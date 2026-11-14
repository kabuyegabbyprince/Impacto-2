import { MemberFee, MemberFeeInstallment } from "../types";

export interface FeeBalanceInfo {
  totalDueAmount: number;
  paidAmount: number;
  remainingBalance: number;
  pendingInstallmentAmount: number;
  percentPaid: number;
  isPartiallyPaid: boolean;
  isFullyPaid: boolean;
  installments: MemberFeeInstallment[];
}

export function getFeeDueName(fee: Partial<MemberFee> | null | undefined): string {
  if (!fee) return "Cooperative Due";
  const explicit = (fee.due_name || "").trim();
  if (explicit) return explicit;
  const periodDate = (fee.period_date || "").trim();
  if (periodDate && periodDate !== "Anytime") return periodDate;
  if (fee.payment_period) {
    return `${fee.payment_period.charAt(0).toUpperCase()}${fee.payment_period.slice(1)} Dues`;
  }
  return "Cooperative Due";
}

export function getFeeBalances(fee: Partial<MemberFee> | null | undefined): FeeBalanceInfo {
  const totalDueAmount = Math.max(0, Number(fee?.total_due_amount ?? fee?.amount ?? 0) || 0);
  const rawPaid = Number(fee?.paid_amount ?? 0) || 0;
  const paidAmount =
    fee?.status === "paid" && rawPaid <= 0
      ? totalDueAmount
      : Math.min(totalDueAmount, Math.max(0, rawPaid));
  const remainingBalance = Math.max(0, totalDueAmount - paidAmount);
  const pendingInstallmentAmount = Math.max(0, Number(fee?.pending_installment_amount ?? 0) || 0);
  const percentPaid = totalDueAmount > 0 ? Math.min(100, Math.round((paidAmount / totalDueAmount) * 100)) : 0;
  const isFullyPaid = fee?.status === "paid" || (totalDueAmount > 0 && remainingBalance <= 0);
  const isPartiallyPaid =
    !isFullyPaid &&
    (fee?.status === "partially_paid" || (paidAmount > 0 && remainingBalance > 0));
  const installments = Array.isArray(fee?.payment_history) ? fee!.payment_history : [];

  return {
    totalDueAmount,
    paidAmount,
    remainingBalance,
    pendingInstallmentAmount,
    percentPaid,
    isPartiallyPaid,
    isFullyPaid,
    installments,
  };
}

export function getEffectiveInstallments(fee: Partial<MemberFee> | null | undefined): MemberFeeInstallment[] {
  if (!fee) return [];
  const rawInstallments = Array.isArray(fee.payment_history) ? fee.payment_history : [];
  if (rawInstallments.length > 0) {
    return [...rawInstallments].sort((a, b) => {
      const ta = new Date(a.paid_at || 0).getTime();
      const tb = new Date(b.paid_at || 0).getTime();
      return ta - tb;
    });
  }

  const bal = getFeeBalances(fee);
  if (bal.paidAmount > 0) {
    return [
      {
        id: `legacy-${fee.id || "fee"}`,
        amount: bal.paidAmount,
        method: fee.paid_by_method || "Direct Settlement",
        reference: fee.transaction_reference || (fee.id ? `REC-${fee.id.slice(0, 8).toUpperCase()}` : "VERIFIED"),
        paid_at: fee.paid_at || fee.reported_at || fee.created_at || new Date().toISOString(),
        verified_by: "Cooperative Accountant",
        note: fee.admin_note || "Verified settlement record",
      },
    ];
  }

  return [];
}

