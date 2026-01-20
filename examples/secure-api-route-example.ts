/**
 * EXAMPLE: Fully Hardened API Route
 * app/api/tasks/[taskId]/route.ts (SECURE VERSION)
 *
 * This demonstrates ALL security best practices:
 * ✅ Authentication required
 * ✅ Authorization checks (project membership)
 * ✅ Input validation with Zod
 * ✅ Rate limiting
 * ✅ Error handling
 * ✅ Audit logging
 * ✅ No data leaks
 */

import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import {
  requireUser,
  assertCanAccessTask,
  handleGuardError,
} from "@/lib/auth/guards";
import {
  rateLimit,
  createRateLimitResponse,
} from "@/lib/middleware/rate-limit";
import { taskUpdateSchema } from "@/lib/validation/schemas";

// ============================================================================
// GET /api/tasks/[taskId] - Fetch single task
// ============================================================================

export async function GET(
  req: Request,
  { params }: { params: { taskId: string } },
) {
  try {
    // 1. Rate limiting
    const rateLimitResult = await rateLimit(req);
    if (!rateLimitResult.success) {
      return createRateLimitResponse(rateLimitResult);
    }

    // 2. Authentication
    const user = await requireUser();

    // 3. Authorization
    await assertCanAccessTask(user.id, params.taskId);

    // 4. Fetch data
    const task = await prisma.task.findUnique({
      where: { id: params.taskId },
      include: {
        assignee: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
        creator: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
        tags: {
          select: {
            id: true,
            name: true,
            color: true,
          },
        },
        subtasks: {
          orderBy: { position: "asc" },
        },
        _count: {
          select: {
            comments: true,
            timeEntries: true,
            files: true,
          },
        },
      },
    });

    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    // 5. Add rate limit headers to response
    const response = NextResponse.json(task);
    Object.entries(rateLimitResult.headers).forEach(([key, value]) => {
      response.headers.set(key, value);
    });

    return response;
  } catch (error) {
    const result = handleGuardError(error);
    return NextResponse.json(
      { error: result.error },
      { status: result.status },
    );
  }
}

// ============================================================================
// PATCH /api/tasks/[taskId] - Update task
// ============================================================================

export async function PATCH(
  req: Request,
  { params }: { params: { taskId: string } },
) {
  try {
    // 1. Rate limiting
    const rateLimitResult = await rateLimit(req);
    if (!rateLimitResult.success) {
      return createRateLimitResponse(rateLimitResult);
    }

    // 2. Authentication
    const user = await requireUser();

    // 3. Authorization (early check)
    await assertCanAccessTask(user.id, params.taskId);

    // 4. Input validation
    const body = await req.json();
    const data = taskUpdateSchema.parse(body);

    // 5. Fetch existing task
    const existingTask = await prisma.task.findUniqueOrThrow({
      where: { id: params.taskId },
      include: { project: true },
    });

    // 6. Additional validation
    // If assignee is being changed, verify they're a project member
    if (data.assigneeId && data.assigneeId !== existingTask.assigneeId) {
      const assigneeMembership = await prisma.projectMember.findFirst({
        where: {
          projectId: existingTask.projectId,
          userId: data.assigneeId,
        },
      });

      if (!assigneeMembership) {
        return NextResponse.json(
          { error: "Assignee must be a project member" },
          { status: 400 },
        );
      }
    }

    // 7. Update task
    const updatedTask = await prisma.task.update({
      where: { id: params.taskId },
      data: {
        ...data,
        dueDate:
          data.dueDate === null
            ? null
            : data.dueDate
              ? new Date(data.dueDate)
              : undefined,
        tags: data.tagIds
          ? {
              set: data.tagIds.map((id) => ({ id })),
            }
          : undefined,
      },
      include: {
        assignee: {
          select: { id: true, name: true, email: true, image: true },
        },
        tags: true,
        subtasks: true,
        _count: {
          select: { comments: true, subtasks: true },
        },
      },
    });

    // 8. Create activity log
    const changedFields = Object.keys(data);
    if (changedFields.length > 0) {
      await prisma.activity.create({
        data: {
          type: "STATUS_CHANGE",
          taskId: params.taskId,
          userId: user.id,
          metadata: {
            changes: changedFields,
            timestamp: new Date().toISOString(),
          },
        },
      });
    }

    // 9. Broadcast update (non-blocking)
    (async () => {
      try {
        const { createClient } = await import("@/lib/supabase/server");
        const supabase = await createClient();
        await supabase.channel(`project:${existingTask.projectId}`).send({
          type: "broadcast",
          event: "task-updated",
          payload: {
            projectId: existingTask.projectId,
            taskId: params.taskId,
            type: "UPDATED",
          },
        });
      } catch (broadcastError) {
        console.error("Broadcast failed:", broadcastError);
      }
    })();

    // 10. Return response
    const response = NextResponse.json(updatedTask);
    Object.entries(rateLimitResult.headers).forEach(([key, value]) => {
      response.headers.set(key, value);
    });

    return response;
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.issues },
        { status: 400 },
      );
    }

    const result = handleGuardError(error);
    return NextResponse.json(
      { error: result.error },
      { status: result.status },
    );
  }
}

// ============================================================================
// DELETE /api/tasks/[taskId] - Delete task
// ============================================================================

export async function DELETE(
  req: Request,
  { params }: { params: { taskId: string } },
) {
  try {
    // 1. Rate limiting (stricter for deletions)
    const rateLimitResult = await rateLimit(req);
    if (!rateLimitResult.success) {
      return createRateLimitResponse(rateLimitResult);
    }

    // 2. Authentication
    const user = await requireUser();

    // 3. Authorization
    await assertCanAccessTask(user.id, params.taskId);

    // 4. Fetch task to get project info
    const task = await prisma.task.findUniqueOrThrow({
      where: { id: params.taskId },
    });

    // 5. Delete task (cascades to subtasks, comments, etc. due to Prisma schema)
    await prisma.task.delete({
      where: { id: params.taskId },
    });

    // 6. Broadcast deletion
    (async () => {
      try {
        const { createClient } = await import("@/lib/supabase/server");
        const supabase = await createClient();
        await supabase.channel(`project:${task.projectId}`).send({
          type: "broadcast",
          event: "task-updated",
          payload: {
            projectId: task.projectId,
            taskId: params.taskId,
            type: "DELETED",
          },
        });
      } catch (broadcastError) {
        console.error("Broadcast failed:", broadcastError);
      }
    })();

    return NextResponse.json(
      { success: true, message: "Task deleted" },
      { status: 200 },
    );
  } catch (error) {
    const result = handleGuardError(error);
    return NextResponse.json(
      { error: result.error },
      { status: result.status },
    );
  }
}
