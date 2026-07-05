import { generateSecret, generateURI, verify } from "otplib";
import QRCode from "qrcode";

/**
 * Generate a new TOTP secret for a user
 */
export function generateTOTPSecret(): string {
  return generateSecret();
}

/**
 * Generate a TOTP URI for QR codes
 */
export function generateTOTPUri(
  email: string,
  issuer: string,
  secret: string,
): string {
  return generateURI({ issuer, label: email, secret });
}

/**
 * Generate a base64 QR code image string
 */
export async function generateQRCode(uri: string): Promise<string> {
  return QRCode.toDataURL(uri);
}

/**
 * Verify a TOTP token against a secret
 */
export async function verifyTOTPToken(
  token: string,
  secret: string,
): Promise<boolean> {
  const result = await verify({ token, secret });
  return result.valid;
}

/**
 * Generate a set of random recovery codes
 */
export function generateRecoveryCodes(count = 8): string[] {
  const codes: string[] = [];
  for (let i = 0; i < count; i++) {
    // Generate 12 characters of random hex
    const code =
      Math.random().toString(36).substring(2, 8).toUpperCase() +
      "-" +
      Math.random().toString(36).substring(2, 8).toUpperCase();
    codes.push(code);
  }
  return codes;
}
