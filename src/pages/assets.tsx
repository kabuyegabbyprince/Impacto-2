import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  PackageCheck,
  Plus,
  Search,
  SlidersHorizontal,
  Trash2,
  Pencil,
  FileText,
  User,
  Tag,
  Boxes,
  MapPin,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ShieldCheck,
  Sparkles,
  Download,
  Info,
  Layers,
  ArrowUpDown,
  History,
  X,
  Share2
} from "lucide-react";
import { useOrgStore } from "../store/orgStore";
import { useAuthStore } from "../store/authStore";
import { useCurrencyStore } from "../store/currencyStore";
import { useAssets, useCreateAsset, useUpdateAsset, useDeleteAsset, useMembers } from "../hooks/useImpactoData";
import { Button, Input, Card, Badge, Modal, EmptyState } from "../components/ui";
import { useToast } from "../components/Toast";
import { Asset } from "../types";

export const AssetManagementPage: React.FC = () => {
  const { activeOrg, activeMember } = useOrgStore();
  const { user } = useAuthStore();
  const { activeCurrency, formatAmount } = useCurrencyStore();
  const { addToast } = useToast();

  const { data: assets = [], isLoading } = useAssets(activeOrg?.id);
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
      addToast("Please provide an asset or item name", "error");
      return;
    }

    // Resolve assigned member name if selected
    let assignedName: string | undefined = undefined;
    if (formData.assigned_to_member_id) {
      const found = members.find((m) => m.id === formData.assigned_to_member_id);
      assignedName = found?.user?.full_name || found?.member_number || "Assigned Member";
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
        addToast("Asset/Stock record updated successfully", "success");
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
        addToast("Asset/Stock recorded into registry", "success");
      }
      setIsRecordModalOpen(false);
      resetForm();
    } catch (err: any) {
      addToast(err?.message || "Failed to save asset record", "error");
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirmAsset || !activeOrg?.id) return;
    try {
      await deleteMutation.mutateAsync({
        id: deleteConfirmAsset.id,
        orgId: activeOrg.id,
      });
      addToast("Asset removed from register", "success");
      setDeleteConfirmAsset(null);
    } catch (err: any) {
      addToast(err?.message || "Failed to delete asset", "error");
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
      addToast("Notes updated", "success");
      setNotesModalAsset(null);
    } catch (err: any) {
      addToast("Failed to update notes", "error");
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
      addToast("No assets to export", "info");
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
    addToast("Asset register CSV exported", "success");
  };

  const getConditionBadge = (condition: Asset["condition"]) => {
    switch (condition) {
      case "new":
        return <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">Brand New</span>;
      case "good":
        return <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300">Good</span>;
      case "fair":
        return <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">Fair / Aging</span>;
      case "needs_repair":
        return <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-orange-100 text-orange-800 dark:bg-orange-950/60 dark:text-orange-300">Needs Repair</span>;
      case "damaged":
        return <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300">Damaged</span>;
      default:
        return <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-gray-100 text-gray-700">Standard</span>;
    }
  };

  const getStatusBadge = (status: Asset["status"]) => {
    switch (status) {
      case "operational":
        return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/40"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>Operational</span>;
      case "maintenance":
        return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400 border border-amber-200 dark:border-amber-800/40"><Clock className="w-3 h-3" />Maintenance</span>;
      case "in_storage":
        return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700"><Boxes className="w-3 h-3" />In Storage / Stock</span>;
      case "decommissioned":
        return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-stone-100 text-stone-600 dark:bg-stone-800 dark:text-stone-300 border border-stone-200">Decommissioned</span>;
      case "disposed":
        return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-rose-50 text-rose-700 dark:bg-rose-950/30 dark:text-rose-400 border border-rose-200">Disposed</span>;
      default:
        return <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-gray-100 text-gray-700">{status}</span>;
    }
  };

  return (
    <div className="space-y-6 pb-16">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-200/80 dark:border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl md:text-2xl font-black tracking-tight text-slate-900 dark:text-white">
              Asset & Stock Management
            </h1>
            <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-[#156c45]/10 text-[#156c45] dark:bg-emerald-950/50 dark:text-emerald-400 uppercase">
              Management Module
            </span>
          </div>
          <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-2xl">
            Keep clear records of organizational equipment, inventory quantities, quality grades, market values, custody accountability, and maintenance notes.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCSV}
            icon={<Download className="h-3.5 w-3.5" />}
          >
            Export CSV
          </Button>

          {isStaff && (
            <Button
              variant="primary"
              size="sm"
              onClick={handleOpenCreate}
              icon={<Plus className="h-4 w-4" />}
            >
              Record New Asset / Stock
            </Button>
          )}
        </div>
      </div>

      {/* KPI Metric Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-gray-200/80 dark:border-slate-800 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Total Book Value</span>
            <div className="p-2 rounded-lg bg-emerald-50 text-[#156c45] dark:bg-emerald-950/50 dark:text-emerald-400">
              <Boxes className="h-4 w-4" />
            </div>
          </div>
          <div className="text-lg md:text-xl font-black text-slate-900 dark:text-white mt-2">
            {formatAmount(metrics.totalValue)}
          </div>
          <p className="text-[11px] text-slate-400 mt-0.5 font-medium">Recorded asset acquisition value</p>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-gray-200/80 dark:border-slate-800 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Units / Stock Quantity</span>
            <div className="p-2 rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400">
              <Layers className="h-4 w-4" />
            </div>
          </div>
          <div className="text-lg md:text-xl font-black text-slate-900 dark:text-white mt-2">
            {metrics.totalItems} <span className="text-xs font-normal text-slate-400">({metrics.totalRecords} entries)</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-0.5 font-medium">Cumulative inventory & equipment</p>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-gray-200/80 dark:border-slate-800 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Assigned In Custody</span>
            <div className="p-2 rounded-lg bg-purple-50 text-purple-600 dark:bg-purple-950/50 dark:text-purple-400">
              <User className="h-4 w-4" />
            </div>
          </div>
          <div className="text-lg md:text-xl font-black text-slate-900 dark:text-white mt-2">
            {metrics.inCustodyCount} <span className="text-xs font-normal text-slate-400">/ {metrics.totalRecords}</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-0.5 font-medium">Under active member custody</p>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-gray-200/80 dark:border-slate-800 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Operational Rate</span>
            <div className="p-2 rounded-lg bg-amber-50 text-amber-600 dark:bg-amber-950/50 dark:text-amber-400">
              <CheckCircle2 className="h-4 w-4" />
            </div>
          </div>
          <div className="text-lg md:text-xl font-black text-slate-900 dark:text-white mt-2">
            {metrics.totalRecords > 0 ? Math.round((metrics.operationalCount / metrics.totalRecords) * 100) : 100}%
          </div>
          <p className="text-[11px] text-slate-400 mt-0.5 font-medium">{metrics.operationalCount} ready for active service</p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white dark:bg-slate-900 p-3.5 rounded-xl border border-gray-200/80 dark:border-slate-800 flex flex-col md:flex-row items-center justify-between gap-3 shadow-2xs">
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search name, identifier, custodian, notes..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg text-xs md:text-sm focus:outline-none focus:ring-2 focus:ring-[#156c45]"
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
            className="px-2.5 py-1.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg text-xs font-medium text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-[#156c45]"
          >
            <option value="all">All Categories</option>
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
            className="px-2.5 py-1.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg text-xs font-medium text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-[#156c45]"
          >
            <option value="all">All Conditions</option>
            <option value="new">Brand New</option>
            <option value="good">Good</option>
            <option value="fair">Fair / Aging</option>
            <option value="needs_repair">Needs Repair</option>
            <option value="damaged">Damaged</option>
          </select>

          {/* State / Status Filter */}
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="px-2.5 py-1.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg text-xs font-medium text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-[#156c45]"
          >
            <option value="all">All Operational States</option>
            <option value="operational">Operational</option>
            <option value="maintenance">Maintenance</option>
            <option value="in_storage">In Storage / Stock</option>
            <option value="decommissioned">Decommissioned</option>
            <option value="disposed">Disposed</option>
          </select>
        </div>
      </div>

      {/* Asset Table Registry */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200/80 dark:border-slate-800 overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs md:text-sm">
            <thead className="bg-gray-50 dark:bg-slate-800/80 border-b border-gray-200/80 dark:border-slate-800 text-[11px] font-mono uppercase tracking-wider text-slate-500 dark:text-slate-400">
              <tr>
                <th className="py-3 px-4 font-bold">Asset / Stock Item</th>
                <th className="py-3 px-3 font-bold">Category & ID</th>
                <th className="py-3 px-3 font-bold text-center">Qty</th>
                <th className="py-3 px-3 font-bold">Quality Grade</th>
                <th className="py-3 px-3 font-bold">Acquisition Value</th>
                <th className="py-3 px-3 font-bold">Condition & State</th>
                <th className="py-3 px-3 font-bold">Custody (Who has it)</th>
                <th className="py-3 px-3 font-bold">Notes / Log</th>
                <th className="py-3 px-4 font-bold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
              {filteredAssets.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Boxes className="h-8 w-8 text-slate-300 dark:text-slate-600" />
                      <p className="font-medium">No assets or stock found matching your query.</p>
                      {isStaff && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleOpenCreate}
                          className="mt-2"
                        >
                          Record First Asset
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
                    (asset.assigned_to_member_id ? "Assigned Member" : "Unassigned / General Storage");

                  return (
                    <tr
                      key={asset.id}
                      className="hover:bg-gray-50/60 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      {/* Name & Location */}
                      <td className="py-3.5 px-4 font-semibold text-slate-900 dark:text-white">
                        <div className="font-bold">{asset.name}</div>
                        {asset.location && (
                          <div className="flex items-center gap-1 text-[11px] text-slate-400 font-normal mt-0.5">
                            <MapPin className="h-3 w-3 shrink-0 text-slate-400" />
                            <span className="truncate max-w-[160px]">{asset.location}</span>
                          </div>
                        )}
                      </td>

                      {/* Category & Identifier */}
                      <td className="py-3.5 px-3">
                        <span className="inline-block text-[11px] font-medium text-slate-600 dark:text-slate-300">
                          {asset.category || "General"}
                        </span>
                        {asset.identifier ? (
                          <div className="text-[10px] font-mono text-slate-400 bg-gray-100 dark:bg-slate-800 px-1.5 py-0.5 rounded w-fit mt-0.5">
                            {asset.identifier}
                          </div>
                        ) : asset.serial_number ? (
                          <div className="text-[10px] font-mono text-slate-400 bg-gray-100 dark:bg-slate-800 px-1.5 py-0.5 rounded w-fit mt-0.5">
                            {asset.serial_number}
                          </div>
                        ) : (
                          <span className="text-[10px] text-slate-400 italic block mt-0.5">No tag ID</span>
                        )}
                      </td>

                      {/* Quantity */}
                      <td className="py-3.5 px-3 text-center">
                        <span className="inline-flex items-center justify-center font-bold px-2 py-0.5 rounded-lg bg-gray-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs">
                          {asset.quantity ?? 1}
                        </span>
                      </td>

                      {/* Quality */}
                      <td className="py-3.5 px-3 text-slate-700 dark:text-slate-300">
                        {asset.quality ? (
                          <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
                            {asset.quality}
                          </span>
                        ) : (
                          <span className="text-xs text-slate-400 italic">Not specified</span>
                        )}
                      </td>

                      {/* Acquisition Value */}
                      <td className="py-3.5 px-3">
                        <div className="font-bold text-slate-900 dark:text-white">
                          {formatAmount((Number(asset.purchase_cost) || 0) * (asset.quantity ?? 1))}
                        </div>
                        {(asset.quantity ?? 1) > 1 ? (
                          <span className="text-[10px] text-slate-400 block mt-0.5">
                            {formatAmount(asset.purchase_cost || 0)}/unit
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

                      {/* Custody (Who has it) */}
                      <td className="py-3.5 px-3">
                        {asset.assigned_to_member_id || asset.assigned_to_name ? (
                          <div className="flex items-center gap-1.5">
                            <div className="w-6 h-6 rounded-full bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300 flex items-center justify-center text-[10px] font-bold shrink-0">
                              <User className="h-3 w-3" />
                            </div>
                            <div className="truncate max-w-[150px]">
                              <span className="font-semibold text-slate-800 dark:text-slate-200 text-xs block truncate">
                                {displayCustodian}
                              </span>
                              <span className="text-[10px] text-purple-600 dark:text-purple-400 font-medium">
                                Active Custodian
                              </span>
                            </div>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400 italic">
                            In Storage / Unassigned
                          </span>
                        )}
                      </td>

                      {/* Notes / Log */}
                      <td className="py-3.5 px-3 max-w-[180px]">
                        {asset.notes ? (
                          <div
                            onClick={() => handleOpenNotes(asset)}
                            className="cursor-pointer group flex items-start gap-1 text-xs text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                            title="Click to view and edit notes"
                          >
                            <FileText className="h-3.5 w-3.5 shrink-0 text-slate-400 group-hover:text-[#156c45] mt-0.5" />
                            <span className="truncate">{asset.notes}</span>
                          </div>
                        ) : (
                          <button
                            onClick={() => handleOpenNotes(asset)}
                            className="text-[11px] text-slate-400 hover:text-[#156c45] underline flex items-center gap-1"
                          >
                            <Plus className="h-3 w-3" /> Add notes
                          </button>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleOpenNotes(asset)}
                            className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 transition"
                            title="View/Edit notes"
                          >
                            <FileText className="h-3.5 w-3.5" />
                          </button>

                          {isStaff && (
                            <>
                              <button
                                onClick={() => handleOpenEdit(asset)}
                                className="p-1.5 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-950/40 transition"
                                title="Edit Asset / Change Custody"
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </button>

                              <button
                                onClick={() => setDeleteConfirmAsset(asset)}
                                className="p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 transition"
                                title="Remove Asset"
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
        title={editingAsset ? "Edit Asset / Custody Details" : "Record New Asset or Stock"}
      >
        <form onSubmit={handleSaveAsset} className="space-y-4 text-xs md:text-sm">
          {/* Asset Name */}
          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
              Asset or Stock Name <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g., Solar Irrigation Pump, Dell Laptop, NPK Fertilizer 50kg"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#156c45]"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {/* Category */}
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                Category
              </label>
              <input
                type="text"
                list="category-suggestions"
                placeholder="e.g., Machinery, Stock / Supplies, IT Hardware"
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full px-3 py-2 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#156c45]"
              />
              <datalist id="category-suggestions">
                <option value="Machinery & Equipment" />
                <option value="Stock / Supplies" />
                <option value="IT Hardware" />
                <option value="Vehicles & Transport" />
                <option value="Office Furniture" />
                <option value="Agricultural Tools" />
              </datalist>
            </div>

            {/* Identifier / Serial (Not required) */}
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                Identifier / Tag / Serial <span className="text-slate-400 font-normal">(Optional)</span>
              </label>
              <input
                type="text"
                placeholder="e.g., TAG-2026-001 or SKU-NPK-99"
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
                Quantity (Count)
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
                Quality Grade / Spec <span className="text-slate-400 font-normal">(Optional)</span>
              </label>
              <input
                type="text"
                placeholder="e.g., Grade A, Export Certified, Refurbished"
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
                Value / Acquisition Cost ({formData.currency})
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
                Acquisition / Stock Date
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
                Physical Condition
              </label>
              <select
                value={formData.condition}
                onChange={(e) => setFormData({ ...formData, condition: e.target.value as any })}
                className="w-full px-3 py-2 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#156c45]"
              >
                <option value="new">Brand New</option>
                <option value="good">Good (Normal operation)</option>
                <option value="fair">Fair (Wear and tear)</option>
                <option value="needs_repair">Needs Repair / Maintenance</option>
                <option value="damaged">Damaged</option>
              </select>
            </div>

            {/* State of each element (Operational Status) */}
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                State / Status
              </label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                className="w-full px-3 py-2 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#156c45]"
              >
                <option value="operational">Operational (In active use)</option>
                <option value="in_storage">In Storage / Central Warehouse</option>
                <option value="maintenance">Under Repair / Maintenance</option>
                <option value="decommissioned">Decommissioned</option>
                <option value="disposed">Disposed / Written Off</option>
              </select>
            </div>
          </div>

          {/* Custody & Member Assignment (Accountability) */}
          <div className="p-3.5 bg-purple-50/50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-800/40 rounded-xl space-y-2">
            <div className="flex items-center gap-1.5 text-purple-900 dark:text-purple-300 font-bold text-xs">
              <User className="h-4 w-4 text-purple-600" />
              Custody & Member Assignment (Accountability)
            </div>
            <p className="text-[11px] text-purple-700/80 dark:text-purple-300/80">
              Designate who is physically holding or personally responsible for this asset or stock batch.
            </p>

            <select
              value={formData.assigned_to_member_id}
              onChange={(e) => setFormData({ ...formData, assigned_to_member_id: e.target.value })}
              className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-purple-200 dark:border-purple-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="">-- No Specific Member (Central Storage / Communal) --</option>
              {members.map((mem) => (
                <option key={mem.id} value={mem.id}>
                  {mem.user?.full_name || mem.member_number || "Member"} ({mem.role || "Member"})
                </option>
              ))}
            </select>
          </div>

          {/* Storage / Location */}
          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
              Physical Location / Unit
            </label>
            <input
              type="text"
              placeholder="e.g., Central Warehouse Bay 3, Sector Office Desk 2, Field Station Huye"
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              className="w-full px-3 py-2 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#156c45]"
            />
          </div>

          {/* Notes explaining what happened */}
          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
              Notes & Incident History (Explain what happened / service history)
            </label>
            <textarea
              rows={3}
              placeholder="Add explanation on condition, repair history, handover circumstances, or special handling instructions..."
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="w-full px-3 py-2 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#156c45]"
            />
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-gray-100 dark:border-slate-800">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setIsRecordModalOpen(false);
                resetForm();
              }}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              loading={createMutation.isPending || updateMutation.isPending}
            >
              {editingAsset ? "Save Changes" : "Save to Register"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* QUICK NOTES MODAL */}
      <Modal
        isOpen={!!notesModalAsset}
        onClose={() => setNotesModalAsset(null)}
        title={`Asset Notes & History: ${notesModalAsset?.name || ""}`}
      >
        <div className="space-y-4 text-xs md:text-sm">
          <p className="text-slate-500 dark:text-slate-400">
            Record updates, inspection notes, repair logs, or incident reports for this item.
          </p>

          <textarea
            rows={5}
            value={quickNotesText}
            onChange={(e) => setQuickNotesText(e.target.value)}
            placeholder="Document what happened to this item, maintenance performed, or handover notes..."
            className="w-full p-3 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#156c45] font-sans"
          />

          <div className="flex items-center justify-between pt-2">
            <span className="text-[11px] text-slate-400">
              Last updated: {notesModalAsset?.updated_at ? new Date(notesModalAsset.updated_at).toLocaleString() : "Recently"}
            </span>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => setNotesModalAsset(null)}>
                Close
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleSaveNotes}
                loading={updateMutation.isPending}
              >
                Save Notes
              </Button>
            </div>
          </div>
        </div>
      </Modal>

      {/* DELETE CONFIRMATION MODAL */}
      <Modal
        isOpen={!!deleteConfirmAsset}
        onClose={() => setDeleteConfirmAsset(null)}
        title="Remove Asset from Registry"
      >
        <div className="space-y-4 text-xs md:text-sm">
          <div className="p-3 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900 rounded-xl flex items-start gap-2.5 text-rose-800 dark:text-rose-300">
            <AlertTriangle className="h-5 w-5 shrink-0 text-rose-600 mt-0.5" />
            <div>
              <div className="font-bold">Are you sure you want to remove this asset?</div>
              <p className="mt-1 text-xs opacity-90">
                You are about to delete <strong>{deleteConfirmAsset?.name}</strong>{" "}
                {deleteConfirmAsset?.identifier ? `(${deleteConfirmAsset.identifier})` : ""}. This action cannot be undone.
              </p>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setDeleteConfirmAsset(null)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={handleDelete}
              loading={deleteMutation.isPending}
            >
              Delete Asset
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
