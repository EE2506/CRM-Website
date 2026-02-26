import requests
import json

base_url = "http://127.0.0.1:5000/api/v1"
email = "jeremiahdavidangpunzalan@gmail.com"
password = "ee25062506"

# 1. Login
response = requests.post(f"{base_url}/auth/login", json={
    "email": email,
    "password": password
})

print(f"Login Status: {response.status_code}")
if response.status_code != 200:
    print(response.json())
    exit(1)

token = response.json()['data']['access_token']
headers = {"Authorization": f"Bearer {token}"}

# 2. Test /crm/dashboard (Works)
resp = requests.get(f"{base_url}/crm/dashboard", headers=headers)
print(f"Dashboard Status: {resp.status_code}")

# 3. Test /tickets (Fails?)
resp = requests.get(f"{base_url}/tickets", headers=headers)
print(f"Tickets Status: {resp.status_code}")
print(resp.text)

# 4. Test /inventory (Fails?)
resp = requests.get(f"{base_url}/inventory", headers=headers)
print(f"Inventory Status: {resp.status_code}")
print(resp.text)
