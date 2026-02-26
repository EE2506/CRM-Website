from . import db, bcrypt
from datetime import datetime
import uuid

class Company(db.Model):
    __tablename__ = 'companies'
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    tax_id = db.Column(db.String(50), unique=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    users = db.relationship('User', backref='company', lazy=True)

class Role(db.Model):
    __tablename__ = 'roles'
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(50), nullable=False)
    permissions = db.Column(db.JSON)  # List of permission strings
    company_id = db.Column(db.Integer, db.ForeignKey('companies.id'), nullable=False)

class User(db.Model):
    __tablename__ = 'users'
    id = db.Column(db.Integer, primary_key=True)
    public_id = db.Column(db.String(36), default=lambda: str(uuid.uuid4()), unique=True)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(128), nullable=False)
    first_name = db.Column(db.String(50))
    last_name = db.Column(db.String(50))
    status = db.Column(db.String(20), default='pending') # Use string for SQLite compatibility
    company_id = db.Column(db.Integer, db.ForeignKey('companies.id'), nullable=True)
    role_id = db.Column(db.Integer, db.ForeignKey('roles.id'), nullable=True)
    role = db.relationship('Role', backref='users')
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    activated_at = db.Column(db.DateTime, nullable=True)

    def set_password(self, password):
        self.password_hash = bcrypt.generate_password_hash(password, rounds=12).decode('utf-8')

    def check_password(self, password):
        return bcrypt.check_password_hash(self.password_hash, password)

    def has_permission(self, permission):
        if not self.role:
            return False
        if '*' in self.role.permissions:
            return True
        return permission in self.role.permissions

    def to_dict(self):
        return {
            "id": self.id,
            "public_id": str(self.public_id),
            "email": self.email,
            "first_name": self.first_name,
            "last_name": self.last_name,
            "status": self.status,
            "role": self.role.name if self.role else None,
            "company_id": self.company_id
        }

class Contact(db.Model):
    __tablename__ = 'contacts'
    id = db.Column(db.Integer, primary_key=True)
    first_name = db.Column(db.String(50), nullable=False)
    last_name = db.Column(db.String(50), nullable=False)
    email = db.Column(db.String(120))
    phone = db.Column(db.String(20))
    type = db.Column(db.Enum('lead', 'prospect', 'customer', 'vendor', name='contact_type'), default='lead')
    tags = db.Column(db.JSON)  # List of tags
    company_id = db.Column(db.Integer, db.ForeignKey('companies.id'), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    activities = db.relationship('Activity', backref='contact', lazy=True, cascade="all, delete-orphan")
    deals = db.relationship('Deal', backref='contact', lazy=True)

class Deal(db.Model):
    __tablename__ = 'deals'
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    value = db.Column(db.Numeric(12, 2), default=0.00)
    stage = db.Column(db.String(50), default='new') # e.g., discovery, proposal, negotiation, won, lost
    probability = db.Column(db.Integer, default=10) # 0-100
    expected_close_date = db.Column(db.DateTime)
    contact_id = db.Column(db.Integer, db.ForeignKey('contacts.id'), nullable=False)
    company_id = db.Column(db.Integer, db.ForeignKey('companies.id'), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

class Activity(db.Model):
    __tablename__ = 'activities'
    id = db.Column(db.Integer, primary_key=True)
    type = db.Column(db.Enum('call', 'email', 'note', 'meeting', 'task', name='activity_type'), nullable=False)
    description = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    contact_id = db.Column(db.Integer, db.ForeignKey('contacts.id'), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False) # The staff member who performed the activity

class Ticket(db.Model):
    __tablename__ = 'tickets'
    id = db.Column(db.Integer, primary_key=True)
    ticket_code = db.Column(db.String(25), unique=True, nullable=False) # TKT-YYYYMMDD-XXXX
    subject = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text)
    type = db.Column(db.Enum('internal', 'customer', 'pos', 'escalated', name='ticket_type'), default='customer')
    status = db.Column(db.Enum('open', 'in_progress', 'awaiting_reply', 'resolved', 'closed', name='ticket_status'), default='open')
    priority = db.Column(db.Enum('low', 'medium', 'high', 'critical', name='ticket_priority'), default='medium')
    
    company_id = db.Column(db.Integer, db.ForeignKey('companies.id'), nullable=False)
    reporter_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True) # User who reported it
    assignee_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True) # Staff assigned to fix it
    contact_id = db.Column(db.Integer, db.ForeignKey('contacts.id'), nullable=True) # Related CRM contact
    
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    resolved_at = db.Column(db.DateTime, nullable=True)
    
    replies = db.relationship('TicketReply', backref='ticket', lazy=True, cascade="all, delete-orphan")

    @staticmethod
    def generate_ticket_code():
        today = datetime.utcnow().strftime('%Y%m%d')
        count = Ticket.query.filter(Ticket.ticket_code.like(f'TKT-{today}-%')).count()
        return f"TKT-{today}-{str(count + 1).zfill(4)}"

class TicketReply(db.Model):
    __tablename__ = 'ticket_replies'
    id = db.Column(db.Integer, primary_key=True)
    content = db.Column(db.Text, nullable=False)
    is_internal = db.Column(db.Boolean, default=False) # Hidden from customers
    
    ticket_id = db.Column(db.Integer, db.ForeignKey('tickets.id'), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

class Product(db.Model):
    __tablename__ = 'products'
    id = db.Column(db.Integer, primary_key=True)
    sku = db.Column(db.String(50), nullable=False)
    name = db.Column(db.String(100), nullable=False)
    category = db.Column(db.String(50))
    price = db.Column(db.Numeric(12, 2), nullable=False)
    
    company_id = db.Column(db.Integer, db.ForeignKey('companies.id'), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

class Sale(db.Model):
    __tablename__ = 'sales'
    id = db.Column(db.Integer, primary_key=True)
    pos_terminal_id = db.Column(db.String(50))
    total_amount = db.Column(db.Numeric(12, 2), nullable=False)
    tax_amount = db.Column(db.Numeric(12, 2), default=0.00)
    payment_method = db.Column(db.String(20)) # cash, card, wallet
    
    company_id = db.Column(db.Integer, db.ForeignKey('companies.id'), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    items = db.relationship('SaleItem', backref='sale', lazy=True, cascade="all, delete-orphan")

class SaleItem(db.Model):
    __tablename__ = 'sale_items'
    id = db.Column(db.Integer, primary_key=True)
    sale_id = db.Column(db.Integer, db.ForeignKey('sales.id'), nullable=False)
    product_id = db.Column(db.Integer, db.ForeignKey('products.id'), nullable=True) # Can be null if custom item
    product_name = db.Column(db.String(100)) # Snapshot of name at time of sale
    quantity = db.Column(db.Integer, default=1)
    unit_price = db.Column(db.Numeric(12, 2), nullable=False)
    total_price = db.Column(db.Numeric(12, 2), nullable=False)
