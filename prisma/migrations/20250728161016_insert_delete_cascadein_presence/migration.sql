-- DropForeignKey
ALTER TABLE "Presence" DROP CONSTRAINT "Presence_userId_fkey";

-- AddForeignKey
ALTER TABLE "Presence" ADD CONSTRAINT "Presence_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
