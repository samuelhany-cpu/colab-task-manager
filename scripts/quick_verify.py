"""
Quick Manual Verification Script
Tests core functionality without Selenium (uses requests library)
"""

import requests
import json

BASE_URL = "http://localhost:3000"

def test_server_running():
    """Test 1: Server is running"""
    try:
        response = requests.get(BASE_URL, timeout=5)
        if response.status_code == 200:
            print("✅ Server is running")
            return True
        else:
            print(f"❌ Server returned status {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Server not reachable: {e}")
        return False

def test_api_health():
    """Test 2: API endpoints are accessible"""
    endpoints = [
        "/api/workspaces",
        "/api/search",
    ]
    
    passed = 0
    for endpoint in endpoints:
        try:
            response = requests.get(f"{BASE_URL}{endpoint}", timeout=5)
            # 401 is expected for protected routes without auth
            if response.status_code in [200, 401]:
                print(f"✅ {endpoint} - Accessible")
                passed += 1
            else:
                print(f"❌ {endpoint} - Status {response.status_code}")
        except Exception as e:
            print(f"❌ {endpoint} - Error: {e}")
    
    return passed == len(endpoints)

def main():
    print("=" * 60)
    print("🧪 COLAB TASK MANAGER - QUICK VERIFICATION")
    print("=" * 60)
    print()
    
    results = []
    results.append(test_server_running())
    results.append(test_api_health())
    
    print()
    print("=" * 60)
    print("📊 VERIFICATION SUMMARY")
    print("=" * 60)
    passed = sum(results)
    total = len(results)
    print(f"✅ Passed: {passed}/{total}")
    print(f"📈 Success Rate: {(passed/total*100):.1f}%")
    print("=" * 60)
    print()
    print("💡 For full E2E testing, please run manual tests:")
    print("   1. Open http://localhost:3000 in your browser")
    print("   2. Follow the test scenarios in docs/SCENARIOS.md")
    print()

if __name__ == "__main__":
    main()
