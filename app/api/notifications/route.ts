import { getCurrentUser } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma, NotificationType } from "@prisma/client";
import {
  rateLimit,
  createRateLimitResponse,
} from "@/lib/middleware/rate-limit";
import { handleApiError } from "@/lib/api/error-handler";

// GET /api/notifications - Fetch user notifications
export async function GET(req: Request) {
  try {
    // Apply rate limiting
    const rateLimitResult = await rateLimit(req);
    if (!rateLimitResult.success) {
      return createRateLimitResponse(rateLimitResult);
    }

    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const filter = searchParams.get("filter"); // 'all', 'unread', or specific type
    const limit = parseInt(searchParams.get("limit") || "50");

    const where: Prisma.NotificationWhereInput = { userId: user.id };

    if (filter === "unread") {
      where.read = false;
    } else if (filter && filter !== "all") {
      where.type = filter as NotificationType;
    }

    const notifications = await prisma.notification.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit,
    });

    const unreadCount = await prisma.notification.count({
      where: { userId: user.id, read: false },
    });

    return NextResponse.json({ notifications, unreadCount });
  } catch (error) {
    return handleApiError(error);
  }
}

// POST /api/notifications - Create notification (internal/testing)
export async function POST(req: Request) {
  try {
    // Apply rate limiting
    const rateLimitResult = await rateLimit(req);
    if (!rateLimitResult.success) {
      return createRateLimitResponse(rateLimitResult);
    }

    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { type, content, link, userId } = body;

    if (!type || !content || !userId) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    }

    const notification = await prisma.notification.create({
      data: {
        type,
        content,
        link,
        userId,
      },
    });

    return NextResponse.json(notification, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
