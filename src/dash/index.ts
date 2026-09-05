// Re-export core dashboard views and administrative modules
export {
  DashboardHome,
  NewsFeed,
  ChatRoom,
  GoalsTracker,
  MeetingsMinutes,
  DocumentsCenter,
  EventsCalendar
} from "../pages/dashboard";

export { OrganizationMarketplace } from "../pages/marketplace";
export { OrganizationMemberFees } from "../pages/fees";
export { GoalsPage } from "../pages/goals";
export { OrganizationSettingsPage } from "../pages/settings";
export { OrganizationProfilePage } from "../pages/org-profile";
export { SuperadminDashboard } from "../pages/superadmin";

export {
  MembersManagement,
  LedgerBookkeeping,
  DonorsPortal,
  GrantsTracker,
  AnnualReports
} from "../pages/admin-modules";

export { AssetManagementPage } from "../pages/assets";
