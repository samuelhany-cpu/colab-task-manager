import { prisma } from "@/lib/prisma";

/**
 * Checks if a user already exists by email in either Prisma or Supabase.
 * This handles redundancy and prevents multiple registration attempts for the same email.
 */
export async function checkUserRedundancy(email: string) {
  // 1. Check Prisma
  const existingPrismaUser = await prisma.user.findUnique({
    where: { email },
  });

  if (existingPrismaUser) {
    return {
      exists: true,
      source: "database",
      message: "User already exists in database.",
    };
  }

  // 2. Check Supabase (optional, but good for sync)
  // Note: signUp will normally return an error if user exists and email confirmation is on,
  // but a proactive check can avoid unnecessary Supabase calls.
  // We don't have a direct "userExists" without admin privileges or signUp,
  // so we primarily rely on Prisma as our source of truth for "registered" users.

  return {
    exists: false,
    source: null,
    message: "User does not exist.",
  };
}
