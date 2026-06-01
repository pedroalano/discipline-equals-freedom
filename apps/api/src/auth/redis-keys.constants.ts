export const REFRESH_TOKEN_TTL = 7 * 24 * 60 * 60; // 7 days
export const REDIS_SCAN_BATCH = 100;

export const redisKeys = {
  magicLinkToken: (hash: string) => `magicLink:${hash}`,
  magicLinkCooldown: (email: string) => `magicLink:cooldown:${email}`,
  refreshToken: (userId: string, tokenId: string) => `refreshToken:${userId}:${tokenId}`,
  refreshTokenPattern: (userId: string) => `refreshToken:${userId}:*`,
};
