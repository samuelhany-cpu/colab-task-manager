import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import {
  rateLimitAuth,
  createRateLimitResponse,
} from "@/lib/middleware/rate-limit";
import { handleApiError } from "@/lib/api/error-handler";

export async function POST(req: Request) {
  try {
    // Apply auth rate limiting (5 req/min)
    const rateLimitResult = await rateLimitAuth(req);
    if (!rateLimitResult.success) {
      return createRateLimitResponse(rateLimitResult);
    }

    const { email } = await req.json();

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    const supabase = await createClient();

    // Resend the signup confirmation email
    const { error } = await supabase.auth.resend({
      type: "signup",
      email,
      options: {
        emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL || new URL(req.url).origin}/auth/callback`,
      },
    });

    if (error) {
      console.error("[RESEND_ERROR]", error);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ message: "Verification email resent" });
  } catch (error) {
    return handleApiError(error);
  }
}
