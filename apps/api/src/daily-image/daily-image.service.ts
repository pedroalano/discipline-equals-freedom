import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Redis } from 'ioredis';
import { REDIS_CLIENT } from '../redis/redis.constants';
import type { DailyImageResponse } from '@zenfocus/types';

interface UnsplashApiResponse {
  urls: { raw: string };
  user: { name: string; links: { html: string } };
}

@Injectable()
export class DailyImageService {
  constructor(
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
    private readonly config: ConfigService,
  ) {}

  async getImage(): Promise<DailyImageResponse | null> {
    const today = new Date().toISOString().slice(0, 10);
    const key = `dailyImage:${today}`;

    const cached = await this.redis.get(key);
    if (cached) {
      return JSON.parse(cached) as DailyImageResponse;
    }

    const accessKey = this.config.get<string>('UNSPLASH_ACCESS_KEY');
    if (!accessKey) return null;

    try {
      const res = await fetch(
        'https://api.unsplash.com/photos/random?query=nature&orientation=landscape',
        { headers: { Authorization: `Client-ID ${accessKey}` } },
      );

      if (!res.ok) return null;

      const data = (await res.json()) as UnsplashApiResponse;
      const image: DailyImageResponse = {
        url: `${data.urls.raw}&w=1920&q=85&fm=webp&fit=crop&cs=srgb`,
        author: data.user.name,
        authorUrl: data.user.links.html,
      };

      await this.redis.set(key, JSON.stringify(image), 'EX', 90000);
      return image;
    } catch {
      return null;
    }
  }
}
