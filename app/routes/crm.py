from flask import Blueprint, jsonify, request, g
from app.models import db, Contact, Activity, Deal, Sale, SaleItem, Ticket, Expense, TimeLog, StockCount, Product
from app.utils.security import require_permission
from sqlalchemy import func, extract
from datetime import datetime, timedelta
import math

crm_bp = Blueprint('crm', __name__)

@crm_bp.route('/dashboard', methods=['GET'])
@require_permission('crm.dashboard.view', 'admin.analytics.view') # Should be assigned to Company Owner
def get_crm_dashboard():
    company_id = g.current_user.company_id
    
    # 1. KPI: Total Revenue (from Sales)
    total_revenue = db.session.query(func.sum(Sale.total_amount)).filter_by(company_id=company_id).scalar() or 0.00
    
    # 2. KPI: Active Leads
    active_leads_count = Contact.query.filter_by(company_id=company_id, type='lead').count()
    
    # 3. KPI: Open Tickets
    open_tickets_count = Ticket.query.filter_by(company_id=company_id, status='open').count()
    high_priority_tickets = Ticket.query.filter_by(company_id=company_id, status='open', priority='high').count()
    
    # 4. KPI: Conversion Rate (Placeholder calculation for now: Deals won / Total contacts)
    total_contacts = Contact.query.filter_by(company_id=company_id).count()
    won_deals = Deal.query.filter_by(company_id=company_id, stage='won').count()
    conversion_rate = (won_deals / total_contacts * 100) if total_contacts > 0 else 0.0
    
    # 5. Chart Data: Sales over last 30 days
    thirty_days_ago = datetime.utcnow() - timedelta(days=30)
    sales_data = db.session.query(
        func.date(Sale.created_at).label('date'),
        func.sum(Sale.total_amount).label('total')
    ).filter(Sale.company_id == company_id, Sale.created_at >= thirty_days_ago)\
    .group_by(func.date(Sale.created_at)).order_by(func.date(Sale.created_at)).all()
    
    # 6. Recent Activity
    recent_activities = Activity.query.filter(Activity.contact_id.in_(
        db.session.query(Contact.id).filter_by(company_id=company_id)
    )).order_by(Activity.created_at.desc()).limit(10).all()
    
    return jsonify({
        "success": True,
        "data": {
            "kpis": {
                "total_revenue": float(total_revenue),
                "active_leads": active_leads_count,
                "open_tickets": open_tickets_count,
                "high_priority_tickets": high_priority_tickets,
                "conversion_rate": round(conversion_rate, 2)
            },
            "sales_chart": [{"date": str(s.date), "total": float(s.total)} for s in sales_data],
            "recent_activity": [{
                "id": a.id,
                "type": a.type,
                "description": a.description,
                "contact_name": f"{a.contact.first_name} {a.contact.last_name}",
                "timestamp": a.created_at.isoformat()
            } for a in recent_activities]
        }
    }), 200

@crm_bp.route('/dashboard/advanced', methods=['GET'])
@require_permission('crm.dashboard.view', 'admin.analytics.view')
def get_advanced_dashboard():
    company_id = g.current_user.company_id
    
    # Time boundaries (Today vs Month)
    today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    month_start = datetime.utcnow().replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    
    # --- SALES & REVENUE ---
    monthly_sales = db.session.query(func.sum(Sale.total_amount)).filter(
        Sale.company_id == company_id, Sale.created_at >= month_start).scalar() or 0.00
        
    monthly_expenses = db.session.query(func.sum(Expense.amount)).filter(
        Expense.company_id == company_id, Expense.date >= month_start).scalar() or 0.00
        
    net_revenue = monthly_sales - monthly_expenses
    
    # --- LABOR ---
    # Simplified generic labor cost estimation for demo purposes if no payroll module.
    # In a real app, you'd multiply hours by hourly wage. Here we just count active shifts.
    active_shifts = TimeLog.query.filter_by(company_id=company_id, status='active').all()
    
    active_shift_data = [{
        "user_id": log.user_id,
        "user_name": f"{log.user.first_name} {log.user.last_name}",
        "clock_in": log.clock_in.isoformat()
    } for log in active_shifts if log.user]
    
    # --- INVENTORY & SHRINKAGE ---
    low_stock_items = Product.query.filter(
        Product.company_id == company_id,
        Product.stock_quantity <= Product.reorder_point
    ).limit(10).all()
    
    low_stock_data = [{
        "name": p.name,
        "sku": p.sku,
        "stock": p.stock_quantity,
        "reorder_point": p.reorder_point
    } for p in low_stock_items]
    
    # Calculate Shrinkage (Value of missing stock from most recent counts)
    shrinkage_events = StockCount.query.filter(
        StockCount.company_id == company_id,
        StockCount.difference < 0 # Negative difference means lost stock
    ).order_by(StockCount.created_at.desc()).limit(50).all()
    
    total_shrinkage_value = sum([abs(s.difference) * s.product.cost_price for s in shrinkage_events if s.product])
    
    # --- TOP SELLERS ---
    # Group sale items by product name to find best sellers
    top_sellers_query = db.session.query(
        SaleItem.product_name,
        func.sum(SaleItem.quantity).label('total_qty'),
        func.sum(SaleItem.total_price).label('total_revenue')
    ).join(Sale).filter(Sale.company_id == company_id).group_by(SaleItem.product_name).order_by(db.text('total_qty DESC')).limit(5).all()
    
    top_sellers_data = [{
        "name": ts.product_name or "Unknown Item",
        "quantity": int(ts.total_qty),
        "revenue": float(ts.total_revenue)
    } for ts in top_sellers_query]

    return jsonify({
        "success": True,
        "data": {
            "financials": {
                "monthly_sales": float(monthly_sales),
                "monthly_expenses": float(monthly_expenses),
                "net_revenue": float(net_revenue)
            },
            "labor": {
                "active_shifts_count": len(active_shifts),
                "active_shifts": active_shift_data
            },
            "inventory": {
                "total_shrinkage_value": float(total_shrinkage_value),
                "low_stock_alerts": low_stock_data
            },
            "sales": {
                "top_sellers": top_sellers_data
            }
        }
    }), 200

