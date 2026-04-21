import { z } from 'zod';

// ── Auth ──────────────────────────────────────────────────────────────────────

export interface RegisterRequest {
  name?: string;
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
  name?: string | null;
  emailVerified: boolean;
  createdAt: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: UserResponse;
}

// ── Email Verification ───────────────────────────────────────────────────────

export interface VerifyEmailRequest {
  token: string;
}

export interface ResendVerificationResponse {
  message: string;
}

// ── Password Reset ───────────────────────────────────────────────────────────

export interface ForgotPasswordRequest {
  email: string;
}

export interface ForgotPasswordResponse {
  message: string;
}

export interface ResetPasswordRequest {
  token: string;
  newPassword: string;
  confirmPassword: string;
}

export interface ResetPasswordResponse {
  message: string;
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

export interface HabitListResponse {
  habits: HabitResponse[];
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
  isToday?: boolean;
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
  isToday: boolean;
  focusItemId: string | null;
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

export interface UpdateNameRequest {
  name: string;
}

export interface UpdatePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

// ── Zod Schemas ───────────────────────────────────────────────────────────────

const strongPassword = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .regex(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
    'Password must contain at least one uppercase letter, one lowercase letter, and one digit',
  );

export const registerSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100).optional(),
  email: z.string().email('Invalid email address'),
  password: strongPassword,
});

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

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

export const createBoardSchema = z.object({ title: z.string().min(1).max(100) });
export const createListSchema = z.object({ title: z.string().min(1).max(100) });
export const createCardSchema = z.object({ title: z.string().min(1).max(200) });

export const updateNameSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name is too long'),
});

export const updatePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: strongPassword,
    confirmPassword: z.string().min(1, 'Please confirm your new password'),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

export type RegisterFormData = z.infer<typeof registerSchema>;
export type LoginFormData = z.infer<typeof loginSchema>;
export type CreateFocusItemFormData = z.infer<typeof createFocusItemSchema>;
export type UpdateNameFormData = z.infer<typeof updateNameSchema>;
export type UpdatePasswordFormData = z.infer<typeof updatePasswordSchema>;

export const verifyEmailSchema = z.object({
  token: z.string().min(1, 'Token is required'),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email('Invalid email address'),
});

export const resetPasswordSchema = z
  .object({
    token: z.string().min(1),
    newPassword: strongPassword,
    confirmPassword: z.string().min(1, 'Please confirm your new password'),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

export type VerifyEmailFormData = z.infer<typeof verifyEmailSchema>;
export type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>;
