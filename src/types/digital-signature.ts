// Tipos para el sistema de firma digital

export type SignatureMethod = 'clickwrap' | 'typed_name' | 'drawn_signature' | 'otp_verified';
export type SignatureStatus = 'valid' | 'revoked' | 'superseded';

export interface DigitalSignature {
  id: string;
  user_id: string;
  document_id: string;
  document_type: string;
  document_version: string;
  document_hash: string;
  signer_full_name: string;
  signer_document_type?: string;
  signer_document_number?: string;
  signer_email: string;
  declaration_text: string;
  ip_address: string;
  user_agent: string;
  geolocation?: {
    lat: number;
    lng: number;
    accuracy?: number;
  };
  signature_method: SignatureMethod;
  typed_signature?: string;
  signature_image_url?: string;
  browser_info: BrowserInfo;
  status: SignatureStatus;
  signed_at: string;
  created_at: string;
}

export interface BrowserInfo {
  browser?: string;
  version?: string;
  os?: string;
  platform?: string;
  screen_resolution?: string;
  timezone?: string;
  language?: string;
}

export interface SignatureReceipt {
  id: string;
  document_type: string;
  document_title: string;
  document_version: string;
  document_hash: string;
  signer_full_name: string;
  signer_document_type?: string;
  signer_document_number?: string;
  signer_email: string;
  declaration_text: string;
  signature_method: SignatureMethod;
  typed_signature?: string;
  signature_image_url?: string;
  ip_address: string;
  signed_at: string;
  status: SignatureStatus;
}

export interface MySignatureItem {
  id: string;
  document_type: string;
  document_title: string;
  document_version: string;
  signature_method: SignatureMethod;
  signed_at: string;
  status: SignatureStatus;
  signer_full_name: string;
}

// Mapeo de documentos a método de firma requerido
export const DOCUMENT_SIGNATURE_METHODS: Record<string, SignatureMethod> = {
  // Documentos de registro (simplificados v1.0)
  age_declaration: 'clickwrap',
  general_terms: 'clickwrap',

  // Documentos por rol
  creator_agreement: 'typed_name',
  brand_agreement: 'typed_name',

  // Documentos legacy (mantener para histórico)
  terms_of_service: 'clickwrap',
  privacy_policy: 'clickwrap',
  cookie_policy: 'clickwrap',
  acceptable_use_policy: 'clickwrap',
  age_verification_policy: 'clickwrap',
  content_moderation_policy: 'clickwrap',
  dmca_policy: 'clickwrap',
  live_shopping_terms: 'clickwrap',
  escrow_payment_terms: 'typed_name',
  data_processing_agreement: 'typed_name',
  white_label_agreement: 'drawn_signature',
};

export function getSignatureMethodForDocument(documentType: string): SignatureMethod {
  return DOCUMENT_SIGNATURE_METHODS[documentType] || 'clickwrap';
}

export function getSignatureMethodLabel(method: SignatureMethod): string {
  switch (method) {
    case 'clickwrap':
      return 'Aceptación con clic';
    case 'typed_name':
      return 'Firma con nombre escrito';
    case 'drawn_signature':
      return 'Firma dibujada';
    case 'otp_verified':
      return 'Firma verificada con OTP';
    default:
      return 'Firma electrónica';
  }
}
