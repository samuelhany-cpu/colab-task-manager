import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const messageSchema = z.object({
  content: z.string().min(1),
  projectId: z.string().optional(),
  receiverId: z.string().optional(),
});

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const projectId = searchParams.get("projectId");
  const receiverId = searchParams.get("receiverId");

  if (projectId) {
    const messages = await prisma.message.findMany({
      where: { projectId },
      include: { sender: { select: { id: true, name: true, image: true } } },
      orderBy: { createdAt: "asc" },
      take: 50,
    });
    return NextResponse.json(messages);
  }

  if (receiverId) {
    const currentUserId = (session.user as { id: string }).id;
    const messages = await prisma.message.findMany({
      where: {
        OR: [
          { senderId: currentUserId, receiverId },
          { senderId: receiverId, receiverId: currentUserId },
        ],
      },
      include: { sender: { select: { id: true, name: true, image: true } } },
      orderBy: { createdAt: "asc" },
      take: 50,
    });
    return NextResponse.json(messages);
  }

  return NextResponse.json({ error: "Context required" }, { status: 400 });
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const senderId = (session.user as { id: string }).id;

  try {
    const body = await req.json();
    const data = messageSchema.parse(body);

    const message = await prisma.message.create({
      data: {
        ...data,
        senderId,
      },
      include: { sender: { select: { id: true, name: true, image: true } } },
    });

    return NextResponse.json(message, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 },
    );
  }
}
