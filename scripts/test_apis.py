import requests
import json
import os
import time

# Load config from .env
def load_env():
    env = {}
    if os.path.exists(".env"):
        with open(".env") as f:
            for line in f:
                if "=" in line and not line.startswith("#"):
                    parts = line.split("=", 1)
                    if len(parts) == 2:
                        key, value = parts
                        env[key.strip()] = value.strip().strip('"')
    return env

config = load_env()
BASE_URL = "http://localhost:3000"
SUPABASE_URL = config.get("NEXT_PUBLIC_SUPABASE_URL")
SUPABASE_ANON_KEY = config.get("NEXT_PUBLIC_SUPABASE_ANON_KEY")
EMAIL = "samuelhany500@gmail.com"
PASSWORD = "Sam@wwe20"

class APITester:
    def __init__(self):
        self.access_token = None
        self.session = requests.Session()
        self.passed = 0
        self.failed = 0
        self.workspace_id = None
        self.workspace_slug = None

    def log(self, name, success, msg=""):
        if success:
            print(f"✅ {name}")
            self.passed += 1
        else:
            print(f"❌ {name} - {msg}")
            self.failed += 1

    def login(self):
        print(f"Logging in to Supabase: {SUPABASE_URL}")
        url = f"{SUPABASE_URL}/auth/v1/token?grant_type=password"
        headers = { "apikey": SUPABASE_ANON_KEY, "Content-Type": "application/json" }
        data = { "email": EMAIL, "password": PASSWORD }
        try:
            res = requests.post(url, headers=headers, json=data)
            if res.status_code == 200:
                self.access_token = res.json().get("access_token")
                self.log("Supabase Login", True)
                return True
            else:
                self.log("Supabase Login", False, f"{res.status_code} {res.text}")
                return False
        except Exception as e:
            self.log("Supabase Login", False, str(e))
            return False

    def call_api(self, method, path, data=None, params=None):
        url = f"{BASE_URL}{path}"
        headers = { "Authorization": f"Bearer {self.access_token}", "Content-Type": "application/json" }
        try:
            if method == "GET":
                res = self.session.get(url, headers=headers, params=params, timeout=10)
            elif method == "POST":
                res = self.session.post(url, headers=headers, json=data, timeout=10)
            return res
        except requests.exceptions.RequestException as e:
            print(f"   Request to {path} Exception: {e}")
            return None
        except Exception as e:
            print(f"   General Error to {path}: {e}")
            return None

    def test_workspaces(self):
        print("\nTesting Workspaces API...")
        res = self.call_api("GET", "/api/workspaces")
        if res and res.status_code == 200:
            workspaces = res.json()
            if isinstance(workspaces, list) and len(workspaces) > 0:
                self.workspace_id = workspaces[0]["id"]
                self.workspace_slug = workspaces[0]["slug"]
                self.log("GET /api/workspaces", True)
                print(f"   Found Workspace: {workspaces[0]['name']}")
            else:
                self.log("GET /api/workspaces", False, "Empty or unexpected response")
        else:
            status = res.status_code if res else "No response"
            self.log("GET /api/workspaces", False, f"Status {status}")

    def test_dashboard(self):
        if not self.workspace_slug: return
        print("\nTesting Dashboard API...")
        res = self.call_api("GET", f"/api/workspaces/{self.workspace_slug}/dashboard")
        if res and res.status_code == 200:
            self.log("GET /api/workspaces/[slug]/dashboard", True)
        else:
            status = res.status_code if res else "No response"
            msg = res.text[:200] if res else ""
            self.log("GET /api/workspaces/[slug]/dashboard", False, f"Status {status} {msg}")

    def test_chat(self):
        if not self.workspace_slug: return
        print("\nTesting Chat API...")
        # First get project ID
        res = self.call_api("GET", "/api/projects", params={"workspaceSlug": self.workspace_slug})
        if res and res.status_code == 200:
            projects = res.json()
            if projects:
                projectId = projects[0]["id"]
                print(f"   Testing Chat (GET) for Project: {projects[0]['name']}")
                res = self.call_api("GET", "/api/chat", params={"projectId": projectId})
                if res and res.status_code == 200:
                    self.log("GET /api/chat", True)
                    
                    print("   Testing Chat (POST) - Sending message...")
                    post_res = self.call_api("POST", "/api/chat", data={
                        "content": "Automated API Test Message",
                        "projectId": projectId
                    })
                    if post_res and post_res.status_code == 201:
                        self.log("POST /api/chat", True)
                    else:
                        status = post_res.status_code if post_res else "No response"
                        msg = post_res.text[:200] if post_res else ""
                        self.log("POST /api/chat", False, f"Status {status} {msg}")
                else:
                    status = res.status_code if res else "No response"
                    msg = res.text[:200] if res else ""
                    self.log("GET /api/chat", False, f"Status {status} {msg}")
            else:
                print("   No projects found, skipping chat test")
        else:
            print(f"   Failed to fetch projects: {res.status_code if res else 'No response'}")

    def run(self):
        if not self.login(): return
        self.test_workspaces()
        self.test_dashboard()
        self.test_chat()
        print(f"\nSummary: {self.passed} Passed, {self.failed} Failed")

if __name__ == "__main__":
    APITester().run()