@crm_bp.route('/time-log/clock-in', methods=['POST'])
@require_permission('crm.dashboard.view') # Any staff that can see dashboard can clock in
def clock_in():
    # Check if already clocked in
    active_log = TimeLog.query.filter_by(user_id=g.current_user.id, status='active').first()
    if active_log:
        return jsonify({"success": False, "error": {"message": "You are already clocked in"}}), 400
        
    new_log = TimeLog(
        user_id=g.current_user.id,
        company_id=g.current_user.company_id
    )
    db.session.add(new_log)
    db.session.commit()
    
    return jsonify({
        "success": True,
        "message": "Clocked in successfully",
        "data": {
            "clock_in_time": new_log.clock_in.isoformat()
        }
    }), 201

@crm_bp.route('/time-log/clock-out', methods=['POST'])
@require_permission('crm.dashboard.view')
def clock_out():
    active_log = TimeLog.query.filter_by(user_id=g.current_user.id, status='active').first()
    if not active_log:
        return jsonify({"success": False, "error": {"message": "You are not currently clocked in"}}), 400
        
    active_log.clock_out = datetime.utcnow()
    active_log.status = 'completed'
    db.session.commit()
    
    return jsonify({
        "success": True,
        "message": "Clocked out successfully",
        "data": {
            "clock_out_time": active_log.clock_out.isoformat()
        }
    }), 200

@crm_bp.route('/contacts', methods=['GET'])
@require_permission('crm.contacts.view', 'contacts.manage')
def get_contacts():
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 20, type=int)
    contact_type = request.args.get('type')
    
    query = Contact.query.filter_by(company_id=g.current_user.company_id)
    
    if contact_type:
        query = query.filter_by(type=contact_type)
        
    pagination = query.paginate(page=page, per_page=per_page, error_out=False)
    contacts = pagination.items
    
    return jsonify({
        "success": True,
        "data": [{
            "id": c.id,
            "first_name": c.first_name,
            "last_name": c.last_name,
            "email": c.email,
            "phone": c.phone,
            "type": c.type,
            "tags": c.tags
        } for c in contacts],
        "meta": {
            "page": pagination.page,
            "per_page": pagination.per_page,
            "total": pagination.total,
            "pages": pagination.pages
        }
    }), 200

@crm_bp.route('/contacts', methods=['POST'])
@require_permission('crm.contacts.create', 'contacts.manage')
def create_contact():
    data = request.get_json()
    
    if not data or not data.get('first_name') or not data.get('last_name'):
        return jsonify({"success": False, "error": {"code": "VALIDATION_ERROR", "message": "Missing required fields"}}), 400
        
    contact = Contact(
        first_name=data['first_name'],
        last_name=data['last_name'],
        email=data.get('email'),
        phone=data.get('phone'),
        type=data.get('type', 'lead'),
        tags=data.get('tags', []),
        company_id=g.current_user.company_id
    )
    
    db.session.add(contact)
    db.session.commit()
    
    return jsonify({
        "success": True,
        "message": "Contact created successfully",
        "data": {"id": contact.id}
    }), 201

@crm_bp.route('/contacts/<int:id>', methods=['GET'])
@require_permission('crm.contacts.view', 'contacts.manage')
def get_contact_detail(id):
    contact = Contact.query.filter_by(id=id, company_id=g.current_user.company_id).first_or_404()
    
    activities = Activity.query.filter_by(contact_id=id).order_by(Activity.created_at.desc()).all()
    
    return jsonify({
        "success": True,
        "data": {
            "id": contact.id,
            "first_name": contact.first_name,
            "last_name": contact.last_name,
            "email": contact.email,
            "phone": contact.phone,
            "type": contact.type,
            "tags": contact.tags,
            "activities": [{
                "id": a.id,
                "type": a.type,
                "description": a.description,
                "created_at": a.created_at.isoformat()
            } for a in activities]
        }
    }), 200

