# 🚀 Colab Task Manager

A modern, real-time collaborative task management platform built with Next.js 16, featuring workspace organization, kanban boards, time tracking, file sharing, and team chat.

![Next.js](https://img.shields.io/badge/Next.js-16.1-black?style=flat-square&logo=next.js)
![React](https://img.shields.io/badge/React-19.2-blue?style=flat-square&logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?style=flat-square&logo=typescript)
![Prisma](https://img.shields.io/badge/Prisma-6.1-teal?style=flat-square&logo=prisma)
![Socket.io](https://img.shields.io/badge/Socket.io-4.8-black?style=flat-square&logo=socket.io)

## ✨ Features

### 🏢 Workspace Management

- **Multi-workspace support** - Organize teams into separate workspaces
- **Role-based access control** - Owner and Member roles with different permissions
- **Workspace dashboard** - Real-time stats and activity feeds

### 📋 Project & Task Management

- **Kanban Board** - Drag-and-drop interface with TODO, IN PROGRESS, and DONE columns
- **Task Details** - Titles, descriptions, priorities (Low, Medium, High, Urgent), due dates
- **Task Assignment** - Assign tasks to team members
- **Real-time Updates** - Instant synchronization across all connected clients
- **Comments & Activity** - Collaborative discussions on tasks

### ⏱️ Time Tracking

- **Time Entries** - Log hours worked on tasks
- **Active Timers** - Start/stop timers with automatic duration calculation
- **Weekly View** - Visualize time entries in a weekly timesheet

### 📁 File Management

- **File Upload** - Attach files to projects and tasks
- **Cloudflare R2 Storage** - Scalable object storage integration
- **File Preview** - View and download uploaded files
- **File Organization** - Browse files by project

### 💬 Real-time Communication

- **Project Chat** - Channel-based messaging per project
- **Direct Messages** - Private conversations between team members
- **Real-time Notifications** - Instant alerts for assignments, mentions, and updates

### 🔐 Authentication & Security

- **NextAuth.js** - Secure authentication with email/password
- **Protected Routes** - Middleware-based route protection
- **Session Management** - Secure user sessions

## 🛠️ Tech Stack

### Frontend

- **Next.js 16** - React framework with App Router
- **React 19** - UI library with Server Components
- **TypeScript** - Type-safe development
- **Lucide React** - Beautiful icon library
- **CSS Modules** - Scoped styling

### Backend

- **Next.js API Routes** - RESTful API endpoints
- **Prisma ORM** - Type-safe database access
- **PostgreSQL** - Relational database
- **NextAuth.js** - Authentication solution

### Real-time

- **Socket.io** - WebSocket connections for real-time features
- **Custom Socket Server** - Node.js HTTP server with Socket.io integration

### Storage

- **Cloudflare R2** - S3-compatible object storage for files
- **AWS SDK v3** - S3 client for R2 integration

### Dev Tools

- **ESLint** - Code linting
- **Prettier** - Code formatting
- **Husky** - Git hooks
- **lint-staged** - Pre-commit linting

## 📦 Installation

### Prerequisites

- Node.js 20+
- PostgreSQL database
- Cloudflare R2 account (optional, for file storage)

### 1. Clone the repository

```bash
git clone https://github.com/yourusername/colab-task-manager.git
cd colab-task-manager
```

### 2. Install dependencies

```bash
npm install
```

### 3. Set up environment variables

Create a `.env` file in the root directory:

```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/colab_tasks?schema=public"

# NextAuth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret-key-here"

# Cloudflare R2 (Optional)
R2_ACCOUNT_ID="your-account-id"
R2_ACCESS_KEY_ID="your-access-key"
R2_SECRET_ACCESS_KEY="your-secret-key"
R2_BUCKET_NAME="your-bucket-name"

# Socket.io
NEXT_PUBLIC_SOCKET_URL="http://localhost:3000"
```

### 4. Set up the database

```bash
# Generate Prisma Client
npx prisma generate

# Run migrations
npx prisma migrate dev

# Seed the database (optional)
npx prisma db seed
```

### 5. Run the development server

```bash
npm run dev:socket
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## 🗂️ Project Structure

```
colab-task-manager/
├── app/
│   ├── (auth)/              # Authentication pages
│   ├── api/                 # API routes
│   ├── app/[slug]/          # Workspace pages
│   └── auth/                # Auth UI
├── components/
│   ├── board/               # Kanban board components
│   ├── chat/                # Chat components
│   ├── files/               # File management
│   ├── layout/              # Layout components
│   ├── notifications/       # Notification system
│   └── project/             # Project components
├── lib/
│   ├── auth.ts              # NextAuth configuration
│   ├── prisma.ts            # Prisma client
│   ├── r2.ts                # R2 storage client
│   └── socket-client.ts     # Socket.io client
├── prisma/
│   ├── schema.prisma        # Database schema
│   └── seed.ts              # Database seeding
├── server.ts                # Custom Socket.io server
└── middleware.ts            # Next.js middleware
```

## 🚀 Deployment

### Deploy to Render

This project includes a `render.yaml` configuration for easy deployment to Render.

1. Push your code to GitHub
2. Connect your repository to Render
3. Render will automatically detect the configuration
4. Set up your environment variables
5. Deploy!

### Environment Variables for Production

Make sure to set all required environment variables in your hosting platform:

- `DATABASE_URL` - PostgreSQL connection string
- `NEXTAUTH_URL` - Your production URL
- `NEXTAUTH_SECRET` - Strong random secret
- `R2_*` - Cloudflare R2 credentials
- `NEXT_PUBLIC_SOCKET_URL` - Your production URL

## 📝 Default Users (Seed Data)

After running `npx prisma db seed`, you can log in with:

**Email:** samuelhany500@gmail.com  
**Password:** password123

**Email:** sarah@example.com  
**Password:** password123

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License.

## 👨‍💻 Author

**Samuel Ehab**

- Email: samuelhany500@gmail.com
- GitHub: [@yourusername](https://github.com/yourusername)

## 🙏 Acknowledgments

- Next.js team for the amazing framework
- Prisma team for the excellent ORM
- Socket.io for real-time capabilities
- All contributors and users of this project

---

**Built with ❤️ using Next.js**
