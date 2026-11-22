import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { Box, Plus, Search, Filter, QrCode, Download, Edit3, Trash2, CheckCircle2, AlertTriangle, RefreshCw, X, Shield, User, MapPin } from "lucide-react";
import { Asset, OrgMember } from "../types";
import { MockDB } from "../lib/mockData";
import { supabase, isSupabaseConfigured } from "../lib/supabase";
import { useOrgStore } from "../store/orgStore";
import { useToast } from "./Toast";
import { OfflineSyncService } from "../lib/offlineSyncService";

interface AssetTrackerProps {
  members?: OrgMember[];
}

export const AssetTracker: React.FC<AssetTrackerProps> = ({ members = [] }) => {
  const { t } = useTranslation();
  const { activeOrg } = useOrgStore();
  const { addToast } = useToast();

  const [assets, setAssets] = useState<Asset[]>(() => {
    return MockDB.getAssets().filter((a: Asset) => !activeOrg?.id || a.org_id === activeOrg.id || a.org_id === "org-1");
  });

  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const [showModal, setShowModal] = useState(false);
  const [editingAsset, setEditingAsset] = useState<Asset | null>(null);
  const [showQrModal, setShowQrModal] = useState<Asset | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Form State
  const [name, setName] = useState("");
  const [category, setCategory] = useState("Field Equipment");
  const [serialNumber, setSerialNumber] = useState("");
  const [purchaseDate, setPurchaseDate] = useState("");
  const [purchaseCost, setPurchaseCost] = useState<number>(0);
  const [currency, setCurrency] = useState("RWF");
  const [condition, setCondition] = useState<Asset["condition"]>("good");
  const [status, setStatus] = useState<Asset["status"]>("operational");
  const [location, setLocation] = useState("");
  const [assignedMemberId, setAssignedMemberId] = useState("");
  const [notes, setNotes] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const openAddModal = () => {
    setEditingAsset(null);
    setName("");
    setCategory("Field Equipment");
    setSerialNumber("AST-" + new Date().getFullYear() + "-" + Math.floor(1000 + Math.random() * 9000));
    setPurchaseDate(new Date().toISOString().split("T")[0]);
    setPurchaseCost(0);
    setCurrency("RWF");
    setCondition("good");
    setStatus("operational");
    setLocation("Cooperative Headquarters");
    setAssignedMemberId("");
    setNotes("");
    setShowModal(true);
  };

  const openEditModal = (asset: Asset) => {
    setEditingAsset(asset);
    setName(asset.name);
    setCategory(asset.category);
    setSerialNumber(asset.serial_number);
    setPurchaseDate(asset.purchase_date || "");
    setPurchaseCost(asset.purchase_cost || 0);
    setCurrency(asset.currency || "RWF");
    setCondition(asset.condition);
    setStatus(asset.status);
    setLocation(asset.location || "");
    setAssignedMemberId(asset.assigned_to_member_id || "");
    setNotes(asset.notes || "");
    setShowModal(true);
  };

  const handleSaveAsset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !serialNumber.trim()) {
      addToast(t("asset_tracker.err_required", "Please specify asset name and serial number"), "error");
      return;
    }

    setIsSaving(true);
    const assignedMember = members.find((m) => m.id === assignedMemberId);

    const assetData: Asset = {
      id: editingAsset ? editingAsset.id : "asset-" + Date.now(),
      org_id: activeOrg?.id || "default-org",
      name,
      category,
      serial_number: serialNumber,
      purchase_date: purchaseDate,
      purchase_cost: Number(purchaseCost) || 0,
      currency,
      condition,
      status,
      location,
      assigned_to_member_id: assignedMemberId || undefined,
      assigned_to_name: assignedMember ? assignedMember.user?.full_name : undefined,
      notes,
      qr_code: "ASSET-" + serialNumber,
      created_at: editingAsset ? editingAsset.created_at : new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    try {
      if (isSupabaseConfigured && OfflineSyncService.isOnline()) {
        await supabase.from("assets").upsert(assetData);
      } else {
        OfflineSyncService.enqueue(editingAsset ? "UPDATE" : "CREATE", "assets", assetData);
      }

      const all = MockDB.getAssets();
      if (editingAsset) {
        const idx = all.findIndex((a: Asset) => a.id === editingAsset.id);
        if (idx >= 0) all[idx] = assetData;
        setAssets((prev) => prev.map((a) => (a.id === editingAsset.id ? assetData : a)));
        addToast(t("asset_tracker.toast_updated", "Asset inventory record updated successfully!"), "success");
      } else {
        all.unshift(assetData);
        setAssets((prev) => [assetData, ...prev]);
        addToast(t("asset_tracker.toast_created", "New asset registered in inventory!"), "success");
      }
      MockDB.saveAssets(all);
      setShowModal(false);
    } catch (err: any) {
      addToast(t("asset_tracker.toast_save_error", "Failed to save asset: {{msg}}", { msg: err.message }), "error");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteAsset = async (id: string) => {
    try {
      if (isSupabaseConfigured && OfflineSyncService.isOnline()) {
        await supabase.from("assets").delete().eq("id", id);
      } else {
        OfflineSyncService.enqueue("DELETE", "assets", { id });
      }
      const all = MockDB.getAssets().filter((a: Asset) => a.id !== id);
      MockDB.saveAssets(all);
      setAssets((prev) => prev.filter((a) => a.id !== id));
      setConfirmDeleteId(null);
      addToast(t("asset_tracker.toast_deleted", "Asset removed from inventory"), "info");
    } catch (err: any) {
      addToast(t("asset_tracker.toast_delete_error", "Failed to delete asset: {{msg}}", { msg: err.message }), "error");
    }
  };

  const getCategoryLabel = (cat: string) => {
    const map: Record<string, string> = {
      "Field Equipment": t("asset_tracker.cat_field", "Field Equipment"),
      "IT Hardware": t("asset_tracker.cat_it", "IT Hardware"),
      "Processing Machinery": t("asset_tracker.cat_machinery", "Processing Machinery"),
      "Transport & Vehicles": t("asset_tracker.cat_transport", "Transport & Vehicles"),
      "Storage & Tools": t("asset_tracker.cat_storage", "Storage & Tools")
    };
    return map[cat] || cat;
  };

  const getConditionLabel = (cond: string) => {
    const map: Record<string, string> = {
      new: t("asset_tracker.cond_new_short", "New"),
      good: t("asset_tracker.cond_good_short", "Good"),
      fair: t("asset_tracker.cond_fair_short", "Fair"),
      needs_repair: t("asset_tracker.cond_repair", "Needs Repair"),
      damaged: t("asset_tracker.cond_damaged_short", "Damaged")
    };
    return map[cond] || cond.replace("_", " ");
  };

  const getStatusLabel = (st: string) => {
    const map: Record<string, string> = {
      operational: t("asset_tracker.status_operational", "Operational"),
      maintenance: t("asset_tracker.status_maintenance", "Maintenance"),
      in_storage: t("asset_tracker.status_in_storage", "In Storage"),
      decommissioned: t("asset_tracker.status_decommissioned", "Decommissioned")
    };
    return map[st] || st.replace("_", " ");
  };

  const handleExportExcel = () => {
    const headers = [
      t("asset_tracker.csv_id", "Asset ID"),
      t("asset_tracker.csv_name", "Asset Name"),
      t("asset_tracker.col_category", "Category"),
      t("asset_tracker.col_serial", "Serial Number"),
      t("asset_tracker.field_purchase_date", "Purchase Date"),
      t("asset_tracker.csv_cost", "Purchase Cost (RWF)"),
      t("asset_tracker.col_condition", "Condition"),
      t("asset_tracker.col_status", "Status"),
      t("asset_tracker.col_location", "Location"),
      t("asset_tracker.csv_assigned", "Assigned To"),
      t("asset_tracker.csv_notes", "Notes")
    ];

    const rows = filteredAssets.map((a) => [
      a.id,
      `"${a.name.replace(/"/g, '""')}"`,
      `"${getCategoryLabel(a.category)}"`,
      `"${a.serial_number}"`,
      a.purchase_date || "",
      a.purchase_cost || 0,
      getConditionLabel(a.condition),
      getStatusLabel(a.status),
      `"${(a.location || "").replace(/"/g, '""')}"`,
      `"${(a.assigned_to_name || t("asset_tracker.unassigned", "Unassigned")).replace(/"/g, '""')}"`,
      `"${(a.notes || "").replace(/"/g, '""')}"`
    ]);

    const csvContent = [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Impacto_Asset_Inventory_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    addToast(t("asset_tracker.toast_exported", "Asset inventory exported to Excel/CSV successfully!"), "success");
  };

  const filteredAssets = assets.filter((a) => {
    const matchesSearch =
      a.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.serial_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (a.assigned_to_name && a.assigned_to_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (a.location && a.location.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesCat = categoryFilter === "all" || a.category === categoryFilter;
    const matchesStat = statusFilter === "all" || a.status === statusFilter;
    return matchesSearch && matchesCat && matchesStat;
  });

  const totalValue = filteredAssets.reduce((sum, a) => sum + ((Number(a.purchase_cost) || 0) * (a.quantity ?? 1)), 0);
  const operationalCount = filteredAssets.filter((a) => a.status === "operational").length;
  const maintenanceCount = filteredAssets.filter((a) => a.status === "maintenance").length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <Box className="h-5 w-5 text-slate-700 dark:text-slate-300 shrink-0" />
            <h2 className="text-xl font-bold text-slate-900 dark:text-white break-words">
              {t("asset_tracker.header_title", "Asset and Equipment Inventory Register")}
            </h2>
          </div>
          <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400 break-words">
            {t("asset_tracker.header_sub", "Track machinery, field equipment, electronics, assigned caretakers, and QR asset barcode tags.")}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            onClick={handleExportExcel}
            className="px-3.5 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-lg text-xs font-medium flex items-center gap-1.5 transition"
          >
            <Download className="h-4 w-4 shrink-0" /> {t("asset_tracker.export_csv", "Export CSV")}
          </button>
          <button
            onClick={openAddModal}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-medium transition flex items-center gap-2 shadow-xs"
          >
            <Plus className="h-4 w-4 shrink-0" /> {t("asset_tracker.register_new", "Register New Asset")}
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs min-w-0">
          <span className="text-xs font-medium text-slate-500 dark:text-slate-400 block break-words">{t("asset_tracker.kpi_total", "Total Assets")}</span>
          <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1 tabular-nums">{filteredAssets.length}</p>
        </div>
        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs min-w-0">
          <span className="text-xs font-medium text-slate-500 dark:text-slate-400 block break-words">{t("asset_tracker.kpi_operational", "Operational")}</span>
          <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1 tabular-nums">{operationalCount}</p>
        </div>
        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs min-w-0">
          <span className="text-xs font-medium text-slate-500 dark:text-slate-400 block break-words">{t("asset_tracker.kpi_maintenance", "In Maintenance")}</span>
          <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1 tabular-nums">{maintenanceCount}</p>
        </div>
        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs min-w-0">
          <span className="text-xs font-medium text-slate-500 dark:text-slate-400 block break-words">{t("asset_tracker.kpi_valuation", "Total Valuation")}</span>
          <p className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white mt-1 tabular-nums break-words">
            {totalValue.toLocaleString()} <span className="text-xs font-normal text-slate-500">RWF</span>
          </p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3 bg-white dark:bg-slate-900 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="relative flex-1 min-w-0">
          <Search className="h-4 w-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder={t("asset_tracker.search_placeholder", "Search by asset name, serial number, caretaker, or location...")}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-emerald-600"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-1 focus:ring-emerald-600"
          >
            <option value="all">{t("marketplace.all_categories", "All Categories")}</option>
            <option value="Field Equipment">{t("asset_tracker.cat_field", "Field Equipment")}</option>
            <option value="IT Hardware">{t("asset_tracker.cat_it", "IT Hardware")}</option>
            <option value="Processing Machinery">{t("asset_tracker.cat_machinery", "Processing Machinery")}</option>
            <option value="Transport & Vehicles">{t("asset_tracker.cat_transport", "Transport & Vehicles")}</option>
            <option value="Storage & Tools">{t("asset_tracker.cat_storage", "Storage & Tools")}</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-1 focus:ring-emerald-600"
          >
            <option value="all">{t("asset_tracker.all_statuses", "All Statuses")}</option>
            <option value="operational">{t("asset_tracker.status_operational", "Operational")}</option>
            <option value="maintenance">{t("asset_tracker.status_maintenance", "Maintenance")}</option>
            <option value="in_storage">{t("asset_tracker.status_in_storage", "In Storage")}</option>
            <option value="decommissioned">{t("asset_tracker.status_decommissioned", "Decommissioned")}</option>
          </select>
        </div>
      </div>

      {/* Asset Table */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="p-3.5">{t("asset_tracker.col_details", "Asset Details")}</th>
                <th className="p-3.5">{t("asset_tracker.col_category", "Category")}</th>
                <th className="p-3.5">{t("asset_tracker.col_serial", "Serial Number")}</th>
                <th className="p-3.5">{t("asset_tracker.col_condition", "Condition")}</th>
                <th className="p-3.5">{t("asset_tracker.col_caretaker", "Assigned Caretaker")}</th>
                <th className="p-3.5">{t("asset_tracker.col_location", "Location")}</th>
                <th className="p-3.5">{t("asset_tracker.col_valuation", "Valuation")}</th>
                <th className="p-3.5">{t("asset_tracker.col_status", "Status")}</th>
                <th className="p-3.5 text-right">{t("lbl_actions", "Actions")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredAssets.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center py-12 text-slate-400">
                    <Box className="h-10 w-10 mx-auto mb-2 opacity-40 text-slate-400" />
                    <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">{t("asset_tracker.empty_table_title", "No assets found")}</p>
                    <p className="text-xs mt-0.5 text-slate-500">{t("asset_tracker.empty_table_desc", "Click \"Register New Asset\" to add equipment.")}</p>
                  </td>
                </tr>
              ) : (
                filteredAssets.map((asset) => (
                  <tr key={asset.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition">
                    <td className="p-3.5">
                      <span className="font-medium text-slate-900 dark:text-white block break-words">{asset.name}</span>
                      {asset.notes && <span className="text-[11px] text-slate-400 line-clamp-1">{asset.notes}</span>}
                    </td>
                    <td className="p-3.5 text-slate-600 dark:text-slate-300 font-normal">{getCategoryLabel(asset.category)}</td>
                    <td className="p-3.5 font-mono text-slate-700 dark:text-slate-300 text-xs">
                      {asset.serial_number}
                    </td>
                    <td className="p-3.5">
                      <span
                        className={`px-2 py-0.5 rounded-md text-xs font-medium capitalize inline-block ${
                          asset.condition === "new" || asset.condition === "good"
                            ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
                            : asset.condition === "fair"
                            ? "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300"
                            : "bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300"
                        }`}
                      >
                        {getConditionLabel(asset.condition)}
                      </span>
                    </td>
                    <td className="p-3.5 text-slate-700 dark:text-slate-300">
                      {asset.assigned_to_name ? (
                        <span className="flex items-center gap-1 font-medium">
                          <User className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                          {asset.assigned_to_name}
                        </span>
                      ) : (
                        <span className="text-slate-400 italic">{t("asset_tracker.unassigned", "Unassigned")}</span>
                      )}
                    </td>
                    <td className="p-3.5 text-slate-600 dark:text-slate-400">
                      {asset.location ? (
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0" /> {asset.location}
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="p-3.5 font-semibold text-slate-900 dark:text-white tabular-nums">
                      {(asset.purchase_cost || 0).toLocaleString()} {asset.currency || "RWF"}
                    </td>
                    <td className="p-3.5">
                      <span
                        className={`px-2 py-0.5 rounded-md text-xs font-medium capitalize inline-block ${
                          asset.status === "operational"
                            ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
                            : asset.status === "maintenance"
                            ? "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300"
                            : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                        }`}
                      >
                        {getStatusLabel(asset.status)}
                      </span>
                    </td>
                    <td className="p-3.5 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => setShowQrModal(asset)}
                          title={t("asset_tracker.title_qr", "Generate QR Tag")}
                          className="p-1.5 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400"
                        >
                          <QrCode className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => openEditModal(asset)}
                          title={t("asset_tracker.title_edit", "Edit Asset")}
                          className="p-1.5 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-800 dark:hover:text-white"
                        >
                          <Edit3 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => setConfirmDeleteId(asset.id)}
                          title={t("asset_tracker.title_delete", "Delete Asset")}
                          className="p-1.5 rounded-md hover:bg-rose-50 dark:hover:bg-rose-950/30 text-slate-400 hover:text-rose-600"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* CONFIRM DELETE MODAL */}
      {confirmDeleteId && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-sm w-full border border-slate-200 dark:border-slate-800 shadow-xl p-5 space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-rose-100 dark:bg-rose-950/40 text-rose-600 shrink-0">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <h4 className="font-bold text-sm text-slate-900 dark:text-white break-words">
                  {t("asset_tracker.confirm_delete_title", "Remove Asset?")}
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 break-words">
                  {t("asset_tracker.confirm_delete_msg", "Are you sure you want to remove this asset from inventory?")}
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setConfirmDeleteId(null)}
                className="px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300"
              >
                {t("common.cancel", "Cancel")}
              </button>
              <button
                type="button"
                onClick={() => handleDeleteAsset(confirmDeleteId)}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-xs font-bold text-white"
              >
                {t("common.delete", "Delete")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ADD / EDIT ASSET MODAL */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-xl max-w-xl w-full border border-slate-200 dark:border-slate-800 shadow-xl p-6 overflow-hidden flex flex-col max-h-[92vh]">
            <div className="flex items-center justify-between gap-2 pb-4 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 shrink-0">
                  <Box className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <h3 className="font-semibold text-base text-slate-900 dark:text-white break-words">
                    {editingAsset ? t("asset_tracker.modal_edit_title", "Edit Asset Record") : t("asset_tracker.modal_add_title", "Register New Equipment / Asset")}
                  </h3>
                  <p className="text-xs text-gray-500 break-words">{t("asset_tracker.modal_sub", "Record serial numbers, valuation, and physical location.")}</p>
                </div>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-gray-600 p-1.5 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 shrink-0"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveAsset} className="py-4 space-y-4 overflow-y-auto flex-1 pr-1">
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  {t("asset_tracker.field_name", "Asset Name & Model *")}
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={t("asset_tracker.field_name_placeholder", "e.g. Solar Drip Irrigation Pump Model-X")}
                  className="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-xs text-gray-900 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    {t("asset_tracker.field_category", "Category *")}
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-xs text-gray-900 dark:text-white"
                  >
                    <option value="Field Equipment">{t("asset_tracker.cat_field", "Field Equipment")}</option>
                    <option value="IT Hardware">{t("asset_tracker.cat_it", "IT Hardware")}</option>
                    <option value="Processing Machinery">{t("asset_tracker.cat_machinery", "Processing Machinery")}</option>
                    <option value="Transport & Vehicles">{t("asset_tracker.cat_transport", "Transport & Vehicles")}</option>
                    <option value="Storage & Tools">{t("asset_tracker.cat_storage", "Storage & Tools")}</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    {t("asset_tracker.field_serial", "Serial / Barcode Tag *")}
                  </label>
                  <input
                    type="text"
                    required
                    value={serialNumber}
                    onChange={(e) => setSerialNumber(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-xs font-mono text-gray-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    {t("asset_tracker.field_cost", "Purchase Valuation (Cost)")}
                  </label>
                  <input
                    type="number"
                    value={purchaseCost}
                    onChange={(e) => setPurchaseCost(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-xs text-gray-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    {t("asset_tracker.field_purchase_date", "Purchase Date")}
                  </label>
                  <input
                    type="date"
                    value={purchaseDate}
                    onChange={(e) => setPurchaseDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-xs text-gray-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    {t("asset_tracker.field_condition", "Physical Condition")}
                  </label>
                  <select
                    value={condition}
                    onChange={(e) => setCondition(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-xs text-gray-900 dark:text-white"
                  >
                    <option value="new">{t("asset_tracker.cond_new", "Brand New")}</option>
                    <option value="good">{t("asset_tracker.cond_good", "Good Working Condition")}</option>
                    <option value="fair">{t("asset_tracker.cond_fair", "Fair (Minor Wear)")}</option>
                    <option value="needs_repair">{t("asset_tracker.cond_repair", "Needs Repair")}</option>
                    <option value="damaged">{t("asset_tracker.cond_damaged", "Damaged / Broken")}</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    {t("asset_tracker.field_status", "Operational Status")}
                  </label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-xs text-gray-900 dark:text-white"
                  >
                    <option value="operational">{t("asset_tracker.opt_operational", "Operational & Active")}</option>
                    <option value="maintenance">{t("asset_tracker.opt_maintenance", "Under Maintenance")}</option>
                    <option value="in_storage">{t("asset_tracker.opt_storage", "In Storage Warehouse")}</option>
                    <option value="decommissioned">{t("asset_tracker.status_decommissioned", "Decommissioned")}</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    {t("asset_tracker.field_location", "Physical Station / Location")}
                  </label>
                  <input
                    type="text"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder={t("asset_tracker.field_location_placeholder", "e.g. Washing Station B, Desk 4")}
                    className="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-xs text-gray-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    {t("asset_tracker.field_caretaker", "Assigned Member Caretaker")}
                  </label>
                  <select
                    value={assignedMemberId}
                    onChange={(e) => setAssignedMemberId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-xs text-gray-900 dark:text-white"
                  >
                    <option value="">{t("asset_tracker.opt_unassigned", "-- Unassigned (General Pool) --")}</option>
                    {members.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.user?.full_name} ({m.role})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  {t("asset_tracker.field_notes", "Maintenance Log / Technical Notes")}
                </label>
                <textarea
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder={t("asset_tracker.field_notes_placeholder", "Warranty info, servicing schedules, component specs...")}
                  className="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-xs text-gray-900 dark:text-white"
                />
              </div>

              <div className="pt-4 border-t border-gray-100 dark:border-gray-800 flex flex-wrap justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2.5 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-xs font-semibold rounded-xl hover:bg-gray-200 transition"
                >
                  {t("common.cancel", "Cancel")}
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition flex items-center gap-2 shadow-sm"
                >
                  {isSaving ? <RefreshCw className="h-4 w-4 animate-spin shrink-0" /> : <Box className="h-4 w-4 shrink-0" />}
                  {editingAsset ? t("asset_tracker.btn_update", "Update Asset") : t("assets.add_asset", "Register Asset")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* QR CODE TAG MODAL */}
      {showQrModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 rounded-3xl max-w-sm w-full border border-gray-200 dark:border-gray-800 shadow-2xl p-6 text-center">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-gray-800 mb-4">
              <span className="text-xs font-bold font-mono text-emerald-600">{t("asset_tracker.qr_tag_header", "IMPACTO ASSET TAG")}</span>
              <button
                onClick={() => setShowQrModal(null)}
                className="text-gray-400 hover:text-gray-600 text-sm p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            <div className="p-4 bg-white rounded-2xl border-2 border-dashed border-gray-200 inline-block mb-4 shadow-sm">
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(
                  `IMPACTO:ASSET:${showQrModal.serial_number}:${showQrModal.name}`
                )}`}
                alt={t("asset_tracker.qr_alt", "Asset QR Code")}
                className="h-44 w-44 mx-auto"
                referrerPolicy="no-referrer"
              />
            </div>

            <h4 className="font-bold text-sm text-gray-900 dark:text-white break-words">{showQrModal.name}</h4>
            <p className="font-mono text-xs text-emerald-600 font-bold mt-0.5">{showQrModal.serial_number}</p>
            <p className="text-[11px] text-gray-500 mt-1 break-words">{t("asset_tracker.qr_hint", "Scan tag on-site for instant field inspection & logs.")}</p>

            <div className="mt-6 flex flex-wrap gap-2">
              <button
                onClick={() => window.print()}
                className="flex-1 py-2.5 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 text-gray-800 dark:text-gray-200 text-xs font-semibold rounded-xl transition"
              >
                {t("asset_tracker.print_label", "Print Label")}
              </button>
              <button
                onClick={() => setShowQrModal(null)}
                className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition"
              >
                {t("common.done", "Done")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
