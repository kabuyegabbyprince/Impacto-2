import { notifyCrossTabChange } from "./crossTabSync";
import {
  User,
  Organization,
  OrgMember,
  Event,
  Meeting,
  NewsPost,
  ChatChannel,
  ChatMessage,
  Goal,
  Grant,
  LedgerEntry,
  Donation,
  ErrorReport,
  SubscriptionPayment,
  MemberTier,
  PlatformSettings
} from "../types";

function getLocal<T>(key: string, defaultValue: T): T {
  try {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : defaultValue;
  } catch (e) {
    return defaultValue;
  }
}

function saveLocal<T>(key: string, data: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(data));
    notifyCrossTabChange(key);
  } catch (e) {
    console.error(`Failed to save ${key} to localStorage:`, e);
  }
}

export class MockDB {
  static getUsers(): User[] { return getLocal("impacto_mock_users", []); }
  static saveUsers(data: User[]) { saveLocal("impacto_mock_users", data); }

  static getOrgs(): Organization[] { return getLocal("impacto_mock_orgs", []); }
  static saveOrgs(data: Organization[]) { saveLocal("impacto_mock_orgs", data); }

  static getMembers(): OrgMember[] { return getLocal("impacto_mock_members", []); }
  static saveMembers(data: OrgMember[]) { saveLocal("impacto_mock_members", data); }

  static getTiers(): MemberTier[] { return getLocal("impacto_mock_tiers", []); }
  static saveTiers(data: MemberTier[]) { saveLocal("impacto_mock_tiers", data); }

  static getEvents(): Event[] { return getLocal("impacto_mock_events", []); }
  static saveEvents(data: Event[]) { saveLocal("impacto_mock_events", data); }

  static getMeetings(): Meeting[] { return getLocal("impacto_mock_meetings", []); }
  static saveMeetings(data: Meeting[]) { saveLocal("impacto_mock_meetings", data); }

  static getNews(): NewsPost[] { return getLocal("impacto_mock_news", []); }
  static saveNews(data: NewsPost[]) { saveLocal("impacto_mock_news", data); }

  static getChannels(): ChatChannel[] { return getLocal("impacto_mock_channels", []); }
  static saveChannels(data: ChatChannel[]) { saveLocal("impacto_mock_channels", data); }

  static getMessages(): ChatMessage[] { return getLocal("impacto_mock_messages", []); }
  static saveMessages(data: ChatMessage[]) { saveLocal("impacto_mock_messages", data); }

  static getGoals(): Goal[] { return getLocal("impacto_mock_goals", []); }
  static saveGoals(data: Goal[]) { saveLocal("impacto_mock_goals", data); }

  static getGrants(): Grant[] { return getLocal("impacto_mock_grants", []); }
  static saveGrants(data: Grant[]) { saveLocal("impacto_mock_grants", data); }

  static getLedger(): LedgerEntry[] { return getLocal("impacto_mock_ledger", []); }
  static saveLedger(data: LedgerEntry[]) { saveLocal("impacto_mock_ledger", data); }

  static getDonations(): Donation[] { return getLocal("impacto_mock_donations", []); }
  static saveDonations(data: Donation[]) { saveLocal("impacto_mock_donations", data); }

  static getErrors(): ErrorReport[] { return getLocal("impacto_mock_errors", []); }
  static saveErrors(data: ErrorReport[]) { saveLocal("impacto_mock_errors", data); }

  static getSubPayments(): SubscriptionPayment[] { return getLocal("impacto_mock_subpayments", []); }
  static saveSubPayments(data: SubscriptionPayment[]) { saveLocal("impacto_mock_subpayments", data); }

  // Shared Helper
  static getPlatformSettings(): PlatformSettings {
    return getLocal("impacto_mock_platform_settings", {
      usd_to_rwf_rate: 1300,
      eur_to_rwf_rate: 1400,
      kes_to_rwf_rate: 10,
      mtn_payment_number: "",
      airtel_payment_number: "",
      payment_name: ""
    });
  }

  static savePlatformSettings(data: PlatformSettings) {
    saveLocal("impacto_mock_platform_settings", data);
  }

  // V2 ADDITIONAL MODULE DATA LAYERS

  static getActivityLogs(): any[] { return getLocal("impacto_mock_activity_logs", []); }
  static saveActivityLogs(data: any[]) { saveLocal("impacto_mock_activity_logs", data); }

