import random
from datetime import datetime, timedelta
from app import create_app
from app.models import db, User, Company, Role, Contact, Deal, Activity, Sale, SaleItem, Product

def seed_data():
    app = create_app()
    with app.app_context():
        print("--- Seeding CRM data ---")
        
        # 1. Clear existing non-user data (to avoid duplicates but keep users)
        Activity.query.delete()
        Deal.query.delete()
        Contact.query.delete()
        SaleItem.query.delete()
        Sale.query.delete()
        Product.query.delete()
        db.session.commit()

        # Get first available company (or create one)
        company = Company.query.first()
        if not company:
            company = Company(name="Main SME Corp", tax_id="123-456-789")
            db.session.add(company)
            db.session.flush()

        # Get first user for association
        user = User.query.filter_by(company_id=company.id).first()
        if not user:
            print("❌ No user found to associate with. Register first!")
            return

        # 2. Seed Products
        categories = ["Electronics", "Office", "Software", "Consulting"]
        products = []
        for i in range(10):
            p = Product(
                sku=f"SKU-{1000+i}",
                name=f"Premium {random.choice(categories)} Asset {i+1}",
                category=random.choice(categories),
                price=random.uniform(500, 5000),
                company_id=company.id
            )
            db.session.add(p)
            products.append(p)
        db.session.flush()

        # 3. Seed Contacts (Leads and Customers)
        first_names = ["James", "Mary", "Robert", "Patricia", "John", "Jennifer", "Michael", "Linda"]
        last_names = ["Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller", "Davis"]
        
        contacts = []
        for i in range(30):
            c = Contact(
                first_name=random.choice(first_names),
                last_name=random.choice(last_names),
                email=f"contact{i}@example.com",
                phone=f"+63 917 {random.randint(100,999)} {random.randint(1000,9999)}",
                type=random.choice(['lead', 'prospect', 'customer']),
                tags=["retail", "wholesale"] if i % 3 == 0 else ["vip"],
                company_id=company.id,
                created_at=datetime.utcnow() - timedelta(days=random.randint(0, 30))
            )
            db.session.add(c)
            contacts.append(c)
        db.session.flush()

        # 4. Seed Deals
        stages = ["new", "discovery", "proposal", "negotiation", "won", "lost"]
        for i in range(15):
            d = Deal(
                name=f"Project {random.randint(100,999)}",
                value=random.uniform(5000, 50000),
                stage=random.choice(stages),
                probability=random.randint(10, 100),
                contact_id=random.choice(contacts).id,
                company_id=company.id,
                created_at=datetime.utcnow() - timedelta(days=random.randint(0, 20))
            )
            db.session.add(d)

        # 5. Seed Activities
        activity_types = ["call", "email", "note", "meeting", "task"]
        for i in range(50):
            a = Activity(
                type=random.choice(activity_types),
                description=f"Followed up on requirements {i+1}",
                contact_id=random.choice(contacts).id,
                user_id=user.id,
                created_at=datetime.utcnow() - timedelta(hours=random.randint(1, 720))
            )
            db.session.add(a)

        # 6. Seed Sales (for the chart)
        for i in range(20):
            created_at = datetime.utcnow() - timedelta(days=random.randint(0, 30))
            s = Sale(
                pos_terminal_id=f"TERM-{random.randint(1,3)}",
                total_amount=0, # Will calculate
                tax_amount=0,
                payment_method=random.choice(["cash", "card", "wallet"]),
                company_id=company.id,
                created_at=created_at
            )
            db.session.add(s)
            db.session.flush()
            
            total = 0
            for _ in range(random.randint(1, 5)):
                p = random.choice(products)
                qty = random.randint(1, 3)
                item_total = float(p.price) * qty
                si = SaleItem(
                    sale_id=s.id,
                    product_id=p.id,
                    product_name=p.name,
                    quantity=qty,
                    unit_price=p.price,
                    total_price=item_total
                )
                db.session.add(si)
                total += item_total
            
            s.total_amount = total
            s.tax_amount = total * 0.12

        db.session.commit()
        print("Success: Seeding complete!")

if __name__ == "__main__":
    seed_data()
