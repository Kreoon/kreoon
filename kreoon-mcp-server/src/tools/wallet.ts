import { createClient } from "@supabase/supabase-js";
import {
  AuthContext,
  ToolResult,
  WalletOverviewOutput,
  RequestWithdrawalInput,
  WithdrawalOutput,
} from "../types.js";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export const walletToolDefinitions = [
  {
    name: "get_wallet_overview",
    description:
      "Obtiene el resumen de la billetera del usuario autenticado: " +
      "saldo disponible, pendiente, en reserva, y las últimas transacciones. " +
      "Costo: 0 tokens (solo lectura).",
    inputSchema: {
      type: "object",
      properties: {
        include_history: {
          type: "boolean",
          description: "Incluir historial de transacciones recientes (default: true)",
        },
        history_limit: {
          type: "number",
          description: "Número de transacciones a incluir (default: 10, max: 50)",
          minimum: 1,
          maximum: 50,
        },
      },
    },
  },
  {
    name: "request_withdrawal",
    description:
      "Solicita un retiro de fondos desde la billetera del usuario. " +
      "El monto mínimo es $10 USD. El estado inicial siempre es 'pending'. " +
      "Costo: 0 tokens (operación financiera, no IA).",
    inputSchema: {
      type: "object",
      properties: {
        amount: {
          type: "number",
          description: "Monto a retirar en USD (mínimo: 10)",
          minimum: 10,
        },
        method: {
          type: "string",
          enum: ["stripe_connect", "mercury", "paypal", "manual"],
          description: "Método de pago preferido",
        },
        notes: {
          type: "string",
          description: "Notas opcionales para el administrador",
        },
      },
      required: ["amount", "method"],
    },
  },
];

export async function handleWalletTool(
  toolName: string,
  args: Record<string, unknown>,
  auth: AuthContext
): Promise<ToolResult<WalletOverviewOutput | WithdrawalOutput>> {
  if (toolName === "get_wallet_overview") {
    return getWalletOverview(args, auth);
  }
  if (toolName === "request_withdrawal") {
    return requestWithdrawal(args as unknown as RequestWithdrawalInput, auth);
  }
  return { success: false, error: `Tool desconocida: ${toolName}` };
}

async function getWalletOverview(
  args: Record<string, unknown>,
  auth: AuthContext
): Promise<ToolResult<WalletOverviewOutput>> {
  const includeHistory = args.include_history !== false;
  const historyLimit = Math.min((args.history_limit as number) ?? 10, 50);

  const { data: wallet, error: walletError } = await supabase
    .from("unified_wallets")
    .select("id, user_id, currency, available_balance, pending_balance, reserved_balance")
    .eq("user_id", auth.user_id)
    .single();

  if (walletError || !wallet) {
    return { success: false, error: "Billetera no encontrada para este usuario" };
  }

  let transactions: WalletOverviewOutput["recent_transactions"] = [];

  if (includeHistory) {
    const { data: txData } = await supabase
      .from("unified_transactions")
      .select("id, transaction_type, amount, description, created_at")
      .eq("wallet_id", wallet.id)
      .order("created_at", { ascending: false })
      .limit(historyLimit);

    transactions = (txData ?? []).map((tx) => ({
      id: tx.id,
      type: tx.transaction_type,
      amount: tx.amount,
      description: tx.description,
      created_at: tx.created_at,
    }));
  }

  return {
    success: true,
    data: {
      user_id: auth.user_id,
      currency: wallet.currency ?? "USD",
      balance_available: wallet.available_balance ?? 0,
      balance_pending: wallet.pending_balance ?? 0,
      balance_reserved: wallet.reserved_balance ?? 0,
      recent_transactions: transactions,
    },
    tokens_used: 0,
  };
}

async function requestWithdrawal(
  input: RequestWithdrawalInput,
  auth: AuthContext
): Promise<ToolResult<WithdrawalOutput>> {
  const { amount, method, notes } = input;

  if (amount < 10) {
    return { success: false, error: "El monto mínimo de retiro es $10 USD" };
  }

  // Verificar saldo disponible
  const { data: wallet, error: walletError } = await supabase
    .from("unified_wallets")
    .select("id, available_balance")
    .eq("user_id", auth.user_id)
    .single();

  if (walletError || !wallet) {
    return { success: false, error: "Billetera no encontrada" };
  }

  if ((wallet.available_balance ?? 0) < amount) {
    return {
      success: false,
      error: `Saldo insuficiente. Disponible: $${wallet.available_balance ?? 0} USD`,
    };
  }

  // Crear solicitud de retiro
  const { data: withdrawal, error: withdrawalError } = await supabase
    .from("withdrawal_requests")
    .insert({
      user_id: auth.user_id,
      wallet_id: wallet.id,
      amount,
      method,
      status: "pending",
      notes: notes ?? null,
      created_at: new Date().toISOString(),
    })
    .select("id, status, amount, method, created_at")
    .single();

  if (withdrawalError || !withdrawal) {
    return { success: false, error: `Error creando solicitud: ${withdrawalError?.message}` };
  }

  // Reservar fondos (evita doble retiro)
  await supabase.rpc("reserve_wallet_funds", {
    p_wallet_id: wallet.id,
    p_amount: amount,
  });

  return {
    success: true,
    data: {
      withdrawal_id: withdrawal.id,
      status: "pending",
      amount: withdrawal.amount,
      method: withdrawal.method,
      estimated_arrival:
        method === "stripe_connect"
          ? "2-3 días hábiles"
          : method === "mercury"
          ? "1-2 días hábiles"
          : "3-5 días hábiles",
    },
    tokens_used: 0,
  };
}
