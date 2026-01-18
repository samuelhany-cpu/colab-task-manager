# Automated Testing Guide

## Overview

This directory contains automated E2E tests for the Colab Task Manager using Selenium WebDriver.

## Prerequisites

- Python 3.8+
- Chrome browser installed
- Application running on `http://localhost:3000`

## Setup

### 1. Install Python Dependencies

```bash
pip install -r scripts/requirements.txt
```

### 2. Configure Test User

Create a test user account or use environment variables:

```bash
# Windows (PowerShell)
$env:TEST_USER_EMAIL="test@example.com"
$env:TEST_USER_PASSWORD="password123"

# Linux/Mac
export TEST_USER_EMAIL="test@example.com"
export TEST_USER_PASSWORD="password123"
```

### 3. Seed Test Data (Optional)

```bash
npx tsx scripts/seed-test-data.ts
```

## Running Tests

### Run Full Test Suite

```bash
python scripts/test_app.py
```

### Run in Headless Mode

```bash
# Windows (PowerShell)
$env:HEADLESS="true"
python scripts/test_app.py

# Linux/Mac
HEADLESS=true python scripts/test_app.py
```

### Custom Base URL

```bash
# Windows (PowerShell)
$env:BASE_URL="http://localhost:3001"
python scripts/test_app.py

# Linux/Mac
BASE_URL=http://localhost:3001 python scripts/test_app.py
```

## Test Coverage

The automated test suite covers:

1. **Authentication** - Login flow
2. **Workspace Navigation** - Workspace selector
3. **Project Creation** - New project form
4. **Task Creation** - Task management
5. **Subtask Operations** - Subtask creation
6. **Chat Functionality** - Messaging
7. **Message Pinning** - Pin/unpin messages (Phase 2)
8. **Global Search** - Ctrl+K search palette
9. **File Upload** - File management (placeholder)
10. **Time Tracking** - Timesheet navigation

## Test Output

The script provides detailed output:

```
🧪 COLAB TASK MANAGER - AUTOMATED TEST SUITE
============================================================

📝 Test 1: User Authentication
✅ Login

📝 Test 2: Workspace Navigation
✅ Workspace Navigation

...

============================================================
📊 TEST SUMMARY
============================================================
✅ Passed: 8
❌ Failed: 0
📈 Success Rate: 100.0%
============================================================
```

## Troubleshooting

### ChromeDriver Issues

The script uses `webdriver-manager` to automatically download the correct ChromeDriver version. If you encounter issues:

```bash
pip install --upgrade webdriver-manager
```

### Element Not Found

If tests fail due to element not found:

- Ensure the app is running on the correct URL
- Check that the test user exists and has the correct credentials
- Verify the UI hasn't changed (selectors may need updating)

### Timeout Errors

Increase wait times in the script if your system is slow:

```python
self.driver.implicitly_wait(20)  # Increase from 10 to 20
self.wait = WebDriverWait(self.driver, 30)  # Increase from 15 to 30
```

## CI/CD Integration

### GitHub Actions Example

```yaml
name: E2E Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - uses: actions/setup-python@v4
        with:
          python-version: "3.10"

      - name: Install dependencies
        run: |
          npm install
          pip install -r scripts/requirements.txt

      - name: Start app
        run: npm run dev &

      - name: Wait for app
        run: npx wait-on http://localhost:3000

      - name: Run tests
        env:
          HEADLESS: true
          TEST_USER_EMAIL: ${{ secrets.TEST_USER_EMAIL }}
          TEST_USER_PASSWORD: ${{ secrets.TEST_USER_PASSWORD }}
        run: python scripts/test_app.py
```

## Extending Tests

To add new tests, create a new method in the `TestRunner` class:

```python
def test_my_feature(self):
    """Test XX: My Feature"""
    try:
        print("\n📝 Test XX: My Feature")
        # Your test code here
        self.log_test("My Feature", "PASS")
    except Exception as e:
        self.log_test("My Feature", "FAIL", str(e))
```

Then add it to `run_all_tests()`:

```python
def run_all_tests(self):
    # ... existing tests
    self.test_my_feature()
```
