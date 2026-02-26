from flask import Blueprint, jsonify, request, g
from app.models import db, Sale, SaleItem, Product, User, Role
from app.utils.security import require_permission
from sqlalchemy import func, extract
from itsdangerous import URLSafeTimedSerializer
import os

admin_bp = Blueprint('admin', __name__)

@admin_bp.route('/analytics/summary', methods=['GET'])
@require_permission('admin.analytics.view')
def get_analytics_summary():
    company_id = g.current_user.company_id
    
    # KPIs
    total_revenue = db.session.query(func.sum(Sale.total_amount)).filter_by(company_id=company_id).scalar() or 0.00
    order_count = Sale.query.filter_by(company_id=company_id).count()
    aov = float(total_revenue) / order_count if order_count > 0 else 0.00
    
    return jsonify({
        "success": True,
        "data": {
            "total_revenue": float(total_revenue),
            "order_count": order_count,
            "average_order_value": aov
        }
    }), 200

@admin_bp.route('/analytics/sales-by-hour', methods=['GET'])
@require_permission('admin.analytics.view')
def get_sales_by_hour():
    company_id = g.current_user.company_id
    
    results = db.session.query(
        extract('hour', Sale.created_at).label('hour'),
        func.sum(Sale.total_amount).label('revenue')
    ).filter_by(company_id=company_id).group_by('hour').all()
    
    # Fill all 24 hours
    heatmap = {int(h): 0.00 for h in range(24)}
    for r in results:
        heatmap[int(r.hour)] = float(r.revenue)
        
    return jsonify({
        "success": True,
        "data": heatmap
    }), 200

@admin_bp.route('/analytics/top-products', methods=['GET'])
@require_permission('admin.analytics.view')
def get_top_products():
    company_id = g.current_user.company_id
    
    results = db.session.query(
        SaleItem.product_name,
        func.sum(SaleItem.quantity).label('total_qty'),
        func.sum(SaleItem.total_price).label('total_rev')
    ).join(Sale).filter(Sale.company_id == company_id).group_by(SaleItem.product_name)\
    .order_by(func.sum(SaleItem.total_price).desc()).limit(10).all()
    
    return jsonify({
        "success": True,
        "data": [{
            "name": r.product_name,
            "quantity": int(r.total_qty),
            "revenue": float(r.total_rev)
        } for r in results]
    }), 200

@admin_bp.route('/analytics/share-link', methods=['POST'])
@require_permission('admin.analytics.share')
def generate_share_link():
    s = URLSafeTimedSerializer(os.getenv('SECRET_KEY'))
    token = s.dumps({"company_id": g.current_user.company_id, "type": "analytics_preview"})
    
    public_url = f"/public/reports/preview?token={token}"
    
    return jsonify({
        "success": True,
        "data": {
            "public_url": public_url,
            "expires_in": 3600 # 1 hour
        }
    }), 201

# --- TEAM & USER MANAGEMENT ---

@admin_bp.route('/users', methods=['GET'])
@require_permission('admin.users.manage')
def get_users():
    users = User.query.filter_by(company_id=g.current_user.company_id).all()
    return jsonify({
        "success": True,
        "data": [user.to_dict() for user in users]
    }), 200

@admin_bp.route('/users/<int:user_id>/approve', methods=['PUT'])
@require_permission('admin.users.manage')
def approve_user(user_id):
    data = request.get_json() or {}
    role_id = data.get('role_id')
    
    if not role_id:
        return jsonify({"success": False, "error": {"message": "role_id is required"}}), 400
        
    user = User.query.filter_by(id=user_id, company_id=g.current_user.company_id).first()
    if not user:
        return jsonify({"success": False, "error": {"message": "User not found"}}), 404
        
    role = Role.query.filter_by(id=role_id, company_id=g.current_user.company_id).first()
    if not role:
        return jsonify({"success": False, "error": {"message": "Role not found"}}), 404
        
    user.role_id = role.id
    user.status = 'active'
    db.session.commit()
    
    return jsonify({
        "success": True,
        "message": "User approved successfully",
        "data": user.to_dict()
    }), 200

@admin_bp.route('/users/<int:user_id>/role', methods=['PUT'])
@require_permission('admin.users.manage')
def change_user_role(user_id):
    data = request.get_json() or {}
    role_id = data.get('role_id')
    
    if not role_id:
        return jsonify({"success": False, "error": {"message": "role_id is required"}}), 400
        
    user = User.query.filter_by(id=user_id, company_id=g.current_user.company_id).first()
    if not user:
        return jsonify({"success": False, "error": {"message": "User not found"}}), 404
        
    role = Role.query.filter_by(id=role_id, company_id=g.current_user.company_id).first()
    if not role:
        return jsonify({"success": False, "error": {"message": "Role not found"}}), 404
        
    if user.role and user.role.name in ["Company Owner", "Owner"]:
        return jsonify({"success": False, "error": {"message": "Cannot change the role of a Company Owner"}}), 403
        
    user.role_id = role.id
    db.session.commit()
    
    return jsonify({
        "success": True,
        "message": "User role updated successfully",
        "data": user.to_dict()
    }), 200

@admin_bp.route('/users/<int:user_id>', methods=['DELETE'])
@require_permission('admin.users.manage')
def delete_user(user_id):
    user = User.query.filter_by(id=user_id, company_id=g.current_user.company_id).first()
    if not user:
        return jsonify({"success": False, "error": {"message": "User not found"}}), 404
        
    if user.id == g.current_user.id:
        return jsonify({"success": False, "error": {"message": "Cannot delete yourself"}}), 400
        
    if user.role and user.role.name in ["Company Owner", "Owner"]:
        return jsonify({"success": False, "error": {"message": "Cannot delete a Company Owner"}}), 403
        
    db.session.delete(user)
    db.session.commit()
    
    return jsonify({
        "success": True,
        "message": "User removed successfully"
    }), 200

@admin_bp.route('/roles', methods=['GET'])
@require_permission('admin.users.manage')
def get_roles():
    roles = Role.query.filter_by(company_id=g.current_user.company_id).all()
    return jsonify({
        "success": True,
        "data": [{"id": r.id, "name": r.name, "permissions": r.permissions} for r in roles]
    }), 200

@admin_bp.route('/roles', methods=['POST'])
@require_permission('admin.users.manage')
def create_role():
    # Only allow Company Owners to create new roles
    if g.current_user.role.name not in ["Company Owner", "Owner"]:
        return jsonify({"success": False, "error": {"message": "Only Company Owners can create roles."}}), 403
        
    data = request.get_json() or {}
    name = data.get('name')
    permissions = data.get('permissions', [])
    
    if not name:
        return jsonify({"success": False, "error": {"message": "Role name is required"}}), 400
        
    # Check if role already exists in this company
    existing = Role.query.filter_by(name=name, company_id=g.current_user.company_id).first()
    if existing:
        return jsonify({"success": False, "error": {"message": "A role with this name already exists."}}), 400
        
    new_role = Role(
        name=name,
        company_id=g.current_user.company_id,
        permissions=permissions
    )
    db.session.add(new_role)
    db.session.commit()
    
    return jsonify({
        "success": True,
        "message": "Role created successfully",
        "data": {"id": new_role.id, "name": new_role.name, "permissions": new_role.permissions}
    }), 201

@admin_bp.route('/company/invite-code', methods=['GET'])
@require_permission('admin.users.manage')
def get_invite_code():
    from app.models import Company
    company = Company.query.get(g.current_user.company_id)
    return jsonify({
        "success": True,
        "data": {"invite_code": company.invite_code}
    }), 200