@crm_bp.route('/contacts/<int:id>', methods=['PUT'])
@require_permission('crm.contacts.edit', 'contacts.manage')
def update_contact(id):
    contact = Contact.query.filter_by(id=id, company_id=g.current_user.company_id).first_or_404()
    data = request.get_json()
    
    if 'first_name' in data: contact.first_name = data['first_name']
    if 'last_name' in data: contact.last_name = data['last_name']
    if 'email' in data: contact.email = data['email']
    if 'phone' in data: contact.phone = data['phone']
    if 'type' in data: contact.type = data['type']
    if 'tags' in data: contact.tags = data['tags']
    
    db.session.commit()
    return jsonify({"success": True, "message": "Contact updated successfully"}), 200

@crm_bp.route('/contacts/<int:id>', methods=['DELETE'])
@require_permission('crm.contacts.delete', 'contacts.manage')
def delete_contact(id):
    contact = Contact.query.filter_by(id=id, company_id=g.current_user.company_id).first_or_404()
    db.session.delete(contact)
    db.session.commit()
    return jsonify({"success": True, "message": "Contact deleted successfully"}), 200

# --- Deal Routes ---

@crm_bp.route('/deals', methods=['GET'])
@require_permission('crm.deals.view', 'deals.manage')
def get_deals():
    query = Deal.query.filter_by(company_id=g.current_user.company_id)
    deals = query.all()
    
    return jsonify({
        "success": True,
        "data": [{
            "id": d.id,
            "name": d.name,
            "value": float(d.value),
            "stage": d.stage,
            "probability": d.probability,
            "contact_id": d.contact_id
        } for d in deals]
    }), 200

@crm_bp.route('/deals', methods=['POST'])
@require_permission('crm.deals.create', 'deals.manage')
def create_deal():
    data = request.get_json()
    
    if not data or not data.get('name') or not data.get('contact_id'):
        return jsonify({"success": False, "error": {"code": "VALIDATION_ERROR", "message": "Missing required fields"}}), 400
        
    deal = Deal(
        name=data['name'],
        value=data.get('value', 0.00),
        stage=data.get('stage', 'new'),
        probability=data.get('probability', 10),
        contact_id=data['contact_id'],
        company_id=g.current_user.company_id
    )
    
    db.session.add(deal)
    db.session.commit()
    
    return jsonify({
        "success": True,
        "message": "Deal created successfully",
        "data": {"id": deal.id}
    }), 201

@crm_bp.route('/deals/<int:id>', methods=['PUT'])
@require_permission('crm.deals.edit', 'deals.manage')
def update_deal(id):
    deal = Deal.query.filter_by(id=id, company_id=g.current_user.company_id).first_or_404()
    data = request.get_json()
    
    if 'name' in data: deal.name = data['name']
    if 'value' in data: deal.value = data['value']
    if 'stage' in data: deal.stage = data['stage']
    if 'probability' in data: deal.probability = data['probability']
    if 'contact_id' in data: deal.contact_id = data['contact_id']
    
    db.session.commit()
    return jsonify({"success": True, "message": "Deal updated successfully"}), 200

@crm_bp.route('/deals/<int:id>', methods=['DELETE'])
@require_permission('crm.deals.delete', 'deals.manage')
def delete_deal(id):
    deal = Deal.query.filter_by(id=id, company_id=g.current_user.company_id).first_or_404()
    db.session.delete(deal)
    db.session.commit()
    return jsonify({"success": True, "message": "Deal deleted successfully"}), 200

# --- Activity Routes ---

@crm_bp.route('/contacts/<int:id>/activities', methods=['POST'])
@require_permission('crm.activities.create', 'contacts.manage', 'deals.manage')
def create_activity(id):
    contact = Contact.query.filter_by(id=id, company_id=g.current_user.company_id).first_or_404()
    data = request.get_json()
    
    if not data or not data.get('type'):
        return jsonify({"success": False, "error": {"code": "VALIDATION_ERROR", "message": "Missing activity type"}}), 400
        
    activity = Activity(
        type=data['type'],
        description=data.get('description'),
        contact_id=id,
        user_id=g.current_user.id
    )
    
    db.session.add(activity)
    db.session.commit()
    
    return jsonify({
        "success": True,
        "message": "Activity logged successfully"
    }), 201

@crm_bp.route('/contacts/export', methods=['GET'])
@require_permission('crm.contacts.export', 'contacts.manage')
def export_contacts():
    import csv
    import io
    from flask import make_response
    
    contacts = Contact.query.filter_by(company_id=g.current_user.company_id).all()
    
    output = io.StringIO()
    writer = csv.writer(output)
    
    writer.writerow(['ID', 'First Name', 'Last Name', 'Email', 'Phone', 'Type', 'Created At'])
    
    for c in contacts:
        writer.writerow([c.id, c.first_name, c.last_name, c.email, c.phone, c.type, c.created_at.isoformat()])
        
    response = make_response(output.getvalue())
    response.headers["Content-Disposition"] = "attachment; filename=contacts.csv"
    response.headers["Content-type"] = "text/csv"
    return response
