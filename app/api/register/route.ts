import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";
import {
  rateLimitAuth,
  createRateLimitResponse,
} from "@/lib/middleware/rate-limit";
import { handleApiError } from "@/lib/api/error-handler";

const BLOCKED_DOMAINS = [
  "example.com",
  "test.com",
  "mailinator.com",
  "yopmail.com",
  "temp-mail.org",
  "tempmail.com",
  "guerrillamail.com",
];

const isBlockedDomain = (email: string) => {
  const domain = email.split("@")[1]?.toLowerCase();
  return BLOCKED_DOMAINS.includes(domain);
};

const registerSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z
    .string()
    .email("Invalid email address")
    .refine((email) => !isBlockedDomain(email), {
      message:
        "This email domain is not allowed. Please use a valid, non-disposable email address.",
    }),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

import { checkUserRedundancy } from "@/lib/auth-utils";

export async function POST(req: Request) {
  try {
    // Apply auth rate limiting (5 req/min)
    const rateLimitResult = await rateLimitAuth(req);
    if (!rateLimitResult.success) {
      return createRateLimitResponse(rateLimitResult);
    }

    const body = await req.json();
    const { name, email, password } = registerSchema.parse(body);

    const supabase = await createClient();

    // 1. Handle Redundancy: Check if user already exists
    const { exists } = await checkUserRedundancy(email);

    if (exists) {
      return NextResponse.json(
        { error: "User already registered. Please sign in." },
        { status: 400 },
      );
    }

    // 2. Sign up user in Supabase
    console.log(`[API/Register] Signing up user in Supabase: ${email}`);
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: name,
        },
        emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL || new URL(req.url).origin}/auth/callback`,
      },
    });

    if (authError) {
      console.error(
        `[API/Register] Supabase signup error: ${authError.message}`,
      );
      return NextResponse.json({ error: authError.message }, { status: 400 });
    }

    if (!authData.user) {
      return NextResponse.json(
        { error: "Failed to create user" },
        { status: 500 },
      );
    }

    // 3. Sync with Prisma
    console.log(
      `[API/Register] Syncing with Prisma for user: ${authData.user.id}`,
    );
    const user = await prisma.user.create({
      data: {
        id: authData.user.id,
        supabaseId: authData.user.id,
        name,
        email,
      },
    });

    console.log(`[API/Register] Registration successful for: ${email}`);

    return NextResponse.json(
      {
        id: user.id,
        name: user.name,
        email: user.email,
      },
      { status: 201 },
    );
  } catch (error) {
    return handleApiError(error);
  }
}
