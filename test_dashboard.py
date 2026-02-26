from app import create_app
from app.models import User
import pprint

app = create_app()

with app.app_context():
    user = User.query.first()
    if user:
        print(f"User Email: {user.email}")
        print(f"User Role: {user.role.name if user.role else 'None'}")
        print(f"User Permissions: {user.role.permissions if user.role else 'None'}")
        
    with app.test_client() as client:
        # We need a valid token to test the API. Let's just bypass auth for a quick test or log in.
        # But we don't have the password. Let's create an access token directly.
        from flask_jwt_extended import create_access_token
        access_token = create_access_token(identity=str(user.id))
        
        headers = {
            'Authorization': f'Bearer {access_token}'
        }
        
        response = client.get('/api/v1/crm/dashboard', headers=headers)
        print(f"Dashboard Response Status: {response.status_code}")
        if response.status_code != 200:
            print(f"Response Data: {response.get_data(as_text=True)}")
        else:
            print("Dashboard API works.")
            
        res_contacts = client.get('/api/v1/crm/contacts', headers=headers)
        print(f"Contacts Response Status: {res_contacts.status_code}")

        res_deals = client.get('/api/v1/crm/deals', headers=headers)
        print(f"Deals Response Status: {res_deals.status_code}")
