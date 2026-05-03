const REQUIRED_ALWAYS = ['DATABASE_URL', 'REDIS_URL', 'JWT_SECRET', 'JWT_REFRESH_SECRET'] as const;

const REQUIRED_IN_PRODUCTION = [
  'CORS_ORIGIN',
  'FRONTEND_URL',
  'APP_URL',
  'RESEND_API_KEY',
  'RESEND_FROM_EMAIL',
] as const;

const FORBIDDEN_PRODUCTION_VALUES: Record<string, string[]> = {
  JWT_SECRET: ['change-me-in-production'],
  JWT_REFRESH_SECRET: ['change-me-in-production'],
  POSTGRES_PASSWORD: ['change-me-in-production', 'zenfocus'],
};

export function validateEnv(config: Record<string, unknown>): Record<string, unknown> {
  const errors: string[] = [];
  const isProd = config['NODE_ENV'] === 'production';

  for (const key of REQUIRED_ALWAYS) {
    if (!config[key]) errors.push(`${key} is required`);
  }

  if (isProd) {
    for (const key of REQUIRED_IN_PRODUCTION) {
      if (!config[key]) errors.push(`${key} is required in production`);
    }
    for (const [key, banned] of Object.entries(FORBIDDEN_PRODUCTION_VALUES)) {
      const value = config[key];
      if (typeof value === 'string' && banned.includes(value)) {
        errors.push(`${key} must not use the placeholder value "${value}" in production`);
      }
    }
    for (const key of ['JWT_SECRET', 'JWT_REFRESH_SECRET'] as const) {
      const value = config[key];
      if (typeof value === 'string' && value.length < 32) {
        errors.push(`${key} must be at least 32 characters in production`);
      }
    }
  }

  if (errors.length > 0) {
    throw new Error(`Invalid environment configuration:\n  - ${errors.join('\n  - ')}`);
  }

  return config;
}
