import React, { useState, useRef } from "react";
import { 
  Award, 
  Download, 
  Printer, 
  X, 
  Check, 
  Search, 
  Sliders, 
  Palette, 
  Type, 
  Users, 
  UserCheck, 
  ShieldCheck, 
  QrCode, 
  PenTool, 
  FileBadge,
  LayoutTemplate,
  CheckSquare,
  Square,
  Upload,
  Image as ImageIcon,
  Building,
  Layers,
  ExternalLink,
  Trash2
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";
import { OrgMember } from "../types";
import { useOrgStore } from "../store/orgStore";
import { useToast } from "./Toast";
import { DigitalSignaturePad } from "./DigitalSignaturePad";
import { MockDB } from "../lib/mockData";
import { supabase, isSupabaseConfigured } from "../lib/supabase";

interface CertificateBadgeBuilderModalProps {
  isOpen: boolean;
  onClose: () => void;
  members: OrgMember[];
}

export type CertificateStructure = 
  | "landscape_classic"      // Landscape A: Classical Filigree & Centered Academic
  | "landscape_asymmetric"   // Landscape B: Modern Asymmetric Column & Grid
  | "portrait_diploma"       // Portrait A: Executive Plaque & Vertical Scroll
  | "portrait_credential";   // Portrait B: Modern Credential & Vertical Badge Card

export type LogoLayout = "split" | "centered" | "bottom_bar";

type TemplateStyle = "emerald" | "gold" | "navy" | "crimson" | "slate";

const THEME_CONFIGS: Record<TemplateStyle, {
  name: string;
  primary: string;
  secondary: string;
  bgLight: string;
  borderClass: string;
  textClass: string;
  badgeBg: string;
}> = {
  emerald: {
    name: "Official Emerald",
    primary: "#156c45",
    secondary: "#238656",
    bgLight: "#f5faf7",
    borderClass: "border-[#156c45]",
    textClass: "text-[#156c45]",
    badgeBg: "bg-emerald-500",
  },
  gold: {
    name: "Executive Gold",
    primary: "#b45309",
    secondary: "#d97706",
    bgLight: "#fffdfa",
    borderClass: "border-amber-600",
    textClass: "text-amber-800",
    badgeBg: "bg-amber-600",
  },
  navy: {
    name: "Institutional Navy",
    primary: "#1e3a8a",
    secondary: "#2563eb",
    bgLight: "#f8faff",
    borderClass: "border-blue-900",
    textClass: "text-blue-900",
    badgeBg: "bg-blue-800",
  },
  crimson: {
    name: "Honorary Crimson",
    primary: "#991b1b",
    secondary: "#dc2626",
    bgLight: "#fef8f8",
    borderClass: "border-red-800",
    textClass: "text-red-800",
    badgeBg: "bg-red-700",
  },
  slate: {
    name: "Minimalist Slate",
    primary: "#334155",
    secondary: "#475569",
    bgLight: "#f8fafc",
    borderClass: "border-slate-700",
    textClass: "text-slate-800",
    badgeBg: "bg-slate-700",
  }
};

export const CertificateBadgeBuilderModal: React.FC<CertificateBadgeBuilderModalProps> = ({
  isOpen,
  onClose,
  members = []
}) => {
  const { t, i18n } = useTranslation();
  const { activeOrg, activeMember } = useOrgStore();
  const { addToast } = useToast();

  // 1. Structure State: 4 Architectural Layouts (2 Landscape + 2 Portrait)
  const [structure, setStructure] = useState<CertificateStructure>("landscape_classic");
  const [templateTheme, setTemplateTheme] = useState<TemplateStyle>("emerald");
  const [customPrimaryColor, setCustomPrimaryColor] = useState<string>("#156c45");

  // 2. Logos & Co-branding States
  const [showOrgLogo, setShowOrgLogo] = useState<boolean>(true);
  const [orgLogoOverride, setOrgLogoOverride] = useState<string>("");
  const [showPartnerLogo, setShowPartnerLogo] = useState<boolean>(false);
  const [partnerLogoUrl, setPartnerLogoUrl] = useState<string>("");
  const [partnerName, setPartnerName] = useState<string>(() => t("cert_builder.default_partner_name", { defaultValue: "National Cooperative Agency (RCA)" }));
  const [partnerSubtitle, setPartnerSubtitle] = useState<string>(() => t("cert_builder.default_partner_subtitle", { defaultValue: "In Technical Partnership & Accreditation" }));
  const [logoLayout, setLogoLayout] = useState<LogoLayout>("split");
  const [logoSize, setLogoSize] = useState<"sm" | "md" | "lg">("md");

  // 3. Editable Text & Copy States
  const [certificateTitle, setCertificateTitle] = useState(() => t("cert_builder.default_title", { defaultValue: "CERTIFICATE OF EXCELLENCE & LEADERSHIP" }));
  const [subtitle, setSubtitle] = useState(() => t("cert_builder.default_subtitle", { defaultValue: "Conferred by Democratic Decision of the General Assembly" }));
  const [reasonText, setReasonText] = useState(() =>
    t("cert_builder.default_reason", {
      defaultValue: "In recognition of outstanding dedication, continuous active participation, and exemplary adherence to cooperative governance standards and shared community welfare."
    })
  );
  const [issueDate, setIssueDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [signatoryName, setSignatoryName] = useState(() => (activeMember as any)?.user?.full_name || t("cert_builder.default_signatory_name", { defaultValue: "Authorized Executive" }));
  const [signatoryTitle, setSignatoryTitle] = useState(() => t("cert_builder.default_signatory_title", { defaultValue: "Board Chairperson / Administrator" }));
  const [signatureDataUrl, setSignatureDataUrl] = useState<string>("");
  const [showSignaturePad, setShowSignaturePad] = useState(false);

  // 4. Member Selection States
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>(() => {
    return members.slice(0, 5).map(m => m.id);
  });
  const [memberSearch, setMemberSearch] = useState("");
  const [previewMemberIndex, setPreviewMemberIndex] = useState(0);
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);

  // Hidden off-screen render container
  const singleRenderRef = useRef<HTMLDivElement | null>(null);

  if (!isOpen) return null;

  const currentTheme = THEME_CONFIGS[templateTheme];
  const effectivePrimary = customPrimaryColor || currentTheme.primary;
  const isLandscape = structure.startsWith("landscape");

  const effectiveOrgLogo = (orgLogoOverride && !orgLogoOverride.includes("logo.png") ? orgLogoOverride : "") || 
    (activeOrg?.logo_url && !activeOrg.logo_url.includes("logo.png") ? activeOrg.logo_url : "");

  const filteredMembers = members.filter(m => {
    const q = memberSearch.toLowerCase();
    const name = (m.user?.full_name || "").toLowerCase();
    const email = (m.user?.email || "").toLowerCase();
    const phone = (m.user?.phone || "").toLowerCase();
    const role = (m.role || "").toLowerCase();
    return name.includes(q) || email.includes(q) || phone.includes(q) || role.includes(q);
  });

  const selectedMembersList = members.filter(m => selectedMemberIds.includes(m.id));
  const activePreviewMember = selectedMembersList[previewMemberIndex] || selectedMembersList[0] || members[0];
  const previewCertificateId = activePreviewMember 
    ? `IMPACTO-${isLandscape ? "CERT" : "BDG"}-2026-${activePreviewMember.id.substring(0, 6).toUpperCase()}` 
    : "IMPACTO-CERT-2026-PREVIEW";

  const handleToggleSelectAll = () => {
    if (selectedMemberIds.length === members.length) {
      setSelectedMemberIds([]);
    } else {
      setSelectedMemberIds(members.map(m => m.id));
    }
  };

  const handleToggleMember = (id: string) => {
    setSelectedMemberIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  // Image Upload Handlers
  const handleOrgLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setOrgLogoOverride(reader.result as string);
      setShowOrgLogo(true);
      addToast(t("cert_builder.toast_org_logo_uploaded", { defaultValue: "Organization logo uploaded successfully!" }), "success");
    };
    reader.readAsDataURL(file);
  };

  const handlePartnerLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setPartnerLogoUrl(reader.result as string);
      setShowPartnerLogo(true);
      addToast(t("cert_builder.toast_partner_logo_uploaded", { defaultValue: "Partner / Co-sponsor logo attached!" }), "success");
    };
    reader.readAsDataURL(file);
  };

  // Logo pixel height helper
  const getLogoHeightPx = () => {
    if (logoSize === "sm") return 42;
    if (logoSize === "lg") return 68;
    return 54;
  };

  // HTML Generator for offscreen canvas export
  const renderCardForMember = (member: OrgMember, uniqueSerial: string) => {
    const container = document.createElement("div");
    container.style.position = "fixed";
    container.style.left = "-9999px";
    container.style.top = "0";
    container.style.zIndex = "-9999";
    container.style.background = "#ffffff";
    container.style.boxSizing = "border-box";

    const memberName = member.user?.full_name || t("cert_builder.esteemed_member", { defaultValue: "Esteemed Member" });
    const memberEmail = member.user?.email || "";
    const memberPhone = member.user?.phone_number || "";
    const orgName = activeOrg?.name || t("cert_builder.default_org_name", { defaultValue: "Impacto Cooperative Federation" });
    const formattedIssueDate = issueDate
      ? new Date(`${issueDate}T12:00:00`).toLocaleDateString(i18n.language, { year: "numeric", month: "short", day: "numeric" })
      : issueDate;
    const logoH = getLogoHeightPx();

    // Logos block HTML
    const orgLogoHtml = showOrgLogo && effectiveOrgLogo 
      ? `<img src="${effectiveOrgLogo}" style="height: ${logoH}px; max-width: 140px; object-fit: contain;" />`
      : `<div style="font-weight: 900; font-size: 14px; letter-spacing: 1.5px; color: ${effectivePrimary}; font-family: sans-serif;">${orgName}</div>`;

    const partnerLogoHtml = showPartnerLogo && partnerLogoUrl
      ? `<div style="text-align: right;">
           <div style="font-size: 8px; text-transform: uppercase; color: #64748b; font-family: sans-serif; margin-bottom: 2px;">${partnerSubtitle}</div>
           <img src="${partnerLogoUrl}" style="height: ${logoH * 0.85}px; max-width: 130px; object-fit: contain;" />
         </div>`
      : showPartnerLogo ? `<div style="font-size: 10px; font-weight: bold; color: #475569; font-family: sans-serif;">${partnerName}</div>` : "";

    const officialText = t("cert_builder.seal_official", { defaultValue: "OFFICIAL" });
    const sealText = t("cert_builder.seal_label", { defaultValue: "SEAL" });
    const verifiedText = t("cert_builder.seal_verified", { defaultValue: "VERIFIED" });
    const authenticatedText = t("cert_builder.seal_authenticated", { defaultValue: "AUTHENTICATED" });
    const certIdPrefix = t("cert_builder.certificate_id_prefix", { defaultValue: "Certificate ID" });

    // -----------------------------------------------------------------
    // STRUCTURE 1: LANDSCAPE CLASSIC FILIGREE (Horizontal 1120 x 792)
    // -----------------------------------------------------------------
    if (structure === "landscape_classic") {
      container.style.width = "1120px";
      container.style.height = "792px";
      container.innerHTML = `
        <div style="border: 10px double ${effectivePrimary}; width: 100%; height: 100%; box-sizing: border-box; padding: 34px 44px; position: relative; text-align: center; display: flex; flex-direction: column; justify-content: space-between; background: #ffffff; font-family: Georgia, serif;">
          <!-- Filigree Corners -->
          <div style="position: absolute; top: 12px; left: 12px; width: 44px; height: 44px; border-top: 3px solid ${effectivePrimary}; border-left: 3px solid ${effectivePrimary};"></div>
          <div style="position: absolute; top: 12px; right: 12px; width: 44px; height: 44px; border-top: 3px solid ${effectivePrimary}; border-right: 3px solid ${effectivePrimary};"></div>
          <div style="position: absolute; bottom: 12px; left: 12px; width: 44px; height: 44px; border-bottom: 3px solid ${effectivePrimary}; border-left: 3px solid ${effectivePrimary};"></div>
          <div style="position: absolute; bottom: 12px; right: 12px; width: 44px; height: 44px; border-bottom: 3px solid ${effectivePrimary}; border-right: 3px solid ${effectivePrimary};"></div>

          <!-- Dual Header / Logos -->
          <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #e2e8f0; padding-bottom: 12px;">
            <div style="text-align: left;">${orgLogoHtml}</div>
            <div style="text-align: center;">
              <div style="font-size: 13px; font-weight: bold; letter-spacing: 2.5px; text-transform: uppercase; color: ${effectivePrimary}; font-family: sans-serif;">${orgName}</div>
              <div style="font-size: 10px; letter-spacing: 1px; text-transform: uppercase; color: #64748b; font-family: sans-serif; margin-top: 2px;">${subtitle}</div>
            </div>
            <div style="text-align: right;">${partnerLogoHtml}</div>
          </div>

          <!-- Title -->
          <div style="margin: 12px 0;">
            <div style="font-size: 26px; font-weight: 900; letter-spacing: 1.5px; color: ${effectivePrimary}; text-transform: uppercase;">${certificateTitle}</div>
            <div style="font-size: 13px; font-style: italic; color: #64748b; margin-top: 4px;">${t("cert_builder.conferred_upon_classic", { defaultValue: "This formal instrument of recognition is solemnly conferred upon" })}</div>
          </div>

          <!-- Recipient Name -->
          <div>
            <div style="font-size: 34px; font-weight: bold; color: #0f172a; border-bottom: 2px solid ${effectivePrimary}; display: inline-block; padding: 0 40px 6px 40px;">
              ${memberName}
            </div>
            <div style="font-size: 11px; font-family: sans-serif; font-weight: 700; text-transform: uppercase; letter-spacing: 1.5px; color: ${effectivePrimary}; margin-top: 8px;">
              ${certIdPrefix}: <span style="font-family: monospace; font-weight: 800; letter-spacing: 1px;">${uniqueSerial}</span>
            </div>
          </div>

          <!-- Reason -->
          <div style="font-size: 13px; line-height: 1.6; color: #334155; max-width: 800px; margin: 0 auto; font-style: italic;">
            "${reasonText}"
          </div>

          <!-- Bottom Footer Row -->
          <div style="display: flex; justify-content: space-between; align-items: flex-end; padding-top: 14px; border-top: 1px solid #e2e8f0; font-family: sans-serif;">
            <div style="text-align: left;">
              <div style="font-size: 9px; text-transform: uppercase; color: #64748b; font-weight: bold;">${t("cert_builder.date_conferred", { defaultValue: "Date Conferred" })}</div>
              <div style="font-size: 12px; font-weight: bold; color: #0f172a;">${formattedIssueDate}</div>
              <div style="font-size: 8px; font-family: monospace; color: #156c45; margin-top: 3px;">${t("cert_builder.verify_label", { defaultValue: "Verify" })}: impacto.rw/verify/${uniqueSerial}</div>
            </div>

            <!-- Seal -->
            <div style="border: 2px dashed ${effectivePrimary}; border-radius: 50%; padding: 4px; background: rgba(255,255,255,0.95);">
              <div style="width: 72px; height: 72px; border-radius: 50%; border: 1.5px solid ${effectivePrimary}; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; color: ${effectivePrimary};">
                <div style="font-size: 8px; font-weight: 900;">${officialText}</div>
                <div style="font-size: 7px; font-weight: bold;">${sealText}</div>
                <div style="font-size: 6px; opacity: 0.8; margin-top: 1px;">${verifiedText}</div>
              </div>
            </div>

            <!-- Signatory -->
            <div style="text-align: right; min-width: 200px;">
              <div style="height: 38px; display: flex; align-items: flex-end; justify-content: flex-end; margin-bottom: 2px;">
                ${signatureDataUrl 
                  ? `<img src="${signatureDataUrl}" style="height: 36px; object-fit: contain;" />` 
                  : `<span style="font-family: Georgia, serif; font-style: italic; font-size: 18px; color: ${effectivePrimary}; font-weight: bold;">${signatoryName}</span>`
                }
              </div>
              <div style="border-top: 1.5px solid #334155; padding-top: 2px;">
                <div style="font-size: 11px; font-weight: bold; color: #0f172a;">${signatoryName}</div>
                <div style="font-size: 9px; color: #64748b;">${signatoryTitle}</div>
              </div>
            </div>
          </div>
        </div>
      `;
    }

    // -----------------------------------------------------------------
    // STRUCTURE 2: LANDSCAPE ASYMMETRIC (Modern Left Accent Column)
    // -----------------------------------------------------------------
    else if (structure === "landscape_asymmetric") {
      container.style.width = "1120px";
      container.style.height = "792px";
      container.innerHTML = `
        <div style="width: 100%; height: 100%; box-sizing: border-box; display: flex; background: #ffffff; font-family: sans-serif; overflow: hidden; border: 1px solid #cbd5e1;">
          <!-- Left Column -->
          <div style="width: 280px; background: ${effectivePrimary}; color: #ffffff; padding: 40px 28px; display: flex; flex-direction: column; justify-content: space-between; box-sizing: border-box; text-align: center;">
            <div>
              ${showOrgLogo && effectiveOrgLogo 
                ? `<div style="background: #ffffff; padding: 10px; border-radius: 12px; display: inline-block; margin-bottom: 16px;"><img src="${effectiveOrgLogo}" style="height: 52px; max-width: 160px; object-fit: contain;" /></div>`
                : `<div style="font-size: 20px; font-weight: 900; letter-spacing: 1px; margin-bottom: 12px;">IMPACTO</div>`
              }
              <div style="font-size: 14px; font-weight: 800; letter-spacing: 1.5px; text-transform: uppercase;">${orgName}</div>
              <div style="font-size: 10px; opacity: 0.85; margin-top: 6px; line-height: 1.4;">${subtitle}</div>
            </div>

            ${showPartnerLogo ? `
              <div style="background: rgba(255,255,255,0.12); padding: 12px; border-radius: 12px; margin: 20px 0;">
                <div style="font-size: 8px; text-transform: uppercase; opacity: 0.8; margin-bottom: 6px;">${partnerSubtitle}</div>
                ${partnerLogoUrl ? `<img src="${partnerLogoUrl}" style="height: 40px; max-width: 140px; object-fit: contain; filter: brightness(0) invert(1);" />` : `<div style="font-size: 11px; font-weight: bold;">${partnerName}</div>`}
              </div>` : ""
            }

            <div style="border-top: 1px solid rgba(255,255,255,0.25); padding-top: 16px; font-size: 9px; opacity: 0.85; text-align: left;">
              <div>${t("cert_builder.serial_label", { defaultValue: "Serial" })}: <span style="font-family: monospace; font-weight: bold;">${uniqueSerial}</span></div>
              <div style="margin-top: 4px;">${t("cert_builder.verified_registry", { defaultValue: "Verified Registry" })}: impacto.rw/verify</div>
            </div>
          </div>

          <!-- Right Content Area -->
          <div style="flex: 1; padding: 48px 56px; display: flex; flex-direction: column; justify-content: space-between; box-sizing: border-box; text-align: left;">
            <div>
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 2px; color: ${effectivePrimary};">
                  ${t("cert_builder.official_merit_credential", { defaultValue: "Official Verification & Merit Credential" })}
                </div>
                <div style="font-size: 11px; font-weight: 600; color: #64748b;">
                  ${t("common.date", { defaultValue: "Date" })}: <strong style="color: #0f172a;">${formattedIssueDate}</strong>
                </div>
              </div>

              <div style="font-size: 30px; font-weight: 900; color: #0f172a; text-transform: uppercase; letter-spacing: -0.5px; margin-top: 16px;">
                ${certificateTitle}
              </div>
              <div style="font-size: 13px; color: #64748b; margin-top: 6px; font-style: italic;">
                ${t("cert_builder.presented_recognition_to", { defaultValue: "Presented in formal recognition and validation to" })}
              </div>
            </div>

            <div style="margin: 20px 0;">
              <div style="font-size: 38px; font-weight: 900; color: ${effectivePrimary}; font-family: Georgia, serif;">
                ${memberName}
              </div>
              <div style="display: inline-block; background: #f8fafc; border: 1.5px solid ${effectivePrimary}; padding: 6px 18px; border-radius: 6px; font-size: 11px; font-weight: 700; color: #0f172a; margin-top: 10px; letter-spacing: 0.5px;">
                ${certIdPrefix.toUpperCase()}: <span style="font-family: monospace; font-weight: 800; color: ${effectivePrimary};">${uniqueSerial}</span>
              </div>
            </div>

            <div style="font-size: 13px; line-height: 1.6; color: #475569; max-width: 680px; font-style: italic; border-left: 3px solid ${effectivePrimary}; padding-left: 16px;">
              "${reasonText}"
            </div>

            <div style="display: flex; justify-content: space-between; align-items: flex-end; border-top: 1px solid #e2e8f0; padding-top: 18px;">
              <div>
                <div style="font-size: 9px; text-transform: uppercase; color: #64748b; font-weight: bold;">${t("cert_builder.validation_status", { defaultValue: "Validation Status" })}</div>
                <div style="font-size: 12px; font-weight: bold; color: #16a34a; margin-top: 2px;">${t("cert_builder.verified_and_sealed", { defaultValue: "Verified & Sealed" })}</div>
                <div style="font-size: 8px; color: #94a3b8; margin-top: 2px;">ID: ${uniqueSerial}</div>
              </div>

              <div style="text-align: right; min-width: 220px;">
                <div style="height: 40px; display: flex; align-items: flex-end; justify-content: flex-end; margin-bottom: 4px;">
                  ${signatureDataUrl 
                    ? `<img src="${signatureDataUrl}" style="height: 38px; object-fit: contain;" />` 
                    : `<span style="font-family: Georgia, serif; font-style: italic; font-size: 20px; color: ${effectivePrimary}; font-weight: bold;">${signatoryName}</span>`
                  }
                </div>
                <div style="border-top: 1.5px solid #0f172a; padding-top: 4px;">
                  <div style="font-size: 12px; font-weight: bold; color: #0f172a;">${signatoryName}</div>
                  <div style="font-size: 10px; color: #64748b;">${signatoryTitle}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      `;
    }

    // -----------------------------------------------------------------
    // STRUCTURE 3: PORTRAIT DIPLOMA & PLAQUE (Vertical 792 x 1120)
    // -----------------------------------------------------------------
    else if (structure === "portrait_diploma") {
      container.style.width = "792px";
      container.style.height = "1120px";
      container.innerHTML = `
        <div style="border: 8px double ${effectivePrimary}; width: 100%; height: 100%; box-sizing: border-box; padding: 48px 40px; text-align: center; display: flex; flex-direction: column; justify-content: space-between; background: #ffffff; font-family: Georgia, serif;">
          <!-- Top Header & Logos -->
          <div>
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
              <div>${orgLogoHtml}</div>
              <div>${partnerLogoHtml}</div>
            </div>
            <div style="font-size: 15px; font-weight: bold; letter-spacing: 3px; text-transform: uppercase; color: ${effectivePrimary}; font-family: sans-serif;">${orgName}</div>
            <div style="font-size: 11px; letter-spacing: 1.5px; text-transform: uppercase; color: #64748b; font-family: sans-serif; margin-top: 4px;">${subtitle}</div>
          </div>

          <!-- Diploma Title -->
          <div style="margin: 20px 0;">
            <div style="font-size: 28px; font-weight: 900; letter-spacing: 1px; color: ${effectivePrimary}; text-transform: uppercase;">${certificateTitle}</div>
            <div style="font-size: 14px; font-style: italic; color: #64748b; margin-top: 8px;">${t("cert_builder.conferred_distinction_upon", { defaultValue: "Conferred with the highest distinction upon" })}</div>
          </div>

          <!-- Recipient -->
          <div>
            <div style="font-size: 36px; font-weight: bold; color: #0f172a; border-bottom: 2px solid ${effectivePrimary}; display: inline-block; padding: 0 44px 8px 44px;">
              ${memberName}
            </div>
            <div style="font-size: 12px; font-family: sans-serif; font-weight: 700; text-transform: uppercase; letter-spacing: 1.5px; color: ${effectivePrimary}; margin-top: 10px;">
              ${certIdPrefix}: <span style="font-family: monospace; font-weight: 800;">${uniqueSerial}</span>
            </div>
          </div>

          <!-- Body Citation -->
          <div style="font-size: 14px; line-height: 1.7; color: #334155; max-width: 600px; margin: 0 auto; font-style: italic;">
            "${reasonText}"
          </div>

          <!-- Seal & Validation -->
          <div style="margin: 16px 0; display: flex; justify-content: center;">
            <div style="border: 2px dashed ${effectivePrimary}; border-radius: 50%; padding: 6px; background: rgba(255,255,255,0.9);">
              <div style="width: 80px; height: 80px; border-radius: 50%; border: 1.5px solid ${effectivePrimary}; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; color: ${effectivePrimary};">
                <div style="font-size: 9px; font-weight: 900;">${officialText}</div>
                <div style="font-size: 8px; font-weight: bold;">${sealText}</div>
                <div style="font-size: 7px; opacity: 0.8; margin-top: 2px;">${authenticatedText}</div>
              </div>
            </div>
          </div>

          <!-- Signatures & Verification footer -->
          <div style="border-top: 1px solid #e2e8f0; padding-top: 18px; display: flex; justify-content: space-between; align-items: flex-end; font-family: sans-serif;">
            <div style="text-align: left;">
              <div style="font-size: 10px; text-transform: uppercase; color: #64748b; font-weight: bold;">${t("cert_builder.conferral_date", { defaultValue: "Conferral Date" })}</div>
              <div style="font-size: 13px; font-weight: bold; color: #0f172a;">${formattedIssueDate}</div>
              <div style="font-size: 9px; font-family: monospace; color: #156c45; margin-top: 4px;">impacto.rw/verify/${uniqueSerial}</div>
            </div>

            <div style="text-align: right; min-width: 220px;">
              <div style="height: 44px; display: flex; align-items: flex-end; justify-content: flex-end; margin-bottom: 4px;">
                ${signatureDataUrl 
                  ? `<img src="${signatureDataUrl}" style="height: 40px; object-fit: contain;" />` 
                  : `<span style="font-family: Georgia, serif; font-style: italic; font-size: 22px; color: ${effectivePrimary}; font-weight: bold;">${signatoryName}</span>`
                }
              </div>
              <div style="border-top: 1.5px solid #334155; padding-top: 4px;">
                <div style="font-size: 12px; font-weight: bold; color: #0f172a;">${signatoryName}</div>
                <div style="font-size: 10px; color: #64748b;">${signatoryTitle}</div>
              </div>
            </div>
          </div>
        </div>
      `;
    }

    // -----------------------------------------------------------------
    // STRUCTURE 4: PORTRAIT CREDENTIAL & ID BADGE (Vertical 600 x 860)
    // -----------------------------------------------------------------
    else {
      container.style.width = "600px";
      container.style.height = "860px";
      container.innerHTML = `
        <div style="border: 2px solid #cbd5e1; border-radius: 24px; width: 100%; height: 100%; box-sizing: border-box; overflow: hidden; display: flex; flex-direction: column; background: #ffffff; font-family: sans-serif;">
          <!-- Lanyard slot -->
          <div style="background: #f1f5f9; padding: 12px 0; text-align: center; border-bottom: 1px solid #cbd5e1;">
            <div style="width: 70px; height: 10px; background: #cbd5e1; border-radius: 9999px; margin: 0 auto;"></div>
          </div>

          <!-- Header Banner -->
          <div style="background: ${effectivePrimary}; color: #ffffff; padding: 22px 20px; text-align: center;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
              ${showOrgLogo && effectiveOrgLogo ? `<img src="${effectiveOrgLogo}" style="height: 38px; max-width: 100px; object-fit: contain; filter: brightness(0) invert(1);" />` : `<div style="font-weight: bold; font-size: 12px;">${orgName}</div>`}
              ${showPartnerLogo && partnerLogoUrl ? `<img src="${partnerLogoUrl}" style="height: 32px; max-width: 90px; object-fit: contain; filter: brightness(0) invert(1);" />` : ""}
            </div>
            <div style="font-size: 16px; font-weight: 900; letter-spacing: 1px; text-transform: uppercase;">${orgName}</div>
            <div style="font-size: 11px; opacity: 0.9; margin-top: 4px; text-transform: uppercase;">${certificateTitle}</div>
          </div>

          <!-- Body -->
          <div style="flex: 1; padding: 28px 24px; display: flex; flex-direction: column; align-items: center; justify-content: space-between; text-align: center;">
            <div style="width: 96px; height: 96px; border-radius: 50%; border: 4px solid ${effectivePrimary}; display: flex; items-center; justify-content: center; font-size: 32px; font-weight: bold; color: ${effectivePrimary}; background: ${currentTheme.bgLight}; line-height: 88px;">
              ${memberName.substring(0, 2).toUpperCase()}
            </div>

            <div>
              <div style="font-size: 24px; font-weight: 800; color: #0f172a;">${memberName}</div>
              <div style="display: inline-block; background: ${effectivePrimary}; color: #ffffff; padding: 5px 18px; border-radius: 9999px; font-size: 11px; font-weight: 700; text-transform: uppercase; margin-top: 8px; font-family: monospace; letter-spacing: 0.8px;">
                ${t("cert_builder.cert_id_short", { defaultValue: "CERT ID" })}: ${uniqueSerial}
              </div>
            </div>

            <!-- Details Box -->
            <div style="width: 100%; max-width: 440px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 14px; padding: 14px 18px; font-size: 12px; text-align: left;">
              <div style="display: flex; justify-content: space-between; margin-bottom: 6px;">
                <span style="color: #64748b; font-weight: 600;">${t("cert_builder.member_id", { defaultValue: "Member ID" })}:</span>
                <span style="color: #0f172a; font-family: monospace; font-weight: bold;">${member.id}</span>
              </div>
              ${memberEmail ? `
              <div style="display: flex; justify-content: space-between; margin-bottom: 6px;">
                <span style="color: #64748b; font-weight: 600;">${t("common.email", { defaultValue: "Email" })}:</span>
                <span style="color: #0f172a;">${memberEmail}</span>
              </div>` : ""}
              ${memberPhone ? `
              <div style="display: flex; justify-content: space-between; margin-bottom: 6px;">
                <span style="color: #64748b; font-weight: 600;">${t("common.phone", { defaultValue: "Phone" })}:</span>
                <span style="color: #0f172a;">${memberPhone}</span>
              </div>` : ""}
              <div style="display: flex; justify-content: space-between;">
                <span style="color: #64748b; font-weight: 600;">${t("cert_builder.issued_date", { defaultValue: "Issued Date" })}:</span>
                <span style="color: #0f172a; font-weight: bold;">${formattedIssueDate}</span>
              </div>
            </div>

            <!-- Verification Footer -->
            <div style="width: 100%; border-top: 1px dashed #cbd5e1; padding-top: 16px; display: flex; align-items: center; justify-content: space-between;">
              <div style="text-align: left;">
                <div style="font-size: 9px; text-transform: uppercase; color: #64748b; font-weight: bold;">${t("cert_builder.authorized_signatory", { defaultValue: "Authorized Signatory" })}</div>
                <div style="font-size: 12px; font-weight: bold; color: ${effectivePrimary}; margin-top: 2px;">${signatoryName}</div>
                <div style="font-size: 8px; color: #156c45; font-family: monospace; margin-top: 2px;">${t("cert_builder.token_label", { defaultValue: "Token" })}: ${uniqueSerial}</div>
              </div>
              <div style="width: 48px; height: 48px; border: 1px solid #cbd5e1; border-radius: 8px; display: flex; flex-direction: column; align-items: center; justify-content: center; font-size: 8px; font-family: monospace; background: #ffffff;">
                <span style="font-weight: bold; font-size: 14px;">QR</span>
                <span>${t("cert_builder.verify_upper", { defaultValue: "VERIFY" })}</span>
              </div>
            </div>
          </div>
        </div>
      `;
    }

    document.body.appendChild(container);
    return container;
  };

  // Export PDF for all selected members
  const handleExportPDF = async () => {
    if (selectedMemberIds.length === 0) {
      addToast(t("cert_builder.err_select_member", { defaultValue: "Please select at least one member to generate certificates/badges." }), "error");
      return;
    }

    setIsExporting(true);
    setExportProgress(0);

    try {
      const selectedList = members.filter(m => selectedMemberIds.includes(m.id));
      const total = selectedList.length;

      // jsPDF setup based on structure orientation
      const doc = new jsPDF({
        orientation: isLandscape ? "landscape" : "portrait",
        unit: "mm",
        format: "a4"
      });

      const issuedCertificatesToSave: any[] = [];

      for (let i = 0; i < total; i++) {
        const mem = selectedList[i];
        const uniqueSerial = "IMPACTO-" + (isLandscape ? "CERT" : "BDG") + "-" + (new Date().getFullYear()) + "-" + Math.floor(10000 + Math.random() * 90000);

        // Render card offscreen
        const element = renderCardForMember(mem, uniqueSerial);

        // Capture with html2canvas
        const canvas = await html2canvas(element, {
          scale: 2,
          useCORS: true,
          logging: false,
          backgroundColor: "#ffffff"
        });

        // Remove DOM element
        document.body.removeChild(element);

        const imgData = canvas.toDataURL("image/png");

        if (i > 0) {
          doc.addPage("a4", isLandscape ? "landscape" : "portrait");
        }

        if (isLandscape) {
          // A4 Landscape: 297mm x 210mm
          doc.addImage(imgData, "PNG", 10, 10, 277, 190);
        } else {
          // A4 Portrait: 210mm x 297mm
          if (structure === "portrait_diploma") {
            doc.addImage(imgData, "PNG", 10, 10, 190, 277);
          } else {
            // ID Card Centered
            doc.addImage(imgData, "PNG", 35, 20, 140, 215);
          }
        }

        // Prepare database record for instant public verification lookup
        issuedCertificatesToSave.push({
          id: `cert-${Date.now()}-${i}`,
          org_id: activeOrg?.id || "org-1",
          recipient_member_id: mem.id,
          recipient_name: mem.user?.full_name || t("common.member", { defaultValue: "Member" }),
          recipient_email: mem.user?.email || "",
          title: certificateTitle,
          description: reasonText,
          issue_date: issueDate,
          certificate_code: uniqueSerial,
          template_theme: templateTheme,
          signatory_name: signatoryName,
          signatory_title: signatoryTitle,
          signatory_signature_url: signatureDataUrl || "",
          qr_verification_url: `https://impacto.rw/verify/${uniqueSerial}`,
          status: "issued",
          created_at: new Date().toISOString()
        });

        setExportProgress(Math.round(((i + 1) / total) * 100));
      }

      // Sync to MockDB so immediate verification on /verify/:code works
      const existingCerts = MockDB.getCertificates();
      MockDB.saveCertificates([...issuedCertificatesToSave, ...existingCerts]);

      // Sync to Supabase if configured
      if (isSupabaseConfigured) {
        try {
          await supabase.from("certificates").upsert(issuedCertificatesToSave);
        } catch (dbErr) {
          console.warn("Could not push certs to Supabase, local cache updated.", dbErr);
        }
      }

      const fileName = `${isLandscape ? "Certificates" : "Badges"}_${activeOrg?.name || "Cooperative"}_${new Date().toISOString().split("T")[0]}.pdf`;
      doc.save(fileName);

      addToast(t("cert_builder.toast_exported", { total, defaultValue: `Successfully exported ${total} credentials! Stamped with verification IDs.` }), "success");
      setIsExporting(false);
    } catch (err: any) {
      console.error(err);
      addToast(t("cert_builder.err_pdf_failed", { error: err.message || t("common.unknown_error", { defaultValue: "Unknown error" }), defaultValue: `Failed to generate PDF: ${err.message || "Unknown error"}` }), "error");
      setIsExporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4">
      <div className="w-full h-full max-w-7xl max-h-[96vh] bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-slate-800 flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* HEADER BAR */}
        <div className="px-4 sm:px-6 py-4 border-b border-gray-150 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-slate-900 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="h-10 w-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-100 dark:border-emerald-900/60 flex items-center justify-center text-[#156c45] shrink-0">
              <Award className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-base font-extrabold text-gray-900 dark:text-white font-display break-words">
                  {t("cert_builder.studio_title", { defaultValue: "Certificate & Member Badge Studio" })}
                </h2>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-[#156c45] uppercase">
                  {t("cert_builder.studio_badge", { defaultValue: "4 Structures • Dual Logos • QR Verifiable" })}
                </span>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 break-words">
                {t("cert_builder.studio_subtitle", { defaultValue: "Design formal diplomas or ID badges with custom logos, and export print-ready PDFs with verifiable tokens." })}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={handleExportPDF}
              disabled={isExporting || selectedMemberIds.length === 0}
              className="flex items-center gap-2 px-4 py-2 bg-[#156c45] hover:bg-[#115436] disabled:bg-[#156c45]/60 text-white text-xs font-bold rounded-xl transition shadow-xs cursor-pointer"
            >
              <Download className="h-3.5 w-3.5 shrink-0" />
              <span>
                {isExporting 
                  ? t("cert_builder.exporting_progress", { progress: exportProgress, defaultValue: `Exporting (${exportProgress}%)...` })
                  : t("cert_builder.export_pdf_btn", { count: selectedMemberIds.length, defaultValue: `Export PDF (${selectedMemberIds.length} Members)` })}
              </span>
            </button>

            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-400 hover:text-gray-700 dark:hover:text-white rounded-xl transition cursor-pointer"
              aria-label={t("common.close", { defaultValue: "Close" })}
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* WORKSPACE: 3-COLUMN LAYOUT */}
        <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
          
          {/* COLUMN 1: CONTROLS & ARCHITECTURE */}
          <div className="w-full lg:w-80 border-b lg:border-b-0 lg:border-r border-gray-150 dark:border-slate-800 p-5 overflow-y-auto bg-gray-50/70 dark:bg-slate-900/40 flex flex-col gap-5 shrink-0 max-h-80 lg:max-h-none">
            
            {/* 4 STRUCTURE SELECTOR */}
            <div>
              <label className="text-xs font-bold text-gray-700 dark:text-gray-300 block mb-2 flex items-center gap-1.5">
                <LayoutTemplate className="h-3.5 w-3.5 text-[#156c45] shrink-0" />
                {t("cert_builder.layout_structure_label", { defaultValue: "Layout Structure & Orientation" })}
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setStructure("landscape_classic")}
                  className={`p-2.5 rounded-xl border text-left text-xs transition cursor-pointer ${
                    structure === "landscape_classic"
                      ? "border-[#156c45] bg-white dark:bg-slate-800 shadow-xs text-[#156c45] font-bold"
                      : "border-gray-200 dark:border-slate-800 bg-white/70 text-gray-600 dark:text-gray-400"
                  }`}
                >
                  <div className="flex items-center gap-1 font-bold">
                    <Award className="h-3.5 w-3.5 shrink-0" />
                    <span>{t("cert_builder.landscape_a", { defaultValue: "Landscape A" })}</span>
                  </div>
                  <span className="text-[10px] text-gray-400 block mt-0.5">{t("cert_builder.classic_filigree", { defaultValue: "Classic Filigree" })}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setStructure("landscape_asymmetric")}
                  className={`p-2.5 rounded-xl border text-left text-xs transition cursor-pointer ${
                    structure === "landscape_asymmetric"
                      ? "border-[#156c45] bg-white dark:bg-slate-800 shadow-xs text-[#156c45] font-bold"
                      : "border-gray-200 dark:border-slate-800 bg-white/70 text-gray-600 dark:text-gray-400"
                  }`}
                >
                  <div className="flex items-center gap-1 font-bold">
                    <Layers className="h-3.5 w-3.5 shrink-0" />
                    <span>{t("cert_builder.landscape_b", { defaultValue: "Landscape B" })}</span>
                  </div>
                  <span className="text-[10px] text-gray-400 block mt-0.5">{t("cert_builder.modern_accent", { defaultValue: "Modern Accent" })}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setStructure("portrait_diploma")}
                  className={`p-2.5 rounded-xl border text-left text-xs transition cursor-pointer ${
                    structure === "portrait_diploma"
                      ? "border-[#156c45] bg-white dark:bg-slate-800 shadow-xs text-[#156c45] font-bold"
                      : "border-gray-200 dark:border-slate-800 bg-white/70 text-gray-600 dark:text-gray-400"
                  }`}
                >
                  <div className="flex items-center gap-1 font-bold">
                    <FileBadge className="h-3.5 w-3.5 shrink-0" />
                    <span>{t("cert_builder.portrait_a", { defaultValue: "Portrait A" })}</span>
                  </div>
                  <span className="text-[10px] text-gray-400 block mt-0.5">{t("cert_builder.honor_plaque", { defaultValue: "Honor Plaque" })}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setStructure("portrait_credential")}
                  className={`p-2.5 rounded-xl border text-left text-xs transition cursor-pointer ${
                    structure === "portrait_credential"
                      ? "border-[#156c45] bg-white dark:bg-slate-800 shadow-xs text-[#156c45] font-bold"
                      : "border-gray-200 dark:border-slate-800 bg-white/70 text-gray-600 dark:text-gray-400"
                  }`}
                >
                  <div className="flex items-center gap-1 font-bold">
                    <QrCode className="h-3.5 w-3.5 shrink-0" />
                    <span>{t("cert_builder.portrait_b", { defaultValue: "Portrait B" })}</span>
                  </div>
                  <span className="text-[10px] text-gray-400 block mt-0.5">{t("cert_builder.member_id_card", { defaultValue: "Member ID Card" })}</span>
                </button>
              </div>
            </div>

            {/* DUAL LOGOS & PARTNER CO-BRANDING */}
            <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-800 space-y-3">
              <label className="text-xs font-bold text-gray-800 dark:text-gray-200 block flex items-center justify-between gap-2">
                <span className="flex items-center gap-1.5 min-w-0">
                  <ImageIcon className="h-3.5 w-3.5 text-[#156c45] shrink-0" />
                  <span className="break-words">{t("cert_builder.logo_endorsement_label", { defaultValue: "Logo & Partner Endorsement" })}</span>
                </span>
                <span className="text-[10px] text-gray-400 shrink-0">{t("cert_builder.co_branding", { defaultValue: "Co-Branding" })}</span>
              </label>

              {/* Organization Logo Controls */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-semibold text-gray-700 dark:text-gray-300">{t("cert_builder.primary_org_logo", { defaultValue: "Primary Org Logo" })}</span>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={showOrgLogo}
                      onChange={(e) => setShowOrgLogo(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-7 h-4 bg-gray-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-[#156c45]"></div>
                  </label>
                </div>

                {showOrgLogo && (
                  <div className="flex items-center gap-2">
                    {effectiveOrgLogo ? (
                      <div className="relative group shrink-0">
                        <img 
                          src={effectiveOrgLogo} 
                          alt={t("cert_builder.org_logo_alt", { defaultValue: "Org logo" })}
                          className="h-9 w-9 object-contain bg-white rounded-lg border border-gray-200 p-0.5" 
                        />
                        <button
                          type="button"
                          onClick={() => setOrgLogoOverride("")}
                          className="absolute -top-1 -right-1 bg-rose-500 text-white rounded-full p-0.5 text-[9px] shadow-xs cursor-pointer"
                          title={t("cert_builder.reset_default_logo", { defaultValue: "Reset to default org logo" })}
                        >
                          <X className="h-2.5 w-2.5" />
                        </button>
                      </div>
                    ) : (
                      <div className="h-9 w-9 rounded-lg bg-gray-100 flex items-center justify-center text-gray-400 shrink-0">
                        <Building className="h-4 w-4" />
                      </div>
                    )}
                    <label className="flex-1 px-2.5 py-1.5 bg-gray-50 dark:bg-slate-800 hover:bg-gray-100 text-gray-700 dark:text-gray-300 rounded-lg text-[11px] font-bold border border-gray-200 dark:border-slate-700 cursor-pointer flex items-center justify-center gap-1 transition">
                      <Upload className="h-3 w-3 shrink-0" />
                      <span>{effectiveOrgLogo ? t("cert_builder.change_logo", { defaultValue: "Change Logo" }) : t("cert_builder.upload_logo", { defaultValue: "Upload Logo" })}</span>
                      <input type="file" accept="image/*" onChange={handleOrgLogoUpload} className="hidden" />
                    </label>
                  </div>
                )}
              </div>

              {/* Partner / Co-Sponsor Logo */}
              <div className="pt-2 border-t border-gray-150 dark:border-slate-800 space-y-2">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-semibold text-gray-700 dark:text-gray-300">{t("cert_builder.partner_sponsor_logo", { defaultValue: "Partner / Sponsor Logo" })}</span>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={showPartnerLogo}
                      onChange={(e) => setShowPartnerLogo(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-7 h-4 bg-gray-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-[#156c45]"></div>
                  </label>
                </div>

                {showPartnerLogo && (
                  <div className="space-y-2 animate-in fade-in duration-150">
                    <div className="flex items-center gap-2">
                      {partnerLogoUrl ? (
                        <div className="relative group shrink-0">
                          <img 
                            src={partnerLogoUrl} 
                            alt={t("cert_builder.partner_logo_alt", { defaultValue: "Partner logo" })}
                            className="h-9 w-9 object-contain bg-white rounded-lg border border-gray-200 p-0.5" 
                          />
                          <button
                            type="button"
                            onClick={() => setPartnerLogoUrl("")}
                            className="absolute -top-1 -right-1 bg-rose-500 text-white rounded-full p-0.5 text-[9px] shadow-xs cursor-pointer"
                          >
                            <X className="h-2.5 w-2.5" />
                          </button>
                        </div>
                      ) : (
                        <div className="h-9 w-9 rounded-lg bg-gray-100 flex items-center justify-center text-gray-400 shrink-0">
                          <Award className="h-4 w-4" />
                        </div>
                      )}
                      <label className="flex-1 px-2.5 py-1.5 bg-gray-50 dark:bg-slate-800 hover:bg-gray-100 text-gray-700 dark:text-gray-300 rounded-lg text-[11px] font-bold border border-gray-200 dark:border-slate-700 cursor-pointer flex items-center justify-center gap-1 transition">
                        <Upload className="h-3 w-3 shrink-0" />
                        <span>{partnerLogoUrl ? t("cert_builder.change_partner_logo", { defaultValue: "Change Partner Logo" }) : t("cert_builder.upload_partner_logo", { defaultValue: "Upload Partner Logo" })}</span>
                        <input type="file" accept="image/*" onChange={handlePartnerLogoUpload} className="hidden" />
                      </label>
                    </div>

                    <input
                      type="text"
                      value={partnerName}
                      onChange={(e) => setPartnerName(e.target.value)}
                      placeholder={t("cert_builder.partner_name_placeholder", { defaultValue: "Partner Name (e.g. MINICOM, RCA)" })}
                      className="w-full text-[11px] px-2.5 py-1 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg outline-none"
                    />

                    <input
                      type="text"
                      value={partnerSubtitle}
                      onChange={(e) => setPartnerSubtitle(e.target.value)}
                      placeholder={t("cert_builder.partner_subtitle_placeholder", { defaultValue: "e.g. In Technical Partnership With" })}
                      className="w-full text-[10px] px-2.5 py-1 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg outline-none text-gray-500"
                    />
                  </div>
                )}
              </div>

              {/* Logo Sizing */}
              <div className="pt-2 border-t border-gray-150 dark:border-slate-800 flex items-center justify-between text-[11px]">
                <span className="text-gray-500 font-semibold">{t("cert_builder.logo_scale", { defaultValue: "Logo Scale:" })}</span>
                <div className="flex gap-1">
                  {(["sm", "md", "lg"] as const).map((sz) => (
                    <button
                      key={sz}
                      type="button"
                      onClick={() => setLogoSize(sz)}
                      className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold transition cursor-pointer ${
                        logoSize === sz ? "bg-[#156c45] text-white" : "bg-gray-100 dark:bg-slate-800 text-gray-600"
                      }`}
                    >
                      {sz}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Template Styles */}
            <div>
              <label className="text-xs font-bold text-gray-700 dark:text-gray-300 block mb-2 flex items-center gap-1.5">
                <Palette className="h-3.5 w-3.5 text-[#156c45] shrink-0" />
                {t("cert_builder.palette_accent_label", { defaultValue: "Palette & Accent" })}
              </label>
              <div className="grid grid-cols-1 gap-1.5">
                {(Object.keys(THEME_CONFIGS) as TemplateStyle[]).map((key) => {
                  const cfg = THEME_CONFIGS[key];
                  const isSelected = templateTheme === key;
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => {
                        setTemplateTheme(key);
                        setCustomPrimaryColor(cfg.primary);
                      }}
                      className={`flex items-center justify-between p-2 rounded-xl border text-xs font-bold transition cursor-pointer ${
                        isSelected
                          ? "border-[#156c45] bg-emerald-50/40 dark:bg-emerald-950/20 text-[#156c45]"
                          : "border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-gray-700 dark:text-slate-300"
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span 
                          className="h-3.5 w-3.5 rounded-full border border-black/10 shrink-0" 
                          style={{ backgroundColor: cfg.primary }}
                        />
                        <span className="break-words">{t(`cert_builder.theme_${key}`, { defaultValue: cfg.name })}</span>
                      </div>
                      {isSelected && <Check className="h-3.5 w-3.5 text-[#156c45] shrink-0" />}
                    </button>
                  );
                })}
              </div>

              {/* Custom Color */}
              <div className="mt-2 flex items-center gap-2 p-2 bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-800">
                <label className="text-[11px] font-semibold text-gray-600 dark:text-gray-400 flex-1">
                  {t("cert_builder.custom_hex_color", { defaultValue: "Custom Hex Color:" })}
                </label>
                <input
                  type="color"
                  value={customPrimaryColor}
                  onChange={(e) => setCustomPrimaryColor(e.target.value)}
                  className="h-6 w-8 rounded border-0 cursor-pointer bg-transparent"
                />
              </div>
            </div>

            {/* Editable Content Fields */}
            <div className="space-y-3">
              <label className="text-xs font-bold text-gray-700 dark:text-gray-300 block flex items-center gap-1.5">
                <Type className="h-3.5 w-3.5 text-[#156c45] shrink-0" />
                {t("cert_builder.word_editor_label", { defaultValue: "Word & Wording Editor" })}
              </label>

              <div>
                <span className="text-[11px] font-semibold text-gray-500 block mb-1">{t("cert_builder.main_heading", { defaultValue: "Main Heading" })}</span>
                <input
                  type="text"
                  value={certificateTitle}
                  onChange={(e) => setCertificateTitle(e.target.value)}
                  className="w-full text-xs font-semibold px-3 py-2 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl focus:border-[#156c45] outline-none"
                  placeholder={t("cert_builder.main_heading_placeholder", { defaultValue: "e.g. CERTIFICATE OF EXCELLENCE" })}
                />
              </div>

              <div>
                <span className="text-[11px] font-semibold text-gray-500 block mb-1">{t("cert_builder.subheading_authority", { defaultValue: "Subheading / Authority" })}</span>
                <input
                  type="text"
                  value={subtitle}
                  onChange={(e) => setSubtitle(e.target.value)}
                  className="w-full text-xs font-semibold px-3 py-2 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl focus:border-[#156c45] outline-none"
                  placeholder={t("cert_builder.subheading_placeholder", { defaultValue: "Subheading..." })}
                />
              </div>

              <div>
                <span className="text-[11px] font-semibold text-gray-500 block mb-1">{t("cert_builder.citation_statement", { defaultValue: "Citation / Reason Statement" })}</span>
                <textarea
                  rows={2}
                  value={reasonText}
                  onChange={(e) => setReasonText(e.target.value)}
                  className="w-full text-xs px-3 py-2 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl focus:border-[#156c45] outline-none leading-relaxed"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="text-[11px] font-semibold text-gray-500 block mb-1">{t("cert_builder.issue_date", { defaultValue: "Issue Date" })}</span>
                  <input
                    type="date"
                    value={issueDate}
                    onChange={(e) => setIssueDate(e.target.value)}
                    className="w-full text-xs font-semibold px-2 py-1.5 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl focus:border-[#156c45] outline-none"
                  />
                </div>
                <div>
                  <span className="text-[11px] font-semibold text-gray-500 block mb-1">{t("cert_builder.signatory_title", { defaultValue: "Signatory Title" })}</span>
                  <input
                    type="text"
                    value={signatoryTitle}
                    onChange={(e) => setSignatoryTitle(e.target.value)}
                    className="w-full text-xs font-semibold px-2 py-1.5 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl focus:border-[#156c45] outline-none"
                  />
                </div>
              </div>

              <div>
                <span className="text-[11px] font-semibold text-gray-500 block mb-1">{t("cert_builder.signatory_official_name", { defaultValue: "Signatory Official Name" })}</span>
                <input
                  type="text"
                  value={signatoryName}
                  onChange={(e) => setSignatoryName(e.target.value)}
                  className="w-full text-xs font-semibold px-3 py-2 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl focus:border-[#156c45] outline-none"
                />
              </div>

              {/* Digital Signature */}
              <div className="pt-2 border-t border-gray-200 dark:border-slate-800 flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <span className="text-xs font-bold text-gray-800 dark:text-gray-200 block">{t("cert_builder.digital_signature", { defaultValue: "Digital Signature" })}</span>
                  <span className="text-[10px] text-gray-400 block">
                    {signatureDataUrl ? t("cert_builder.signature_applied", { defaultValue: "Signature applied" }) : t("cert_builder.using_typeface", { defaultValue: "Using printed typeface" })}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowSignaturePad(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 hover:bg-gray-50 rounded-xl text-xs font-bold text-[#156c45] transition cursor-pointer shrink-0"
                >
                  <PenTool className="h-3.5 w-3.5 shrink-0" />
                  <span>{signatureDataUrl ? t("common.change", { defaultValue: "Change" }) : t("cert_builder.draw_upload_btn", { defaultValue: "Draw/Upload" })}</span>
                </button>
              </div>
            </div>
          </div>

          {/* COLUMN 2: LIVE CANVAS PREVIEW */}
          <div className="flex-1 p-4 sm:p-6 bg-stone-100/60 dark:bg-slate-950/40 flex flex-col items-center justify-center overflow-y-auto min-w-0">
            
            {/* Preview Navigation */}
            <div className="w-full max-w-3xl mb-3 flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-bold text-gray-600 dark:text-gray-400 break-words">
                {t("cert_builder.live_preview_showing", {
                  current: previewMemberIndex + 1,
                  total: selectedMembersList.length || 1,
                  defaultValue: `Live Preview: Showing member ${previewMemberIndex + 1} of ${selectedMembersList.length || 1}`
                })}
              </span>

              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  disabled={previewMemberIndex <= 0}
                  onClick={() => setPreviewMemberIndex(prev => Math.max(0, prev - 1))}
                  className="px-2.5 py-1 text-xs font-bold bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-lg disabled:opacity-40 cursor-pointer"
                >
                  {t("common.previous", { defaultValue: "Previous" })}
                </button>
                <button
                  type="button"
                  disabled={previewMemberIndex >= selectedMembersList.length - 1}
                  onClick={() => setPreviewMemberIndex(prev => Math.min(selectedMembersList.length - 1, prev + 1))}
                  className="px-2.5 py-1 text-xs font-bold bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-lg disabled:opacity-40 cursor-pointer"
                >
                  {t("common.next", { defaultValue: "Next" })}
                </button>
              </div>
            </div>

            {/* LIVE PREVIEWS FOR 4 STRUCTURES */}
            
            {/* STRUCTURE 1: LANDSCAPE CLASSIC */}
            {structure === "landscape_classic" && (
              <div 
                className="w-full max-w-3xl aspect-[1.414/1] bg-white dark:bg-slate-900 shadow-xl border-4 rounded-xl p-5 sm:p-8 flex flex-col justify-between text-center relative overflow-hidden transition select-none"
                style={{ borderColor: effectivePrimary }}
              >
                <div className="absolute top-2.5 left-2.5 w-10 h-10 border-t-2 border-l-2 opacity-50" style={{ borderColor: effectivePrimary }} />
                <div className="absolute top-2.5 right-2.5 w-10 h-10 border-t-2 border-r-2 opacity-50" style={{ borderColor: effectivePrimary }} />
                <div className="absolute bottom-2.5 left-2.5 w-10 h-10 border-b-2 border-l-2 opacity-50" style={{ borderColor: effectivePrimary }} />
                <div className="absolute bottom-2.5 right-2.5 w-10 h-10 border-b-2 border-r-2 opacity-50" style={{ borderColor: effectivePrimary }} />

                {/* Top Logo Bar */}
                <div className="flex items-center justify-between gap-2 border-b border-gray-150 dark:border-slate-800 pb-2">
                  <div className="text-left min-w-0">
                    {showOrgLogo && effectiveOrgLogo ? (
                      <img src={effectiveOrgLogo} alt={t("cert_builder.org_logo_alt", { defaultValue: "Org logo" })} className="h-10 max-w-[120px] object-contain" />
                    ) : (
                      <span className="font-extrabold text-xs tracking-wider break-words" style={{ color: effectivePrimary }}>
                        {activeOrg?.name || t("cert_builder.cooperative_fallback", { defaultValue: "COOPERATIVE" })}
                      </span>
                    )}
                  </div>
                  <div className="min-w-0 px-2">
                    <h3 className="text-xs font-black tracking-widest uppercase font-sans break-words" style={{ color: effectivePrimary }}>
                      {activeOrg?.name || t("cert_builder.cooperative_federation_fallback", { defaultValue: "COOPERATIVE FEDERATION" })}
                    </h3>
                    <p className="text-[9px] text-gray-500 uppercase tracking-widest break-words">{subtitle}</p>
                  </div>
                  <div className="text-right min-w-0">
                    {showPartnerLogo && (partnerLogoUrl ? (
                      <img src={partnerLogoUrl} alt={t("cert_builder.partner_logo_alt", { defaultValue: "Partner" })} className="h-9 max-w-[100px] object-contain" />
                    ) : (
                      <span className="text-[10px] font-bold text-gray-500 break-words">{partnerName}</span>
                    ))}
                  </div>
                </div>

                {/* Title */}
                <div className="my-2">
                  <h1 className="text-lg sm:text-2xl font-black font-serif tracking-tight uppercase break-words" style={{ color: effectivePrimary }}>
                    {certificateTitle}
                  </h1>
                  <p className="text-xs text-gray-500 italic mt-0.5 font-serif">
                    {t("cert_builder.conferred_upon_classic", { defaultValue: "This formal instrument of recognition is solemnly conferred upon" })}
                  </p>
                </div>

                {/* Recipient */}
                <div className="my-1">
                  <span 
                    className="text-xl sm:text-3xl font-serif font-bold text-gray-900 dark:text-white border-b-2 pb-1 px-6 sm:px-8 inline-block break-words"
                    style={{ borderColor: effectivePrimary }}
                  >
                    {activePreviewMember?.user?.full_name || t("cert_builder.representative_member", { defaultValue: "Representative Member" })}
                  </span>
                  <p className="text-[10px] font-mono font-bold uppercase tracking-widest mt-1.5" style={{ color: effectivePrimary }}>
                    {t("cert_builder.certificate_id_prefix", { defaultValue: "Certificate ID" }).toUpperCase()}: <span className="text-gray-700 dark:text-gray-300 font-black">{previewCertificateId}</span>
                  </p>
                </div>

                <p className="max-w-xl mx-auto text-xs font-serif leading-relaxed text-gray-700 dark:text-gray-300 italic px-4 line-clamp-2">
                  "{reasonText}"
                </p>

                {/* Footer */}
                <div className="pt-3 border-t border-gray-200 dark:border-slate-800 flex items-end justify-between gap-2 px-4 font-sans text-left">
                  <div>
                    <span className="text-[9px] uppercase font-bold text-gray-400 block">{t("cert_builder.date_conferred", { defaultValue: "Date Conferred" })}</span>
                    <span className="text-xs font-bold text-gray-800 dark:text-gray-200">
                      {issueDate ? new Date(`${issueDate}T12:00:00`).toLocaleDateString(i18n.language, { year: "numeric", month: "short", day: "numeric" }) : issueDate}
                    </span>
                    <span className="text-[8px] font-mono text-[#156c45] block mt-0.5">impacto.rw/verify</span>
                  </div>

                  <div 
                    className="w-14 h-14 rounded-full border-2 border-dashed flex flex-col items-center justify-center text-center p-1 shrink-0"
                    style={{ borderColor: effectivePrimary, color: effectivePrimary }}
                  >
                    <ShieldCheck className="h-4 w-4 mb-0.5" />
                    <span className="text-[6px] font-black uppercase leading-tight">{t("cert_builder.official_seal_full", { defaultValue: "OFFICIAL SEAL" })}</span>
                  </div>

                  <div className="text-right min-w-0">
                    <div className="h-7 flex items-end justify-end mb-1">
                      {signatureDataUrl ? (
                        <img src={signatureDataUrl} alt={t("cert_builder.signature_alt", { defaultValue: "Signature" })} className="h-6 object-contain" />
                      ) : (
                        <span className="font-serif italic font-bold text-sm" style={{ color: effectivePrimary }}>
                          {signatoryName}
                        </span>
                      )}
                    </div>
                    <div className="border-t border-gray-400 pt-0.5">
                      <span className="text-xs font-bold text-gray-900 dark:text-white block">{signatoryName}</span>
                      <span className="text-[9px] text-gray-500 block">{signatoryTitle}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* STRUCTURE 2: LANDSCAPE ASYMMETRIC */}
            {structure === "landscape_asymmetric" && (
              <div className="w-full max-w-3xl aspect-[1.414/1] bg-white dark:bg-slate-900 shadow-xl border border-gray-200 dark:border-slate-800 rounded-xl flex overflow-hidden select-none">
                {/* Accent Column */}
                <div 
                  className="w-1/3 p-5 text-white flex flex-col justify-between min-w-0"
                  style={{ backgroundColor: effectivePrimary }}
                >
                  <div>
                    {showOrgLogo && effectiveOrgLogo ? (
                      <div className="bg-white p-2 rounded-lg inline-block mb-3">
                        <img src={effectiveOrgLogo} alt={t("cert_builder.org_logo_alt", { defaultValue: "Org" })} className="h-8 max-w-[100px] object-contain" />
                      </div>
                    ) : (
                      <div className="font-black text-sm mb-3">IMPACTO</div>
                    )}
                    <h4 className="text-xs font-bold uppercase tracking-wider break-words">{activeOrg?.name || t("cert_builder.cooperative_fallback", { defaultValue: "COOPERATIVE" })}</h4>
                    <p className="text-[9px] opacity-80 mt-1 break-words">{subtitle}</p>
                  </div>

                  {showPartnerLogo && (
                    <div className="bg-white/10 p-2.5 rounded-lg my-3">
                      <span className="text-[8px] uppercase opacity-75 block mb-1 break-words">{partnerSubtitle}</span>
                      {partnerLogoUrl ? (
                        <img src={partnerLogoUrl} alt={t("cert_builder.partner_logo_alt", { defaultValue: "Partner" })} className="h-6 max-w-[90px] object-contain filter brightness-0 invert" />
                      ) : (
                        <span className="text-[10px] font-bold break-words">{partnerName}</span>
                      )}
                    </div>
                  )}

                  <div className="text-[8px] opacity-75 border-t border-white/20 pt-2 font-mono">
                    {t("cert_builder.token_label", { defaultValue: "Token" })}: {t("cert_builder.verified_token_sample", { defaultValue: "VERIFIED-TOKEN" })}<br />
                    {t("cert_builder.verify_label", { defaultValue: "Verify" })}: impacto.rw/verify
                  </div>
                </div>

                {/* Right Body */}
                <div className="flex-1 p-6 flex flex-col justify-between text-left min-w-0">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-widest text-[#156c45]">
                      {t("cert_builder.official_verification_credential", { defaultValue: "Official Verification Credential" })}
                    </span>
                    <h2 className="text-lg sm:text-xl font-black uppercase text-gray-900 dark:text-white mt-1 break-words">
                      {certificateTitle}
                    </h2>
                  </div>

                  <div>
                    <h3 className="text-xl sm:text-2xl font-serif font-bold break-words" style={{ color: effectivePrimary }}>
                      {activePreviewMember?.user?.full_name || t("cert_builder.representative_member", { defaultValue: "Representative Member" })}
                    </h3>
                    <span 
                      className="inline-block mt-1.5 text-[9px] font-mono font-bold uppercase tracking-wider px-2.5 py-1 rounded border shadow-xs"
                      style={{ borderColor: effectivePrimary, color: effectivePrimary, backgroundColor: "#f8fafc" }}
                    >
                      {t("cert_builder.certificate_id_prefix", { defaultValue: "Certificate ID" }).toUpperCase()}: {previewCertificateId}
                    </span>
                  </div>

                  <p className="text-xs italic text-gray-600 dark:text-gray-400 border-l-2 pl-3 line-clamp-2" style={{ borderColor: effectivePrimary }}>
                    "{reasonText}"
                  </p>

                  <div className="flex justify-between items-end border-t border-gray-150 dark:border-slate-800 pt-3 gap-2">
                    <div>
                      <span className="text-[9px] text-gray-400 font-bold block uppercase">{t("common.date", { defaultValue: "Date" })}</span>
                      <span className="text-xs font-bold text-gray-900 dark:text-white">
                        {issueDate ? new Date(`${issueDate}T12:00:00`).toLocaleDateString(i18n.language, { year: "numeric", month: "short", day: "numeric" }) : issueDate}
                      </span>
                    </div>
                    <div className="text-right min-w-0">
                      <div className="text-xs font-bold text-gray-900 dark:text-white">{signatoryName}</div>
                      <div className="text-[9px] text-gray-500">{signatoryTitle}</div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* STRUCTURE 3: PORTRAIT DIPLOMA */}
            {structure === "portrait_diploma" && (
              <div 
                className="w-80 sm:w-96 aspect-[1/1.414] bg-white dark:bg-slate-900 shadow-xl border-4 rounded-xl p-6 flex flex-col justify-between text-center select-none"
                style={{ borderColor: effectivePrimary }}
              >
                <div>
                  <div className="flex justify-between items-center mb-2">
                    {showOrgLogo && effectiveOrgLogo && <img src={effectiveOrgLogo} alt={t("cert_builder.org_logo_alt", { defaultValue: "Org" })} className="h-7 object-contain" />}
                    {showPartnerLogo && (partnerLogoUrl ? <img src={partnerLogoUrl} alt={t("cert_builder.partner_logo_alt", { defaultValue: "Partner" })} className="h-6 object-contain" /> : <span className="text-[9px] text-gray-400">{partnerName}</span>)}
                  </div>
                  <h3 className="text-xs font-bold tracking-widest uppercase break-words" style={{ color: effectivePrimary }}>
                    {activeOrg?.name || t("cert_builder.cooperative_federation_fallback", { defaultValue: "COOPERATIVE FEDERATION" })}
                  </h3>
                  <p className="text-[8px] text-gray-500 uppercase break-words">{subtitle}</p>
                </div>

                <div>
                  <h2 className="text-base font-black font-serif uppercase tracking-tight break-words" style={{ color: effectivePrimary }}>
                    {certificateTitle}
                  </h2>
                  <p className="text-[10px] text-gray-500 italic mt-0.5 font-serif">{t("cert_builder.conferred_with_honors", { defaultValue: "Conferred with honors upon" })}</p>
                  <div className="text-xl font-serif font-bold text-gray-900 dark:text-white border-b-2 pb-1 inline-block mt-2 break-words" style={{ borderColor: effectivePrimary }}>
                    {activePreviewMember?.user?.full_name || t("cert_builder.representative_member", { defaultValue: "Representative Member" })}
                  </div>
                  <div className="text-[10px] font-mono font-bold mt-1.5 uppercase tracking-wider" style={{ color: effectivePrimary }}>
                    {t("cert_builder.certificate_id_prefix", { defaultValue: "Certificate ID" }).toUpperCase()}: {previewCertificateId}
                  </div>
                </div>

                <p className="text-[11px] italic text-gray-600 dark:text-gray-300 line-clamp-3 px-2">
                  "{reasonText}"
                </p>

                <div className="flex justify-center">
                  <div className="w-12 h-12 rounded-full border border-dashed flex items-center justify-center text-center" style={{ borderColor: effectivePrimary, color: effectivePrimary }}>
                    <ShieldCheck className="h-4 w-4" />
                  </div>
                </div>

                <div className="flex justify-between items-end border-t border-gray-150 dark:border-slate-800 pt-2 text-left gap-2">
                  <div>
                    <span className="text-[8px] text-gray-400 block uppercase font-bold">{t("cert_builder.conferred_short", { defaultValue: "Conferred" })}</span>
                    <span className="text-[11px] font-bold text-gray-800 dark:text-gray-200">
                      {issueDate ? new Date(`${issueDate}T12:00:00`).toLocaleDateString(i18n.language, { year: "numeric", month: "short", day: "numeric" }) : issueDate}
                    </span>
                  </div>
                  <div className="text-right min-w-0">
                    <span className="text-[11px] font-bold text-gray-900 dark:text-white block">{signatoryName}</span>
                    <span className="text-[8px] text-gray-500 block">{signatoryTitle}</span>
                  </div>
                </div>
              </div>
            )}

            {/* STRUCTURE 4: PORTRAIT ID BADGE */}
            {structure === "portrait_credential" && (
              <div className="w-72 bg-white dark:bg-slate-900 shadow-2xl border-2 border-gray-200 dark:border-slate-800 rounded-3xl overflow-hidden flex flex-col select-none">
                <div className="bg-gray-100 dark:bg-slate-800/80 py-2 text-center border-b border-gray-200 dark:border-slate-800">
                  <div className="w-12 h-2 bg-gray-300 dark:bg-slate-700 rounded-full mx-auto" />
                </div>

                <div className="py-3 px-3 text-white text-center" style={{ backgroundColor: effectivePrimary }}>
                  <div className="flex justify-between items-center mb-1">
                    {showOrgLogo && effectiveOrgLogo && <img src={effectiveOrgLogo} alt={t("cert_builder.org_logo_alt", { defaultValue: "Org" })} className="h-5 object-contain filter brightness-0 invert" />}
                    {showPartnerLogo && partnerLogoUrl && <img src={partnerLogoUrl} alt={t("cert_builder.partner_logo_alt", { defaultValue: "Partner" })} className="h-4 object-contain filter brightness-0 invert" />}
                  </div>
                  <h4 className="text-xs font-black uppercase break-words">{activeOrg?.name || t("cert_builder.cooperative_fallback", { defaultValue: "COOPERATIVE" })}</h4>
                  <p className="text-[8px] uppercase opacity-90 break-words">{certificateTitle}</p>
                </div>

                <div className="p-4 flex flex-col items-center text-center gap-2.5">
                  <div 
                    className="w-16 h-16 rounded-full border-3 flex items-center justify-center text-lg font-bold shadow-xs"
                    style={{ borderColor: effectivePrimary, color: effectivePrimary, backgroundColor: currentTheme.bgLight }}
                  >
                    {(activePreviewMember?.user?.full_name || "CO").substring(0, 2).toUpperCase()}
                  </div>

                  <div>
                    <h3 className="text-sm font-black text-gray-900 dark:text-white break-words">
                      {activePreviewMember?.user?.full_name || t("cert_builder.member_name_placeholder", { defaultValue: "Member Name" })}
                    </h3>
                    <span 
                      className="inline-block mt-1 px-2.5 py-0.5 rounded-full text-[9px] font-mono font-bold uppercase text-white tracking-wider"
                      style={{ backgroundColor: effectivePrimary }}
                    >
                      {t("cert_builder.cert_id_short", { defaultValue: "CERT ID" })}: {previewCertificateId}
                    </span>
                  </div>

                  <div className="w-full bg-gray-50 dark:bg-slate-800/50 rounded-xl p-2.5 border border-gray-150 dark:border-slate-800 text-[10px] space-y-1 text-left">
                    <div className="flex justify-between gap-2">
                      <span className="text-gray-400 font-semibold">{t("cert_builder.member_id", { defaultValue: "Member ID" })}:</span>
                      <span className="font-mono font-bold text-gray-800 dark:text-gray-200">
                        {activePreviewMember?.id?.substring(0, 8)}
                      </span>
                    </div>
                    <div className="flex justify-between gap-2">
                      <span className="text-gray-400 font-semibold">{t("cert_builder.valid_label", { defaultValue: "Valid" })}:</span>
                      <span className="font-bold text-gray-800 dark:text-gray-200">
                        {issueDate ? new Date(`${issueDate}T12:00:00`).toLocaleDateString(i18n.language, { year: "numeric", month: "short", day: "numeric" }) : issueDate}
                      </span>
                    </div>
                  </div>

                  <div className="w-full pt-2 border-t border-dashed border-gray-200 dark:border-slate-800 flex items-center justify-between gap-2">
                    <div className="text-left text-[8px] min-w-0">
                      <span className="text-gray-400 block font-bold">{t("cert_builder.authorized_by", { defaultValue: "Authorized By" })}</span>
                      <span className="font-bold text-gray-800 dark:text-gray-200 break-words">{signatoryName}</span>
                    </div>
                    <div className="p-1 rounded bg-gray-100 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 shrink-0">
                      <QrCode className="h-4 w-4 text-gray-600 dark:text-gray-300" />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* COLUMN 3: MEMBER SELECTION ROSTER */}
          <div className="w-full lg:w-80 border-t lg:border-t-0 lg:border-l border-gray-150 dark:border-slate-800 p-5 overflow-y-auto bg-white dark:bg-slate-900 flex flex-col gap-4 shrink-0">
            
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <h3 className="text-xs font-bold text-gray-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                  <Users className="h-3.5 w-3.5 text-[#156c45] shrink-0" />
                  <span>{t("cert_builder.select_recipients", { defaultValue: "Select Recipients" })}</span>
                </h3>
                <p className="text-[10px] text-gray-400">
                  {t("cert_builder.members_selected_count", {
                    selected: selectedMemberIds.length,
                    total: members.length,
                    defaultValue: `${selectedMemberIds.length} of ${members.length} members selected`
                  })}
                </p>
              </div>

              <button
                type="button"
                onClick={handleToggleSelectAll}
                className="text-[11px] font-bold text-[#156c45] hover:underline cursor-pointer shrink-0"
              >
                {selectedMemberIds.length === members.length
                  ? t("common.deselect_all", { defaultValue: "Deselect All" })
                  : t("common.select_all", { defaultValue: "Select All" })}
              </button>
            </div>

            {/* Search Input */}
            <div className="relative">
              <Search className="h-3.5 w-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={memberSearch}
                onChange={(e) => setMemberSearch(e.target.value)}
                placeholder={t("cert_builder.search_member_placeholder", { defaultValue: "Search member name or role..." })}
                className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-gray-200 dark:border-slate-800 bg-gray-50 dark:bg-slate-800/80 text-xs text-gray-900 dark:text-white outline-none focus:border-[#156c45]"
              />
            </div>

            {/* Members Checkbox List */}
            <div className="space-y-1.5 flex-1 overflow-y-auto max-h-[480px] pr-1">
              {filteredMembers.length === 0 ? (
                <div className="text-center py-8 text-gray-400 text-xs">
                  {t("cert_builder.no_matching_members", { defaultValue: "No matching members found" })}
                </div>
              ) : (
                filteredMembers.map((member) => {
                  const isChecked = selectedMemberIds.includes(member.id);
                  const isCurrentPreview = activePreviewMember?.id === member.id;
                  const fullName = member.user?.full_name || t("common.member", { defaultValue: "Member" });

                  return (
                    <div
                      key={member.id}
                      onClick={() => handleToggleMember(member.id)}
                      className={`flex items-center justify-between gap-2 p-2.5 rounded-xl border transition cursor-pointer select-none ${
                        isChecked 
                          ? "border-[#156c45]/40 bg-emerald-50/30 dark:bg-emerald-950/20" 
                          : "border-gray-200 dark:border-slate-800 hover:bg-gray-50 dark:hover:bg-slate-800/60"
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className={`h-4 w-4 rounded flex items-center justify-center shrink-0 border ${
                          isChecked 
                            ? "bg-[#156c45] border-[#156c45] text-white" 
                            : "border-gray-300 dark:border-slate-600"
                        }`}>
                          {isChecked && <Check className="h-3 w-3 stroke-[3]" />}
                        </div>

                        <div className="min-w-0">
                          <span className="text-xs font-bold text-gray-800 dark:text-gray-200 block break-words">
                            {fullName}
                          </span>
                          <span className="text-[10px] text-gray-400 capitalize block break-words">
                            {t(`roles.${member.role}`, { defaultValue: member.role || "Member" })} {member.user?.email ? `• ${member.user.email}` : ""}
                          </span>
                        </div>
                      </div>

                      {isChecked && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            const idx = selectedMembersList.findIndex(m => m.id === member.id);
                            if (idx !== -1) setPreviewMemberIndex(idx);
                          }}
                          className={`text-[9px] font-bold px-2 py-0.5 rounded-md border transition shrink-0 cursor-pointer ${
                            isCurrentPreview 
                              ? "bg-[#156c45] text-white border-[#156c45]" 
                              : "bg-white dark:bg-slate-800 text-gray-600 border-gray-200 hover:border-[#156c45]"
                          }`}
                        >
                          {isCurrentPreview ? t("cert_builder.viewing", { defaultValue: "Viewing" }) : t("cert_builder.preview", { defaultValue: "Preview" })}
                        </button>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            {/* Quick Export Summary Card */}
            <div className="p-3 bg-gray-50 dark:bg-slate-800/60 rounded-xl border border-gray-200 dark:border-slate-800 text-[11px] space-y-2">
              <div className="flex items-center justify-between gap-2 text-gray-600 dark:text-gray-400">
                <span>{t("cert_builder.selected_label", { defaultValue: "Selected" })}:</span>
                <span className="font-bold text-gray-900 dark:text-white">
                  {t("cert_builder.recipients_count", {
                    count: selectedMemberIds.length,
                    defaultValue: `${selectedMemberIds.length} ${selectedMemberIds.length === 1 ? "recipient" : "recipients"}`
                  })}
                </span>
              </div>
              <div className="flex items-center justify-between gap-2 text-gray-600 dark:text-gray-400">
                <span>{t("cert_builder.structure_label", { defaultValue: "Structure" })}:</span>
                <span className="font-bold text-gray-900 dark:text-white capitalize text-right">
                  {t(`cert_builder.structure_${structure}`, { defaultValue: structure.replace("_", " ") })}
                </span>
              </div>
              <button
                type="button"
                onClick={handleExportPDF}
                disabled={isExporting || selectedMemberIds.length === 0}
                className="w-full py-2 bg-[#156c45] hover:bg-[#115436] disabled:bg-[#156c45]/60 text-white font-bold rounded-lg transition shadow-3xs cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Download className="h-3.5 w-3.5 shrink-0" />
                <span>{t("cert_builder.export_credentials_btn", { count: selectedMemberIds.length, defaultValue: `Export ${selectedMemberIds.length} Credentials` })}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* DIGITAL SIGNATURE PAD MODAL */}
      <DigitalSignaturePad
        isOpen={showSignaturePad}
        onClose={() => setShowSignaturePad(false)}
        documentTitle={t("cert_builder.signature_doc_title", { defaultValue: "Official Executive Certificate Seal" })}
        documentVersion={1}
        signerName={signatoryName}
        signerRole={signatoryTitle}
        onSignComplete={(data) => {
          setSignatureDataUrl(data.signatureDataUrl);
          setShowSignaturePad(false);
          addToast(t("cert_builder.toast_signature_bound", { defaultValue: "Digital signature successfully bound to certificate builder!" }), "success");
        }}
      />
    </div>
  );
};
