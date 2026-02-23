from flask import Flask, jsonify
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
from flask_bcrypt import Bcrypt
from flask_jwt_extended import JWTManager
from flask_cors import CORS
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from flask_wtf.csrf import CSRFProtect
from config import config
import os

# Initialize extensions
db = SQLAlchemy()
migrate = Migrate()
bcrypt = Bcrypt()
jwt = JWTManager()
cors = CORS()
csrf = CSRFProtect()
limiter = Limiter(key_func=get_remote_address)

def create_app(config_name='default'):
    app = Flask(__name__)
    app.config.from_object(config[config_name])
    
    # Initialize extensions with app
    db.init_app(app)
    migrate.init_app(app, db)
    bcrypt.init_app(app)
    jwt.init_app(app)
    cors.init_app(app, resources={r"/api/*": {"origins": "*"}})
    csrf.init_app(app)
    
    # Register Blueprints
    from app.routes.auth import auth_bp
    from app.routes.admin import admin_bp
    from app.routes.crm import crm_bp
    from app.routes.tickets import tickets_bp
    from app.routes.pos import pos_bp
    
    app.register_blueprint(auth_bp, url_prefix='/api/v1/auth')
    app.register_blueprint(admin_bp, url_prefix='/api/v1/admin')
    app.register_blueprint(crm_bp, url_prefix='/api/v1/crm')
    app.register_blueprint(tickets_bp, url_prefix='/api/v1/tickets')
    app.register_blueprint(pos_bp, url_prefix='/api/v1/pos')
    
    # Health check route
    @app.route('/api/v1/health')
    def health():
        return jsonify({
            "status": "healthy",
            "version": "1.1.0",
            "environment": config_name
        }), 200
        
    return app
