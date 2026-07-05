import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth/guards";
import { handleApiError } from "@/lib/api/error-handler";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  try {
    const user = await requireUser();
    const { searchParams } = new URL(req.url);

    const action = searchParams.get("action");
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = parseInt(searchParams.get("offset") || "0");

    const logs = await prisma.auditLog.findMany({
      where: {
        userId: user.id,
        ...(action ? { action } : {}),
      },
      orderBy: {
        createdAt: "desc",
      },
      take: limit,
      skip: offset,
      include: {
        user: {
          select: {
            name: true,
            email: true,
          },
        },
      },
    });

    const total = await prisma.auditLog.count({
      where: {
        userId: user.id,
        ...(action ? { action } : {}),
      },
    });

    return NextResponse.json({
      logs,
      pagination: {
        total,
        limit,
        offset,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
