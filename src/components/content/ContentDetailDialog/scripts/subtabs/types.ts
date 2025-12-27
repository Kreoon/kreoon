import { Content } from '@/types/database';
import { ContentFormData } from '../../types';
import { ScriptPermissionsHook } from '../types';
import { TextEditorFeatures } from '@/components/ui/rich-text-editor';

export interface AdvancedConfigData {
  enable_comments: boolean;
  require_approval_before_advance: boolean;
  client_read_only_mode: boolean;
  enable_custom_fields: boolean;
  content_types: string[];
  text_editor_features: TextEditorFeatures;
}

export interface SubTabProps {
  content: Content;
  formData: ContentFormData;
  setFormData: React.Dispatch<React.SetStateAction<ContentFormData>>;
  editMode: boolean;
  setEditMode: (value: boolean) => void;
  onUpdate?: () => void;
  selectedProduct: any;
  onProductChange: (productId: string) => void;
  scriptPermissions: ScriptPermissionsHook;
  advancedConfig?: AdvancedConfigData | null;
  /** 
   * When true, the sub-tab is in read-only mode regardless of editMode.
   * This is enforced by blockConfig or scriptPermissions.
   */
  readOnly?: boolean;
}
