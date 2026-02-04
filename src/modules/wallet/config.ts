// Wallet Module Configuration

/**
 * Feature flags for the wallet module
 * Set WALLET_ENABLED to true when ready for production
 */
export const WALLET_CONFIG = {
  /**
   * When false, wallet features are in "Coming Soon" mode
   * Users can see the UI but cannot perform actual transactions
   */
  WALLET_ENABLED: false,

  /**
   * When false, withdrawal requests are disabled
   */
  WITHDRAWALS_ENABLED: false,

  /**
   * When false, escrow releases are disabled
   */
  ESCROW_ENABLED: false,

  /**
   * Minimum withdrawal amount in COP
   */
  MIN_WITHDRAWAL_AMOUNT: 50000,

  /**
   * Platform fee percentage (0-100)
   */
  PLATFORM_FEE_PERCENTAGE: 10,

  /**
   * Coming soon message configuration
   */
  COMING_SOON: {
    title: 'Próximamente',
    subtitle: 'Sistema de Wallet',
    description:
      'Estamos trabajando en el sistema de pagos y retiros. Pronto podrás gestionar tus ganancias directamente desde la plataforma.',
    features: [
      'Balance en tiempo real',
      'Historial de transacciones',
      'Retiros a múltiples métodos de pago',
      'Sistema de escrow para campañas',
      'Panel de administración',
    ],
    estimatedLaunch: 'Q1 2026',
  },
} as const;

/**
 * Check if the wallet module is in production mode
 */
export function isWalletEnabled(): boolean {
  return WALLET_CONFIG.WALLET_ENABLED;
}

/**
 * Check if withdrawals are enabled
 */
export function isWithdrawalsEnabled(): boolean {
  return WALLET_CONFIG.WALLET_ENABLED && WALLET_CONFIG.WITHDRAWALS_ENABLED;
}

/**
 * Check if escrow operations are enabled
 */
export function isEscrowEnabled(): boolean {
  return WALLET_CONFIG.WALLET_ENABLED && WALLET_CONFIG.ESCROW_ENABLED;
}
