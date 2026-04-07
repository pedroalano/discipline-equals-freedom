import { NotFoundException, UnauthorizedException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as bcrypt from 'bcryptjs';
import { UsersService } from './users.service';
import { PrismaService } from '../prisma/prisma.service';
import { REDIS_CLIENT } from '../redis/redis.constants';

const mockPrisma = {
  user: {
    findUnique: jest.fn(),
    findUniqueOrThrow: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
};

const mockRedis = {
  scan: jest.fn(),
  del: jest.fn(),
};

const now = new Date('2026-01-01T00:00:00Z');

function makeUser(overrides = {}) {
  return {
    id: 'user-1',
    email: 'user@example.com',
    passwordHash: '$2a$12$hashedpassword',
    name: 'Test User',
    createdAt: now,
    updatedAt: now,
    lastCarryOverDate: null,
    ...overrides,
  };
}

describe('UsersService', () => {
  let service: UsersService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: REDIS_CLIENT, useValue: mockRedis },
      ],
    }).compile();

    service = module.get(UsersService);
    jest.clearAllMocks();
  });

  describe('getProfile', () => {
    it('returns profile with stats', async () => {
      mockPrisma.user.findUniqueOrThrow.mockResolvedValue({
        id: 'user-1',
        email: 'user@example.com',
        name: 'Test User',
        createdAt: now,
        _count: { focusItems: 5, boards: 2 },
      });

      const result = await service.getProfile('user-1');

      expect(result.id).toBe('user-1');
      expect(result.email).toBe('user@example.com');
      expect(result.stats.focusItemCount).toBe(5);
      expect(result.stats.boardCount).toBe(2);
    });

    it('throws when user not found', async () => {
      mockPrisma.user.findUniqueOrThrow.mockRejectedValue(new Error('Not found'));
      await expect(service.getProfile('missing')).rejects.toThrow();
    });
  });

  describe('updateName', () => {
    it('updates name and returns profile', async () => {
      mockPrisma.user.update.mockResolvedValue(makeUser({ name: 'New Name' }));
      mockPrisma.user.findUniqueOrThrow.mockResolvedValue({
        id: 'user-1',
        email: 'user@example.com',
        name: 'New Name',
        createdAt: now,
        _count: { focusItems: 0, boards: 0 },
      });

      const result = await service.updateName('user-1', { name: 'New Name' });

      expect(result.name).toBe('New Name');
      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: { name: 'New Name' },
      });
    });
  });

  describe('updatePassword', () => {
    it('updates password and purges redis tokens', async () => {
      const hashedPassword = await bcrypt.hash('oldpassword', 12);
      mockPrisma.user.findUnique.mockResolvedValue(makeUser({ passwordHash: hashedPassword }));
      mockPrisma.user.update.mockResolvedValue(makeUser());
      mockRedis.scan.mockResolvedValue(['0', []]);

      await service.updatePassword('user-1', {
        currentPassword: 'oldpassword',
        newPassword: 'newpassword123',
      });

      expect(mockPrisma.user.update).toHaveBeenCalled();
      expect(mockRedis.scan).toHaveBeenCalled();
    });

    it('throws UnauthorizedException for wrong current password', async () => {
      const hashedPassword = await bcrypt.hash('correctpassword', 12);
      mockPrisma.user.findUnique.mockResolvedValue(makeUser({ passwordHash: hashedPassword }));

      await expect(
        service.updatePassword('user-1', {
          currentPassword: 'wrongpassword',
          newPassword: 'newpassword123',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('throws NotFoundException when user not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(
        service.updatePassword('missing', {
          currentPassword: 'password',
          newPassword: 'newpassword123',
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('deleteAccount', () => {
    it('purges redis tokens and deletes user', async () => {
      mockRedis.scan.mockResolvedValue(['0', ['refreshToken:user-1:token-abc']]);
      mockRedis.del.mockResolvedValue(1);
      mockPrisma.user.delete.mockResolvedValue(makeUser());

      await service.deleteAccount('user-1');

      expect(mockRedis.scan).toHaveBeenCalled();
      expect(mockRedis.del).toHaveBeenCalledWith('refreshToken:user-1:token-abc');
      expect(mockPrisma.user.delete).toHaveBeenCalledWith({ where: { id: 'user-1' } });
    });

    it('deletes user even when no redis tokens exist', async () => {
      mockRedis.scan.mockResolvedValue(['0', []]);
      mockPrisma.user.delete.mockResolvedValue(makeUser());

      await service.deleteAccount('user-1');

      expect(mockRedis.del).not.toHaveBeenCalled();
      expect(mockPrisma.user.delete).toHaveBeenCalledWith({ where: { id: 'user-1' } });
    });
  });
});