  static getActivityAttendance(): any[] { return getLocal("impacto_mock_activity_attendance", []); }
  static saveActivityAttendance(data: any[]) { saveLocal("impacto_mock_activity_attendance", data); }

  static getMessageTemplates(): any[] { return getLocal("impacto_mock_message_templates", []); }
  static saveMessageTemplates(data: any[]) { saveLocal("impacto_mock_message_templates", data); }

  static getNotificationSends(): any[] { return getLocal("impacto_mock_notification_sends", []); }
  static saveNotificationSends(data: any[]) { saveLocal("impacto_mock_notification_sends", data); }

  static getEventRSVPs(): any[] { return getLocal("impacto_mock_event_rsvps", []); }
  static saveEventRSVPs(data: any[]) { saveLocal("impacto_mock_event_rsvps", data); }

  static getEventWaitlist(): any[] { return getLocal("impacto_mock_event_waitlist", []); }
  static saveEventWaitlist(data: any[]) { saveLocal("impacto_mock_event_waitlist", data); }

  static getIdentityVerifications(): any[] { return getLocal("impacto_mock_identity_verifications", []); }
  static saveIdentityVerifications(data: any[]) { saveLocal("impacto_mock_identity_verifications", data); }

  static getDocuments(): any[] { return getLocal("impacto_mock_documents", []); }
  static saveDocuments(data: any[]) { saveLocal("impacto_mock_documents", data); }

  static getDocumentAcknowledgements(): any[] { return getLocal("impacto_mock_document_acknowledgements", []); }
  static saveDocumentAcknowledgements(data: any[]) { saveLocal("impacto_mock_document_acknowledgements", data); }

  static getResignations(): any[] {
    const defaultResignations = [
      {
        id: "resign-seed-1",
        org_id: "org-1",
        member_id: "member-sample-1",
        user_id: "user-sample-1",
        member_name: "Eric Munyaneza",
        reason: "Relocation or Resettlement",
        reason_category: "Relocation or Resettlement",
        reason_detail: "Moving to Eastern Province for agricultural training fellowship.",
        details: "Moving to Eastern Province for agricultural training fellowship.",
        feedback: "The cooperative leadership was exceptionally supportive with seasonal seed distributions. Hoping to rejoin when I return.",
        rating: 5,
        rejoin_intent: "yes",
        custom_answers: {
          q_support_rating: "5",
          q_equipment: "Yes",
          q_recommend: "High"
        },
        submitted_at: new Date(Date.now() - 4 * 86400000).toISOString(),
        resignation_date: new Date(Date.now() - 4 * 86400000).toISOString(),
        created_at: new Date(Date.now() - 4 * 86400000).toISOString(),
        finalized_at: new Date(Date.now() - 4 * 86400000).toISOString(),
        status: "finalized"
      },
      {
        id: "resign-seed-2",
        org_id: "org-1",
        member_id: "member-sample-2",
        user_id: "user-sample-2",
        member_name: "Aline Uwase",
        reason: "Scheduling Conflicts / Lack of time",
        reason_category: "Scheduling Conflicts / Lack of time",
        reason_detail: "New employment schedule clashes with Saturday general assemblies.",
        details: "New employment schedule clashes with Saturday general assemblies.",
        feedback: "Please consider providing digital voting and evening committee meetings for working members.",
        rating: 4,
        rejoin_intent: "maybe",
        custom_answers: {
          q_support_rating: "4",
          q_equipment: "Yes",
          q_recommend: "Medium"
        },
        submitted_at: new Date(Date.now() - 9 * 86400000).toISOString(),
        resignation_date: new Date(Date.now() - 9 * 86400000).toISOString(),
        created_at: new Date(Date.now() - 9 * 86400000).toISOString(),
        finalized_at: new Date(Date.now() - 9 * 86400000).toISOString(),
        status: "finalized"
      },
      {
        id: "resign-seed-3",
        org_id: "org-1",
        member_id: "member-sample-3",
        user_id: "user-sample-3",
        member_name: "Emmanuel Hakizimana",
        reason: "Mismatch with agropastoral targets",
        reason_category: "Mismatch with agropastoral targets",
        reason_detail: "Transitioned farm focus from coffee harvesting to horticulture.",
        details: "Transitioned farm focus from coffee harvesting to horticulture.",
        feedback: "Great bookkeeping and transparency from the accounting committee.",
        rating: 4,
        rejoin_intent: "yes",
        custom_answers: {
          q_support_rating: "4",
          q_equipment: "Yes",
          q_recommend: "High"
        },
        submitted_at: new Date(Date.now() - 15 * 86400000).toISOString(),
        resignation_date: new Date(Date.now() - 15 * 86400000).toISOString(),
        created_at: new Date(Date.now() - 15 * 86400000).toISOString(),
        finalized_at: new Date(Date.now() - 15 * 86400000).toISOString(),
        status: "finalized"
      }
    ];
    return getLocal("impacto_mock_resignations", defaultResignations);
  }
  static saveResignations(data: any[]) { saveLocal("impacto_mock_resignations", data); }

