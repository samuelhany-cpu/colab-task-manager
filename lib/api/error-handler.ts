/**
 * Centralized API Error Handler
 *
 * Provides consistent error responses across all API routes.
 * Prevents leaking sensitive information in error messages.
 */

import { NextResponse } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import {
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
} from "@/lib/auth/guards";

/**
 * Handle all API errors with appropriate status codes and safe messages
 */
export function handleApiError(error: unknown): NextResponse {
  // Log full error for debugging (but don't expose to client)
  console.error("[API Error]", error);

  // Zod validation errors (400)
  if (error instanceof z.ZodError) {
    return NextResponse.json(
      {
        error: "Validation failed",
        details: error.issues.map((issue) => ({
          path: issue.path.join("."),
          message: issue.message,
        })),
      },
      { status: 400 },
    );
  }

  // Authentication errors (401)
  if (error instanceof UnauthorizedError) {
    return NextResponse.json({ error: error.message }, { status: 401 });
  }

  // Authorization errors (403)
  if (error instanceof ForbiddenError) {
    return NextResponse.json({ error: error.message }, { status: 403 });
  }

  // Not found errors (404)
  if (error instanceof NotFoundError) {
    return NextResponse.json({ error: error.message }, { status: 404 });
  }

  // Prisma errors
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    // Unique constraint violation (409)
    if (error.code === "P2002") {
      return NextResponse.json(
        { error: "A record with this value already exists" },
        { status: 409 },
      );
    }

    // Record not found (404)
    if (error.code === "P2025") {
      return NextResponse.json({ error: "Record not found" }, { status: 404 });
    }

    // Foreign key constraint (400)
    if (error.code === "P2003") {
      return NextResponse.json(
        { error: "Invalid reference to related record" },
        { status: 400 },
      );
    }

    // Generic Prisma error (don't leak details)
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }

  // Prisma validation errors (400)
  if (error instanceof Prisma.PrismaClientValidationError) {
    return NextResponse.json({ error: "Invalid data format" }, { status: 400 });
  }

  // Generic Error object
  if (error instanceof Error) {
    // Check for specific error messages that should be exposed
    if (error.message.includes("not found")) {
      return NextResponse.json(
        { error: "Resource not found" },
        { status: 404 },
      );
    }

    // Don't expose generic error messages
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }

  // Unknown error type
  return NextResponse.json({ error: "Internal server error" }, { status: 500 });
}

/**
 * Create a standardized success response
 */
export function createSuccessResponse<T>(
  data: T,
  status: number = 200,
): NextResponse {
  return NextResponse.json(data, { status });
}

/**
 * Create a standardized error response
 */
export function createErrorResponse(
  message: string,
  status: number = 400,
): NextResponse {
  return NextResponse.json({ error: message }, { status });
}
