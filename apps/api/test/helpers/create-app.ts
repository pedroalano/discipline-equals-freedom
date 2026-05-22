import { Test } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import { execSync } from 'child_process';
import { AppModule } from '../../src/app.module';
import { PrismaService } from '../../src/prisma/prisma.service';
import { EmailService } from '../../src/email/email.service';
import { REDIS_CLIENT } from '../../src/redis/redis.constants';
import type { Redis } from 'ioredis';

// Derive the test DB URL from the dev DATABASE_URL so credentials always match.
// Replaces only the database name at the end of the connection string.
const devDbUrl = process.env['DATABASE_URL'] ?? 'postgresql://zenfocus:zenfocus@postgres:5432/zenfocus';
export const TEST_DB_URL = devDbUrl.replace(/\/[^/?]+(\?.*)?$/, '/zenfocus_test$1');

export interface TestApp {
  app: INestApplication;
  prisma: PrismaService;
  redis: Redis;
}

export async function createTestApp(): Promise<TestApp> {
  // Point all Prisma clients in this worker to the test DB
  process.env['DATABASE_URL'] = TEST_DB_URL;

  // Ensure the test DB is fully migrated (fast no-op when already up-to-date).
  // First-time setup: create the DB first with:
  //   docker compose exec postgres psql -U zenfocus -c "CREATE DATABASE zenfocus_test;"
  try {
    execSync('pnpm --filter api exec prisma migrate deploy', {
      cwd: '/app',
      env: { ...process.env },
      stdio: 'pipe',
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(
      `[Integration tests] Could not apply migrations to "${TEST_DB_URL}".\n` +
        `If the test DB does not exist, create it first:\n` +
        `  docker compose exec postgres psql -U zenfocus -c "CREATE DATABASE zenfocus_test;"\n` +
        `Original error: ${msg}`,
    );
  }

  const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
    .overrideGuard(ThrottlerGuard)
    .useValue({ canActivate: () => true })
    .overrideProvider(EmailService)
    .useValue({ sendMagicLinkEmail: jest.fn().mockResolvedValue(undefined) })
    .compile();

  const app = moduleRef.createNestApplication();
  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
  );
  await app.init();

  return {
    app,
    prisma: moduleRef.get(PrismaService),
    redis: moduleRef.get<Redis>(REDIS_CLIENT),
  };
}
