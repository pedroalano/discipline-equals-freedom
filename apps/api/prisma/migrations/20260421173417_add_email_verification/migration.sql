-- AlterTable
ALTER TABLE "User" ADD COLUMN     "emailVerified" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "emailVerifiedAt" TIMESTAMP(3);

-- Grandfather existing users as verified
UPDATE "User" SET "emailVerified" = true, "emailVerifiedAt" = NOW();
