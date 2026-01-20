# SECURITY AUDIT & THREAT MODEL

## Collaborative Task Manager - Production Hardening

**Date:** January 20, 2026  
**System:** Next.js App Router + Supabase + PostgreSQL + Prisma ORM  
**Environment:** Vercel Production

---

## EXECUTIVE SUMMARY

### Current Security Posture: **HIGH RISK**

**Critical Vulnerabilities Identified:**

1. ❌ **NO ROW LEVEL SECURITY (RLS)** - Database completely exposed via Supabase client
2. ❌ **Insufficient Authorization Checks** - Missing project/workspace membership validation in many routes
3. ❌ **DM Authorization Bypass** - No shared-workspace validation for DMs
4. ❌ **File Access Control Missing** - No cross-project file access prevention
5. ❌ **Realtime Channel Security Gaps** - Client can subscribe to arbitrary channels
6. ❌ **No Rate Limiting** - Open to spam/DOS attacks
7. ❌ **Weak Input Validation** - Some routes lack Zod validation
8. ❌ **Client-Controlled IDs** - APIs trust userId from body (though using getCurrentUser helps)

---

## THREAT MODEL

### System Architecture

```
┌──────────────────────────────────────────────────────────┐
│                      VERCEL EDGE                         │
│  ┌────────────┐         ┌──────────────┐                │
│  │  Next.js   │◄────────┤  Middleware  │                │
│  │ App Router │         │   (Auth)     │                │
│  └─────┬──────┘         └──────────────┘                │
│        │                                                  │
│        ▼                                                  │
│  ┌─────────────────────────────────────┐                │
│  │       API Routes (Server)           │                │
│  │  - /api/tasks                       │                │
│  │  - /api/messages (chat)             │                │
│  │  - /api/files                       │                │
│  │  - /api/projects                    │                │
│  └────┬───────────────┬────────────────┘                │
└───────┼───────────────┼─────────────────────────────────┘
        │               │
        ▼               ▼
┌───────────────┐  ┌─────────────────────────────┐
│   SUPABASE    │  │    SUPABASE STORAGE         │
│   PostgreSQL  │  │    (Files/Uploads)          │
│   + Auth      │  │                             │
│   + Realtime  │  │    Bucket: colab-task-mgr   │
└───────────────┘  └─────────────────────────────┘
```

### Data Flow Analysis

#### 1. Authentication Flow

```
Client → Supabase Auth → Cookie (JWT) → Next.js Middleware
                                              ↓
                                    getCurrentUser()
                                              ↓
                              Supabase User → Prisma User (via supabaseId)
```

**Threat:** Session hijacking, token replay  
**Mitigation:** HTTPS-only cookies, secure flags, refresh token rotation

---

#### 2. Authorization Flow (CURRENT - VULNERABLE)

```
API Route → getCurrentUser() → user.id
                                  ↓
                         Check membership? ❌ INCONSISTENT
                                  ↓
                           Direct DB query → Response
```

**Vulnerabilities:**

- **Missing workspace scope checks** in many routes
- **No project membership validation** for project-scoped resources
- **DM bypass:** Users can message anyone, even outside shared workspaces
- **Cross-workspace data leaks** possible via projectId manipulation

---

#### 3. Database Access (CURRENT - CRITICAL)

```
API Route → Prisma Client → PostgreSQL
                              ↓
                         NO RLS ENABLED ❌
                              ↓
                   Direct row access (DANGER)
```

**Critical Issue:** If Supabase client credentials leak or API bypassed, attacker has FULL DATABASE ACCESS.

---

#### 4. File Storage Flow (VULNERABLE)

```
Client → POST /api/files → Upload to Supabase Storage
                              ↓
                    Store metadata in File table
                              ↓
                    Generate signed URL (3600s)
```

**Vulnerabilities:**

- No MIME type validation
- No size limits enforced
- No cross-project access checks
- Signed URLs valid for 1 hour with no revocation
- Missing virus scanning

---

#### 5. Realtime (Chat) Flow (VULNERABLE)

```
Client → Subscribe to channel: "project:X"
                              ↓
                    NO SERVER VALIDATION ❌
                              ↓
                Receive all broadcasts for project X
```

**Vulnerabilities:**

- Client chooses channel name → can subscribe to ANY project
- No server-side authorization before subscription
- No broadcast verification (who sent the message?)

---

## HIGH-RISK ATTACK SURFACES

### 🔴 CRITICAL (Immediate Fix Required)

#### C1: Horizontal Privilege Escalation via Project Access

**Attack Vector:**

```javascript
// Attacker discovers projectId from URL or response
// Even though not a member, can access tasks
GET /api/tasks?projectId=cm_victim_project_123
```

**Current Defense:** ✅ Partial - Task GET checks ProjectMember  
**Gaps:** File download, notifications, time entries may lack checks

**Impact:** Read/modify tasks from any project  
**CVSS:** 9.1 (Critical)

