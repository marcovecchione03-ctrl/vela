import bcrypt from "bcryptjs";

// Industry standard minimum work factor
const SALT_ROUNDS = 10;

/**
 * Hashes a plain text password securely using bcrypt.
 */
export async function hashPassword(password: string): Promise<string> {
  return await bcrypt.hash(password, SALT_ROUNDS);
}

/**
 * Verifies a plain text password against a hashed password.
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return await bcrypt.compare(password, hash);
}
