
import requests
import time
import json

BASE_URL = "http://localhost:3000"

def test_registration_api():
    email = f"testuser{int(time.time())}@gmail.com"
    password = "password123"
    name = "API Test User"
    
    print(f"Testing registration for: {email}")
    
    try:
        response = requests.post(
            f"{BASE_URL}/api/register",
            json={"email": email, "password": password, "name": name},
            headers={"Content-Type": "application/json"}
        )
        
        print(f"Status Code: {response.status_code}")
        print(f"Response: {response.text}")
        
        if response.status_code in [200, 201]:
            print("✅ Registration API Success")
            return True
        else:
            print("❌ Registration API Failed")
            return False
            
    except Exception as e:
        print(f"❌ Exception: {e}")
        return False

if __name__ == "__main__":
    test_registration_api()