---

#### C2: Database Exposure via RLS Bypass

**Attack Vector:**

```javascript
// If attacker obtains SUPABASE_ANON_KEY from client bundle
const supabase = createClient(URL, ANON_KEY);
await supabase.from("User").select("*"); // Returns ALL users
await supabase.from("Message").select("*"); // All messages
```

**Current Defense:** ❌ NONE - RLS is DISABLED  
**Impact:** Full database read/write access  
**CVSS:** 10.0 (Critical)

---

#### C3: Unauthorized DM Access

**Attack Vector:**

```javascript
// Attacker can read DMs with ANY user
GET /api/chat?receiverId=victim_user_id
// No check if both users share a workspace
```

**Current Defense:** ❌ NONE  
**Impact:** Read private messages from any user  
**CVSS:** 8.5 (High)

---

#### C4: Realtime Channel Hijacking

**Attack Vector:**

```javascript
// Client subscribes to any project channel
const channel = supabase.channel("project:victim_project_id");
channel.on("broadcast", { event: "task-updated" }, (msg) => {
  console.log("Victim task update:", msg);
});
```

**Current Defense:** ❌ NONE  
**Impact:** Monitor all project activity in real-time  
**CVSS:** 7.8 (High)

---

### 🟠 HIGH (Fix Before Production)

#### H1: File Access Control Bypass

**Attack Vector:**

```javascript
// Discover file key from network tab or enumerate
const url = await getDownloadUrl("2025-01-secret-file.pdf");
// No check if user has access to file's project
```

**Current Defense:** ⚠️ Partial - API checks project, but direct Supabase Storage access bypasses  
**Impact:** Download files from any project  
**CVSS:** 7.5 (High)

---

#### H2: No Rate Limiting

**Attack Vector:**

```python
# Spam API with requests
for i in range(10000):
    requests.post('/api/chat', json={'content': 'spam', 'workspaceId': '...'})
```

**Current Defense:** ❌ NONE  
**Impact:** DOS, database overload, cost explosion  
**CVSS:** 6.5 (Medium)

---

#### H3: Workspace Invitation Token Enumeration

**Attack Vector:**

```javascript
// Brute force invitation tokens (CUID format, ~25 chars)
// Or discover leaked tokens from email forwarding
GET /api/invite/cl9abc123xyz...
```

**Current Defense:** ⚠️ Partial - Token is unique but not cryptographically secure  
**Impact:** Join any workspace without invitation  
**CVSS:** 6.8 (Medium)

---

## SECURITY REQUIREMENTS (CIA Triad)

### Confidentiality ❌ FAILING

- [ ] Users can only see workspaces they're members of
- [ ] Projects visible only to project members
- [ ] Tasks/files/messages scoped to project membership
- [ ] DMs only between users who share a workspace
- [ ] Notifications only visible to owner

### Integrity ⚠️ PARTIAL

- [x] Authentication via Supabase (good)
- [ ] Authorization checks inconsistent
- [ ] No audit trail for sensitive operations
- [ ] File integrity not validated

### Availability ❌ FAILING

- [ ] No rate limiting
- [ ] No DOS protection
- [ ] No graceful error handling

---

## COMPLIANCE & REGULATORY CONCERNS

### GDPR (EU Data Protection)

- ❌ **Data minimization:** Storing unnecessary metadata
- ❌ **Access control:** Users can potentially access data they shouldn't
- ⚠️ **Right to erasure:** No cascade delete audit
- ❌ **Data breach notification:** No logging/monitoring for unauthorized access

### SOC 2 (Security Controls)

- ❌ **CC6.1 - Logical Access:** Insufficient authorization
- ❌ **CC6.6 - Access Restriction:** No RLS
- ❌ **CC7.2 - Monitoring:** No audit logs

---

## RECOMMENDED SECURITY CONTROLS

### Immediate (P0)

1. ✅ **Enable RLS on all tables**
2. ✅ **Create RLS policies for every model**
3. ✅ **Implement `requireUser()` helper**
4. ✅ **Add workspace/project membership guards**
5. ✅ **Validate DM authorization (shared workspace)**

### Pre-Production (P1)

6. ✅ **Add rate limiting middleware**
7. ✅ **Harden file upload validation**
8. ✅ **Secure realtime channel subscriptions**
9. ✅ **Add Zod validation to all routes**
10. ✅ **Implement CSRF protection**

### Production (P2)

11. ⚠️ **Add audit logging**
12. ⚠️ **Implement anomaly detection**
13. ⚠️ **Add security headers**
14. ⚠️ **Secret rotation strategy**

---

## NEXT STEPS

See `SECURITY_IMPLEMENTATION.md` for:

- Exact SQL for RLS policies
- Auth helper implementations
- API route hardening code
- Verification test cases
- Production rollout plan

**Estimated Implementation Time:** 16-24 hours  
**Risk Reduction:** 90%+ (High → Low)
