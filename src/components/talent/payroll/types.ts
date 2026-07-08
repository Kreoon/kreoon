import type { TalentPayment } from '@/types/talentPayments.types';

export interface MonthlyClosureEntry {
  payment: TalentPayment;
  full_name: string;
  avatar_url: string | null;
}

export interface ContentExportDetail {
  id: string;
  title: string | null;
  sequence_number: string | null;
  client_name: string | null;
  creator_payment: number | null;
  editor_payment: number | null;
}

// Fechas indexadas por status: contentId → { to_status → moved_at (ISO) }
export type StatusDateMap = Map<string, Record<string, string>>;
