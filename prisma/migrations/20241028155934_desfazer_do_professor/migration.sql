/*
  Warnings:

  - You are about to drop the column `PresenceDate` on the `Presence` table. All the data in the column will be lost.
  - You are about to drop the column `shift` on the `Presence` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Presence" DROP COLUMN "PresenceDate",
DROP COLUMN "shift";