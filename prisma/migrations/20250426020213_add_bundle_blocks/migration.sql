/*
  Warnings:

  - You are about to drop the column `basePrice` on the `Bundle` table. All the data in the column will be lost.
  - You are about to drop the column `options` on the `Bundle` table. All the data in the column will be lost.
  - You are about to drop the column `parentSKU` on the `Bundle` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[productId]` on the table `Bundle` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `productId` to the `Bundle` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "InputType" AS ENUM ('TABLE', 'MULTI_SELECT', 'ONE_SELECT', 'RADIO', 'FILE');

-- DropIndex
DROP INDEX "Bundle_parentSKU_key";

-- AlterTable
ALTER TABLE "Bundle" DROP COLUMN "basePrice",
DROP COLUMN "options",
DROP COLUMN "parentSKU",
ADD COLUMN     "productId" TEXT NOT NULL;

-- CreateTable
CREATE TABLE "Block" (
    "id" TEXT NOT NULL,
    "bundleId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "position" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Block_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BundleInput" (
    "id" TEXT NOT NULL,
    "blockId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "type" "InputType" NOT NULL,
    "position" INTEGER NOT NULL,
    "options" JSONB,
    "required" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BundleInput_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Bundle_productId_key" ON "Bundle"("productId");

-- AddForeignKey
ALTER TABLE "Block" ADD CONSTRAINT "Block_bundleId_fkey" FOREIGN KEY ("bundleId") REFERENCES "Bundle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BundleInput" ADD CONSTRAINT "BundleInput_blockId_fkey" FOREIGN KEY ("blockId") REFERENCES "Block"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
