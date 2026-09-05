import React, { useState } from "react";
import { useLocalTranslation } from "../locales/additional-translations";
import { useOrgStore } from "../store/orgStore";
import { useAuthStore } from "../store/authStore";
import {
  useMarketplaceProducts,
  useCreateMarketplaceProduct,
  useMarketplaceLeads,
  useExpressInterest
} from "../hooks/useImpactoData";
import { Card, Input, Button, Badge, ImageUploadInput } from "../components/ui";
import { ResolvedImage } from "../components/ResolvedMedia";
import { useToast } from "../components/Toast";
import { ShoppingBag, Star, Plus, Shield, MessageSquare, AlertCircle, Phone, Mail, User } from "lucide-react";

import { Organization } from "../types";

interface MarketplaceProps {
  orgId?: string;
  org?: Organization;
  isPublic?: boolean;
}

export const OrganizationMarketplace: React.FC<MarketplaceProps> = ({
  orgId: propOrgId,
  org: propOrg,
  isPublic = false
}) => {
  const { t } = useLocalTranslation();
  const { activeOrg: storeOrg, activeMember } = useOrgStore();
  const { user } = useAuthStore();
  const { addToast } = useToast();

  const activeOrg = propOrg || storeOrg;
  const targetOrgId = propOrgId || activeOrg?.id;

  const isAdmin = !isPublic && (activeMember?.role === "org_admin" || activeMember?.role === "manager");

  // Data fetching
  const { data: products, isLoading: loadingProducts } = useMarketplaceProducts(targetOrgId);
  const { data: leads, isLoading: loadingLeads } = useMarketplaceLeads(isAdmin ? targetOrgId : undefined);

  // Mutations
  const createProductMutation = useCreateMarketplaceProduct();
  const expressInterestMutation = useExpressInterest();

  // Component UI States
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<any | null>(null);
  const [message, setMessage] = useState("");
  const [visitorName, setVisitorName] = useState("");
  const [visitorContact, setVisitorContact] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  // Product Form states
  const [newTitle, setNewTitle] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newPrice, setNewPrice] = useState("");
  const [newContact, setNewContact] = useState("");
  const [newImgUrl, setNewImgUrl] = useState("");

  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetOrgId || !user) return;
    if (!newTitle || !newDescription || !newPrice || !newContact) {
      addToast("Please fill in all required product details.", "error");
      return;
    }

    try {
      await createProductMutation.mutateAsync({
        org_id: targetOrgId,
        title: newTitle,
        description: newDescription,
        price: parseFloat(newPrice),
        currency: "RWF",
        image_url: newImgUrl || undefined,
        contact_info: newContact,
        created_by: user.id
      });
      addToast("Successfully listed product on organization marketplace!", "success");
      setShowAddModal(false);
      // reset forms
      setNewTitle("");
      setNewDescription("");
      setNewPrice("");
      setNewContact("");
      setNewImgUrl("");
    } catch (err: any) {
      addToast(err.message || "Failed to list item.", "error");
    }
  };

  const handleExpressInterest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetOrgId || !selectedProduct) return;

    if (!activeMember && (!visitorName.trim() || !visitorContact.trim())) {
      addToast("Please provide your name and phone/email so the cooperative can reach you.", "error");
      return;
    }

    try {
      const formattedMessage = activeMember
        ? (message || `Hello! I am interested in purchasing or securing "${selectedProduct.title}". Please contact me as soon as possible.`)
        : `[Public Inquiry from ${visitorName.trim()} (${visitorContact.trim()})]\n${message || `Interested in securing "${selectedProduct.title}".`}`;

      await expressInterestMutation.mutateAsync({
        org_id: targetOrgId,
        product_id: selectedProduct.id,
        member_id: activeMember?.id || "public_lead",
        message: formattedMessage
      });
      addToast("Your interest inquiry has been sent! The cooperative will contact you shortly.", "success");
      setSelectedProduct(null);
      setMessage("");
      setVisitorName("");
      setVisitorContact("");
    } catch (err: any) {
      addToast(err.message || "Error submitting interest.", "error");
    }
  };

  const filteredProducts = products?.filter((p) =>
    p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6 md:space-y-8 container mx-auto max-w-7xl px-4 py-6 font-sans select-none" id="marketplace-container">
      {/* Header section */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-gray-200 dark:border-slate-800 pb-5">
        <div>
          <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400 tracking-wider uppercase">
            {activeOrg?.name} {t("marketplace_listed", "Marketplace")}
          </span>
          <h1 className="text-2xl md:text-3xl font-extrabold font-display leading-none tracking-tight text-stone-900 dark:text-white mt-1">
            {t("marketplace_title")}
          </h1>
          <p className="text-xs md:text-sm text-gray-500 dark:text-slate-400 mt-1 font-medium">
            {t("marketplace_sub")}
          </p>
        </div>

        <div className="flex items-center gap-3">
          {isAdmin && (
            <Button onClick={() => setShowAddModal(true)} className="flex items-center gap-1.5 font-bold rounded-xl bg-emerald-700 hover:bg-emerald-800" id="btn-add-product">
              <Plus className="h-4 w-4" /> {t("marketplace_log_item")}
            </Button>
          )}
        </div>
      </div>

      {/* Admin Leads Notifications Section */}
      {isAdmin && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-5 rounded-2xl shadow-3xs" id="leads-notification-box">
          <div className="flex items-center gap-2 mb-3.5 border-b border-gray-200 dark:border-slate-800 pb-3">
            <Shield className="h-4 w-4 text-[#156c45] dark:text-emerald-400" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
              {t("marketplace_admin_center", { count: leads?.length || 0 })}
            </h3>
          </div>

          {leads && leads.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-bold uppercase text-[11px] leading-normal">
                    <th className="py-2.5 px-3">{t("marketplace_date")}</th>
                    <th className="py-2.5 px-3">{t("marketplace_interested_member")}</th>
                    <th className="py-2.5 px-3">{t("marketplace_product_title")}</th>
                    <th className="py-2.5 px-3">{t("marketplace_custom_note")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200/70 dark:divide-slate-800/80 text-stone-800 dark:text-slate-200">
                  {leads.slice(0, 5).map((l) => (
                    <tr key={l.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                      <td className="py-3 px-3 font-mono text-[10px] text-slate-400">
                        {new Date(l.created_at).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-3">
                        <div className="flex flex-col">
                          <span className="font-bold">{l.member_name}</span>
                          <span className="text-[10px] text-slate-400">{l.member_email}</span>
                        </div>
                      </td>
                      <td className="py-3 px-3 font-bold text-emerald-800 dark:text-emerald-400">
                        {l.product_title}
                      </td>
                      <td className="py-3 px-3 font-medium text-slate-600 dark:text-slate-300 leading-snug">
                        {l.message}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-[11px] text-slate-400 italic">{t("marketplace_no_leads")}</p>
          )}
        </div>
      )}

      {/* Grid Filter */}
      <div className="flex justify-between items-center bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-4 rounded-2xl shadow-3xs">
        <div className="w-full max-w-sm">
          <Input
            placeholder={t("marketplace_search_items")}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="text-xs text-slate-500 dark:text-slate-400 font-mono font-bold">
          {t("marketplace_total", { count: filteredProducts?.length || 0 })}
        </div>
      </div>

      {loadingProducts ? (
        <div className="text-center py-12">
          <p className="text-sm text-slate-500 animate-pulse">{t("marketplace_loading")}</p>
        </div>
      ) : filteredProducts && filteredProducts.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" id="products-grid">
          {filteredProducts.map((p) => (
            <div key={p.id} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 overflow-hidden shadow-3xs hover:shadow-md transition duration-200 flex flex-col justify-between">
              <div>
                {/* Product image placeholder if missing */}
                <div className="h-44 w-full bg-slate-100 dark:bg-slate-800/80 flex items-center justify-center overflow-hidden relative">
                  {p.image_url ? (
                    <ResolvedImage
                      src={p.image_url}
                      alt={p.title}
                      referrerPolicy="no-referrer"
                      className="object-cover h-full w-full"
                      bucketName="avatars"
                    />
                  ) : (
                    <ShoppingBag className="h-12 w-12 text-slate-300 dark:text-slate-600" />
                  )}
                  <span className="absolute top-2.5 right-2.5 bg-zinc-900/80 backdrop-blur-xs text-white px-2.5 py-1 text-xs font-extrabold rounded-lg font-mono">
                    {p.price.toLocaleString()} RWF
                  </span>
                </div>

                <div className="p-5 space-y-2">
                  <h3 className="text-base font-bold text-stone-900 dark:text-white leading-tight font-display">
                    {p.title}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-3 leading-relaxed">
                    {p.description}
                  </p>
                </div>
              </div>

              <div className="p-5 border-t border-gray-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 space-y-3">
                <div className="flex flex-col gap-1 text-[10px] text-slate-400 font-mono leading-tight">
                  <span className="flex items-center gap-1">
                    <User className="h-3 w-3" /> {t("marketplace_contacts")} {p.contact_info}
                  </span>
                  <span>{t("marketplace_listed")} {new Date(p.created_at).toLocaleDateString()}</span>
                </div>

                <div className="pt-1">
                  <Button
                    size="sm"
                    className="w-full flex items-center justify-center gap-1.5 text-xs font-bold rounded-xl"
                    onClick={() => setSelectedProduct(p)}
                  >
                    <Star className="h-3.5 w-3.5 shrink-0" /> {t("marketplace_express_interest")}
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-16 border border-slate-200/80 dark:border-slate-800 rounded-2xl bg-white dark:bg-slate-900 shadow-3xs" id="empty-marketplace">
          <ShoppingBag className="h-12 w-12 mx-auto text-slate-300 dark:text-slate-600 mb-3" />
          <h2 className="text-sm font-bold text-stone-800 dark:text-white">{t("marketplace_no_items")}</h2>
          <p className="text-xs text-gray-400 mt-1 max-w-sm mx-auto">
            {t("marketplace_no_items_desc")}
          </p>
        </div>
      )}

      {/* Add Product Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in" id="add-modal">
          <div className="bg-white dark:bg-slate-900 border rounded-xl shadow-lg w-full max-w-lg p-6 relative">
            <h2 className="text-lg font-bold text-stone-900 dark:text-white flex items-center gap-1.5 mb-4">
              <ShoppingBag className="h-5 w-5 text-emerald-700" /> {t("marketplace_log_title")}
            </h2>
            <form onSubmit={handleCreateProduct} className="space-y-4">
              <Input
                label={t("marketplace_prod_name")}
                placeholder={t("marketplace_prod_name_placeholder")}
                required
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
              />
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-700 dark:text-slate-300">
                  {t("marketplace_desc")} <span className="text-red-500">*</span>
                </label>
                <textarea
                  className="w-full h-24 text-xs rounded-lg border bg-white dark:bg-slate-900 border-gray-300 dark:border-slate-850 p-2.5 outline-none focus:ring-1 focus:ring-emerald-600"
                  placeholder={t("marketplace_desc_placeholder")}
                  required
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Input
                  label={t("marketplace_price")}
                  type="number"
                  placeholder="e.g. 15000"
                  required
                  value={newPrice}
                  onChange={(e) => setNewPrice(e.target.value)}
                />
                <Input
                  label={t("marketplace_contact")}
                  placeholder="e.g. coop-manager@tele.com"
                  required
                  value={newContact}
                  onChange={(e) => setNewContact(e.target.value)}
                />
              </div>

              <ImageUploadInput
                label={t("marketplace_img")}
                placeholder={t("marketplace_upload_placeholder")}
                value={newImgUrl}
                onChange={(url) => setNewImgUrl(url)}
              />

              <div className="flex justify-end gap-2.5 pt-4 border-t border-dashed">
                <Button variant="outline" type="button" onClick={() => setShowAddModal(false)}>
                  {t("marketplace_cancel")}
                </Button>
                <Button type="submit" disabled={createProductMutation.isPending} className="font-bold">
                  {createProductMutation.isPending ? t("marketplace_publishing") : t("marketplace_publish")}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Express Interest Modal */}
      {selectedProduct && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in" id="interest-modal">
          <div className="bg-white dark:bg-slate-900 border rounded-xl shadow-lg w-full max-w-md p-6 relative">
            <h2 className="text-lg font-bold text-stone-900 dark:text-white flex items-center gap-1.5 mb-2">
              <MessageSquare className="h-5 w-5 text-emerald-700" /> {t("marketplace_share_interest")}
            </h2>
            <div className="p-3 bg-stone-50 dark:bg-slate-950/20 border rounded-lg text-xs space-y-1 mb-4">
              <p className="font-bold text-emerald-800 dark:text-emerald-400">{selectedProduct.title}</p>
              <p className="font-medium text-stone-700 dark:text-slate-300">{t("marketplace_value")} <span className="font-bold text-red-700">{selectedProduct.price.toLocaleString()} RWF</span></p>
            </div>

            <form onSubmit={handleExpressInterest} className="space-y-4">
              {!activeMember && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200/80 dark:border-slate-800">
                  <Input
                    label="Your Full Name *"
                    placeholder="e.g. John Doe"
                    required
                    value={visitorName}
                    onChange={(e) => setVisitorName(e.target.value)}
                  />
                  <Input
                    label="Phone or WhatsApp *"
                    placeholder="e.g. +250 788 123 456"
                    required
                    value={visitorContact}
                    onChange={(e) => setVisitorContact(e.target.value)}
                  />
                </div>
              )}

              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-700 dark:text-slate-300">
                  {t("marketplace_custom_req")}
                </label>
                <textarea
                  className="w-full h-24 text-xs rounded-lg border bg-white dark:bg-slate-900 border-gray-300 dark:border-slate-850 p-2.5 outline-none focus:ring-1 focus:ring-emerald-600"
                  placeholder={t("marketplace_custom_req_placeholder")}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                />
              </div>

              <div className="flex justify-end gap-2.5 pt-2">
                <Button variant="outline" type="button" onClick={() => setSelectedProduct(null)}>
                  {t("marketplace_discard")}
                </Button>
                <Button type="submit" className="font-bold">
                  {t("marketplace_log_interest_btn")}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
