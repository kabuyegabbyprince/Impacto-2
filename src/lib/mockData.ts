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

  static getResignations(): any[] { return getLocal("impacto_mock_resignations", []); }
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
}
