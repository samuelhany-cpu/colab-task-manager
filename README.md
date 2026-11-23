# Colab Task Manager

A collaborative workspace and task management application built with **Next.js**, **TypeScript**, **Prisma**, and **PostgreSQL**.

> **Project status:** Portfolio/prototype code. Review and harden authentication, authorization, and real-time messaging before exposing it to public users. In particular, the current [Socket.IO server](server.ts) accepts client-supplied room identifiers and events without a verified per-connection identity/room membership check; it is **not production-ready**.

## Engineering overview

| Area | Source | Why it matters |
| --- | --- | --- |
| Workspace/project/task data model | [Prisma schema](prisma/schema.prisma) | Relational modeling, memberships and task lifecycle |
| API routes | [app/api](app/api) | Full-stack server-side request handling |
| Supabase session integration | [lib/supabase](lib/supabase) | Session utilities and middleware integration |
| Real-time experiment | [server.ts](server.ts), [socket client](lib/socket-client.ts) | Socket.IO room and event delivery (requires authorization hardening) |
| Shared UI | [components](components) | Kanban, project, chat and related user interfaces |
| Deployment configuration | [render.yaml](render.yaml) | Example deployment descriptor; **not** proof that all features are securely deployable |

### Features represented in the repository

- Workspace, project and task management, including Kanban-style UI
- Membership and role data in PostgreSQL
- Comments, collaboration and notification code paths
- Time tracking and file storage integration modules
- Socket.IO-based real-time messaging prototype

Feature descriptions refer to repository code, not independently verified production behavior.

## Tech stack

- **Application:** Next.js, React, TypeScript
- **Backend/data:** Next.js API routes, Prisma, PostgreSQL
- **Auth/session utilities:** Supabase (see `lib/supabase`)
- **Real-time:** Socket.IO (prototype; authorization work required)
- **Object storage:** S3-compatible storage via AWS SDK / R2 integration

## Local setup

Requirements: Node.js 20+, PostgreSQL, npm.

```bash
git clone https://github.com/samuelhany-cpu/colab-task-manager.git
cd colab-task-manager
npm ci
```

1. Copy `.env.example` to `.env` and fill in **your own local** database, Supabase, and optional storage settings. Never commit secrets.
2. Configure `DATABASE_URL` and `DIRECT_URL` for Prisma as required by [schema.prisma](prisma/schema.prisma).
3. Generate the Prisma client and apply the project's migrations to a **disposable development database**:

```bash
npx prisma generate
npx prisma migrate dev
npm run dev
```

Open `http://localhost:3000`. The `npm run dev` command starts Next.js; it does **not** start the custom Socket.IO server. The code in [server.ts](server.ts) is a separate prototype and needs an authorization review before being exposed to untrusted clients. Do not assume the example Render configuration runs that custom server.

### Demo seed — destructive, opt-in only

[The seed script](prisma/seed.ts) uses `deleteMany()` across multiple tables before recreating demo workspaces, users and tasks. **Never run it on a database containing valuable data.** It now refuses to run unless explicitly enabled and requires a unique demo-only password supplied at runtime.

For a disposable local database, set `ALLOW_DESTRUCTIVE_SEED=true` and `DEMO_SEED_PASSWORD` (12+ characters), then run:

```bash
npm run db:seed:demo
```

On Windows PowerShell, set the two environment variables in the shell session before running that command. Demo accounts are defined in `prisma/seed.ts`; don't reuse their credentials for real services.

## Before a production deployment

- Authenticate Socket.IO connections and authorize room joins and events against actual workspace/project membership.
- Restrict allowed Socket.IO origins and validate incoming event payloads.
- Verify auth/session and authorization checks on every API route.
- Use migrations/backups and separate dev/prod databases; do **not** run demo seed in production.
- Test complete user flows, real-time behavior, deployment configuration and error handling.

## Repository ownership

This is a portfolio project. For backend-oriented hiring reviews, start with [the schema](prisma/schema.prisma), [API routes](app/api), and [the real-time server](server.ts), including its current limitations.
