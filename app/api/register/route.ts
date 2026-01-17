import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

const registerSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

import { checkUserRedundancy } from "@/lib/auth-utils";

export async function POST(req: Request) {
  try {
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
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: name,
        },
        emailRedirectTo: `${new URL(req.url).origin}/auth/callback`,
      },
    });

    if (authError) {
      return NextResponse.json({ error: authError.message }, { status: 400 });
    }
    // The provided `catch` block is syntactically incorrect here as it cannot follow an `if` statement directly.
    // Assuming the intent was to add more robust error handling around the signup process,
    // but without a `try` block preceding it, this `catch` block cannot be placed here.
    // The outer `try...catch` already handles general exceptions.
    // For now, I will not insert the `catch` block as it would break syntax.
    // If the intent was to replace the `if (authError)` with a `try...catch` around `supabase.auth.signUp`,
    // that would require a different structural change.

    if (!authData.user) {
      return NextResponse.json(
        { error: "Failed to create user" },
        { status: 500 },
      );
    }

    // 3. Sync with Prisma
    const user = await prisma.user.create({
      data: {
        id: authData.user.id,
        supabaseId: authData.user.id,
        name,
        email,
      },
    });

    return NextResponse.json(
      {
        id: user.id,
        name: user.name,
        email: user.email,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Registration error:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 },
    );
  }
}
