// Shared in-memory store for 2FA codes
// Both login and verify-2fa routes import from here to guarantee the same Map instance

export const twoFactorCodes = new Map<string, { code: string; expiresAt: Date; userId: string }>();
