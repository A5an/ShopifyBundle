/*
  Warnings:

  - Made the column `accessToken` on table `Session` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "Session" ADD COLUMN     "email" TEXT,
ADD COLUMN     "firstName" TEXT,
ADD COLUMN     "lastName" TEXT,
ALTER COLUMN "accessToken" SET NOT NULL,
ALTER COLUMN "collaborator" DROP NOT NULL,
ALTER COLUMN "emailVerified" DROP NOT NULL;
