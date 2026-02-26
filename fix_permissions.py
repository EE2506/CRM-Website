from app import create_app
from app.models import db, Role, User

app = create_app()

with app.app_context():
    # 1. Update the Admin role to have all permissions ('*')
    admin_role = Role.query.filter_by(name='Admin').first()
    if admin_role:
        print("Found Admin role. Updating permissions to ['*']...")
        admin_role.permissions = ['*']
        db.session.commit()
    else:
        print("Admin role not found. Let's see what roles exist:")
        roles = Role.query.all()
        for r in roles:
            print(f"Role: {r.name}, Company: {r.company_id}, Perms: {r.permissions}")
            if getattr(r, 'name', '').lower() == 'admin' or getattr(r, 'name', '') == 'Company Owner':
                r.permissions = ['*']
                db.session.commit()
                print(f"Updated {r.name} permissions to ['*']")

    # 2. Check the user
    user = User.query.filter_by(email='jd@gmail.com').first()
    if user:
        print(f"User {user.email} has role {user.role.name if user.role else 'None'} with permissions {user.role.permissions if user.role else 'None'}")
    
print("Role update script finished.")
