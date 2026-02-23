from flask import Blueprint, jsonify, request, g
from app.models import db, Sale, SaleItem, Product
from app.utils.security import require_permission
from datetime import datetime

pos_bp = Blueprint('pos', __name__)

@pos_bp.route('/sync/sales', methods=['POST'])
@require_permission('pos.sync')
def sync_sales():
    data = request.get_json()
    
    if not data or not isinstance(data, list):
        return jsonify({"success": False, "error": {"code": "VALIDATION_ERROR", "message": "Expected list of sales"}}), 400
        
    synced_count = 0
    for sale_data in data:
        sale = Sale(
            pos_terminal_id=sale_data.get('terminal_id'),
            total_amount=sale_data['total_amount'],
            tax_amount=sale_data.get('tax_amount', 0.00),
            payment_method=sale_data.get('payment_method', 'cash'),
            company_id=g.current_user.company_id,
            created_at=datetime.fromisoformat(sale_data['created_at']) if 'created_at' in sale_data else datetime.utcnow()
        )
        db.session.add(sale)
        db.session.flush() # Get sale.id
        
        for item_data in sale_data.get('items', []):
            item = SaleItem(
                sale_id=sale.id,
                product_id=item_data.get('product_id'),
                product_name=item_data.get('product_name'),
                quantity=item_data.get('quantity', 1),
                unit_price=item_data['unit_price'],
                total_price=item_data['total_price']
            )
            db.session.add(item)
        
        synced_count += 1
        
    db.session.commit()
    
    return jsonify({
        "success": True,
        "message": f"Successfully synced {synced_count} sales"
    }), 201