  static getAuditLogs(): any[] { return getLocal("impacto_mock_audit_logs", []); }
  static saveAuditLogs(data: any[]) { saveLocal("impacto_mock_audit_logs", data); }

  static getSupportConversations(): any[] { return getLocal("impacto_mock_support_conversations", []); }
  static saveSupportConversations(data: any[]) { saveLocal("impacto_mock_support_conversations", data); }

  static getSupportMessages(): any[] { return getLocal("impacto_mock_support_messages", []); }
  static saveSupportMessages(data: any[]) { saveLocal("impacto_mock_support_messages", data); }

  static getEventAttendance(): any[] { return getLocal("impacto_mock_event_attendance", []); }
  static saveEventAttendance(data: any[]) { saveLocal("impacto_mock_event_attendance", data); }

  static getMemberFees(): any[] { return getLocal("impacto_mock_member_fees", []); }
  static saveMemberFees(data: any[]) { saveLocal("impacto_mock_member_fees", data); }

  static getMarketplaceProducts(): any[] { return getLocal("impacto_mock_marketplace_products", []); }
  static saveMarketplaceProducts(data: any[]) { saveLocal("impacto_mock_marketplace_products", data); }

  static getMarketplaceLeads(): any[] { return getLocal("impacto_mock_marketplace_leads", []); }
  static saveMarketplaceLeads(data: any[]) { saveLocal("impacto_mock_marketplace_leads", data); }

  static getPolls(): any[] { return getLocal("impacto_mock_polls", []); }
  static savePolls(data: any[]) { saveLocal("impacto_mock_polls", data); }

  static getPollVotes(): any[] { return getLocal("impacto_mock_poll_votes", []); }
  static savePollVotes(data: any[]) { saveLocal("impacto_mock_poll_votes", data); }

  static getPlatformStaff(): any[] {
    const defaultStaff = [
      {
        id: "staff-superadmin-1",
        email: "superadmin@impact-o.app",
        username: "superadmin",
        full_name: "Lead System Operator",
        role: "superadmin",
        status: "active",
        password_plain: "admin123",
        created_at: new Date(Date.now() - 60 * 86400000).toISOString(),
        notes: "Chief platform administrator with unrestricted access",
        permissions: { can_audit_payments: true, can_view_ledgers: true, can_verify_members: true }
      }
    ];
    let cached = getLocal("impacto_mock_platform_staff", defaultStaff);
    // Force remove legacy static auditors to clean up user's local cache
    cached = cached.filter((staff: any) => staff.id !== "staff-auditor-1" && staff.id !== "staff-auditor-2");
    return cached;
  }
  static savePlatformStaff(data: any[]) { saveLocal("impacto_mock_platform_staff", data); }

  static getPlatformAuditLogs(): any[] {
    const defaultLogs: any[] = [];
    return getLocal("impacto_mock_platform_audit_logs", defaultLogs);
  }
  static savePlatformAuditLogs(data: any[]) { saveLocal("impacto_mock_platform_audit_logs", data); }

