-- Eliminar referencias al "sistema de escrow" en los documentos legales de la DB
-- Los contratos ahora usan lenguaje de "pago anticipado a KREOON / SICOMMER INT LLC"

UPDATE legal_documents
SET
  content_html = REPLACE(
    REPLACE(
      REPLACE(
        content_html,
        'en el sistema de escrow de KREOON. Esta regla aplica a:',
        'directamente a KREOON (SICOMMER INT LLC), por los medios de pago autorizados (Stripe o transferencia bancaria). Esta regla aplica a:'
      ),
      'Cliente deposita fondos en escrow (100% del valor)',
      'Cliente realiza el pago del 100% del valor a KREOON por los medios autorizados (Stripe o transferencia bancaria a Mercury Bank)'
    ),
    'Una vez aprobado el contenido y liberados los fondos del escrow, el Cliente recibe:',
    'Una vez aprobado el contenido y liberado el pago al Talento por parte de KREOON, el Cliente recibe:'
  ),
  updated_at = NOW()
WHERE document_type = 'client_agreement'
  AND content_html ILIKE '%escrow%';

-- Actualizar cualquier otro documento legal que mencione "sistema de escrow" o "fondos en escrow"
UPDATE legal_documents
SET
  content_html = REPLACE(
    REPLACE(
      REPLACE(
        REPLACE(
          content_html,
          'Términos de Escrow y Pagos',
          'Términos de Pago Anticipado'
        ),
        'Terminos de Escrow y Pagos',
        'Términos de Pago Anticipado'
      ),
      'sistema de escrow de KREOON',
      'sistema de pagos anticipados de KREOON'
    ),
    'fondos se mantienen en custodia (escrow)',
    'fondos son recibidos por KREOON y liberados al Creador tras aprobación'
  ),
  updated_at = NOW()
WHERE document_type != 'client_agreement'
  AND content_html ILIKE '%escrow%';
