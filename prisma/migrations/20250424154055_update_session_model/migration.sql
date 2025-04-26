-- AlterTable
ALTER TABLE "Session" ADD COLUMN     "accountOwner" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "collaborator" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "emailVerified" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "locale" TEXT;
