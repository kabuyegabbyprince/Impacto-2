import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Crown,
  Package,
  Receipt,
  FileText,
  Coins
} from "lucide-react";
import { Badge, Button, Modal } from "./ui";
import { SubscriptionPayment, Organization } from "../types";
import { useOrgSubscriptionPayments, usePlatformSettings } from "../hooks/useImpactoData";
import { useOrgStore } from "../store/orgStore";
import { AddOnPackageId } from "../lib/subscriptionMatrix";

interface SubscriptionPaymentDashboardProps {
  org?: Organization | null;
  orgId?: string;
  onOpenRenewModal?: () => void;
  onOpenAddonModal?: (pkgId?: AddOnPackageId) => void;
}

export const SubscriptionPaymentDashboard: React.FC<SubscriptionPaymentDashboardProps> = ({
  org: propOrg,
  orgId,
  onOpenRenewModal,
}) => {
  const { t } = useTranslation();
  const { activeOrg } = useOrgStore();
  const org = propOrg || activeOrg;
  const targetOrgId = org?.id || orgId;
  const { data: payments = [] } = useOrgSubscriptionPayments(targetOrgId);
  const [selectedPaymentDetail, setSelectedPaymentDetail] = useState<SubscriptionPayment | null>(null);

  const { data: globalPlatformSettings } = usePlatformSettings();
  const usdRate = globalPlatformSettings?.usd_to_rwf_rate || 1400;

  return (
    <div className="flex flex-col gap-6 w-full">
      {/* Verified Transactions & Invoices Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 sm:p-6 shadow-3xs flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
          <div>
            <h4 className="text-sm font-black font-display text-slate-900 dark:text-white flex items-center gap-2">
              <FileText className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              {t("Organization Payment Ledger & MoMo Records", "Organization Payment Ledger & MoMo Records")}
            </h4>
            <p className="text-xs text-slate-500 mt-0.5">
              Real-time synchronization with platform audit logs and mobile money collection ledger.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs font-mono font-bold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-lg">
              {payments.length} {payments.length === 1 ? "entry" : "entries"}
            </span>
            {onOpenRenewModal && (
              <Button
                size="sm"
                onClick={() => onOpenRenewModal()}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs h-8 px-3 rounded-xl shadow-xs flex items-center gap-1.5 cursor-pointer"
              >
                <Receipt className="h-3.5 w-3.5" />
                Submit Receipt Proof
              </Button>
            )}
          </div>
        </div>

        {payments.length > 0 ? (
          <div className="overflow-x-auto border border-slate-200/80 dark:border-slate-800 rounded-xl">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 font-mono text-[10px] uppercase border-b border-slate-200/80 dark:border-slate-800">
                <tr>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Item / Category</th>
                  <th className="px-4 py-3">Gateway & MoMo Phone</th>
                  <th className="px-4 py-3">Reference</th>
                  <th className="px-4 py-3">Amount</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {payments.map((p) => {
                  const pDate = p.created_at || p.submitted_at ? new Date(p.created_at || p.submitted_at) : new Date();
                  const isPkg = p.package_id || p.item_type === "package" || p.plan?.toLowerCase()?.includes("package") || p.plan?.toLowerCase()?.includes("pack");
                  const itemTitle = p.plan || p.plan_details || (isPkg ? "Add-On Package" : "Plan Subscription");
                  const senderPhone = p.phone || p.phone_number || "N/A";
                  const txnRef = p.reference || p.transaction_reference || "N/A";
                  const amountLocal = p.amount_local || (p.amount_usd ? p.amount_usd * usdRate : 33750);

                  return (
                    <tr key={p.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition">
                      <td className="px-4 py-3 font-mono text-slate-600 dark:text-slate-400 whitespace-nowrap">
                        {pDate.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
                      </td>
                      <td className="px-4 py-3 font-medium text-slate-900 dark:text-white">
                        <div className="flex items-center gap-1.5">
                          {isPkg ? (
                            <span className="p-1 rounded-md bg-purple-50 dark:bg-purple-950/60 text-purple-600">
                              <Package className="h-3.5 w-3.5" />
                            </span>
                          ) : (
                            <span className="p-1 rounded-md bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600">
                              <Crown className="h-3.5 w-3.5" />
                            </span>
                          )}
                          <span className="truncate max-w-[200px]">{itemTitle}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-300 font-mono whitespace-nowrap">
                        <div className="flex items-center gap-1">
                          <span className={`h-1.5 w-1.5 rounded-full ${p.method === "airtel" ? "bg-red-500" : "bg-amber-500"}`} />
                          <span>{senderPhone}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 font-mono text-slate-700 dark:text-slate-300 font-bold whitespace-nowrap">
                        <span className="bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-[11px]">
                          {txnRef}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-mono font-bold text-slate-900 dark:text-white whitespace-nowrap">
                        {amountLocal.toLocaleString()} RWF
                        {p.amount_usd && <span className="text-[10px] text-slate-400 ml-1">(${p.amount_usd})</span>}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {p.status === "approved" ? (
                          <Badge color="green">APPROVED</Badge>
                        ) : p.status === "awaiting_approval" ? (
                          <Badge color="yellow">AWAITING REVIEW</Badge>
                        ) : (
                          <Badge color="red">REJECTED</Badge>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setSelectedPaymentDetail(p)}
                          className="h-7 text-[11px] px-2.5 rounded-lg cursor-pointer"
                        >
                          View Receipt
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-8 text-center bg-slate-50 dark:bg-slate-950/40 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 flex flex-col items-center justify-center gap-2">
            <Coins className="h-8 w-8 text-slate-400" />
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300">No payment records found yet</span>
            <p className="text-[11px] text-slate-500 max-w-sm">
              Use MTN MoMo or Airtel Money to activate your subscription plan or add-on feature packages.
            </p>
          </div>
        )}
      </div>

      {/* Payment Receipt / Audit Details Modal */}
      {selectedPaymentDetail && (
        <Modal
          open={!!selectedPaymentDetail}
          onClose={() => setSelectedPaymentDetail(null)}
          title="Mobile Money Payment Evidence & Audit Log"
        >
          <div className="space-y-4 text-xs">
            <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2.5 font-medium">
              <div className="flex justify-between">
                <span className="text-slate-400">Payment ID:</span>
                <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{selectedPaymentDetail.id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Purchased Item:</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">
                  {selectedPaymentDetail.plan || selectedPaymentDetail.plan_details || "Subscription"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Transaction Reference:</span>
                <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                  {selectedPaymentDetail.reference || selectedPaymentDetail.transaction_reference || "N/A"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Sender MoMo Number:</span>
                <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                  {selectedPaymentDetail.phone || selectedPaymentDetail.phone_number || "N/A"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Total Transferred:</span>
                <span className="font-mono font-bold text-emerald-600 text-sm">
                  {(selectedPaymentDetail.amount_local || (selectedPaymentDetail.amount_usd ? selectedPaymentDetail.amount_usd * usdRate : 33750)).toLocaleString()} RWF
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Status:</span>
                <Badge color={selectedPaymentDetail.status === "approved" ? "green" : selectedPaymentDetail.status === "awaiting_approval" ? "yellow" : "red"}>
                  {selectedPaymentDetail.status?.toUpperCase()}
                </Badge>
              </div>
              {selectedPaymentDetail.audited_by_name && (
                <div className="flex justify-between">
                  <span className="text-slate-400">Verified By:</span>
                  <span className="font-bold text-slate-700 dark:text-slate-300">{selectedPaymentDetail.audited_by_name}</span>
                </div>
              )}
              {selectedPaymentDetail.audit_notes && (
                <div className="border-t border-slate-200 dark:border-slate-700 pt-2 flex flex-col gap-1">
                  <span className="text-slate-400">Auditor Notes:</span>
                  <p className="italic text-slate-600 dark:text-slate-300">{selectedPaymentDetail.audit_notes}</p>
                </div>
              )}
              {selectedPaymentDetail.proof_url && (
                <div className="border-t border-slate-200 dark:border-slate-700 pt-2 flex flex-col gap-1">
                  <span className="text-slate-400">MoMo SMS Receipt Copy / Proof:</span>
                  <div className="p-2.5 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 font-mono text-[11px] text-slate-700 dark:text-slate-300 break-all">
                    {selectedPaymentDetail.proof_url}
                  </div>
                </div>
              )}
            </div>

            <Button
              className="w-full bg-slate-900 dark:bg-emerald-600 text-white font-bold h-10 rounded-xl cursor-pointer"
              onClick={() => setSelectedPaymentDetail(null)}
            >
              Close Receipt
            </Button>
          </div>
        </Modal>
      )}
    </div>
  );
};
