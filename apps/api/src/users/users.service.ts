import { Inject, Injectable } from '@nestjs/common';
import type { Redis } from 'ioredis';
import { PrismaService } from '../prisma/prisma.service';
import { REDIS_CLIENT } from '../redis/redis.constants';
import type { User } from '@prisma/client';
import type { ProfileResponse } from '@zenfocus/types';
import type { UpdateNameDto } from './dto/update-name.dto';

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
  ) {}

  async findById(id: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { id } });
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { email } });
  }

  async create(email: string, name?: string): Promise<User> {
    return this.prisma.user.create({ data: { email, name } });
  }

  async markEmailVerified(userId: string): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: { emailVerified: true, emailVerifiedAt: new Date() },
    });
  }

  async getProfile(userId: string): Promise<ProfileResponse> {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        createdAt: true,
        _count: { select: { focusItems: true, boards: true } },
      },
    });

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      createdAt: user.createdAt.toISOString(),
      stats: {
        focusItemCount: user._count.focusItems,
        boardCount: user._count.boards,
      },
    };
  }

  async updateName(userId: string, dto: UpdateNameDto): Promise<ProfileResponse> {
    await this.prisma.user.update({ where: { id: userId }, data: { name: dto.name } });
    return this.getProfile(userId);
  }

  async deleteAccount(userId: string): Promise<void> {
    await this.purgeRefreshTokens(userId);
    await this.prisma.user.delete({ where: { id: userId } });
  }

  private async purgeRefreshTokens(userId: string): Promise<void> {
    const pattern = `refreshToken:${userId}:*`;
    const keys: string[] = [];
    let cursor = '0';

    do {
      const [next, batch] = await this.redis.scan(cursor, 'MATCH', pattern, 'COUNT', 100);
      cursor = next;
      keys.push(...batch);
    } while (cursor !== '0');

    if (keys.length > 0) {
      await this.redis.del(...keys);
    }
  }
}
