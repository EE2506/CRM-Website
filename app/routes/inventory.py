from flask import Blueprint, jsonify, request, g
from app.models import db, Product
from app.utils.security import require_permission

inventory_bp = Blueprint('inventory', __name__)

@inventory_bp.route('', methods=['GET'])
@require_permission('inventory.view')
def get_inventory():
    query = Product.query.filter_by(company_id=g.current_user.company_id)
    products = query.order_by(Product.created_at.desc()).all()
    
    return jsonify({
        "success": True,
        "data": [{
            "id": p.id,
            "sku": p.sku,
            "name": p.name,
            "category": p.category,
            "price": float(p.price),
            "created_at": p.created_at.isoformat()
        } for p in products]
    }), 200

@inventory_bp.route('', methods=['POST'])
@require_permission('inventory.create')
def create_product():
    data = request.get_json()
    
    if not data or not data.get('sku') or not data.get('name') or not data.get('price'):
        return jsonify({"success": False, "error": {"code": "VALIDATION_ERROR", "message": "Missing required fields (sku, name, price)"}}), 400
        
    product = Product(
        sku=data['sku'],
        name=data['name'],
        category=data.get('category', 'Uncategorized'),
        price=data['price'],
        company_id=g.current_user.company_id
    )
    
    db.session.add(product)
    db.session.commit()
    
    return jsonify({
        "success": True,
        "message": "Product created successfully",
        "data": {"id": product.id}
    }), 201

@inventory_bp.route('/<int:id>', methods=['PUT', 'PATCH'])
@require_permission('inventory.edit')
def update_product(id):
    product = Product.query.filter_by(id=id, company_id=g.current_user.company_id).first_or_404()
    data = request.get_json()
    
    if 'sku' in data: product.sku = data['sku']
    if 'name' in data: product.name = data['name']
    if 'category' in data: product.category = data['category']
    if 'price' in data: product.price = data['price']
    
    db.session.commit()
    return jsonify({"success": True, "message": "Product updated successfully"}), 200

@inventory_bp.route('/<int:id>', methods=['DELETE'])
@require_permission('inventory.delete')
def delete_product(id):
    product = Product.query.filter_by(id=id, company_id=g.current_user.company_id).first_or_404()
    db.session.delete(product)
    db.session.commit()
    return jsonify({"success": True, "message": "Product deleted successfully"}), 200
