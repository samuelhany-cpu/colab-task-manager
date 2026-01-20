# SECURITY VERIFICATION TEST SUITE

## Manual and Automated Testing for Security Hardening

**Purpose:** Verify all security controls are working correctly before production deployment.

---

## TABLE OF CONTENTS

1. [Authentication Tests](#authentication-tests)
2. [Authorization Tests](#authorization-tests)
3. [RLS Policy Tests](#rls-policy-tests)
4. [File Security Tests](#file-security-tests)
5. [Rate Limiting Tests](#rate-limiting-tests)
6. [Realtime Security Tests](#realtime-security-tests)
7. [Input Validation Tests](#input-validation-tests)
8. [DM Authorization Tests](#dm-authorization-tests)
9. [Automated Test Scripts](#automated-test-scripts)

---

## AUTHENTICATION TESTS

### Test 1.1: Unauthenticated Access Blocked

**Objective:** Verify all API routes reject unauthenticated requests.

```bash
# Test without auth token
curl -X GET http://localhost:3000/api/tasks?projectId=test-project-id

# Expected Response:
# Status: 401 Unauthorized
# Body: {"error": "Authentication required"}
```

**Pass Criteria:** All protected routes return 401

---

### Test 1.2: Invalid Token Rejected

```bash
# Test with invalid token
curl -X GET http://localhost:3000/api/tasks?projectId=test-project-id \
  -H "Authorization: Bearer invalid-token-12345"

# Expected Response:
# Status: 401 Unauthorized
```

**Pass Criteria:** Invalid tokens are rejected

---

### Test 1.3: Expired Token Rejected

```bash
# Create expired token (requires manual token generation)
# Use a token that expired >24 hours ago

curl -X GET http://localhost:3000/api/workspaces \
  -H "Authorization: Bearer <expired-token>"

# Expected Response:
# Status: 401 Unauthorized
# Body: {"error": "Token expired"}
```

**Pass Criteria:** Expired tokens trigger re-authentication

---

## AUTHORIZATION TESTS

### Test 2.1: Cross-Workspace Access Denied

**Setup:**

1. Create User A in Workspace 1
2. Create User B in Workspace 2
3. User A attempts to access Workspace 2 resources

```bash
# User A attempts to access Workspace 2 project
curl -X GET http://localhost:3000/api/projects?workspaceId=workspace-2-id \
  -H "Authorization: Bearer <user-a-token>"

# Expected Response:
# Status: 403 Forbidden
# Body: {"error": "Not a workspace member"}
```

**Pass Criteria:** Users cannot access resources outside their workspaces

---

### Test 2.2: Cross-Project Task Access Denied

**Setup:**

1. User is member of Project A
2. User attempts to access tasks from Project B

```bash
# Attempt to access task from different project
curl -X GET http://localhost:3000/api/tasks/task-from-project-b-id \
  -H "Authorization: Bearer <user-token>"

# Expected Response:
# Status: 403 Forbidden
# Body: {"error": "Not a project member"}
```

**Pass Criteria:** Users cannot access tasks from projects they're not members of

---

### Test 2.3: Non-Owner Cannot Delete Project

**Setup:**

1. User is MEMBER (not OWNER) of project
2. User attempts to delete project

```bash
curl -X DELETE http://localhost:3000/api/projects/project-id \
  -H "Authorization: Bearer <member-token>"

# Expected Response:
# Status: 403 Forbidden
# Body: {"error": "Project owner permission required"}
```

**Pass Criteria:** Only project owners can delete projects

---

## RLS POLICY TESTS

### Test 3.1: Direct Supabase Access Blocked

**Objective:** Verify RLS prevents unauthorized direct database access.

```javascript
// test-rls-direct.js
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
);

async function testRLS() {
  // Test 1: Unauthenticated access to User table
  const { data: users, error: userError } = await supabase
    .from("User")
    .select("*");

  console.log("Unauth User access:", { users, userError });
  // Expected: error or empty array

  // Test 2: Unauthenticated access to Workspace table
  const { data: workspaces, error: wsError } = await supabase
    .from("Workspace")
    .select("*");

  console.log("Unauth Workspace access:", { workspaces, wsError });
  // Expected: error or empty array

  // Test 3: Authenticated access to other user's notifications
  await supabase.auth.signInWithPassword({
    email: "user-a@example.com",
    password: "password123",
  });

  const { data: notifications } = await supabase
    .from("Notification")
    .select("*")
    .eq("userId", "different-user-id"); // Different user

  console.log("Other user notifications:", notifications);
  // Expected: empty array (RLS filters them out)
}

testRLS();
```

**Pass Criteria:**

- Unauthenticated queries return empty results or errors
- Authenticated users only see their own data

---

### Test 3.2: RLS Performance

**Objective:** Verify RLS policies don't cause performance degradation.

```sql
-- Run in Supabase SQL Editor

-- Test query performance with RLS
EXPLAIN ANALYZE
SELECT * FROM "Task"
WHERE "projectId" IN (
  SELECT "projectId" FROM "ProjectMember"
  WHERE "userId" = 'test-user-id'
);

-- Check execution time
-- Expected: < 100ms for datasets under 10,000 tasks
```

**Pass Criteria:** Queries complete in reasonable time (<100ms for typical datasets)

---

## FILE SECURITY TESTS

### Test 4.1: Cross-Project File Access Denied

**Setup:**

1. User A uploads file to Project 1
2. User B (not in Project 1) attempts to download file

```bash
# User B attempts to download file from Project 1
curl -X GET http://localhost:3000/api/files/file-id/download \
  -H "Authorization: Bearer <user-b-token>"

# Expected Response:
# Status: 403 Forbidden
# Body: {"error": "Not a project member"}
```

**Pass Criteria:** Users cannot download files from projects they're not members of

---

### Test 4.2: File Type Validation

```bash
# Attempt to upload executable file
curl -X POST http://localhost:3000/api/files \
  -H "Authorization: Bearer <user-token>" \
  -F "file=@malicious.exe" \
  -F "projectId=project-id"

# Expected Response:
# Status: 400 Bad Request
# Body: {"error": "Executable files are not allowed"}
```

**Pass Criteria:** Dangerous file types are rejected

---

### Test 4.3: File Size Limit

```bash
# Attempt to upload 100MB file (exceeds 50MB limit)
dd if=/dev/zero of=large-file.bin bs=1M count=100
curl -X POST http://localhost:3000/api/files \
  -H "Authorization: Bearer <user-token>" \
  -F "file=@large-file.bin" \
  -F "projectId=project-id"

# Expected Response:
# Status: 400 Bad Request
# Body: {"error": "File too large. Maximum size is 50MB"}
```

**Pass Criteria:** Files exceeding size limit are rejected

---

## RATE LIMITING TESTS

### Test 5.1: API Rate Limit

```bash
# Script to test rate limiting
for i in {1..101}; do
  curl -X GET http://localhost:3000/api/workspaces \
    -H "Authorization: Bearer <user-token>" \
    -w "\nStatus: %{http_code}\n"
  sleep 0.1
done

# Expected Results:
# Requests 1-100: Status 200
# Request 101: Status 429
# Response: {"error": "Too many requests", "retryAfter": "60"}
```

**Pass Criteria:** Rate limit triggers at configured threshold

---

### Test 5.2: Chat Rate Limit

```bash
# Send 31 messages rapidly
for i in {1..31}; do
  curl -X POST http://localhost:3000/api/chat \
    -H "Authorization: Bearer <user-token>" \
    -H "Content-Type: application/json" \
    -d "{\"content\": \"Test message $i\", \"workspaceId\": \"ws-id\"}" \
    -w "\nStatus: %{http_code}\n"
done

# Expected Results:
# Messages 1-30: Status 201
# Message 31: Status 429
```

**Pass Criteria:** Chat rate limit (30 messages/min) enforced

---

### Test 5.3: Upload Rate Limit

```bash
# Attempt 11 uploads in 1 minute
for i in {1..11}; do
  echo "test file $i" > test-file-$i.txt
  curl -X POST http://localhost:3000/api/files \
    -H "Authorization: Bearer <user-token>" \
    -F "file=@test-file-$i.txt" \
    -F "projectId=project-id" \
    -w "\nStatus: %{http_code}\n"
  sleep 1
done

# Expected Results:
# Uploads 1-10: Status 201
# Upload 11: Status 429
```

**Pass Criteria:** Upload rate limit (10/min) enforced

---

### Test 5.4: Rate Limit Headers

```bash
curl -v -X GET http://localhost:3000/api/workspaces \
  -H "Authorization: Bearer <user-token>"

# Expected Headers:
# X-RateLimit-Limit: 100
# X-RateLimit-Remaining: 99
# X-RateLimit-Reset: 1706745600000
```

**Pass Criteria:** Rate limit headers present in response

---

## REALTIME SECURITY TESTS

### Test 6.1: Unauthorized Channel Subscription

**Objective:** Verify users cannot subscribe to channels they don't have access to.

```javascript
// test-realtime-security.js
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(url, anonKey);

// Sign in as User A
await supabase.auth.signInWithPassword({
  email: "user-a@example.com",
  password: "password123",
});

// Attempt to subscribe to Project B (User A not a member)
const channel = supabase.channel("project:project-b-id");

channel.on("broadcast", { event: "task-updated" }, (payload) => {
  console.log("SECURITY BREACH: Received:", payload);
});

await channel.subscribe();

// Expected: Subscription denied or no messages received
```

**Pass Criteria:** Users cannot subscribe to channels for projects they're not members of

---

### Test 6.2: DM Channel Security

```javascript
// Attempt to subscribe to DM between two other users
const dmChannel = supabase.channel("dm:user-x-id-user-y-id");

dmChannel.on("broadcast", { event: "new-message" }, (payload) => {
  console.log("SECURITY BREACH: Intercepted DM:", payload);
});

await dmChannel.subscribe();

// Expected: Subscription denied
```

**Pass Criteria:** Users cannot subscribe to DM channels they're not part of

---

## INPUT VALIDATION TESTS

### Test 7.1: SQL Injection Prevention

```bash
# Attempt SQL injection in task title
curl -X POST http://localhost:3000/api/tasks \
  -H "Authorization: Bearer <user-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Test'; DROP TABLE Task; --",
    "projectId": "project-id"
  }'

# Expected Response:
# Status: 201 (task created safely)
# Title stored as literal string, SQL not executed
```

**Pass Criteria:** SQL injection attempts are safely escaped

---

### Test 7.2: XSS Prevention

```bash
# Attempt XSS in comment
curl -X POST http://localhost:3000/api/tasks/task-id/comments \
  -H "Authorization: Bearer <user-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "content": "<script>alert(\"XSS\")</script>",
    "taskId": "task-id"
  }'

# Expected Response:
# Status: 201
# Content stored safely, not executed in frontend
```

**Pass Criteria:** XSS payloads are sanitized or escaped

---

### Test 7.3: Invalid ID Format Rejected

```bash
# Test with invalid CUID format
curl -X GET http://localhost:3000/api/tasks/invalid-id-format \
  -H "Authorization: Bearer <user-token>"

# Expected Response:
# Status: 400 Bad Request
# Body: {"error": "Invalid ID format"}
```

**Pass Criteria:** Malformed IDs are rejected with 400

---

## DM AUTHORIZATION TESTS

### Test 8.1: DM Between Non-Shared Workspace Users

**Setup:**

1. User A in Workspace 1
2. User B in Workspace 2 (no shared workspace)
3. User A attempts to DM User B

```bash
curl -X POST http://localhost:3000/api/chat \
  -H "Authorization: Bearer <user-a-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "content": "Hello",
    "receiverId": "user-b-id"
  }'

# Expected Response:
# Status: 403 Forbidden
# Body: {"error": "Can only message users in shared workspaces"}
```

**Pass Criteria:** DMs only allowed between users who share at least one workspace

---

### Test 8.2: Read Others' DMs

**Setup:**

1. User A and User B have a DM conversation
2. User C attempts to read their messages

```bash
curl -X GET http://localhost:3000/api/chat?receiverId=user-b-id \
  -H "Authorization: Bearer <user-c-token>"

# Expected Response:
# Status: 403 Forbidden or empty array
```

**Pass Criteria:** Users cannot read DMs they're not part of

---

## AUTOMATED TEST SCRIPTS

### Automated Security Test Suite

Create `scripts/security-tests.ts`:

```typescript
import { expect, test, describe } from "@jest/globals";

describe("Security Tests", () => {
  test("Unauthenticated access returns 401", async () => {
    const response = await fetch("http://localhost:3000/api/tasks");
    expect(response.status).toBe(401);
  });

  test("Cross-workspace access returns 403", async () => {
    // Login as User A
    const tokenA = await loginUser("user-a@example.com", "password");

    // Attempt to access Workspace B
    const response = await fetch(
      "http://localhost:3000/api/projects?workspaceId=workspace-b-id",
      {
        headers: { Authorization: `Bearer ${tokenA}` },
      },
    );

    expect(response.status).toBe(403);
  });

  test("Rate limiting triggers at threshold", async () => {
    const token = await loginUser("test@example.com", "password");

    // Send 101 requests
    const requests = Array.from({ length: 101 }, (_, i) =>
      fetch("http://localhost:3000/api/workspaces", {
        headers: { Authorization: `Bearer ${token}` },
      }),
    );

    const responses = await Promise.all(requests);
    const rateLimited = responses.filter((r) => r.status === 429);

    expect(rateLimited.length).toBeGreaterThan(0);
  });

  test("File upload validates MIME type", async () => {
    const token = await loginUser("test@example.com", "password");

    const formData = new FormData();
    formData.append(
      "file",
      new Blob(["test"], { type: "application/x-executable" }),
    );
    formData.append("projectId", "project-id");

    const response = await fetch("http://localhost:3000/api/files", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    });

    expect(response.status).toBe(400);
  });
});
```

### Run Tests

```bash
# Install dependencies
npm install --save-dev @jest/globals

# Run security tests
npm test -- security-tests.ts

# Run with coverage
npm test -- --coverage security-tests.ts
```

---

## TEST RESULTS TEMPLATE

Document your test results:

```markdown
## Security Test Results - [Date]

### Environment: [Staging/Production]

### Tester: [Your Name]

| Test ID | Test Name                      | Status  | Notes                         |
| ------- | ------------------------------ | ------- | ----------------------------- |
| 1.1     | Unauthenticated Access Blocked | ✅ PASS | All routes return 401         |
| 1.2     | Invalid Token Rejected         | ✅ PASS |                               |
| 2.1     | Cross-Workspace Access Denied  | ✅ PASS |                               |
| 2.2     | Cross-Project Task Access      | ✅ PASS |                               |
| 3.1     | RLS Blocks Direct Access       | ✅ PASS | Verified with Supabase client |
| 4.1     | Cross-Project File Access      | ✅ PASS |                               |
| 5.1     | API Rate Limit                 | ✅ PASS | Triggered at 100 requests     |
| 5.2     | Chat Rate Limit                | ✅ PASS | Triggered at 30 messages      |
| 8.1     | DM Authorization               | ✅ PASS |                               |

### Summary

- **Total Tests:** 20
- **Passed:** 20
- **Failed:** 0
- **Overall Status:** ✅ READY FOR PRODUCTION

### Issues Found

None

### Recommendations

- Monitor rate limit triggers in production
- Set up alerts for repeated 403 errors
```

---

## CONTINUOUS TESTING

### CI/CD Integration

Add to `.github/workflows/security-tests.yml`:

```yaml
name: Security Tests

on: [push, pull_request]

jobs:
  security:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: "18"
      - run: npm ci
      - run: npm run test:security
      - name: Check for secrets
        run: |
          if git grep -E 'SUPABASE_SERVICE_ROLE_KEY|sk_live|sk_test'; then
            echo "Secrets found in code!"
            exit 1
          fi
```

---

## PRODUCTION MONITORING

After deployment, monitor:

1. **401/403 Error Rates** - Should be low (<1% of requests)
2. **429 Rate Limit Hits** - Track legitimate vs. attack traffic
3. **Failed Login Attempts** - Detect brute force attacks
4. **Unusual Query Patterns** - Detect scraping/enumeration

Use Vercel Analytics or Sentry for monitoring.

---

## NEXT STEPS

1. Complete all manual tests in staging
2. Document test results
3. Set up automated tests in CI/CD
4. Deploy to production
5. Monitor for 48 hours
6. Conduct post-deployment security review
