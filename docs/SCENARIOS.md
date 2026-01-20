# Colab Task Manager - Test Scenarios

This document outlines the end-to-end test scenarios for the Colab Task Manager, covering all features implemented in Phase 1 and Phase 2.

## 1. Authentication & Onboarding

- **Signup**: Register a new user with valid/invalid data.
- **Login**: Authenticate existing user; test incorrect credentials.
- **Password Reset**: Request reset email, follow link, and change password.
- **Workspace Onboarding**: Create a first workspace or join an existing one via invite.

## 2. Workspace & Project Management

- **Workflow Navigation**: Switch between different workspaces.
- **Project Creation**: Create a new project within a workspace.
- **Project Archiving**: Archive an active project and verify it moves to the archive.
- **Member Invitations**: Invite a user to a workspace and verify roles (Owner/Member).

## 3. Task Management (Kanban & List)

- **Task Creation**: Create tasks with title, description, priority, and due date.
- **Kanban Interactivity**: Drag and drop tasks between columns (TODO, IN PROGRESS, DONE).
- **Task Detail Editing**: Update task metadata and verify changes persist.
- **Filtering**: Filter tasks by Tag and Assignee.

## 4. Subtasks & Checklists

- **Adding Subtasks**: Create multiple subtasks for a task.
- **Toggle Completion**: Mark subtasks as complete/incomplete and verify the progress bar.
- **Reordering**: Drag and drop subtasks to reorder.
- **Promotion**: Promote a subtask to a full task and verify the original is deleted.

## 5. Time Tracking & Reporting

- **Timer**: Start timer on a task, verify real-time update, and stop timer.
- **Manual Entry**: Add a time entry manually with a note and "Billable" toggle.
- **Reporting**: View the activity chart on the Timesheet page.
- **Export**: Generate and download CSV and PDF reports.

## 6. Real-time Collaboration (Chat)

- **Messaging**: Send messages in project channels and DMs.
- **Mentions**: @mention a user in a comment/chat and verify they receive a notification.
- **Reactions**: Add/remove emoji reactions to messages.
- **Editing/Deletion**: Edit a message content and delete a message.
- **Typing Indicators**: Verify "User is typing..." appears for other users.
- **Threaded Replies**: Start a thread and reply to a message.

## 7. File Management

- **Upload**: Upload various file types (Images, PDF, Video, Audio).
- **Preview**: Open the preview modal; test video playback and image zoom.
- **Versioning**: Upload a new version of an existing file.
- **Restore**: Restore a file to a previous version from the history.
- **Movement**: Move a file from one folder/project to another.

## 8. Global Search

- **Command Palette**: Press `Ctrl+K` to open search.
- **Search Scope**: Search for Tasks, Projects, and Files.
- **Navigation**: Use keyboard to select a result and navigate to that page.
