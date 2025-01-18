/*
  Warnings:

  - You are about to drop the column `idade` on the `Classes` table. All the data in the column will be lost.
  - Added the required column `dateOfBirth` to the `Classes` table without a default value. This is not possible if the table is not empty.
  - Made the column `period` on table `Presence` required. This step will fail if there are existing NULL values in that column.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Classes" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "nome" TEXT NOT NULL,
    "dateOfBirth" DATETIME NOT NULL
);
INSERT INTO "new_Classes" ("id", "nome") SELECT "id", "nome" FROM "Classes";
DROP TABLE "Classes";
ALTER TABLE "new_Classes" RENAME TO "Classes";
CREATE TABLE "new_Presence" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "period" TEXT NOT NULL,
    "userId" INTEGER NOT NULL,
    CONSTRAINT "Presence_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Presence" ("createdAt", "id", "period", "userId") SELECT "createdAt", "id", "period", "userId" FROM "Presence";
DROP TABLE "Presence";
ALTER TABLE "new_Presence" RENAME TO "Presence";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
