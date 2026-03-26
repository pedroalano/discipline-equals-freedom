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

// ── Board ─────────────────────────────────────────────────────────────────────

export interface CreateBoardRequest {
  title: string;
}
export interface UpdateBoardRequest {
  title?: string;
  description?: string;
  color?: string;
}
export interface BoardSummaryResponse {
  id: string;
  userId: string;
  title: string;
  description: string | null;
  color: string | null;
  createdAt: string;
  updatedAt: string;
}
export interface BoardDetailResponse extends BoardSummaryResponse {
  lists: ListResponse[];
}

// ── List ──────────────────────────────────────────────────────────────────────

export interface CreateListRequest {
  title: string;
  boardId: string;
}
export interface UpdateListRequest {
  title?: string;
  position?: number;
}
export interface ListResponse {
  id: string;
  boardId: string;
  title: string;
  position: number;
  createdAt: string;
  cards: CardResponse[];
}

// ── Card ──────────────────────────────────────────────────────────────────────

export interface CreateCardRequest {
  title: string;
  listId: string;
}
export interface UpdateCardRequest {
  title?: string;
  description?: string;
}
export interface MoveCardRequest {
  listId: string;
  position: number;
}
export interface CardResponse {
  id: string;
  listId: string;
  title: string;
  description: string | null;
  position: number;
  createdAt: string;
  updatedAt: string;
}

// ── WebSocket events (server → client) ───────────────────────────────────────

export interface CardMovedEvent {
  card: CardResponse;
}
export interface CardUpdatedEvent {
  card: CardResponse;
}
export interface CardCreatedEvent {
  card: CardResponse;
}
export interface CardDeletedEvent {
  cardId: string;
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

export const createBoardSchema = z.object({ title: z.string().min(1).max(100) });
export const createListSchema = z.object({ title: z.string().min(1).max(100) });
export const createCardSchema = z.object({ title: z.string().min(1).max(200) });

export type RegisterFormData = z.infer<typeof registerSchema>;
export type LoginFormData = z.infer<typeof loginSchema>;
export type CreateFocusItemFormData = z.infer<typeof createFocusItemSchema>;
