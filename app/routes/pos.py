from flask import Blueprint, jsonify, request, g
from app.models import db, Sale, SaleItem, Product
from app.utils.security import require_permission
from datetime import datetime

pos_bp = Blueprint('pos', __name__)

@pos_bp.route('/products', methods=['GET'])
@require_permission('pos.view', 'pos.sync', 'inventory.view')
def get_pos_products():
    products = Product.query.filter_by(company_id=g.current_user.company_id).filter(
        Product.stock_quantity > 0
    ).order_by(Product.name.asc()).all()
    
    return jsonify({
        "success": True,
        "data": [{
            "id": p.id,
            "name": p.name,
            "sku": p.sku,
            "price": float(p.price),
            "stock_quantity": p.stock_quantity,
            "category": p.category
        } for p in products]
    }), 200

@pos_bp.route('/sale', methods=['POST'])
@require_permission('pos.sync')
def create_sale():
    """Create a single sale transaction from the POS frontend."""
    data = request.get_json()
    
    if not data or not data.get('items') or len(data['items']) == 0:
        return jsonify({"success": False, "error": {"code": "VALIDATION_ERROR", "message": "At least one item is required"}}), 400
    
    total_amount = 0
    sale_items = []
    
    for item_data in data['items']:
        product = Product.query.get(item_data['product_id'])
        if not product:
            return jsonify({"success": False, "error": {"code": "NOT_FOUND", "message": f"Product {item_data['product_id']} not found"}}), 404
        
        qty = item_data.get('quantity', 1)
        unit_price = float(product.price)
        item_total = unit_price * qty
        total_amount += item_total
        
        sale_items.append({
            "product_id": product.id,
            "product_name": product.name,
            "quantity": qty,
            "unit_price": unit_price,
            "total_price": item_total
        })
        
        # Deduct stock
        product.stock_quantity = max(0, (product.stock_quantity or 0) - qty)
    
    tax_rate = 0.12  # 12% VAT
    tax_amount = total_amount * tax_rate
    
    sale = Sale(
        pos_terminal_id='WEB-POS',
        total_amount=total_amount + tax_amount,
        tax_amount=tax_amount,
        payment_method=data.get('payment_method', 'cash'),
        company_id=g.current_user.company_id,
        created_at=datetime.utcnow()
    )
    db.session.add(sale)
    db.session.flush()
    
    for si in sale_items:
        item = SaleItem(
            sale_id=sale.id,
            product_id=si['product_id'],
            product_name=si['product_name'],
            quantity=si['quantity'],
            unit_price=si['unit_price'],
            total_price=si['total_price']
        )
        db.session.add(item)
    
    db.session.commit()
    
    return jsonify({
        "success": True,
        "message": "Sale completed successfully",
        "data": {
            "id": sale.id,
            "total_amount": float(sale.total_amount),
            "tax_amount": float(sale.tax_amount),
            "payment_method": sale.payment_method,
            "items_count": len(sale_items)
        }
    }), 201

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

