import { z } from 'zod';

// ── Auth ──────────────────────────────────────────────────────────────────────

export interface UserResponse {
  id: string;
  email: string;
  name?: string | null;
  emailVerified: boolean;
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
  position?: number;
}

export interface FocusItemResponse {
  id: string;
  userId: string;
  text: string;
  date: string; // YYYY-MM-DD
  completed: boolean;
  position: number;
  createdAt: string;
  habitId: string | null;
}

export interface FocusItemListResponse {
  items: FocusItemResponse[];
  total: number;
  completed: number;
}

// ── Habit ─────────────────────────────────────────────────────────────────────

export type HabitFrequency = 'DAILY' | 'CUSTOM';

export interface CreateHabitRequest {
  name: string;
  description?: string;
  frequency: HabitFrequency;
  customDays?: number[]; // weekday numbers 0-6; required when frequency === 'CUSTOM'
}

export interface UpdateHabitRequest {
  name?: string;
  description?: string;
  frequency?: HabitFrequency;
  customDays?: number[];
  isActive?: boolean;
  position?: number;
}

export interface HabitResponse {
  id: string;
  userId: string;
  name: string;
  description: string | null;
  frequency: HabitFrequency;
  customDays: number[] | null;
  isActive: boolean;
  position: number;
  createdAt: string;
  updatedAt: string;
}

export interface HabitStreakResponse {
  habitId: string;
  currentStreak: number;
  longestStreak: number;
  completedToday: boolean;
}

export interface HabitsAggregateCompletionResponse {
  days: { date: string; count: number }[]; // oldest -> newest, length = requested window
}

export interface HabitListResponse {
  habits: HabitResponse[];
}

// ── Board ─────────────────────────────────────────────────────────────────────

export interface CreateBoardRequest {
  title: string;
}
export interface BoardSummaryResponse {
  id: string;
  userId: string;
  title: string;
  description: string | null;
  color: string | null;
  createdAt: string;
  updatedAt: string;
  listCount: number;
}
export interface BoardDetailResponse extends BoardSummaryResponse {
  lists: ListResponse[];
}

// ── List ──────────────────────────────────────────────────────────────────────

export interface CreateListRequest {
  title: string;
  boardId: string;
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

export type CardPriority = 'LOW' | 'MEDIUM' | 'HIGH';

export interface CreateCardRequest {
  title: string;
  listId: string;
  description?: string | null;
  priority?: CardPriority | null;
  dueDate?: string | null;
  labels?: string[];
  color?: string | null;
}
export interface UpdateCardRequest {
  title?: string;
  description?: string | null;
  isToday?: boolean;
  priority?: CardPriority | null;
  dueDate?: string | null;
  labels?: string[];
  color?: string | null;
}
export interface CardResponse {
  id: string;
  listId: string;
  title: string;
  description: string | null;
  position: number;
  isToday: boolean;
  focusItemId: string | null;
  priority: CardPriority | null;
  dueDate: string | null;
  labels: string[];
  color: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface MoveToTodayResponse {
  card: CardResponse;
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

// ── Users / Profile ───────────────────────────────────────────────────────────

export interface ProfileResponse {
  id: string;
  email: string;
  name: string | null;
  createdAt: string;
  stats: {
    focusItemCount: number;
    boardCount: number;
  };
}

// ── Zod Schemas ───────────────────────────────────────────────────────────────

export const createFocusItemSchema = z.object({
  text: z.string().min(1, 'Text is required').max(500, 'Text too long'),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD format'),
});

export const createHabitSchema = z
  .object({
    name: z.string().min(1, 'Name is required').max(200, 'Name too long'),
    frequency: z.enum(['DAILY', 'CUSTOM']),
    customDays: z.array(z.number().int().min(0).max(6)).min(1).max(7).optional(),
  })
  .refine((d) => d.frequency !== 'CUSTOM' || (d.customDays && d.customDays.length > 0), {
    message: 'customDays required for CUSTOM frequency',
    path: ['customDays'],
  });

export type CreateHabitFormData = z.infer<typeof createHabitSchema>;

export const updateNameSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name is too long'),
});

export type CreateFocusItemFormData = z.infer<typeof createFocusItemSchema>;

export const requestMagicLinkSchema = z.object({
  email: z.string().email('Invalid email address'),
});

