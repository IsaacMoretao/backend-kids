/*
  Warnings:

  - Added the required column `particularities` to the `User` table without a default value. This is not possible if the table is not empty.

*/

-- CreateTable
CREATE TABLE "CanceledDays" (
    "id" SERIAL NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "canceledDay" TIMESTAMP(3) NOT NULL,
    "reasonForCancellation" TEXT NOT NULL,
    "isApproved" BOOLEAN NOT NULL DEFAULT true,
    "userId" INTEGER NOT NULL,

    CONSTRAINT "CanceledDays_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "CanceledDays" ADD CONSTRAINT "CanceledDays_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
