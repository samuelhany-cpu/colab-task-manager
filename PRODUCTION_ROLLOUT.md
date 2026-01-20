# PRODUCTION ROLLOUT PLAN

## Safe Deployment Strategy for Security Hardening

**Project:** Collaborative Task Manager Security Hardening  
**Target:** Vercel Production + Supabase  
**Risk Level:** HIGH (Database-level changes)  
**Rollback Time:** <5 minutes

---

## EXECUTIVE SUMMARY

This rollout plan ensures zero-downtime deployment of security hardening measures across:

- Database (RLS policies)
- Application code (auth guards, validation)
- Infrastructure (rate limiting)

**Total Deployment Time:** 2-4 hours (during low-traffic window)

---

## PRE-DEPLOYMENT CHECKLIST

### Infrastructure

- [ ] Staging environment fully tested
- [ ] Production database backup created (automated + manual)
- [ ] Vercel production deployment tagged in git
- [ ] Supabase SQL scripts prepared and reviewed
- [ ] Rollback scripts ready

### Team Readiness

- [ ] On-call engineer assigned
- [ ] Customer support team notified of deployment
- [ ] Maintenance window communicated (if needed)
- [ ] Emergency contacts list updated

### Monitoring

- [ ] Error monitoring enabled (Sentry/LogRocket)
- [ ] Performance monitoring ready (Vercel Analytics)
- [ ] Database query monitoring active (Supabase Dashboard)
- [ ] Alert thresholds configured

### Testing

- [ ] All security tests passed in staging
- [ ] Load testing completed
- [ ] Rollback tested in staging
- [ ] User acceptance testing completed

---

## DEPLOYMENT PHASES

### PHASE 0: Preparation (30 minutes before)

**Actions:**

1. Create production database snapshot
2. Tag current production deployment
3. Notify team deployment is starting
4. Open monitoring dashboards

**Commands:**

```bash
# 1. Tag current production code
git tag pre-security-hardening-$(date +%Y%m%d)
git push origin --tags

# 2. Backup database (automatic via Supabase, verify)
# Check Supabase Dashboard > Database > Backups

# 3. Document current state
vercel env pull .env.production.backup
```

**Verification:**

- [ ] Backup verified in Supabase dashboard
- [ ] Git tag created
- [ ] Team notified

---

### PHASE 1: Database Security (RLS Policies) - 30 minutes

**CRITICAL:** This is the highest-risk phase. Application will still work after this phase, but direct database access will be restricted.

#### Step 1.1: Apply RLS Policies to Production

Open Supabase SQL Editor (Production) and execute:

```sql
-- IMPORTANT: Run in sections, verify each section

-- Section 1: Enable RLS on all tables (5 min)
ALTER TABLE "User" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Workspace" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "WorkspaceMember" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Project" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ProjectMember" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Task" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Subtask" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Comment" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Activity" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "TimeEntry" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Timer" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "File" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "FileVersion" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Folder" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Message" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "MessageRead" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Reaction" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Notification" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Tag" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Conversation" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ConversationMember" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Invitation" ENABLE ROW LEVEL SECURITY;

-- Verify RLS enabled
SELECT schemaname, tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public' AND rowsecurity = true;
-- Expected: All tables listed above
```

**⚠️ CHECKPOINT:** Verify application still works (limited functionality expected)

---

#### Step 1.2: Create RLS Policies (20 min)

Copy and execute policies from `supabase/rls-policies.sql` section by section:

```sql
-- Section 2: User policies
-- (Copy User policies from rls-policies.sql)

-- TEST: Verify User policies work
SELECT * FROM "User" WHERE "supabaseId" = auth.uid()::text;
-- Should return current user

-- Section 3: Workspace policies
-- (Copy Workspace policies)

-- TEST: Verify Workspace policies
SELECT * FROM "Workspace";
-- Should return only workspaces user is member of

-- Continue with remaining sections...
```

**After Each Section:**

- Test in application
- Check error logs
- Verify no 500 errors

---

#### Step 1.3: Create Performance Indexes (5 min)

```sql
-- Section 4: Performance indexes
-- (Copy index creation from rls-policies.sql)

-- Verify indexes created
SELECT schemaname, tablename, indexname
FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY tablename;
```

---

#### Phase 1 Verification

**Manual Tests:**

```bash
# Test 1: API still works
curl https://your-app.vercel.app/api/workspaces \
  -H "Authorization: Bearer <valid-token>"
# Expected: 200 OK, user's workspaces

# Test 2: Unauthorized access blocked
curl https://your-app.vercel.app/api/workspaces
# Expected: 401 Unauthorized
```

