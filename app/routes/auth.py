from flask import Blueprint, jsonify, request, current_app
from app.models import db, User, Company, Role
from flask_jwt_extended import create_access_token, create_refresh_token, jwt_required, get_jwt_identity
from app.utils.security import generate_signed_url
import datetime

auth_bp = Blueprint('auth', __name__)

@auth_bp.route('/register', methods=['POST'])
def register():
    data = request.get_json()
    
    if not data or not data.get('email') or not data.get('password'):
        return jsonify({"success": False, "error": {"code": "VALIDATION_ERROR", "message": "Missing email or password"}}), 400
        
    if User.query.filter_by(email=data['email']).first():
        return jsonify({"success": False, "error": {"code": "ALREADY_EXISTS", "message": "Email already registered"}}), 409
        
    invite_code_input = data.get('invite_code')
    
    if invite_code_input:
        company = Company.query.filter_by(invite_code=invite_code_input).first()
        if not company:
            return jsonify({"success": False, "error": {"code": "NOT_FOUND", "message": "Invalid invite code"}}), 404
            
        user = User(
            email=data['email'],
            first_name=data.get('first_name'),
            last_name=data.get('last_name'),
            company_id=company.id,
            role_id=None,
            status='pending_approval' # Wait for admin to approve
        )
        user.set_password(data['password'])
        
        db.session.add(user)
        db.session.commit()
        
        return jsonify({
            "success": True,
            "message": "Registration successful. Please wait for an Admin to approve your account.",
            "data": { "email": user.email, "status": "pending_approval" }
        }), 201
        
    else:
        # Create company if provided, or use default
        company_name = data.get('company_name', f"{data['email']}'s Company")
        
        # Generate unique code
        new_code = Company.generate_invite_code()
        while Company.query.filter_by(invite_code=new_code).first():
            new_code = Company.generate_invite_code()
            
        company = Company(name=company_name, invite_code=new_code)
        db.session.add(company)
        db.session.flush() # Get company ID
        
        # Create default role for owner
        owner_role = Role(name='Company Owner', permissions=['*'], company_id=company.id)
        db.session.add(owner_role)
        db.session.flush()

        user = User(
            email=data['email'],
            first_name=data.get('first_name'),
            last_name=data.get('last_name'),
            company_id=company.id,
            role_id=owner_role.id,
            status='pending'
        )
        user.set_password(data['password'])
        
        db.session.add(user)
        db.session.commit()
        
        # Generate activation link
        token = generate_signed_url({'user_id': user.id}, salt='activate-account')
        activation_url = f"{request.host_url}api/v1/auth/activate/{token}"
        
        # EXPLICITLY LOG FOR USER
        log_msg = f"\n{'='*50}\nACTIVATE ACCOUNT LINK: {activation_url}\n{'='*50}\n"
        print(log_msg)
        current_app.logger.info(log_msg)
        
        return jsonify({
            "success": True,
            "message": "Registration successful. Please check your email to activate account.",
            "data": {
                "email": user.email,
                "activation_url": activation_url # For demo purposes
            }
        }), 201

@auth_bp.route('/login', methods=['POST'])
def login():
    data = request.get_json()
    
    if not data or not data.get('email') or not data.get('password'):
        return jsonify({"success": False, "error": {"code": "VALIDATION_ERROR", "message": "Missing email or password"}}), 400
        
    user = User.query.filter_by(email=data['email']).first()
    
    if not user or not user.check_password(data['password']):
        return jsonify({"success": False, "error": {"code": "UNAUTHORIZED", "message": "Invalid credentials"}}), 401
        
    if user.status != 'active':
        return jsonify({"success": False, "error": {"code": "FORBIDDEN", "message": f"Account status: {user.status}"}}), 403
        
    access_token = create_access_token(identity=str(user.id))
    refresh_token = create_refresh_token(identity=str(user.id))
    
    return jsonify({
        "success": True,
        "data": {
            "access_token": access_token,
            "refresh_token": refresh_token,
            "user": {
                "email": user.email,
                "first_name": user.first_name,
                "last_name": user.last_name,
                "role": user.role.name if user.role else None
            }
        }
    }), 200

@auth_bp.route('/activate/<token>', methods=['GET'])
def activate(token):
    from app.utils.security import verify_signed_url
    payload = verify_signed_url(token, salt='activate-account')
    
    if not payload:
        return jsonify({"success": False, "message": "Invalid or expired activation link"}), 400
        
    user = User.query.get(payload['user_id'])
    if not user:
        return jsonify({"success": False, "message": "User not found"}), 404
        
    user.status = 'active'
    user.activated_at = datetime.datetime.utcnow()
    db.session.commit()
    
    return jsonify({"success": True, "message": "Account activated successfully"}), 200
