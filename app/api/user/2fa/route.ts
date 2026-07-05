import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth/guards";
import { handleApiError } from "@/lib/api/error-handler";
import { withRateLimit } from "@/lib/middleware/rate-limit";
import {
  generateTOTPSecret,
  generateTOTPUri,
  generateQRCode,
  verifyTOTPToken,
  generateRecoveryCodes,
} from "@/lib/auth/2fa";
import { NextResponse } from "next/server";
import { z } from "zod";

/**
 * GET: Generate TOTP Secret and QR Code for setup
 */
export const GET = withRateLimit(
  async () => {
    try {
      const user = await requireUser();

      // Check if 2FA is already enabled
      const dbUser = await prisma.user.findUnique({
        where: { id: user.id },
        select: { twoFactorEnabled: true, email: true },
      });

      if (dbUser?.twoFactorEnabled) {
        return NextResponse.json(
          { error: "Two-factor authentication is already enabled" },
          { status: 400 },
        );
      }

      const secret = generateTOTPSecret();
      const uri = generateTOTPUri(
        dbUser?.email || "user@colab.task",
        "Colab Task Manager",
        secret,
      );
      const qrCode = await generateQRCode(uri);

      // Store the secret temporarily (unverified)
      await prisma.user.update({
        where: { id: user.id },
        data: { twoFactorSecret: secret },
      });

      return NextResponse.json({ qrCode, secret });
    } catch (error) {
      return handleApiError(error);
    }
  },
  { type: "strict" },
);

const verifySchema = z.object({
  token: z.string().length(6),
});

/**
 * POST: Verify token and enable 2FA
 */
export const POST = withRateLimit(
  async (req: Request) => {
    try {
      const user = await requireUser();
      const body = await req.json();
      const { token } = verifySchema.parse(body);

      const dbUser = await prisma.user.findUnique({
        where: { id: user.id },
        select: { twoFactorSecret: true, twoFactorEnabled: true },
      });

      if (dbUser?.twoFactorEnabled) {
        return NextResponse.json(
          { error: "Two-factor authentication is already enabled" },
          { status: 400 },
        );
      }

      if (!dbUser?.twoFactorSecret) {
        return NextResponse.json(
          { error: "Two-factor authentication secret not generated" },
          { status: 400 },
        );
      }

      const isValid = await verifyTOTPToken(token, dbUser.twoFactorSecret);

      if (!isValid) {
        return NextResponse.json(
          { error: "Invalid verification token" },
          { status: 400 },
        );
      }

      const recoveryCodes = generateRecoveryCodes();

      await prisma.user.update({
        where: { id: user.id },
        data: {
          twoFactorEnabled: true,
          recoveryCodes: JSON.stringify(recoveryCodes),
        },
      });

      // Log the security event
      await prisma.auditLog.create({
        data: {
          userId: user.id,
          action: "2FA_ENABLED",
          resourceType: "USER",
          resourceId: user.id,
          metadata: { timestamp: new Date() },
        },
      });

      return NextResponse.json({
        success: true,
        recoveryCodes,
      });
    } catch (error) {
      return handleApiError(error);
    }
  },
  { type: "strict" },
);
