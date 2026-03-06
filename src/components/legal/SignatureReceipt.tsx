import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  CheckCircle2, FileText, Download, X, Shield,
  Calendar, MapPin, Hash, User, Mail, Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useDigitalSignature } from '@/hooks/useDigitalSignature';
import { SignatureReceipt as SignatureReceiptType, getSignatureMethodLabel } from '@/types/digital-signature';
import { cn } from '@/lib/utils';

interface SignatureReceiptProps {
  signatureId: string;
  isOpen: boolean;
  onClose: () => void;
}

export function SignatureReceipt({ signatureId, isOpen, onClose }: SignatureReceiptProps) {
  const { getSignatureReceipt } = useDigitalSignature();
  const [receipt, setReceipt] = useState<SignatureReceiptType | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (isOpen && signatureId) {
      setIsLoading(true);
      getSignatureReceipt(signatureId)
        .then(setReceipt)
        .finally(() => setIsLoading(false));
    }
  }, [isOpen, signatureId, getSignatureReceipt]);

  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[300] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="bg-gradient-to-b from-slate-900 to-slate-950 border border-white/10 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto my-auto"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/10 bg-green-500/10 sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-500/20 rounded-full">
              <CheckCircle2 className="w-6 h-6 text-green-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">Comprobante de Firma</h2>
              <p className="text-sm text-green-400">Firma electrónica válida</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
            aria-label="Cerrar"
          >
            <X className="w-5 h-5 text-white" />
          </button>
        </div>

        {/* Contenido */}
        <div className="p-6 space-y-6">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="w-8 h-8 text-purple-400 animate-spin mb-4" />
              <p className="text-white/60">Cargando comprobante...</p>
            </div>
          ) : receipt ? (
            <>
              {/* Documento */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-white/60">
                  <FileText className="w-4 h-4" />
                  <span className="text-sm uppercase tracking-wide">Documento</span>
                </div>
                <div className="bg-white/5 rounded-lg p-4">
                  <p className="text-white font-medium">{receipt.document_title}</p>
                  <p className="text-sm text-white/60">Versión {receipt.document_version}</p>
                </div>
              </div>

              {/* Firmante */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-white/60">
                  <User className="w-4 h-4" />
                  <span className="text-sm uppercase tracking-wide">Firmante</span>
                </div>
                <div className="bg-white/5 rounded-lg p-4 space-y-2">
                  <p className="text-white font-medium">{receipt.signer_full_name}</p>
                  {receipt.signer_document_type && receipt.signer_document_number && (
                    <p className="text-sm text-white/60">
                      {receipt.signer_document_type.toUpperCase()}: {receipt.signer_document_number}
                    </p>
                  )}
                  <div className="flex items-center gap-2 text-sm text-white/60">
                    <Mail className="w-3 h-3" />
                    {receipt.signer_email}
                  </div>
                </div>
              </div>

              {/* Detalles de firma */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-white/60">
                    <Calendar className="w-4 h-4" />
                    <span className="text-sm">Fecha</span>
                  </div>
                  <p className="text-white text-sm">
                    {new Date(receipt.signed_at).toLocaleString('es-CO', {
                      timeZone: 'America/Bogota',
                      dateStyle: 'long',
                      timeStyle: 'medium',
                    })}
                  </p>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-white/60">
                    <MapPin className="w-4 h-4" />
                    <span className="text-sm">IP</span>
                  </div>
                  <p className="text-white text-sm font-mono">{receipt.ip_address}</p>
                </div>
              </div>

              {/* Hash */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-white/60">
                  <Hash className="w-4 h-4" />
                  <span className="text-sm">Hash SHA-256</span>
                </div>
                <p className="text-xs text-white/60 font-mono break-all bg-white/5 rounded p-2">
                  {receipt.document_hash}
                </p>
              </div>

              {/* Método de firma */}
              <div className="flex items-center justify-between py-3 border-t border-white/10">
                <span className="text-white/60">Método de firma</span>
                <span className="text-white font-medium">
                  {getSignatureMethodLabel(receipt.signature_method)}
                </span>
              </div>

              {/* Firma visual si existe */}
              {receipt.typed_signature && (
                <div className="text-center py-4 border-t border-white/10">
                  <p className="text-2xl font-serif italic text-white">
                    {receipt.typed_signature}
                  </p>
                  <p className="text-xs text-white/40 mt-2">Firma escrita</p>
                </div>
              )}

              {receipt.signature_image_url && (
                <div className="text-center py-4 border-t border-white/10">
                  <img
                    src={receipt.signature_image_url}
                    alt="Firma"
                    className="max-h-20 mx-auto"
                  />
                  <p className="text-xs text-white/40 mt-2">Firma dibujada</p>
                </div>
              )}

              {/* Declaración legal */}
              <div className="bg-purple-500/10 rounded-lg p-4 text-sm text-white/70">
                <p>
                  Este documento fue firmado electrónicamente a través de KREOON,
                  operada por SICOMMER INT LLC. La firma electrónica tiene plena
                  validez legal conforme a la Ley 527/1999 (Colombia), ESIGN Act
                  (USA), eIDAS (UE) y normativa aplicable.
                </p>
              </div>

              {/* ID de firma */}
              <div className="text-center text-xs text-white/30">
                ID de firma: {receipt.id}
              </div>

              {/* Acciones */}
              <div className="flex gap-3 pt-2">
                <Button
                  variant="outline"
                  className="flex-1 bg-white/5 border-white/10 text-white hover:bg-white/10"
                  onClick={() => {
                    // TODO: Implementar descarga de PDF
                    alert('Próximamente: Descarga de comprobante PDF');
                  }}
                >
                  <Download className="w-4 h-4 mr-2" />
                  Descargar PDF
                </Button>
                <Button
                  onClick={onClose}
                  className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500"
                >
                  Cerrar
                </Button>
              </div>
            </>
          ) : (
            <div className="text-center py-12 text-white/40">
              <p>No se pudo cargar el comprobante</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-center gap-2 p-4 border-t border-white/10 text-xs text-white/30">
          <Shield className="w-3 h-3" />
          Firma electrónica segura — SICOMMER INT LLC
        </div>
      </motion.div>
    </motion.div>
  );
}

export default SignatureReceipt;
