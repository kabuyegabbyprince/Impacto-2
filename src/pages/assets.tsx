import React, { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import {
  Plus,
  Search,
  Trash2,
  Pencil,
  FileText,
  User,
  Boxes,
  MapPin,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Download,
  Layers,
  X
} from "lucide-react";
import { useOrgStore } from "../store/orgStore";
import { useAuthStore } from "../store/authStore";
import { useCurrencyStore } from "../store/currencyStore";
import { useAssets, useCreateAsset, useUpdateAsset, useDeleteAsset, useMembers } from "../hooks/useImpactoData";
import { Button, Modal } from "../components/ui";
import { useToast } from "../components/Toast";
import { PlanGatedView } from "../components/PlanGatedView";
import { Asset } from "../types";

export const AssetManagementPage: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { activeOrg, activeMember } = useOrgStore();
  const { user } = useAuthStore();
  const { activeCurrency, formatAmount } = useCurrencyStore();
  const { addToast } = useToast();

  const { data: assets = [] } = useAssets(activeOrg?.id);
  const { data: members = [] } = useMembers(activeOrg?.id);

  const createMutation = useCreateAsset();
  const updateMutation = useUpdateAsset();
  const deleteMutation = useDeleteAsset();

  const isStaff =
    activeMember?.role === "org_admin" ||
    activeMember?.role === "manager" ||
    (activeMember?.role as string) === "accountant" ||
    !!user?.is_superadmin;

  // Filters & State
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [selectedCondition, setSelectedCondition] = useState<string>("all");

  // Modals
  const [isRecordModalOpen, setIsRecordModalOpen] = useState(false);
  const [editingAsset, setEditingAsset] = useState<Asset | null>(null);
  const [notesModalAsset, setNotesModalAsset] = useState<Asset | null>(null);
  const [quickNotesText, setQuickNotesText] = useState("");
  const [deleteConfirmAsset, setDeleteConfirmAsset] = useState<Asset | null>(null);

  // Form State for Create / Edit
  const [formData, setFormData] = useState({
    name: "",
    category: "General Asset",
    quantity: 1,
    quality: "Standard Grade",
    identifier: "",
    purchase_cost: 0,
    currency: activeCurrency || "RWF",
    purchase_date: new Date().toISOString().split("T")[0],
    condition: "good" as Asset["condition"],
    status: "operational" as Asset["status"],
    assigned_to_member_id: "",
    location: "Main Office / Warehouse",
    notes: "",
  });

  const resetForm = () => {
    setFormData({
      name: "",
      category: "General Asset",
      quantity: 1,
      quality: "Standard Grade",
      identifier: "",
      purchase_cost: 0,
      currency: activeCurrency || "RWF",
      purchase_date: new Date().toISOString().split("T")[0],
      condition: "good",
      status: "operational",
      assigned_to_member_id: "",
      location: "Main Office / Warehouse",
      notes: "",
    });
    setEditingAsset(null);
  };

  const handleOpenCreate = () => {
    resetForm();
    setIsRecordModalOpen(true);
  };

  const handleOpenEdit = (asset: Asset) => {
    setEditingAsset(asset);
    setFormData({
      name: asset.name,
      category: asset.category || "General Asset",
      quantity: asset.quantity ?? 1,
      quality: asset.quality || "",
      identifier: asset.identifier || asset.serial_number || "",
      purchase_cost: asset.purchase_cost ?? 0,
      currency: asset.currency || activeCurrency || "RWF",
      purchase_date: asset.purchase_date || new Date().toISOString().split("T")[0],
      condition: asset.condition || "good",
      status: asset.status || "operational",
      assigned_to_member_id: asset.assigned_to_member_id || "",
      location: asset.location || "",
      notes: asset.notes || "",
    });
    setIsRecordModalOpen(true);
  };

  const handleSaveAsset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeOrg?.id) return;
    if (!formData.name.trim()) {
      addToast(t("asset_tracker.toast_name_required", "Please provide an asset or item name"), "error");
      return;
    }

    // Resolve assigned member name if selected
    let assignedName: string | undefined = undefined;
    if (formData.assigned_to_member_id) {
      const found = members.find((m) => m.id === formData.assigned_to_member_id);
      assignedName = found?.user?.full_name || found?.member_number || t("asset_tracker.assigned_member", "Assigned Member");
    }

    try {
      if (editingAsset) {
        await updateMutation.mutateAsync({
          id: editingAsset.id,
          updates: {
            name: formData.name.trim(),
            category: formData.category,
            quantity: Number(formData.quantity) || 1,
            quality: formData.quality.trim() || undefined,
            identifier: formData.identifier.trim() || undefined,
            serial_number: formData.identifier.trim() || undefined,
            purchase_cost: Number(formData.purchase_cost) || 0,
            currency: formData.currency,
            purchase_date: formData.purchase_date,
            condition: formData.condition,
            status: formData.status,
            assigned_to_member_id: formData.assigned_to_member_id || undefined,
            assigned_to_name: assignedName,
            location: formData.location.trim() || undefined,
            notes: formData.notes.trim() || undefined,
          },
        });
        addToast(t("asset_tracker.toast_updated", "Asset/Stock record updated successfully"), "success");
      } else {
        await createMutation.mutateAsync({
          org_id: activeOrg.id,
          name: formData.name.trim(),
          category: formData.category,
          quantity: Number(formData.quantity) || 1,
          quality: formData.quality.trim() || undefined,
          identifier: formData.identifier.trim() || undefined,
          serial_number: formData.identifier.trim() || undefined,
          purchase_cost: Number(formData.purchase_cost) || 0,
          currency: formData.currency,
          purchase_date: formData.purchase_date,
          condition: formData.condition,
          status: formData.status,
          assigned_to_member_id: formData.assigned_to_member_id || undefined,
          assigned_to_name: assignedName,
          location: formData.location.trim() || undefined,
          notes: formData.notes.trim() || undefined,
        });
        addToast(t("asset_tracker.toast_created", "Asset/Stock recorded into registry"), "success");
      }
      setIsRecordModalOpen(false);
      resetForm();
    } catch (err: any) {
      addToast(err?.message || t("asset_tracker.toast_save_failed", "Failed to save asset record"), "error");
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirmAsset || !activeOrg?.id) return;
    try {
      await deleteMutation.mutateAsync({
        id: deleteConfirmAsset.id,
        orgId: activeOrg.id,
      });
      addToast(t("asset_tracker.toast_deleted", "Asset removed from register"), "success");
      setDeleteConfirmAsset(null);
    } catch (err: any) {
      addToast(err?.message || t("asset_tracker.toast_delete_failed", "Failed to delete asset"), "error");
    }
  };

  const handleOpenNotes = (asset: Asset) => {
    setNotesModalAsset(asset);
    setQuickNotesText(asset.notes || "");
  };

  const handleSaveNotes = async () => {
    if (!notesModalAsset) return;
    try {
      await updateMutation.mutateAsync({
        id: notesModalAsset.id,
        updates: {
          notes: quickNotesText.trim(),
        },
      });
      addToast(t("asset_tracker.toast_notes_updated", "Notes updated"), "success");
      setNotesModalAsset(null);
    } catch (err: any) {
      addToast(t("asset_tracker.toast_notes_failed", "Failed to update notes"), "error");
    }
  };

  // Categories list
  const categories = useMemo(() => {
    const list = Array.from(new Set(assets.map((a) => a.category || "General Asset")));
    return ["all", ...list];
  }, [assets]);

  // Filtered Assets
  const filteredAssets = useMemo(() => {
    return assets.filter((item) => {
      const matchesSearch =
        !searchTerm.trim() ||
        item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.identifier && item.identifier.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (item.serial_number && item.serial_number.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (item.assigned_to_name && item.assigned_to_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (item.notes && item.notes.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (item.quality && item.quality.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchesCat = selectedCategory === "all" || (item.category || "General Asset") === selectedCategory;
      const matchesStatus = selectedStatus === "all" || item.status === selectedStatus;
      const matchesCondition = selectedCondition === "all" || item.condition === selectedCondition;

      return matchesSearch && matchesCat && matchesStatus && matchesCondition;
    });
  }, [assets, searchTerm, selectedCategory, selectedStatus, selectedCondition]);

  // Summary Metrics
  const metrics = useMemo(() => {
    let totalItems = 0;
    let totalValue = 0;
    let inCustodyCount = 0;
    let operationalCount = 0;

    assets.forEach((a) => {
      const q = a.quantity ?? 1;
      const unitCost = Number(a.purchase_cost) || 0;
      totalItems += q;
      totalValue += (unitCost * q);
      if (a.assigned_to_member_id || a.assigned_to_name) inCustodyCount += 1;
      if (a.status === "operational") operationalCount += 1;
    });

    return { totalRecords: assets.length, totalItems, totalValue, inCustodyCount, operationalCount };
  }, [assets]);

  const handleExportCSV = () => {
    if (!filteredAssets.length) {
      addToast(t("asset_tracker.toast_no_export", "No assets to export"), "info");
      return;
    }
    const headers = [
      "Name",
      "Identifier/Serial",
      "Category",
      "Quantity",
      "Quality",
      "Value",
      "Currency",
      "Condition",
      "State/Status",
      "Custodian / Assigned Member",
      "Location",
      "Notes",
      "Date Recorded"
    ];
    const rows = filteredAssets.map((a) => [
      `"${(a.name || "").replace(/"/g, '""')}"`,
      `"${(a.identifier || a.serial_number || "").replace(/"/g, '""')}"`,
      `"${(a.category || "").replace(/"/g, '""')}"`,
      a.quantity ?? 1,
      `"${(a.quality || "").replace(/"/g, '""')}"`,
      a.purchase_cost || 0,
      `"${a.currency || "RWF"}"`,
      `"${a.condition || ""}"`,
      `"${a.status || ""}"`,
      `"${(a.assigned_to_name || "Unassigned").replace(/"/g, '""')}"`,
      `"${(a.location || "").replace(/"/g, '""')}"`,
      `"${(a.notes || "").replace(/"/g, '""')}"`,
      `"${a.purchase_date || a.created_at?.split("T")[0] || ""}"`
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Asset_Register_${activeOrg?.name || "Coop"}_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    addToast(t("asset_tracker.toast_exported", "Asset register CSV exported"), "success");
  };

  const getConditionBadge = (condition: Asset["condition"]) => {
    switch (condition) {
      case "new":
        return <span className="text-xs font-medium text-emerald-700 dark:text-emerald-400">{t("asset_tracker.cond_new", "Brand New")}</span>;
      case "good":
        return <span className="text-xs font-medium text-slate-700 dark:text-slate-300">{t("asset_tracker.cond_good", "Good")}</span>;
      case "fair":
        return <span className="text-xs font-medium text-amber-700 dark:text-amber-400">{t("asset_tracker.cond_fair", "Fair / Aging")}</span>;
      case "needs_repair":
        return <span className="text-xs font-medium text-rose-600 dark:text-rose-400">{t("asset_tracker.cond_needs_repair", "Needs Repair")}</span>;
      case "damaged":
        return <span className="text-xs font-medium text-rose-700 dark:text-rose-400">{t("asset_tracker.cond_damaged", "Damaged")}</span>;
      default:
        return <span className="text-xs font-medium text-slate-600 dark:text-slate-400">{t("asset_tracker.standard", "Standard")}</span>;
    }
  };

  const getStatusBadge = (status: Asset["status"]) => {
    switch (status) {
      case "operational":
        return <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700 dark:text-emerald-400"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>{t("asset_tracker.status_operational", "Operational")}</span>;
      case "maintenance":
        return <span className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-700 dark:text-amber-400"><Clock className="w-3.5 h-3.5" />{t("asset_tracker.status_maintenance", "Maintenance")}</span>;
      case "in_storage":
        return <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 dark:text-slate-400"><Boxes className="w-3.5 h-3.5" />{t("asset_tracker.status_in_storage", "In Storage")}</span>;
      case "decommissioned":
        return <span className="inline-flex items-center gap-1.5 text-xs font-medium text-stone-500">{t("asset_tracker.status_decommissioned", "Decommissioned")}</span>;
      case "disposed":
        return <span className="inline-flex items-center gap-1.5 text-xs font-medium text-rose-600">{t("asset_tracker.status_disposed", "Disposed")}</span>;
      default:
        return <span className="text-xs font-medium text-slate-600">{status}</span>;
    }
  };

  return (
    <PlanGatedView
      requiredTier="pro"
      featureKey="asset_tracker"
      featureName={t("asset_tracker.gated_feature_name", "Asset and Stock Management")}
      customMessage={t("asset_tracker.gated_message", "Asset and Stock Management is available on the Pro Plan ($25/mo). Upgrade to the Pro Plan to track physical equipment, warehouse stock, custody assignments, and depreciation logs.")}
    >
      <div className="space-y-6 pb-16">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
        <div className="min-w-0">
          <h1 className="text-xl md:text-2xl font-bold tracking-tight text-slate-900 dark:text-white break-words">
            {t("asset_tracker.page_title", "Asset and Inventory Management")}
          </h1>
          <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-2xl break-words">
            {t("asset_tracker.page_subtitle", "Keep clear records of organizational equipment, inventory quantities, quality grades, market values, custody accountability, and maintenance notes.")}
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCSV}
            icon={<Download className="h-3.5 w-3.5" />}
          >
            {t("asset_tracker.export_csv", "Export CSV")}
          </Button>

          {isStaff && (
            <Button
              variant="primary"
              size="sm"
              onClick={handleOpenCreate}
              icon={<Plus className="h-4 w-4" />}
            >
              {t("asset_tracker.record_new", "Record New Asset")}
            </Button>
          )}
        </div>
      </div>

      {/* KPI Metric Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs min-w-0">
          <div className="flex items-center justify-between gap-2 text-xs font-medium text-slate-500 dark:text-slate-400">
            <span className="truncate">{t("asset_tracker.total_book_value", "Total Book Value")}</span>
            <Boxes className="h-4 w-4 text-slate-400 shrink-0" />
          </div>
          <div className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white mt-2 tabular-nums break-words">
            {formatAmount(metrics.totalValue)}
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-normal break-words">{t("asset_tracker.recorded_acq_value", "Recorded acquisition value")}</p>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs min-w-0">
          <div className="flex items-center justify-between gap-2 text-xs font-medium text-slate-500 dark:text-slate-400">
            <span className="truncate">{t("asset_tracker.stock_units", "Stock Units")}</span>
            <Layers className="h-4 w-4 text-slate-400 shrink-0" />
          </div>
          <div className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white mt-2 tabular-nums break-words">
            {metrics.totalItems} <span className="text-xs font-normal text-slate-500">({t("asset_tracker.entries_count", { count: metrics.totalRecords, defaultValue: "{{count}} entries" })})</span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-normal break-words">{t("asset_tracker.cumulative_inventory", "Cumulative inventory")}</p>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs min-w-0">
          <div className="flex items-center justify-between gap-2 text-xs font-medium text-slate-500 dark:text-slate-400">
            <span className="truncate">{t("asset_tracker.assigned_custody", "Assigned in Custody")}</span>
            <User className="h-4 w-4 text-slate-400 shrink-0" />
          </div>
          <div className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white mt-2 tabular-nums">
            {metrics.inCustodyCount} <span className="text-xs font-normal text-slate-500">/ {metrics.totalRecords}</span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-normal break-words">{t("asset_tracker.under_custody", "Under member custody")}</p>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs min-w-0">
          <div className="flex items-center justify-between gap-2 text-xs font-medium text-slate-500 dark:text-slate-400">
            <span className="truncate">{t("asset_tracker.operational_rate", "Operational Rate")}</span>
            <CheckCircle2 className="h-4 w-4 text-slate-400 shrink-0" />
          </div>
          <div className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white mt-2 tabular-nums">
            {metrics.totalRecords > 0 ? Math.round((metrics.operationalCount / metrics.totalRecords) * 100) : 100}%
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-normal break-words">{t("asset_tracker.ready_active_service", { count: metrics.operationalCount, defaultValue: "{{count}} ready for active service" })}</p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white dark:bg-slate-900 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 shadow-xs">
        <div className="relative w-full md:w-80 min-w-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder={t("asset_tracker.search_placeholder", "Search name, identifier, custodian, notes...")}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-8 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs md:text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-emerald-600"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-white"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto flex-wrap">
          {/* Category Filter */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-medium text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-1 focus:ring-emerald-600"
          >
            <option value="all">{t("asset_tracker.all_categories", "All Categories")}</option>
            {categories.filter((c) => c !== "all").map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>

          {/* Condition Filter */}
          <select
            value={selectedCondition}
            onChange={(e) => setSelectedCondition(e.target.value)}
            className="px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-medium text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-1 focus:ring-emerald-600"
          >
            <option value="all">{t("asset_tracker.all_conditions", "All Conditions")}</option>
            <option value="new">{t("asset_tracker.cond_new", "Brand New")}</option>
            <option value="good">{t("asset_tracker.cond_good", "Good")}</option>
            <option value="fair">{t("asset_tracker.cond_fair", "Fair / Aging")}</option>
            <option value="needs_repair">{t("asset_tracker.cond_needs_repair", "Needs Repair")}</option>
            <option value="damaged">{t("asset_tracker.cond_damaged", "Damaged")}</option>
          </select>

          {/* State / Status Filter */}
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-medium text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-1 focus:ring-emerald-600"
          >
            <option value="all">{t("asset_tracker.all_states", "All Operational States")}</option>
            <option value="operational">{t("asset_tracker.status_operational", "Operational")}</option>
            <option value="maintenance">{t("asset_tracker.status_maintenance", "Maintenance")}</option>
            <option value="in_storage">{t("asset_tracker.status_in_storage_stock", "In Storage / Stock")}</option>
            <option value="decommissioned">{t("asset_tracker.status_decommissioned", "Decommissioned")}</option>
            <option value="disposed">{t("asset_tracker.status_disposed", "Disposed")}</option>
          </select>
        </div>
      </div>

      {/* Asset Table Registry */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-600 dark:text-slate-400">
              <tr>
                <th className="py-3 px-4">{t("asset_tracker.col_item", "Asset / Stock Item")}</th>
                <th className="py-3 px-3">{t("asset_tracker.col_category_id", "Category & ID")}</th>
                <th className="py-3 px-3 text-center">{t("asset_tracker.col_qty", "Qty")}</th>
                <th className="py-3 px-3">{t("asset_tracker.col_quality", "Quality Grade")}</th>
                <th className="py-3 px-3">{t("asset_tracker.col_value", "Acquisition Value")}</th>
                <th className="py-3 px-3">{t("asset_tracker.col_condition_state", "Condition & State")}</th>
                <th className="py-3 px-3">{t("asset_tracker.col_custody", "Custody")}</th>
                <th className="py-3 px-3">{t("asset_tracker.col_notes", "Notes")}</th>
                <th className="py-3 px-4 text-right">{t("asset_tracker.col_actions", "Actions")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredAssets.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Boxes className="h-8 w-8 text-slate-300 dark:text-slate-600" />
                      <p className="font-medium">{t("asset_tracker.empty_query", "No assets or stock found matching your query.")}</p>
                      {isStaff && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleOpenCreate}
                          className="mt-2"
                        >
                          {t("asset_tracker.record_first", "Record First Asset")}
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                filteredAssets.map((asset) => {
                  const assignedMember = members.find((m) => m.id === asset.assigned_to_member_id);
                  const displayCustodian =
                    asset.assigned_to_name ||
                    assignedMember?.user?.full_name ||
                    assignedMember?.member_number ||
                    (asset.assigned_to_member_id ? t("asset_tracker.assigned_member", "Assigned Member") : t("asset_tracker.unassigned_storage", "Unassigned / General Storage"));

                  return (
                    <tr
                      key={asset.id}
                      className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      {/* Name & Location */}
                      <td className="py-3.5 px-4 font-semibold text-slate-900 dark:text-white">
                        <div className="font-medium text-slate-900 dark:text-white break-words">{asset.name}</div>
                        {asset.location && (
                          <div className="flex items-center gap-1 text-[11px] text-slate-400 font-normal mt-0.5">
                            <MapPin className="h-3 w-3 shrink-0 text-slate-400" />
                            <span className="truncate max-w-[160px]">{asset.location}</span>
                          </div>
                        )}
                      </td>

                      {/* Category & Identifier */}
                      <td className="py-3.5 px-3">
                        <span className="inline-block text-xs font-medium text-slate-600 dark:text-slate-300">
                          {asset.category || t("asset_tracker.general", "General")}
                        </span>
                        {asset.identifier ? (
                          <div className="text-[10px] font-mono text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded w-fit mt-0.5">
                            {asset.identifier}
                          </div>
                        ) : asset.serial_number ? (
                          <div className="text-[10px] font-mono text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded w-fit mt-0.5">
                            {asset.serial_number}
                          </div>
                        ) : (
                          <span className="text-[10px] text-slate-400 italic block mt-0.5">{t("asset_tracker.no_tag_id", "No tag ID")}</span>
                        )}
                      </td>

                      {/* Quantity */}
                      <td className="py-3.5 px-3 text-center">
                        <span className="inline-flex items-center justify-center font-semibold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs tabular-nums">
                          {asset.quantity ?? 1}
                        </span>
                      </td>

                      {/* Quality */}
                      <td className="py-3.5 px-3 text-slate-700 dark:text-slate-300">
                        {asset.quality ? (
                          <span className="text-xs font-normal text-slate-700 dark:text-slate-300">
                            {asset.quality}
                          </span>
                        ) : (
                          <span className="text-xs text-slate-400 italic">{t("asset_tracker.standard", "Standard")}</span>
                        )}
                      </td>

                      {/* Acquisition Value */}
                      <td className="py-3.5 px-3">
                        <div className="font-semibold text-slate-900 dark:text-white tabular-nums">
                          {formatAmount((Number(asset.purchase_cost) || 0) * (asset.quantity ?? 1))}
                        </div>
                        {(asset.quantity ?? 1) > 1 ? (
                          <span className="text-[10px] text-slate-400 block mt-0.5 tabular-nums">
                            {formatAmount(asset.purchase_cost || 0)}{t("asset_tracker.per_unit", "/unit")}
                          </span>
                        ) : asset.purchase_date ? (
                          <span className="text-[10px] text-slate-400 block mt-0.5">
                            {asset.purchase_date}
                          </span>
                        ) : null}
                      </td>

                      {/* Condition & Operational Status */}
                      <td className="py-3.5 px-3 space-y-1">
                        <div>{getConditionBadge(asset.condition)}</div>
                        <div>{getStatusBadge(asset.status)}</div>
                      </td>

                      {/* Custody */}
                      <td className="py-3.5 px-3">
                        {asset.assigned_to_member_id || asset.assigned_to_name ? (
                          <div className="flex items-center gap-1.5">
                            <div className="w-5 h-5 rounded-full bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 flex items-center justify-center text-[10px] font-medium shrink-0">
                              <User className="h-3 w-3" />
                            </div>
                            <div className="truncate max-w-[150px]">
                              <span className="font-medium text-slate-800 dark:text-slate-200 text-xs block truncate">
                                {displayCustodian}
                              </span>
                            </div>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400 italic">
                            {t("asset_tracker.status_in_storage", "In Storage")}
                          </span>
                        )}
                      </td>

                      {/* Notes / Log */}
                      <td className="py-3.5 px-3 max-w-[180px]">
                        {asset.notes ? (
                          <div
                            onClick={() => handleOpenNotes(asset)}
                            className="cursor-pointer group flex items-start gap-1 text-xs text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                            title={t("asset_tracker.click_view_edit_notes", "Click to view and edit notes")}
                          >
                            <FileText className="h-3.5 w-3.5 shrink-0 text-slate-400 group-hover:text-emerald-600 mt-0.5" />
                            <span className="truncate">{asset.notes}</span>
                          </div>
                        ) : (
                          <button
                            onClick={() => handleOpenNotes(asset)}
                            className="text-xs text-slate-400 hover:text-emerald-600 flex items-center gap-1"
                          >
                            <Plus className="h-3 w-3" /> {t("asset_tracker.add_notes", "Add notes")}
                          </button>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => handleOpenNotes(asset)}
                            className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                            title={t("asset_tracker.view_edit_notes", "View/Edit notes")}
                          >
                            <FileText className="h-3.5 w-3.5" />
                          </button>

                          {isStaff && (
                            <>
                              <button
                                onClick={() => handleOpenEdit(asset)}
                                className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                                title={t("asset_tracker.edit_asset_btn", "Edit Asset")}
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </button>

                              <button
                                onClick={() => setDeleteConfirmAsset(asset)}
                                className="p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 rounded-md hover:bg-rose-50 dark:hover:bg-rose-950/40 transition"
                                title={t("asset_tracker.remove_asset_btn", "Remove Asset")}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* CREATE / EDIT ASSET MODAL */}
      <Modal
        isOpen={isRecordModalOpen}
        onClose={() => {
          setIsRecordModalOpen(false);
          resetForm();
        }}
        title={editingAsset ? t("asset_tracker.modal_edit_title", "Edit Asset / Custody Details") : t("asset_tracker.modal_create_title", "Record New Asset or Stock")}
      >
        <form onSubmit={handleSaveAsset} className="space-y-4 text-xs md:text-sm">
          {/* Asset Name */}
          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
              {t("asset_tracker.field_name", "Asset or Stock Name")} <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder={t("asset_tracker.placeholder_name", "e.g., Solar Irrigation Pump, Dell Laptop, NPK Fertilizer 50kg")}
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#156c45]"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {/* Category */}
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                {t("asset_tracker.field_category", "Category")}
              </label>
              <input
                type="text"
                list="category-suggestions"
                placeholder={t("asset_tracker.placeholder_category", "e.g., Machinery, Stock / Supplies, IT Hardware")}
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full px-3 py-2 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#156c45]"
              />
              <datalist id="category-suggestions">
                <option value={t("asset_tracker.cat_machinery", "Machinery & Equipment")} />
                <option value={t("asset_tracker.cat_stock", "Stock / Supplies")} />
                <option value={t("asset_tracker.cat_it", "IT Hardware")} />
                <option value={t("asset_tracker.cat_vehicles", "Vehicles & Transport")} />
                <option value={t("asset_tracker.cat_furniture", "Office Furniture")} />
                <option value={t("asset_tracker.cat_agri", "Agricultural Tools")} />
              </datalist>
            </div>

            {/* Identifier / Serial */}
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                {t("asset_tracker.field_identifier", "Identifier / Tag / Serial")} <span className="text-slate-400 font-normal">({t("common.optional", "Optional")})</span>
              </label>
              <input
                type="text"
                placeholder={t("asset_tracker.placeholder_identifier", "e.g., TAG-2026-001 or SKU-NPK-99")}
                value={formData.identifier}
                onChange={(e) => setFormData({ ...formData, identifier: e.target.value })}
                className="w-full px-3 py-2 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#156c45]"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {/* Quantity */}
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                {t("asset_tracker.field_quantity", "Quantity (Count)")}
              </label>
              <input
                type="number"
                min="1"
                value={formData.quantity}
                onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) || 1 })}
                className="w-full px-3 py-2 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#156c45]"
              />
            </div>

            {/* Quality Grade */}
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                {t("asset_tracker.field_quality", "Quality Grade / Spec")} <span className="text-slate-400 font-normal">({t("common.optional", "Optional")})</span>
              </label>
              <input
                type="text"
                placeholder={t("asset_tracker.placeholder_quality", "e.g., Grade A, Export Certified, Refurbished")}
                value={formData.quality}
                onChange={(e) => setFormData({ ...formData, quality: e.target.value })}
                className="w-full px-3 py-2 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#156c45]"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {/* Value (Cost) */}
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                {t("asset_tracker.field_value_cost", { currency: formData.currency, defaultValue: "Value / Acquisition Cost ({{currency}})" })}
              </label>
              <input
                type="number"
                min="0"
                step="any"
                value={formData.purchase_cost}
                onChange={(e) => setFormData({ ...formData, purchase_cost: parseFloat(e.target.value) || 0 })}
                className="w-full px-3 py-2 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#156c45]"
              />
            </div>

            {/* Date */}
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                {t("asset_tracker.field_acq_date", "Acquisition / Stock Date")}
              </label>
              <input
                type="date"
                value={formData.purchase_date}
                onChange={(e) => setFormData({ ...formData, purchase_date: e.target.value })}
                className="w-full px-3 py-2 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#156c45]"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {/* Condition */}
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                {t("asset_tracker.field_condition", "Physical Condition")}
              </label>
              <select
                value={formData.condition}
                onChange={(e) => setFormData({ ...formData, condition: e.target.value as any })}
                className="w-full px-3 py-2 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#156c45]"
              >
                <option value="new">{t("asset_tracker.cond_new", "Brand New")}</option>
                <option value="good">{t("asset_tracker.cond_good_opt", "Good (Normal operation)")}</option>
                <option value="fair">{t("asset_tracker.cond_fair_opt", "Fair (Wear and tear)")}</option>
                <option value="needs_repair">{t("asset_tracker.cond_repair_opt", "Needs Repair / Maintenance")}</option>
                <option value="damaged">{t("asset_tracker.cond_damaged", "Damaged")}</option>
              </select>
            </div>

            {/* State */}
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                {t("asset_tracker.field_state", "State / Status")}
              </label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                className="w-full px-3 py-2 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#156c45]"
              >
                <option value="operational">{t("asset_tracker.status_operational_opt", "Operational (In active use)")}</option>
                <option value="in_storage">{t("asset_tracker.status_storage_opt", "In Storage / Central Warehouse")}</option>
                <option value="maintenance">{t("asset_tracker.status_maintenance_opt", "Under Repair / Maintenance")}</option>
                <option value="decommissioned">{t("asset_tracker.status_decommissioned", "Decommissioned")}</option>
                <option value="disposed">{t("asset_tracker.status_disposed_opt", "Disposed / Written Off")}</option>
              </select>
            </div>
          </div>

          {/* Custody & Member Assignment */}
          <div className="p-3.5 bg-purple-50/50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-800/40 rounded-xl space-y-2">
            <div className="flex items-center gap-1.5 text-purple-900 dark:text-purple-300 font-bold text-xs">
              <User className="h-4 w-4 text-purple-600 shrink-0" />
              <span className="break-words">{t("asset_tracker.custody_title", "Custody & Member Assignment (Accountability)")}</span>
            </div>
            <p className="text-[11px] text-purple-700/80 dark:text-purple-300/80 break-words">
              {t("asset_tracker.custody_desc", "Designate who is physically holding or personally responsible for this asset or stock batch.")}
            </p>

            <select
              value={formData.assigned_to_member_id}
              onChange={(e) => setFormData({ ...formData, assigned_to_member_id: e.target.value })}
              className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-purple-200 dark:border-purple-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="">{t("asset_tracker.custody_none", "-- No Specific Member (Central Storage / Communal) --")}</option>
              {members.map((mem) => (
                <option key={mem.id} value={mem.id}>
                  {mem.user?.full_name || mem.member_number || t("common.member", "Member")} ({mem.role || t("common.member", "Member")})
                </option>
              ))}
            </select>
          </div>

          {/* Storage / Location */}
          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
              {t("asset_tracker.field_location", "Physical Location / Unit")}
            </label>
            <input
              type="text"
              placeholder={t("asset_tracker.placeholder_location", "e.g., Central Warehouse Bay 3, Sector Office Desk 2, Field Station Huye")}
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              className="w-full px-3 py-2 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#156c45]"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
              {t("asset_tracker.field_notes", "Notes & Incident History (Explain what happened / service history)")}
            </label>
            <textarea
              rows={3}
              placeholder={t("asset_tracker.placeholder_notes", "Add explanation on condition, repair history, handover circumstances, or special handling instructions...")}
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="w-full px-3 py-2 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#156c45]"
            />
          </div>

          <div className="flex flex-wrap items-center justify-end gap-2.5 pt-3 border-t border-gray-100 dark:border-slate-800">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setIsRecordModalOpen(false);
                resetForm();
              }}
            >
              {t("common.cancel", "Cancel")}
            </Button>
            <Button
              type="submit"
              variant="primary"
              loading={createMutation.isPending || updateMutation.isPending}
            >
              {editingAsset ? t("asset_tracker.save_changes", "Save Changes") : t("asset_tracker.save_register", "Save to Register")}
            </Button>
          </div>
        </form>
      </Modal>

      {/* QUICK NOTES MODAL */}
      <Modal
        isOpen={!!notesModalAsset}
        onClose={() => setNotesModalAsset(null)}
        title={t("asset_tracker.notes_modal_title", { name: notesModalAsset?.name || "", defaultValue: "Asset Notes & History: {{name}}" })}
      >
        <div className="space-y-4 text-xs md:text-sm">
          <p className="text-slate-500 dark:text-slate-400 break-words">
            {t("asset_tracker.notes_modal_desc", "Record updates, inspection notes, repair logs, or incident reports for this item.")}
          </p>

          <textarea
            rows={5}
            value={quickNotesText}
            onChange={(e) => setQuickNotesText(e.target.value)}
            placeholder={t("asset_tracker.notes_modal_placeholder", "Document what happened to this item, maintenance performed, or handover notes...")}
            className="w-full p-3 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#156c45] font-sans"
          />

          <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
            <span className="text-[11px] text-slate-400">
              {t("asset_tracker.last_updated", "Last updated:")} {notesModalAsset?.updated_at ? new Date(notesModalAsset.updated_at).toLocaleString(i18n.language) : t("asset_tracker.recently", "Recently")}
            </span>
            <div className="flex flex-wrap items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => setNotesModalAsset(null)}>
                {t("common.close", "Close")}
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleSaveNotes}
                loading={updateMutation.isPending}
              >
                {t("asset_tracker.save_notes", "Save Notes")}
              </Button>
            </div>
          </div>
        </div>
      </Modal>

      {/* DELETE CONFIRMATION MODAL */}
      <Modal
        isOpen={!!deleteConfirmAsset}
        onClose={() => setDeleteConfirmAsset(null)}
        title={t("asset_tracker.delete_modal_title", "Remove Asset from Registry")}
      >
        <div className="space-y-4 text-xs md:text-sm">
          <div className="p-3 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900 rounded-xl flex items-start gap-2.5 text-rose-800 dark:text-rose-300">
            <AlertTriangle className="h-5 w-5 shrink-0 text-rose-600 mt-0.5" />
            <div className="min-w-0">
              <div className="font-bold break-words">{t("asset_tracker.delete_confirm_heading", "Are you sure you want to remove this asset?")}</div>
              <p className="mt-1 text-xs opacity-90 break-words">
                {t("asset_tracker.delete_confirm_desc", {
                  name: deleteConfirmAsset?.name || "",
                  id: deleteConfirmAsset?.identifier ? ` (${deleteConfirmAsset.identifier})` : "",
                  defaultValue: "You are about to delete {{name}}{{id}}. This action cannot be undone."
                })}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setDeleteConfirmAsset(null)}>
              {t("common.cancel", "Cancel")}
            </Button>
            <Button
              variant="danger"
              onClick={handleDelete}
              loading={deleteMutation.isPending}
            >
              {t("asset_tracker.delete_btn", "Delete Asset")}
            </Button>
          </div>
        </div>
      </Modal>
      </div>
    </PlanGatedView>
  );
};
