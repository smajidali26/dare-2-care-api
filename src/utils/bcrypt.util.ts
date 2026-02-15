import bcrypt from 'bcryptjs';

/**
 * Bcrypt Utilities
 * Handles password hashing and comparison
 */

const SALT_ROUNDS = 10;

/**
 * Hash a password
 * @param password - Plain text password to hash
 * @returns Hashed password
 */
export const hashPassword = async (password: string): Promise<string> => {
  return bcrypt.hash(password, SALT_ROUNDS);
};

/**
 * Compare password with hash
 * @param password - Plain text password
 * @param hash - Hashed password to compare against
 * @returns True if password matches hash, false otherwise
 */
export const comparePassword = async (
  password: string,
  hash: string
): Promise<boolean> => {
  return bcrypt.compare(password, hash);
};
