from flask import Blueprint, jsonify, request, g
from app.models import db, Sale, SaleItem, Product
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
