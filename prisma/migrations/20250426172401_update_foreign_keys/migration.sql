-- DropForeignKey
ALTER TABLE "Block" DROP CONSTRAINT "Block_bundleId_fkey";

-- DropForeignKey
ALTER TABLE "BundleInput" DROP CONSTRAINT "BundleInput_blockId_fkey";

-- AddForeignKey
ALTER TABLE "Block" ADD CONSTRAINT "Block_bundleId_fkey" FOREIGN KEY ("bundleId") REFERENCES "Bundle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BundleInput" ADD CONSTRAINT "BundleInput_blockId_fkey" FOREIGN KEY ("blockId") REFERENCES "Block"("id") ON DELETE CASCADE ON UPDATE CASCADE;
