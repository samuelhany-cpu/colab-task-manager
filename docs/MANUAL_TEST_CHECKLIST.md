# Manual Testing Checklist

Use this checklist to manually verify all features in the browser.

## Prerequisites

- ✅ Dev server running: `npm run dev`
- ✅ Browser open: `http://localhost:3000`
- ✅ Test user account created

---

## 1. Authentication ✓

- [ ] Navigate to `/login`
- [ ] Enter credentials and click "Sign In"
- [ ] Verify redirect to dashboard
- [ ] Check that user name appears in header

## 2. Workspace & Projects ✓

- [ ] Verify workspace selector is visible
- [ ] Click "New Project" button
- [ ] Fill form: Name = "Test Project", Description = "Testing"
- [ ] Submit and verify project appears in list
- [ ] Click on project to open it

## 3. Task Management ✓

- [ ] Click "New Task" button in project
- [ ] Fill: Title = "Test Task", Description = "Testing tasks"
- [ ] Set Priority to "HIGH"
- [ ] Submit and verify task appears in Kanban board
- [ ] Drag task from TODO to IN_PROGRESS column
- [ ] Verify task moved successfully

## 4. Subtasks ✓

- [ ] Click on a task to open modal
- [ ] In subtask input, type "Subtask 1" and press Enter
- [ ] Add another: "Subtask 2"
- [ ] Check one subtask as complete
- [ ] Verify progress bar updates
- [ ] Hover over subtask to see actions
- [ ] Click "Convert to Task" icon (↗️)
- [ ] Confirm and verify new task created

## 5. Chat & Messaging ✓

- [ ] Navigate to Chat section
- [ ] Select a project channel or DM
- [ ] Type message: "Test message" and send
- [ ] Verify message appears in chat
- [ ] Hover over message to see action buttons
- [ ] Click emoji button and add reaction 👍
- [ ] Verify reaction appears below message

## 6. Message Pinning (Phase 2) 📌

- [ ] Hover over a message
- [ ] Click the Pin icon (📌)
- [ ] Verify pin icon changes to PinOff
- [ ] Click again to unpin
- [ ] Verify message pin status toggles

## 7. Message Threading ✓

- [ ] Hover over a message
- [ ] Click Reply button
- [ ] Verify thread view opens
- [ ] Type reply message and send
- [ ] Click "Close Thread" to return
- [ ] Verify reply count shows on original message

## 8. Global Search (Ctrl+K) 🔍

- [ ] Press `Ctrl+K` anywhere in app
- [ ] Search modal should open
- [ ] Type "Test Task"
- [ ] Verify task appears in results
- [ ] Type "Test message"
- [ ] Verify message appears in results (Phase 2)
- [ ] Click a result to navigate
- [ ] Press Escape to close

## 9. File Management ✓

- [ ] Navigate to Files section
- [ ] Click "Upload" button
- [ ] Select a file (image, PDF, etc.)
- [ ] Verify file appears in list
- [ ] Click file to open preview
- [ ] For images: verify zoom works
- [ ] For videos: verify playback works

## 10. Time Tracking ✓

- [ ] Navigate to Timesheet
- [ ] Click "Add Entry" or timer icon
- [ ] Fill: Task, Hours, Note
- [ ] Toggle "Billable" checkbox
- [ ] Submit and verify entry appears
- [ ] Check that activity chart updates
- [ ] Click "Export" and select CSV
- [ ] Verify download starts

## 11. User Mentions ✓

- [ ] In chat or comment, type `@`
- [ ] Verify user list appears
- [ ] Select a user
- [ ] Send message
- [ ] Verify mention appears as badge
- [ ] Click mention badge
- [ ] Verify user profile modal opens

## 12. Real-time Features ✓

### Typing Indicators

- [ ] Open chat in two browser windows (or incognito)
- [ ] Start typing in one window
- [ ] Verify "User is typing..." appears in other window

### Live Updates

- [ ] Create a task in one window
- [ ] Verify it appears in other window (if same project)
- [ ] Send a chat message
- [ ] Verify it appears instantly in other window

---

## Test Summary

**Total Tests**: 12 categories
**Passed**: **\_** / 12
**Failed**: **\_** / 12

### Issues Found

1.
2.
3.

### Notes

-
-
-

---

## Quick Smoke Test (5 minutes)

If short on time, test these critical paths:

1. ✅ Login
2. ✅ Create Project
3. ✅ Create Task
4. ✅ Send Chat Message
5. ✅ Pin Message (Phase 2)
6. ✅ Global Search (Ctrl+K)
