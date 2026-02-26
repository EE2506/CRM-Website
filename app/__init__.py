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
import logging
from logging.handlers import RotatingFileHandler

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
    
    # Configure Logging
    if not os.path.exists('logs'):
        os.mkdir('logs')
    file_handler = RotatingFileHandler('logs/app.log', maxBytes=10240, backupCount=10)
    file_handler.setFormatter(logging.Formatter(
        '%(asctime)s %(levelname)s: %(message)s [in %(pathname)s:%(lineno)d]'
    ))
    file_handler.setLevel(logging.INFO)
    app.logger.addHandler(file_handler)
    app.logger.setLevel(logging.INFO)
    app.logger.info('Application startup')
    
    # Initialize extensions with app
    db.init_app(app)
    migrate.init_app(app, db)
    bcrypt.init_app(app)
    jwt.init_app(app)
    cors.init_app(app, resources={r"/api/*": {"origins": "*"}})
    
    # CSRF is not needed for API routes (JWT-authenticated SPA).
    # Only initialize for server-rendered forms if any exist.
    app.config['WTF_CSRF_ENABLED'] = False
    
    # Initialize Limiter (fallback to memory if Redis is unavailable)
    try:
        limiter.init_app(app)
    except Exception as e:
        app.logger.warning(f"Limiter initialization failed: {e}. Falling back to memory.")
        app.config['RATELIMIT_STORAGE_URI'] = 'memory://'
        limiter.init_app(app)
    
    # Register Blueprints
    from app.routes.auth import auth_bp
    from app.routes.admin import admin_bp
    from app.routes.crm import crm_bp
    from app.routes.tickets import tickets_bp
    from app.routes.pos import pos_bp
    from app.routes.inventory import inventory_bp
    
    app.register_blueprint(auth_bp, url_prefix='/api/v1/auth')
    app.register_blueprint(admin_bp, url_prefix='/api/v1/admin')
    app.register_blueprint(crm_bp, url_prefix='/api/v1/crm')
    app.register_blueprint(tickets_bp, url_prefix='/api/v1/tickets')
    app.register_blueprint(pos_bp, url_prefix='/api/v1/pos')
    app.register_blueprint(inventory_bp, url_prefix='/api/v1/inventory')
    
    # Health check route
    @app.route('/api/v1/health')
    def health():
        return jsonify({
            "status": "healthy",
            "version": "1.1.0",
            "environment": config_name
        }), 200
        
    return app