**Go/No-Go Decision:**

- [ ] Application loads without errors
- [ ] Users can log in
- [ ] Users see their workspaces
- [ ] No spike in error rate

**If ANY issues:** Execute [Rollback Plan](#rollback-plan) immediately

---

### PHASE 2: Application Code Deployment - 15 minutes

**Actions:**

1. Deploy updated code to Vercel
2. Monitor deployment
3. Verify functionality

#### Step 2.1: Deploy to Vercel

```bash
# Ensure you're on the security-hardening branch
git checkout security-hardening

# Deploy to production
vercel --prod

# Monitor deployment
vercel logs --follow
```

#### Step 2.2: Gradual Rollout (Optional)

If using Vercel's gradual deployment:

```bash
# Deploy to 10% of traffic first
vercel --prod --target=10

# Monitor for 10 minutes
# If stable, increase to 50%
vercel promote --target=50

# If still stable, promote to 100%
vercel promote --target=100
```

---

#### Phase 2 Verification

**Automated Tests:**

```bash
# Run post-deployment tests
npm run test:e2e:production

# Or manually:
node scripts/production-smoke-tests.js
```

**Manual Tests:**

1. Log in as test user
2. Create a workspace
3. Create a project
4. Create a task
5. Upload a file
6. Send a message
7. Verify rate limiting (send 31 messages quickly)

**Metrics to Watch:**

- Error rate (should be <0.1%)
- Response time (should be <500ms p95)
- 401/403 errors (some increase expected, should stabilize)

**Go/No-Go Decision:**

- [ ] All critical features working
- [ ] Error rate acceptable
- [ ] No user complaints
- [ ] Performance within SLA

---

### PHASE 3: Rate Limiting Activation - 10 minutes

**Actions:**

1. Verify rate limiting is working
2. Adjust limits if needed

#### Step 3.1: Test Rate Limits

```bash
# Test auth rate limit
for i in {1..6}; do
  curl -X POST https://your-app.vercel.app/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email":"test@example.com","password":"wrong"}'
done
# 6th request should be rate limited

# Test chat rate limit
# (Use authenticated user, send 31 messages)
```

#### Step 3.2: Monitor Rate Limit Hits

Check logs for rate limit events:

```bash
vercel logs --grep "Rate limit exceeded" | head -20
```

**Expected:** Few legitimate rate limit hits (<5% of requests)

---

#### Phase 3 Verification

**Metrics:**

- Rate limit hit rate: <5%
- False positives (legitimate users hit limit): <1%
- Attack traffic blocked: >95%

**Go/No-Go Decision:**

- [ ] Rate limits working
- [ ] Minimal false positives
- [ ] No user complaints

---

### PHASE 4: Storage Security - 10 minutes

**Actions:**

1. Apply Supabase Storage policies
2. Verify file uploads/downloads work

#### Step 4.1: Configure Storage Policies

In Supabase SQL Editor:

```sql
-- Enable RLS on storage.objects
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Apply storage policies
-- (Copy from SECURITY_IMPLEMENTATION.md Phase 4)
```

#### Step 4.2: Test File Operations

```bash
# Test file upload
curl -X POST https://your-app.vercel.app/api/files \
  -H "Authorization: Bearer <token>" \
  -F "file=@test.pdf" \
  -F "projectId=<project-id>"

# Test file download
curl -X GET https://your-app.vercel.app/api/files/<file-id>/download \
  -H "Authorization: Bearer <token>"
```

---

### PHASE 5: Monitoring & Validation - 30 minutes

**Actions:**

1. Monitor system for 30 minutes
2. Collect metrics
3. Verify security improvements

#### Step 5.1: Run Security Verification Suite

```bash
# Run automated security tests against production
npm run test:security:production

# Expected: All tests pass
```

#### Step 5.2: Check Metrics

**Dashboard Checklist:**

- [ ] Error rate: <0.1%
- [ ] 401 errors: Present but stable
- [ ] 403 errors: Present but low
- [ ] 429 errors: <5% of requests
- [ ] Response time: <500ms p95
- [ ] Database query time: <100ms p95

#### Step 5.3: User Validation

**Internal Testing:**

1. Have team members test all features
2. Report any issues immediately
3. Verify no critical features broken

**User Feedback:**

- Monitor support channels
- Check for spike in complaints
- Verify no authentication issues reported

---

## POST-DEPLOYMENT (24-48 hours)

### Hour 1-4: Intensive Monitoring

**Every 30 minutes:**

- Check error dashboard
- Review rate limit logs
- Monitor user activity
- Check for security events

### Hour 4-24: Active Monitoring

**Every 2 hours:**

- Review error logs
- Check performance metrics
- Verify no security incidents

### Hour 24-48: Normal Monitoring

**Daily:**

- Review security logs
- Check for anomalies
- Collect user feedback

---

## ROLLBACK PLAN

### Emergency Rollback (Execute if critical issues found)

**Time to Rollback:** <5 minutes

#### Option 1: Rollback Code Only (Least Disruptive)

```bash
# Revert to previous deployment
vercel rollback

# Verify rollback successful
curl https://your-app.vercel.app/api/health
```

**When to Use:** Application errors, but database is fine

---

#### Option 2: Disable RLS (More Disruptive)

**⚠️ Use only if application completely broken**

```sql
-- In Supabase SQL Editor
ALTER TABLE "User" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "Workspace" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "WorkspaceMember" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "Project" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "ProjectMember" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "Task" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "Subtask" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "Comment" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "Activity" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "TimeEntry" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "Timer" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "File" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "FileVersion" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "Folder" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "Message" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "MessageRead" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "Reaction" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "Notification" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "Tag" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "Conversation" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "ConversationMember" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "Invitation" DISABLE ROW LEVEL SECURITY;

-- Verify RLS disabled
SELECT schemaname, tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public';
-- Expected: All tables show rowsecurity = false
```

**When to Use:** RLS policies causing critical database issues

---

#### Option 3: Full Rollback (Nuclear Option)

**⚠️ Last resort only**

```bash
# 1. Rollback code
vercel rollback

# 2. Disable RLS (see Option 2)

# 3. Restore database snapshot (if corrupted)
# Contact Supabase support or use Point-in-Time Recovery
```

**When to Use:** Complete system failure, data corruption

---

### Rollback Communication

**Immediately notify:**

1. Development team
2. Customer support
3. Management
4. Users (if significant downtime)

**Message Template:**

```
We've rolled back a security update due to [specific issue].
- User data is safe
- Service is restored
- We're investigating the root cause
- Timeline for re-deployment: [estimate]
```

---

## SUCCESS CRITERIA

Deployment is considered successful when:

### Functional Requirements

- [x] All features working as before
- [x] No increase in error rate
- [x] Performance within SLA

### Security Requirements

- [x] RLS policies active and effective
- [x] Authorization guards working
- [x] Rate limiting functional
- [x] File security enforced

### User Experience

- [x] No user-reported issues
- [x] Login/signup working
- [x] All critical workflows functional

### Monitoring

- [x] Error rate <0.1%
- [x] Response time <500ms p95
- [x] No security incidents detected

---

## LESSONS LEARNED

After deployment, document:

### What Went Well

- [List successes]

### What Went Wrong

- [List issues encountered]

### Action Items

- [List improvements for next deployment]

---

## CONTACT INFORMATION

### Emergency Contacts

**Development Lead:** [Name] - [Phone] - [Email]  
**DevOps:** [Name] - [Phone] - [Email]  
**On-Call Engineer:** [Name] - [Phone] - [Email]

### Vendor Support

**Vercel Support:** support@vercel.com  
**Supabase Support:** support@supabase.io

---

## DEPLOYMENT TIMELINE TEMPLATE

| Time  | Phase            | Duration | Status | Notes          |
| ----- | ---------------- | -------- | ------ | -------------- |
| 14:00 | Preparation      | 30 min   | ⏳     | Backup created |
| 14:30 | RLS Policies     | 30 min   | ⏳     |                |
| 15:00 | Code Deploy      | 15 min   | ⏳     |                |
| 15:15 | Rate Limiting    | 10 min   | ⏳     |                |
| 15:25 | Storage Security | 10 min   | ⏳     |                |
| 15:35 | Validation       | 30 min   | ⏳     |                |
| 16:05 | Complete         | -        | ⏳     |                |

**Legend:**

- ⏳ Pending
- ✅ Complete
- ⚠️ Issues
- ❌ Failed

---

## SIGN-OFF

**Prepared by:** ****\*\*****\_****\*\***** Date: **\_\_\_**  
**Reviewed by:** ****\*\*****\_****\*\***** Date: **\_\_\_**  
**Approved by:** ****\*\*****\_****\*\***** Date: **\_\_\_**

**Deployment Executed by:** ****\*\*****\_****\*\***** Date: **\_\_\_**  
**Deployment Status:** [ ] Success [ ] Partial [ ] Rolled Back

**Final Notes:**

---

---

---
