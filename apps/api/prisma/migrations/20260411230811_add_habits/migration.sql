-- CreateEnum
CREATE TYPE "HabitFrequency" AS ENUM ('DAILY', 'CUSTOM');

-- AlterTable
ALTER TABLE "FocusItem" ADD COLUMN     "habitId" TEXT;

-- CreateTable
CREATE TABLE "Habit" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "frequency" "HabitFrequency" NOT NULL DEFAULT 'DAILY',
    "customDays" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "position" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Habit_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Habit_userId_isActive_idx" ON "Habit"("userId", "isActive");

-- CreateIndex
CREATE INDEX "FocusItem_userId_date_idx" ON "FocusItem"("userId", "date");

-- CreateIndex
CREATE INDEX "FocusItem_habitId_idx" ON "FocusItem"("habitId");

-- AddForeignKey
ALTER TABLE "FocusItem" ADD CONSTRAINT "FocusItem_habitId_fkey" FOREIGN KEY ("habitId") REFERENCES "Habit"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Habit" ADD CONSTRAINT "Habit_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
