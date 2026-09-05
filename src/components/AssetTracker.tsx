import React, { useState } from "react";
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
      addToast("Please specify asset name and serial number", "error");
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
        addToast("Asset inventory record updated successfully!", "success");
      } else {
        all.unshift(assetData);
        setAssets((prev) => [assetData, ...prev]);
        addToast("New asset registered in inventory!", "success");
      }
      MockDB.saveAssets(all);
      setShowModal(false);
    } catch (err: any) {
      addToast("Failed to save asset: " + err.message, "error");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteAsset = async (id: string) => {
    if (!window.confirm("Are you sure you want to remove this asset from inventory?")) return;
    try {
      if (isSupabaseConfigured && OfflineSyncService.isOnline()) {
        await supabase.from("assets").delete().eq("id", id);
      } else {
        OfflineSyncService.enqueue("DELETE", "assets", { id });
      }
      const all = MockDB.getAssets().filter((a: Asset) => a.id !== id);
      MockDB.saveAssets(all);
      setAssets((prev) => prev.filter((a) => a.id !== id));
      addToast("Asset removed from inventory", "info");
    } catch (err: any) {
      addToast("Failed to delete asset: " + err.message, "error");
    }
  };

  const handleExportExcel = () => {
    const headers = [
      "Asset ID",
      "Asset Name",
      "Category",
      "Serial Number",
      "Purchase Date",
      "Purchase Cost (RWF)",
      "Condition",
      "Status",
      "Location",
      "Assigned To",
      "Notes"
    ];

    const rows = filteredAssets.map((a) => [
      a.id,
      `"${a.name.replace(/"/g, '""')}"`,
      `"${a.category}"`,
      `"${a.serial_number}"`,
      a.purchase_date || "",
      a.purchase_cost || 0,
      a.condition,
      a.status,
      `"${(a.location || "").replace(/"/g, '""')}"`,
      `"${(a.assigned_to_name || "Unassigned").replace(/"/g, '""')}"`,
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
    addToast("Asset inventory exported to Excel/CSV successfully!", "success");
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-gray-900 p-6 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-2 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300">
              <Box className="h-5 w-5" />
            </span>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white font-display">
              Asset & Equipment Inventory Tracker
            </h2>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Track machinery, field electronics, IT equipment, assigned caretakers, and QR asset barcode tags.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportExcel}
            className="px-3.5 py-2.5 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition"
          >
            <Download className="h-4 w-4" /> Export to Excel
          </button>
          <button
            onClick={openAddModal}
            className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-2 shadow-sm"
          >
            <Plus className="h-4 w-4" /> Register New Asset
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-900 p-4 rounded-2xl border border-gray-200 dark:border-gray-800">
          <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Total Assets</span>
          <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{filteredAssets.length}</p>
        </div>
        <div className="bg-white dark:bg-gray-900 p-4 rounded-2xl border border-gray-200 dark:border-gray-800">
          <span className="text-[11px] font-semibold text-emerald-600 uppercase tracking-wider">Operational</span>
          <p className="text-2xl font-bold text-emerald-600 mt-1">{operationalCount}</p>
        </div>
        <div className="bg-white dark:bg-gray-900 p-4 rounded-2xl border border-gray-200 dark:border-gray-800">
          <span className="text-[11px] font-semibold text-amber-600 uppercase tracking-wider">In Maintenance</span>
          <p className="text-2xl font-bold text-amber-600 mt-1">{maintenanceCount}</p>
        </div>
        <div className="bg-white dark:bg-gray-900 p-4 rounded-2xl border border-gray-200 dark:border-gray-800">
          <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Total Valuation</span>
          <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
            {totalValue.toLocaleString()} <span className="text-xs font-normal text-gray-500">RWF</span>
          </p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3 bg-white dark:bg-gray-900 p-4 rounded-2xl border border-gray-200 dark:border-gray-800">
        <div className="relative flex-1">
          <Search className="h-4 w-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search by asset name, serial number, caretaker, or location..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-xs text-gray-900 dark:text-white"
          />
        </div>
        <div className="flex gap-2">
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-xs text-gray-700 dark:text-gray-300"
          >
            <option value="all">All Categories</option>
            <option value="Field Equipment">Field Equipment</option>
            <option value="IT Hardware">IT Hardware</option>
            <option value="Processing Machinery">Processing Machinery</option>
            <option value="Transport & Vehicles">Transport & Vehicles</option>
            <option value="Storage & Tools">Storage & Tools</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-xs text-gray-700 dark:text-gray-300"
          >
            <option value="all">All Statuses</option>
            <option value="operational">Operational</option>
            <option value="maintenance">Maintenance</option>
            <option value="in_storage">In Storage</option>
            <option value="decommissioned">Decommissioned</option>
          </select>
        </div>
      </div>

      {/* Asset Table */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-gray-50 dark:bg-gray-800/60 text-gray-500 dark:text-gray-400 font-semibold uppercase tracking-wider border-b border-gray-200 dark:border-gray-800">
              <tr>
                <th className="p-4">Asset Details</th>
                <th className="p-4">Category</th>
                <th className="p-4">Serial Number</th>
                <th className="p-4">Condition</th>
                <th className="p-4">Assigned Caretaker</th>
                <th className="p-4">Location</th>
                <th className="p-4">Valuation</th>
                <th className="p-4">Status</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {filteredAssets.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center py-12 text-gray-400">
                    <Box className="h-10 w-10 mx-auto mb-2 opacity-40" />
                    <p className="text-sm font-semibold">No assets found</p>
                    <p className="text-xs mt-0.5">Click "Register New Asset" to add equipment.</p>
                  </td>
                </tr>
              ) : (
                filteredAssets.map((asset) => (
                  <tr key={asset.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/30 transition">
                    <td className="p-4">
                      <span className="font-bold text-gray-900 dark:text-white block">{asset.name}</span>
                      {asset.notes && <span className="text-[11px] text-gray-500 line-clamp-1">{asset.notes}</span>}
                    </td>
                    <td className="p-4 text-gray-600 dark:text-gray-300 font-medium">{asset.category}</td>
                    <td className="p-4 font-mono font-semibold text-emerald-600 dark:text-emerald-400">
                      {asset.serial_number}
                    </td>
                    <td className="p-4">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold capitalize ${
                          asset.condition === "new" || asset.condition === "good"
                            ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                            : asset.condition === "fair"
                            ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                            : "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300"
                        }`}
                      >
                        {asset.condition.replace("_", " ")}
                      </span>
                    </td>
                    <td className="p-4 text-gray-700 dark:text-gray-300">
                      {asset.assigned_to_name ? (
                        <span className="flex items-center gap-1 font-medium">
                          <User className="h-3.5 w-3.5 text-gray-400" />
                          {asset.assigned_to_name}
                        </span>
                      ) : (
                        <span className="text-gray-400 italic">Unassigned</span>
                      )}
                    </td>
                    <td className="p-4 text-gray-600 dark:text-gray-400">
                      {asset.location ? (
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3.5 w-3.5 text-gray-400" /> {asset.location}
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="p-4 font-mono font-bold text-gray-900 dark:text-white">
                      {(asset.purchase_cost || 0).toLocaleString()} {asset.currency || "RWF"}
                    </td>
                    <td className="p-4">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold capitalize ${
                          asset.status === "operational"
                            ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                            : asset.status === "maintenance"
                            ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                            : "bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300"
                        }`}
                      >
                        {asset.status.replace("_", " ")}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => setShowQrModal(asset)}
                          title="Generate QR Tag"
                          className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400"
                        >
                          <QrCode className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => openEditModal(asset)}
                          title="Edit Asset"
                          className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-emerald-600"
                        >
                          <Edit3 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteAsset(asset.id)}
                          title="Delete Asset"
                          className="p-1.5 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/30 text-rose-600"
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

      {/* ADD / EDIT ASSET MODAL */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 rounded-3xl max-w-xl w-full border border-gray-200 dark:border-gray-800 shadow-2xl p-6 overflow-hidden flex flex-col max-h-[92vh]">
            <div className="flex items-center justify-between pb-4 border-b border-gray-100 dark:border-gray-800">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-2xl bg-emerald-600 text-white">
                  <Box className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-gray-900 dark:text-white">
                    {editingAsset ? "Edit Asset Record" : "Register New Equipment / Asset"}
                  </h3>
                  <p className="text-xs text-gray-500">Record serial numbers, valuation, and physical location.</p>
                </div>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-gray-600 p-1.5 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveAsset} className="py-4 space-y-4 overflow-y-auto flex-1 pr-1">
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Asset Name & Model *
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Solar Drip Irrigation Pump Model-X"
                  className="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-xs text-gray-900 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    Category *
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-xs text-gray-900 dark:text-white"
                  >
                    <option value="Field Equipment">Field Equipment</option>
                    <option value="IT Hardware">IT Hardware</option>
                    <option value="Processing Machinery">Processing Machinery</option>
                    <option value="Transport & Vehicles">Transport & Vehicles</option>
                    <option value="Storage & Tools">Storage & Tools</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    Serial / Barcode Tag *
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
                    Purchase Valuation (Cost)
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
                    Purchase Date
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
                    Physical Condition
                  </label>
                  <select
                    value={condition}
                    onChange={(e) => setCondition(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-xs text-gray-900 dark:text-white"
                  >
                    <option value="new">Brand New</option>
                    <option value="good">Good Working Condition</option>
                    <option value="fair">Fair (Minor Wear)</option>
                    <option value="needs_repair">Needs Repair</option>
                    <option value="damaged">Damaged / Broken</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    Operational Status
                  </label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-xs text-gray-900 dark:text-white"
                  >
                    <option value="operational">Operational & Active</option>
                    <option value="maintenance">Under Maintenance</option>
                    <option value="in_storage">In Storage Warehouse</option>
                    <option value="decommissioned">Decommissioned</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    Physical Station / Location
                  </label>
                  <input
                    type="text"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="e.g. Washing Station B, Desk 4"
                    className="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-xs text-gray-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    Assigned Member Caretaker
                  </label>
                  <select
                    value={assignedMemberId}
                    onChange={(e) => setAssignedMemberId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-xs text-gray-900 dark:text-white"
                  >
                    <option value="">-- Unassigned (General Pool) --</option>
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
                  Maintenance Log / Technical Notes
                </label>
                <textarea
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Warranty info, servicing schedules, component specs..."
                  className="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-xs text-gray-900 dark:text-white"
                />
              </div>

              <div className="pt-4 border-t border-gray-100 dark:border-gray-800 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2.5 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-xs font-semibold rounded-xl hover:bg-gray-200 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition flex items-center gap-2 shadow-sm"
                >
                  {isSaving ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Box className="h-4 w-4" />}
                  {editingAsset ? "Update Asset" : "Register Asset"}
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
              <span className="text-xs font-bold font-mono text-emerald-600">IMPACTO ASSET TAG</span>
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
                alt="Asset QR Code"
                className="h-44 w-44 mx-auto"
                referrerPolicy="no-referrer"
              />
            </div>

            <h4 className="font-bold text-sm text-gray-900 dark:text-white">{showQrModal.name}</h4>
            <p className="font-mono text-xs text-emerald-600 font-bold mt-0.5">{showQrModal.serial_number}</p>
            <p className="text-[11px] text-gray-500 mt-1">Scan tag on-site for instant field inspection & logs.</p>

            <div className="mt-6 flex gap-2">
              <button
                onClick={() => window.print()}
                className="flex-1 py-2.5 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 text-gray-800 dark:text-gray-200 text-xs font-semibold rounded-xl transition"
              >
                Print Label
              </button>
              <button
                onClick={() => setShowQrModal(null)}
                className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
