from functools import wraps
from flask import g, abort, current_app, request
from itsdangerous import URLSafeTimedSerializer, SignatureExpired, BadSignature

def generate_signed_url(payload, salt, expires_in=86400):
    """Generate a signed, timed URL payload."""
    s = URLSafeTimedSerializer(current_app.config['SECRET_KEY'])
    return s.dumps(payload, salt=salt)

def verify_signed_url(token, salt, max_age=86400):
    """Verify a signed, timed URL payload."""
    s = URLSafeTimedSerializer(current_app.config['SECRET_KEY'])
    try:
        return s.loads(token, salt=salt, max_age=max_age)
    except (SignatureExpired, BadSignature):
        return None

def require_permission(*permissions):
    """Decorator to enforce granular permissions."""
    def decorator(f):
        @wraps(f)
        def decorated(*args, **kwargs):
            # This requires g.current_user to be set via middleware or JWT
            from flask_jwt_extended import get_jwt_identity, verify_jwt_in_request
            from app.models import User
            
            try:
                verify_jwt_in_request()
            except Exception as e:
                abort(401)
                
            user_id = get_jwt_identity()
            if not user_id:
                abort(401)
                
            user = User.query.get(user_id)
            if not user:
                abort(401)
                
            # Log for debugging
            print(f"Checking permissions {permissions} for user {user.email}")
            
            # Simple check for now, can be expanded to full RBAC logic
            user_permissions = user.role.permissions if user.role and user.role.permissions else []
            if not user.role or not any(p in user_permissions for p in permissions):
                # Allow '*' wildcard for super admins
                if '*' not in user_permissions:
                    abort(403)
                
            g.current_user = user
            return f(*args, **kwargs)
        return decorated
    return decorator
