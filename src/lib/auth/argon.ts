import { hash as argonHash, verify as argonVerify } from '@node-rs/argon2';

/**
 * Hash a plaintext password using Argon2id (default algorithm in @node-rs/argon2).
 * Default cost params match OWASP 2024 recommendations.
 */
export async function hashPassword(password: string): Promise<string> {
  return argonHash(password, {
    memoryCost: 19456, // 19 MiB
    timeCost: 2,
    parallelism: 1,
  });
}

export async function verifyPassword(hash: string, password: string): Promise<boolean> {
  try {
    return await argonVerify(hash, password);
  } catch {
    return false;
  }
}