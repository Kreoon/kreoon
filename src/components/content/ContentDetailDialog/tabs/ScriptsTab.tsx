import { ScriptsTabContainer } from '../scripts/ScriptsTabContainer';
import { TabProps } from '../types';

interface ScriptsTabProps extends TabProps {
  selectedProduct: any;
  onProductChange: (productId: string) => void;
}

export function ScriptsTab({
  content,
  formData,
  setFormData,
  editMode,
  setEditMode,
  permissions,
  onUpdate,
  selectedProduct,
  onProductChange,
}: ScriptsTabProps) {
  return (
    <ScriptsTabContainer
      content={content}
      formData={formData}
      setFormData={setFormData}
      editMode={editMode}
      setEditMode={setEditMode}
      permissions={permissions}
      onUpdate={onUpdate}
      selectedProduct={selectedProduct}
      onProductChange={onProductChange}
    />
  );
}
