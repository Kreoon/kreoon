import { useState } from "react";
import { Mail } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  CampaignList,
  CampaignEditor,
  SegmentList,
  TemplateList,
  DripSequenceList,
  DripSequenceEditor,
  EmailAnalyticsDashboard,
} from "@/components/crm/email";
import type { EmailCampaign, EmailDripSequence } from "@/types/email-marketing.types";

type Tab = "campaigns" | "sequences" | "templates" | "segments" | "analytics";

export default function PlatformCRMEmailMarketing() {
  const [activeTab, setActiveTab] = useState<Tab>("campaigns");
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState<EmailCampaign | null>(null);
  const [selectedSequence, setSelectedSequence] = useState<EmailDripSequence | null>(null);

  const handleCreateCampaign = () => {
    setEditingCampaign(null);
    setEditorOpen(true);
  };

  const handleEditCampaign = (campaign: EmailCampaign) => {
    setEditingCampaign(campaign);
    setEditorOpen(true);
  };

  const handleCampaignDetail = (campaign: EmailCampaign) => {
    // For now, open editor; in the future could be a separate detail view
    setEditingCampaign(campaign);
    setEditorOpen(true);
  };

  const handleSelectSequence = (seq: EmailDripSequence) => {
    setSelectedSequence(seq);
  };

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title="Email Marketing"
        description="Campañas, secuencias automatizadas y analíticas de email"
        icon={Mail}
      />

      <Tabs value={activeTab} onValueChange={(v) => { setActiveTab(v as Tab); setSelectedSequence(null); }}>
        <TabsList>
          <TabsTrigger value="campaigns">Campañas</TabsTrigger>
          <TabsTrigger value="sequences">Secuencias</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
          <TabsTrigger value="segments">Segmentos</TabsTrigger>
          <TabsTrigger value="analytics">Analíticas</TabsTrigger>
        </TabsList>

        <TabsContent value="campaigns" className="mt-6">
          <CampaignList
            onCreate={handleCreateCampaign}
            onEdit={handleEditCampaign}
            onDetail={handleCampaignDetail}
          />
        </TabsContent>

        <TabsContent value="sequences" className="mt-6">
          {selectedSequence ? (
            <DripSequenceEditor
              sequence={selectedSequence}
              onBack={() => setSelectedSequence(null)}
            />
          ) : (
            <DripSequenceList onSelect={handleSelectSequence} />
          )}
        </TabsContent>

        <TabsContent value="templates" className="mt-6">
          <TemplateList />
        </TabsContent>

        <TabsContent value="segments" className="mt-6">
          <SegmentList />
        </TabsContent>

        <TabsContent value="analytics" className="mt-6">
          <EmailAnalyticsDashboard />
        </TabsContent>
      </Tabs>

      {/* Campaign Editor Modal */}
      <CampaignEditor
        open={editorOpen}
        onOpenChange={setEditorOpen}
        campaign={editingCampaign}
      />
    </div>
  );
}
