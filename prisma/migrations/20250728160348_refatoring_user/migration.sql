-- CreateEnum
CREATE TYPE "Level" AS ENUM ('READER', 'USER', 'ADMIN');

-- CreateEnum
CREATE TYPE "TypePeriod" AS ENUM ('MORNING', 'NIGHT');

-- AlterTable Presence
ALTER TABLE "Presence"
ALTER COLUMN "period" TYPE "TypePeriod"
USING "period"::text::"TypePeriod";

-- AlterTable User
ALTER TABLE "User"
ADD COLUMN "avatarURL" TEXT NOT NULL DEFAULT 'https://api.multiavatar.com/gerson.svg',
ADD COLUMN "isActive" BOOLEAN NOT NULL DEFAULT true,
ALTER COLUMN "level" TYPE "Level"
USING "level"::text::"Level";