  static getAssets(): any[] {
    const defaultAssets = [
      {
        id: "asset-1",
        org_id: "org-1",
        name: "Solar Irrigation Pump Alpha-1",
        category: "Field Equipment",
        quantity: 1,
        quality: "Grade A Industrial",
        identifier: "SIP-2026-001",
        serial_number: "SIP-2026-001",
        purchase_date: "2026-01-15",
        purchase_cost: 1450000,
        currency: "RWF",
        condition: "good",
        assigned_to_member_id: "member-1",
        assigned_to_name: "Jean Bosco (Coop Lead)",
        location: "Huye Sector Station B",
        status: "operational",
        notes: "Serviced in July 2026. High efficiency solar array. Custody handover signed.",
        qr_code: "ASSET-SIP-2026-001",
        created_at: new Date(Date.now() - 30 * 86400000).toISOString(),
        updated_at: new Date(Date.now() - 5 * 86400000).toISOString()
      },
      {
        id: "asset-2",
        org_id: "org-1",
        name: "Dell Latitude 5430 Admin Laptop",
        category: "IT Hardware",
        quantity: 1,
        quality: "Refurbished Business Grade",
        identifier: "DEL-9942-X",
        serial_number: "DEL-9942-X",
        purchase_date: "2026-02-10",
        purchase_cost: 650000,
        currency: "RWF",
        condition: "good",
        assigned_to_member_id: "member-2",
        assigned_to_name: "Aline Uwase (Accountant)",
        location: "Main Office - Desk 2",
        status: "operational",
        notes: "Configured with accounting software and encrypted ledger vault.",
        qr_code: "ASSET-DEL-9942-X",
        created_at: new Date(Date.now() - 25 * 86400000).toISOString(),
        updated_at: new Date(Date.now() - 2 * 86400000).toISOString()
      },
      {
        id: "asset-3",
        org_id: "org-1",
        name: "Organic Coffee Fertilizer - NPK Bags",
        category: "Stock / Supplies",
        quantity: 50,
        quality: "Premium Grade 1 (Export Certified)",
        identifier: "STK-FERT-50KG",
        serial_number: "LOT-2026-B8",
        purchase_date: "2026-03-01",
        purchase_cost: 1250000,
        currency: "RWF",
        condition: "new",
        assigned_to_member_id: "member-1",
        assigned_to_name: "Jean Bosco (Warehouse Custody)",
        location: "Central Warehouse Bay 3",
        status: "in_storage",
        notes: "50 bags (50kg each). Stored on wooden pallets off moisture floor. Minimum stock alert: 15 bags.",
        qr_code: "STOCK-FERT-2026",
        created_at: new Date(Date.now() - 40 * 86400000).toISOString(),
        updated_at: new Date(Date.now() - 1 * 86400000).toISOString()
      }
    ];
    return getLocal("impacto_mock_assets", defaultAssets);
  }
  static saveAssets(data: any[]) { saveLocal("impacto_mock_assets", data); }

  static getCertificates(): any[] {
    const defaultCerts = [
      {
        id: "cert-1",
        org_id: "org-1",
        recipient_member_id: "member-1",
        recipient_name: "Jean Claude Mugisha",
        recipient_email: "jeanclaude@example.com",
        title: "Certificate of Completion - Cooperative Leadership & Governance",
        description: "For exemplary participation and completion of the intensive 4-week workshop on cooperative financial compliance and democratic assembly procedures.",
        issue_date: "2026-08-20",
        expiry_date: "2028-08-20",
        certificate_code: "CERT-2026-COOP-8821",
        template_theme: "emerald",
        signatory_name: "Evariste Ndagijimana",
        signatory_title: "Cooperative President",
        signatory_signature_url: "",
        qr_verification_url: "https://impact-o.app/verify/CERT-2026-COOP-8821",
        status: "issued",
        created_at: new Date(Date.now() - 14 * 86400000).toISOString()
      },
      {
        id: "cert-2",
        org_id: "org-1",
        recipient_member_id: "member-2",
        recipient_name: "Claire Umutoni",
        recipient_email: "claire@example.com",
        title: "Certificate of Excellence - Sustainable Agricultural Innovation",
        description: "Recognized for outstanding contribution in deploying organic compost practices and solar drip irrigation systems across Huye sector.",
        issue_date: "2026-08-28",
        certificate_code: "CERT-2026-AGRI-4019",
        template_theme: "gold",
        signatory_name: "Evariste Ndagijimana",
        signatory_title: "Cooperative President",
        signatory_signature_url: "",
        qr_verification_url: "https://impact-o.app/verify/CERT-2026-AGRI-4019",
        status: "issued",
        created_at: new Date(Date.now() - 6 * 86400000).toISOString()
      }
    ];
    return getLocal("impacto_mock_certificates", defaultCerts);
  }
  static saveCertificates(data: any[]) { saveLocal("impacto_mock_certificates", data); }

  static getDocumentSignatures(): any[] { return getLocal("impacto_mock_document_signatures", []); }
  static saveDocumentSignatures(data: any[]) { saveLocal("impacto_mock_document_signatures", data); }

  static getOfflineSyncQueue(): any[] { return getLocal("impacto_mock_offline_sync_queue", []); }
  static saveOfflineSyncQueue(data: any[]) { saveLocal("impacto_mock_offline_sync_queue", data); }
}

