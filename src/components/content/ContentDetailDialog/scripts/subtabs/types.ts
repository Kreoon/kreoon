import { Content } from '@/types/database';
import { ContentFormData } from '../../types';
import { ScriptPermissionsHook } from '../types';

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
}
