import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { DailyImageService } from './daily-image.service';
import { REDIS_CLIENT } from '../redis/redis.constants';

const mockRedis = {
  get: jest.fn(),
  set: jest.fn(),
};

const mockConfig = {
  get: jest.fn(),
};

const FIXED_DATE = '2026-04-16';

function makeUnsplashResponse() {
  return {
    urls: { raw: 'https://images.unsplash.com/photo-123' },
    user: { name: 'Photo Author', links: { html: 'https://unsplash.com/@author' } },
  };
}

describe('DailyImageService', () => {
  let service: DailyImageService;
  let fetchSpy: jest.SpyInstance;

  beforeEach(async () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date(`${FIXED_DATE}T12:00:00Z`));

    const module = await Test.createTestingModule({
      providers: [
        DailyImageService,
        { provide: REDIS_CLIENT, useValue: mockRedis },
        { provide: ConfigService, useValue: mockConfig },
      ],
    }).compile();

    service = module.get(DailyImageService);
    jest.clearAllMocks();
    fetchSpy = jest.spyOn(global, 'fetch');
    mockRedis.set.mockResolvedValue('OK');
  });

  afterEach(() => {
    jest.useRealTimers();
    fetchSpy.mockRestore();
  });

  describe('getImage', () => {
    it('returns the cached image from Redis without calling fetch', async () => {
      const cached = {
        url: 'cached-url',
        author: 'Author',
        authorUrl: 'https://unsplash.com/@author',
      };
      mockRedis.get.mockResolvedValue(JSON.stringify(cached));

      const result = await service.getImage();

      expect(result).toEqual(cached);
      expect(fetchSpy).not.toHaveBeenCalled();
      expect(mockRedis.set).not.toHaveBeenCalled();
    });

    it('uses the correct date-scoped Redis key', async () => {
      const cached = { url: 'url', author: 'A', authorUrl: 'B' };
      mockRedis.get.mockResolvedValue(JSON.stringify(cached));

      await service.getImage();

      expect(mockRedis.get).toHaveBeenCalledWith(`dailyImage:${FIXED_DATE}`);
    });

    it('returns null when the Unsplash access key is not configured', async () => {
      mockRedis.get.mockResolvedValue(null);
      mockConfig.get.mockReturnValue(undefined);

      const result = await service.getImage();

      expect(result).toBeNull();
      expect(fetchSpy).not.toHaveBeenCalled();
    });

    it('fetches from Unsplash with the correct Authorization header', async () => {
      mockRedis.get.mockResolvedValue(null);
      mockConfig.get.mockReturnValue('test-access-key');
      fetchSpy.mockResolvedValue({
        ok: true,
        json: async () => makeUnsplashResponse(),
      } as unknown as Response);

      await service.getImage();

      expect(fetchSpy).toHaveBeenCalledWith(
        expect.stringContaining('unsplash.com'),
        expect.objectContaining({
          headers: { Authorization: 'Client-ID test-access-key' },
        }),
      );
    });

    it('stores the fetched image in Redis with EX 90000', async () => {
      mockRedis.get.mockResolvedValue(null);
      mockConfig.get.mockReturnValue('test-access-key');
      fetchSpy.mockResolvedValue({
        ok: true,
        json: async () => makeUnsplashResponse(),
      } as unknown as Response);

      await service.getImage();

      expect(mockRedis.set).toHaveBeenCalledWith(
        `dailyImage:${FIXED_DATE}`,
        expect.any(String),
        'EX',
        90000,
      );
    });

    it('returns the image with the transformed URL', async () => {
      mockRedis.get.mockResolvedValue(null);
      mockConfig.get.mockReturnValue('test-access-key');
      fetchSpy.mockResolvedValue({
        ok: true,
        json: async () => makeUnsplashResponse(),
      } as unknown as Response);

      const result = await service.getImage();

      expect(result?.url).toContain('&w=1920&q=85&fm=webp');
      expect(result?.author).toBe('Photo Author');
      expect(result?.authorUrl).toBe('https://unsplash.com/@author');
    });

    it('returns null when the Unsplash response is not ok', async () => {
      mockRedis.get.mockResolvedValue(null);
      mockConfig.get.mockReturnValue('test-access-key');
      fetchSpy.mockResolvedValue({ ok: false } as unknown as Response);

      const result = await service.getImage();

      expect(result).toBeNull();
    });

    it('returns null when fetch throws a network error', async () => {
      mockRedis.get.mockResolvedValue(null);
      mockConfig.get.mockReturnValue('test-access-key');
      fetchSpy.mockRejectedValue(new Error('Network error'));

      const result = await service.getImage();

      expect(result).toBeNull();
    });
  });
});
