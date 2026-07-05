import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth/guards";
import { handleApiError } from "@/lib/api/error-handler";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const user = await requireUser();

    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        twoFactorEnabled: true,
        integrations: {
          select: {
            type: true,
            externalId: true,
          },
        },
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!dbUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json(dbUser);
  } catch (error) {
    return handleApiError(error);
  }
}
