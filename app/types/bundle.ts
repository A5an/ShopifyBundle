export type InputType = 'MULTI_SELECT' | 'ONE_SELECT' | 'RADIO' | 'FILE';

export type PriceModifier = {
  value: number;
  type: 'fixed' | 'percentage';
};

export type OptionValue = {
  id: string;
  label: string;
  price?: PriceModifier;
  maxQuantity?: number;
  showFileUpload?: boolean; // Only for radio buttons
};

export type BundleInput = {
  id: string;
  blockId: string;
  title: string;
  description?: string | null;
  type: InputType;
  position: number;
  options?: OptionValue[];
  required: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export type Block = {
  id: string;
  bundleId: string;
  title: string;
  description?: string | null;
  position: number;
  inputs: BundleInput[];
  createdAt: Date;
  updatedAt: Date;
};

export type Bundle = {
  id: string;
  title: string;
  description: string | null;
  productId: string;
  blocks: Block[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export type SelectedValue = {
  valueId: string;
  quantity?: number;
  fileUrl?: string;
};

export type SelectedInput = {
  inputId: string;
  values: SelectedValue[];
};

export type SelectedBlock = {
  blockId: string;
  inputs: SelectedInput[];
};

export type BundleConfiguration = {
  bundleId: string;
  blocks: SelectedBlock[];
};

export interface PriceResult {
  basePrice: number;
  finalPrice: number;
  isB2B: boolean;
} 