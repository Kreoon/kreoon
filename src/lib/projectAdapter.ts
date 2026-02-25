import type { Content } from '@/types/database';
import type { UnifiedProject, ProjectType, ProjectAssignment } from '@/types/unifiedProject.types';

/**
 * ProjectAdapter - translates between content/marketplace data sources
 * and the unified UnifiedProject interface.
 */
export class ProjectAdapter {
  /**
   * Convert a Content record (from content table) to UnifiedProject.
   * Content projects are always type 'content_creation'.
   */
  static fromContent(content: Content, organizationId: string, assignments?: ProjectAssignment[]): UnifiedProject {
    return {
      id: content.id,
      source: 'content',
      projectType: 'content_creation',
      title: content.title,
      status: content.status,
      organizationId,

      clientId: content.client_id || undefined,
      clientName: content.client?.name || undefined,
      creatorId: content.creator_id || undefined,
      creatorName: content.creator?.full_name || undefined,
      editorId: content.editor_id || undefined,
      editorName: content.editor?.full_name || undefined,
      strategistId: content.strategist_id || undefined,

      brief: {
        product_name: content.product || '',
        product_url: content.reference_url || '',
        objective: content.description || '',
        sales_angle: content.sales_angle || '',
      },

      deadline: content.deadline || undefined,
      startDate: content.start_date || undefined,
      createdAt: content.created_at,
      updatedAt: content.updated_at,

      creatorPayment: content.creator_payment,
      editorPayment: content.editor_payment,
      currency: 'COP',

      contentData: content,
      assignments,
    };
  }

  /**
   * Convert a marketplace_projects record to UnifiedProject.
   * The project_type comes from the DB row.
   */
  static fromMarketplace(project: any, assignments?: ProjectAssignment[]): UnifiedProject {
    const brief = typeof project.brief === 'string'
      ? JSON.parse(project.brief)
      : project.brief || {};

    return {
      id: project.id,
      source: 'marketplace',
      projectType: (project.project_type as ProjectType) || 'content_creation',
      title: project.title || brief.product_name || 'Sin titulo',
      status: project.status,
      organizationId: project.organization_id || '',

      clientId: project.brand_id || undefined,
      clientName: project.brand?.name || project.brand_name || undefined,
      creatorId: project.creator_id || undefined,
      creatorName: project.creator?.display_name || undefined,
      editorId: project.editor_id || undefined,

      brief,

      deadline: project.deadline || undefined,
      startDate: project.started_at || undefined,
      createdAt: project.created_at,
      updatedAt: project.updated_at,

      totalPrice: project.total_price,
      currency: project.currency || 'USD',
      creatorPayment: project.creator_payout,
      editorPayment: project.editor_payout,
      platformFee: project.platform_fee,

      deliverablesCount: project.deliverables_count,
      deliverablesApproved: project.deliverables_approved,

      lastMessageAt: project.last_message_at || undefined,
      unreadMessages: project.unread_brand_messages || project.unread_creator_messages || 0,

      marketplaceData: project,
      assignments,
    };
  }

  /**
   * Convert UnifiedProject changes back to a content table update payload.
   * Used with the update_content_by_id RPC.
   */
  static toContentUpdate(project: UnifiedProject, formData?: Record<string, any>): Record<string, any> {
    const base: Record<string, any> = {
      title: project.title,
      description: project.brief.objective || null,
      product: project.brief.product_name || null,
      reference_url: project.brief.product_url || null,
      sales_angle: project.brief.sales_angle || null,
      client_id: project.clientId || null,
      creator_id: project.creatorId || null,
      editor_id: project.editorId || null,
      strategist_id: project.strategistId || null,
      deadline: project.deadline || null,
      start_date: project.startDate || null,
      creator_payment: project.creatorPayment ?? 0,
      editor_payment: project.editorPayment ?? 0,
    };

    // Pass through editable fields from formData that aren't in UnifiedProject
    if (formData) {
      const passthroughFields = [
        'script', 'video_url', 'video_urls', 'raw_video_urls', 'hooks_count',
        'drive_url', 'notes', 'campaign_week', 'sphere_phase', 'is_published',
        'creator_paid', 'editor_paid', 'invoiced', 'product_id',
        'editor_guidelines', 'strategist_guidelines', 'trafficker_guidelines',
        'designer_guidelines', 'admin_guidelines',
      ];
      for (const field of passthroughFields) {
        if (field in formData && formData[field] !== undefined) {
          base[field] = formData[field] === '' ? null : formData[field];
        }
      }
    }

    return base;
  }

  /**
   * Convert UnifiedProject changes back to a marketplace_projects update payload.
   */
  static toMarketplaceUpdate(project: UnifiedProject): Record<string, any> {
    return {
      title: project.title,
      brief: project.brief,
      status: project.status,
      creator_id: project.creatorId || null,
      editor_id: project.editorId || null,
      deadline: project.deadline || null,
      total_price: project.totalPrice ?? 0,
      creator_payout: project.creatorPayment ?? 0,
      editor_payout: project.editorPayment,
      platform_fee: project.platformFee ?? 0,
      project_type: project.projectType,
    };
  }
}
