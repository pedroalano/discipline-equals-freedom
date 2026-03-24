import { z } from 'zod';

// ── Auth ──────────────────────────────────────────────────────────────────────

export interface RegisterRequest {
  email: string;
  password: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface UserResponse {
  id: string;
  email: string;
  createdAt: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: UserResponse;
}

// ── DailyImage ────────────────────────────────────────────────────────────────

export interface DailyImageResponse {
  url: string;
  author: string;
  authorUrl: string;
}

// ── FocusItem ─────────────────────────────────────────────────────────────────

export interface CreateFocusItemRequest {
  text: string;
  date: string; // ISO date: YYYY-MM-DD
}

export interface UpdateFocusItemRequest {
  text?: string;
  completed?: boolean;
}

export interface FocusItemResponse {
  id: string;
  userId: string;
  text: string;
  date: string; // YYYY-MM-DD
  completed: boolean;
  createdAt: string;
}

// ── Zod Schemas ───────────────────────────────────────────────────────────────

export const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

export const createFocusItemSchema = z.object({
  text: z.string().min(1, 'Text is required').max(500, 'Text too long'),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD format'),
});

export type RegisterFormData = z.infer<typeof registerSchema>;
export type LoginFormData = z.infer<typeof loginSchema>;
export type CreateFocusItemFormData = z.infer<typeof createFocusItemSchema>;
