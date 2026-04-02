-- Agregar campo de fecha límite de pago a paquetes de cliente
-- Permite mostrar al cliente cuándo debe realizar el pago pendiente

ALTER TABLE client_packages
ADD COLUMN IF NOT EXISTS payment_due_date DATE DEFAULT NULL;

-- Comentario descriptivo
COMMENT ON COLUMN client_packages.payment_due_date IS 'Fecha límite para completar el pago del paquete';

-- Índice para consultas de paquetes con pagos vencidos
CREATE INDEX IF NOT EXISTS idx_client_packages_payment_due_date
ON client_packages (payment_due_date)
WHERE payment_due_date IS NOT NULL AND payment_status != 'paid';
