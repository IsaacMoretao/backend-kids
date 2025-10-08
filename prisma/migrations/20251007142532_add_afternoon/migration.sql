-- AlterEnum
ALTER TYPE "TypePeriod" ADD VALUE 'AFTERNOON';

-- AlterTable
ALTER TABLE "User" ALTER COLUMN "avatarURL" SET DEFAULT 'https://robohash.org/gerson.png';
