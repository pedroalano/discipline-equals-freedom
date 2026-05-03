-- CreateEnum
CREATE TYPE "CardPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

-- AlterTable
ALTER TABLE "Card" ADD COLUMN     "color" TEXT,
ADD COLUMN     "dueDate" TIMESTAMP(3),
ADD COLUMN     "labels" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "priority" "CardPriority";
