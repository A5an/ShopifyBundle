import { prisma } from "../db.server";
import type { Bundle, Block, BundleInput, SelectedBlock } from "../types/bundle";
import type { Prisma } from "@prisma/client";
import { Session } from "@shopify/shopify-api";
import { hidePriceForNonAuth } from "../middleware/price-visibility.server";

type SessionType = {
  onlineAccessInfo?: {
    associated_user?: {
      id?: string | number;
    };
  };
};

export class BundleService {
  async createBundle(data: {
    title: string;
    description?: string;
    productId: string;
    isActive: boolean;
    blocks: Array<{
      title: string;
      description?: string;
      position: number;
      inputs: Array<{
        title: string;
        description?: string;
        type: string;
        position: number;
        required: boolean;
        options: any;
      }>;
    }>;
  }): Promise<Bundle> {
    // Check if bundle already exists for this product
    const existingBundle = await prisma.bundle.findUnique({
      where: { productId: data.productId },
    });

    if (existingBundle) {
      throw new Error("A bundle already exists for this product. Please edit the existing bundle or choose a different product.");
    }

    return prisma.bundle.create({
      data: {
        title: data.title,
        description: data.description,
        productId: data.productId,
        isActive: data.isActive,
        blocks: {
          create: data.blocks.map((block) => ({
            title: block.title,
            description: block.description,
            position: block.position,
            inputs: {
              create: block.inputs.map((input) => ({
                title: input.title,
                description: input.description,
                type: input.type as any,
                position: input.position,
                required: input.required,
                options: input.options,
              })),
            },
          })),
        },
      },
      include: {
        blocks: {
          include: {
            inputs: true,
          },
        },
      },
    });
  }

  async getBundle(id: string) {
    return prisma.bundle.findUnique({
      where: { id },
      include: {
        blocks: {
          include: {
            inputs: true,
          },
          orderBy: {
            position: 'asc',
          },
        },
      },
    });
  }

  async listBundles() {
    return prisma.bundle.findMany({
      include: {
        blocks: {
          include: {
            inputs: true,
          },
          orderBy: {
            position: 'asc',
          },
        },
      },
    });
  }

  validateConfiguration(bundle: Bundle, selectedBlocks: SelectedBlock[]): boolean {
    for (const block of bundle.blocks) {
      const selectedBlock = selectedBlocks.find(sb => sb.blockId === block.id);
      
      // Check required inputs in this block
      const requiredInputs = block.inputs.filter(i => i.required);
      for (const input of requiredInputs) {
        const selectedInput = selectedBlock?.inputs.find(si => si.inputId === input.id);
        if (!selectedInput || selectedInput.values.length === 0) {
          return false;
        }

        // Validate each selected value
        for (const selectedValue of selectedInput.values) {
          const value = input.options?.find(o => o.id === selectedValue.valueId);
          if (!value) return false;

          // Check quantity limits
          if (selectedValue.quantity && value.maxQuantity) {
            if (selectedValue.quantity > value.maxQuantity) return false;
          }

          // Check file upload requirement for radio options
          if (input.type === 'RADIO' && value.showFileUpload && !selectedValue.fileUrl) {
            return false;
  }
        }

        // For single select inputs, ensure only one value is selected
        if (input.type === 'ONE_SELECT' || input.type === 'RADIO') {
          if (selectedInput.values.length !== 1) return false;
        }
      }
    }
    
    return true;
  }

  async updateBundle(
    id: string,
    bundle: Prisma.BundleUpdateInput
  ) {
    return prisma.bundle.update({
      where: { id },
      data: bundle,
      include: {
        blocks: {
          include: {
            inputs: true,
          },
          orderBy: {
            position: 'asc',
          },
        },
      },
    });
  }

  async deleteBundle(id: string) {
    return prisma.bundle.delete({
      where: { id },
    });
  }

  async updateBlockPosition(blockId: string, newPosition: number) {
    const block = await prisma.block.findUnique({
      where: { id: blockId },
      include: { bundle: { include: { blocks: true } } },
    });

    if (!block) throw new Error('Block not found');

    // Reorder all blocks in the bundle
    await prisma.$transaction(
      block.bundle.blocks.map((b) => {
        let position = b.position;
        if (b.id === blockId) {
          position = newPosition;
        } else if (
          (block.position < newPosition && b.position > block.position && b.position <= newPosition) ||
          (block.position > newPosition && b.position < block.position && b.position >= newPosition)
        ) {
          position = block.position < newPosition ? b.position - 1 : b.position + 1;
        }

        return prisma.block.update({
          where: { id: b.id },
          data: { position },
        });
      })
    );
  }

  async updateInputPosition(inputId: string, newPosition: number) {
    const input = await prisma.bundleInput.findUnique({
      where: { id: inputId },
      include: { block: { include: { inputs: true } } },
    });

    if (!input) throw new Error('Input not found');

    // Reorder all inputs in the block
    await prisma.$transaction(
      input.block.inputs.map((i) => {
        let position = i.position;
        if (i.id === inputId) {
          position = newPosition;
        } else if (
          (input.position < newPosition && i.position > input.position && i.position <= newPosition) ||
          (input.position > newPosition && i.position < input.position && i.position >= newPosition)
        ) {
          position = input.position < newPosition ? i.position - 1 : i.position + 1;
        }

        return prisma.bundleInput.update({
          where: { id: i.id },
          data: { position },
        });
      })
    );
  }

  async getBundleByProductId(productId: string) {
    // Handle both GID and numeric product IDs
    const fullGid = productId.includes('gid://') 
      ? productId 
      : `gid://shopify/Product/${productId}`;

    console.log('Looking for bundle with full GID:', fullGid);
    
    return prisma.bundle.findUnique({
      where: {
        productId: fullGid,
      },
      include: {
        blocks: {
          orderBy: {
            position: 'asc',
          },
          include: {
            inputs: {
              orderBy: {
                position: 'asc',
              },
            },
          },
        },
      },
    });
  }
} 