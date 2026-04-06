import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LayoutTemplate, Sparkles, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import {
  TemplateExplorer,
  TemplateFilters as TemplateFiltersComponent,
  TemplateCategoryTabs,
  TemplatePreviewModal,
  CloneTemplateDialog,
} from '@/components/template-library';
import { usePublicTemplates } from '@/components/template-library/hooks';
import type { TemplateFilters, PublicTemplate, TemplateCategory, TemplateSortBy } from '@/components/template-library/types/template';

export default function TemplateLibraryPage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [filters, setFilters] = useState<TemplateFilters>({
    category: null,
    search: '',
    sortBy: 'popular',
  });

  const [selectedTemplate, setSelectedTemplate] = useState<PublicTemplate | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [showCloneDialog, setShowCloneDialog] = useState(false);

  const handleCategoryChange = (category: TemplateCategory | null) => {
    setFilters(prev => ({ ...prev, category }));
  };

  const handleSortChange = (sortBy: TemplateSortBy) => {
    setFilters(prev => ({ ...prev, sortBy }));
  };

  const handleSearchChange = (search: string) => {
    setFilters(prev => ({ ...prev, search }));
  };

  const handleTemplateSelect = (template: PublicTemplate) => {
    setSelectedTemplate(template);
    setShowPreview(true);
  };

  const handleUseTemplate = () => {
    setShowPreview(false);
    setShowCloneDialog(true);
  };

  const handleCloneSuccess = () => {
    setShowCloneDialog(false);
    setSelectedTemplate(null);
    navigate('/profile-builder');
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-gray-800 bg-gray-950/50">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-purple-500/10 rounded-lg">
                  <LayoutTemplate className="h-6 w-6 text-purple-400" />
                </div>
                <h1 className="text-2xl font-bold text-white">Biblioteca de Plantillas</h1>
              </div>
              <p className="text-gray-400">
                Explora y usa plantillas creadas por la comunidad para tu perfil
              </p>
            </div>

            {user && (
              <Button
                onClick={() => navigate('/profile-builder')}
                className="bg-purple-600 hover:bg-purple-500"
              >
                <Plus className="h-4 w-4 mr-2" />
                Crear mi plantilla
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Filters and Content */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Category Tabs */}
        <TemplateCategoryTabs
          activeCategory={filters.category}
          onCategoryChange={handleCategoryChange}
        />

        {/* Filters Bar */}
        <div className="mt-4 mb-6">
          <TemplateFiltersComponent
            filters={filters}
            onFiltersChange={(newFilters) => {
              setFilters(prev => ({ ...prev, ...newFilters }));
            }}
          />
        </div>

        {/* Explorer Grid */}
        <TemplateExplorer
          filters={filters}
          onTemplateSelect={handleTemplateSelect}
          useTemplatesHook={() => usePublicTemplates(filters)}
        />
      </div>

      {/* Preview Modal */}
      {selectedTemplate && (
        <TemplatePreviewModal
          template={selectedTemplate}
          open={showPreview}
          onOpenChange={setShowPreview}
          onUseTemplate={handleUseTemplate}
        />
      )}

      {/* Clone Dialog */}
      {selectedTemplate && (
        <CloneTemplateDialog
          template={selectedTemplate}
          open={showCloneDialog}
          onOpenChange={setShowCloneDialog}
          onSuccess={handleCloneSuccess}
        />
      )}
    </div>
  );
}
