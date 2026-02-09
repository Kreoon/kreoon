import { useState } from 'react';
import { MessageSquare, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { useOrgInquiries } from '@/hooks/useOrgInquiries';
import { Badge } from '@/components/ui/badge';
import { INQUIRY_STATUS_LABELS, INQUIRY_TYPE_LABELS } from '@/components/marketplace/types/marketplace';
import type { InquiryStatus } from '@/components/marketplace/types/marketplace';

const STATUS_TABS: { value: InquiryStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'Todas' },
  { value: 'new', label: 'Nuevas' },
  { value: 'reviewed', label: 'Revisadas' },
  { value: 'contacted', label: 'Contactadas' },
  { value: 'closed', label: 'Cerradas' },
];

export default function MarketplaceInquiriesPage() {
  const { profile } = useAuth();
  const orgId = profile?.current_organization_id || null;
  const [statusFilter, setStatusFilter] = useState<InquiryStatus | 'all'>('all');

  const { inquiries, loading } = useOrgInquiries(orgId, statusFilter === 'all' ? undefined : statusFilter);

  return (
    <div className="min-h-full bg-[#0a0a0f]">
      <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <MessageSquare className="h-6 w-6 text-purple-400" />
            Consultas
          </h1>
          <p className="text-sm text-gray-500 mt-1">Mensajes recibidos desde tu perfil público</p>
        </div>

        {/* Status filter */}
        <div className="flex gap-1 mb-6 overflow-x-auto no-scrollbar">
          {STATUS_TABS.map(tab => (
            <button
              key={tab.value}
              onClick={() => setStatusFilter(tab.value)}
              className={cn(
                'px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all',
                statusFilter === tab.value
                  ? 'bg-purple-500/15 text-purple-400'
                  : 'bg-white/5 text-gray-500 hover:text-gray-300'
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex items-center justify-center p-12">
            <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
          </div>
        ) : inquiries.length === 0 ? (
          <div className="text-center py-16">
            <MessageSquare className="h-12 w-12 mx-auto text-gray-600 mb-3" />
            <p className="text-gray-400">No hay consultas {statusFilter !== 'all' && 'con este estado'}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {inquiries.map(inquiry => {
              const statusInfo = INQUIRY_STATUS_LABELS[inquiry.status];
              return (
                <div key={inquiry.id} className="p-4 rounded-xl border border-white/5 bg-white/[0.02]">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-white">{inquiry.sender_name}</p>
                        <Badge className={cn('text-[10px]', statusInfo.color)}>{statusInfo.label}</Badge>
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5">{inquiry.sender_email}</p>
                      {inquiry.sender_company && (
                        <p className="text-xs text-gray-600">{inquiry.sender_company}</p>
                      )}
                    </div>
                    <div className="text-right">
                      <Badge variant="outline" className="text-[10px]">
                        {INQUIRY_TYPE_LABELS[inquiry.inquiry_type] || inquiry.inquiry_type}
                      </Badge>
                      <p className="text-xs text-gray-600 mt-1">
                        {new Date(inquiry.created_at).toLocaleDateString('es-CO')}
                      </p>
                    </div>
                  </div>
                  <p className="text-sm font-medium text-gray-300 mt-2">{inquiry.subject}</p>
                  <p className="text-sm text-gray-400 mt-1 line-clamp-2">{inquiry.message}</p>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
