import { createServer } from "http";
import { parse } from "url";
import next from "next";
import { Server } from "socket.io";

const dev = process.env.NODE_ENV !== "production";
const hostname = "localhost";
const port = parseInt(process.env.PORT || "3000", 10);

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const httpServer = createServer((req, res) => {
    const parsedUrl = parse(req.url!, true);
    handle(req, res, parsedUrl);
  });

  const io = new Server(httpServer, {
    cors: {
      origin: "*", // Adjust for production
      methods: ["GET", "POST"],
    },
  });

  io.on("connection", (socket) => {
    console.log("Client connected:", socket.id);

    socket.on("join-project", (projectId: string) => {
      socket.join(`project:${projectId}`);
      console.log(`Socket ${socket.id} joined project:${projectId}`);
    });

    socket.on("join-user", (userId: string) => {
      socket.join(`user:${userId}`);
      console.log(`Socket ${socket.id} joined user:${userId}`);
    });

    socket.on(
      "send-message",
      (data: {
        projectId?: string;
        receiverId?: string;
        content: string;
        senderId: string;
      }) => {
        if (data.projectId) {
          io.to(`project:${data.projectId}`).emit("new-message", data);
        } else if (data.receiverId) {
          io.to(`user:${data.receiverId}`).emit("new-message", data);
          io.to(`user:${data.senderId}`).emit("new-message", data);
        }
      },
    );

    socket.on(
      "task-update",
      (data: { projectId: string; taskId: string; type: string }) => {
        io.to(`project:${data.projectId}`).emit("task-updated", data);
      },
    );

    // Send notification to specific user
    socket.on(
      "send-notification",
      (data: { userId: string; notification: unknown }) => {
        io.to(`user:${data.userId}`).emit(
          "new-notification",
          data.notification,
        );
        console.log(`Notification sent to user:${data.userId}`);
      },
    );

    socket.on("disconnect", () => {
      console.log("Client disconnected:", socket.id);
    });
  });

  httpServer.listen(port, () => {
    console.log(`> Ready on http://${hostname}:${port}`);
  });
});
