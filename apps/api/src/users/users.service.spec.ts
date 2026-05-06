import { Test } from '@nestjs/testing';
import { UsersService } from './users.service';
import { PrismaService } from '../prisma/prisma.service';
import { REDIS_CLIENT } from '../redis/redis.constants';

const mockPrisma = {
  user: {
    findUnique: jest.fn(),
    findUniqueOrThrow: jest.fn(),
    create: jest.fn(),
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
    name: 'Test User',
    emailVerified: false,
    emailVerifiedAt: null,
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

  describe('create', () => {
    it('creates user without password hash', async () => {
      mockPrisma.user.create.mockResolvedValue(makeUser());

      await service.create('user@example.com', 'Test User');

      expect(mockPrisma.user.create).toHaveBeenCalledWith({
        data: { email: 'user@example.com', name: 'Test User' },
      });
    });

    it('creates user with no name when omitted', async () => {
      mockPrisma.user.create.mockResolvedValue(makeUser({ name: null }));

      await service.create('user@example.com');

      expect(mockPrisma.user.create).toHaveBeenCalledWith({
        data: { email: 'user@example.com', name: undefined },
      });
    });
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

  describe('markEmailVerified', () => {
    it('flips emailVerified flag and sets timestamp', async () => {
      mockPrisma.user.update.mockResolvedValue(makeUser({ emailVerified: true }));

      await service.markEmailVerified('user-1');

      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: expect.objectContaining({ emailVerified: true }),
      });
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
