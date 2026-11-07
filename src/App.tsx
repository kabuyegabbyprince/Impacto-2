import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate, useParams, useLocation } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// Automatically migrate legacy hashed URLs (e.g. /#/@slug or /#/login) to standard clean paths
if (window.location.hash && window.location.hash.startsWith('#/')) {
  try {
    const cleanPath = window.location.hash.substring(1); // Keeps the slash: /@slug, /login, etc.
    window.history.replaceState(null, '', cleanPath || '/');
  } catch (err) {
    console.error("Hash routing translation failed:", err);
  }
}

// Authentication Pages
import {
  Login,
  Register,
  OrgPicker,
  ForgotPassword,
  ResetPassword
} from "./pages/auth";

import { CertificateVerifyPage } from "./pages/CertificateVerifyPage";
import { PublicOrgPage } from "./pages/PublicOrgPage";
import { MeetRoomPage } from "./pages/MeetRoomPage";

// Active Dashboard & Governance Modules (from src/dash)
import {
  DashboardHome,
  NewsFeed,
  ChatRoom,
  GoalsTracker,
  MeetingsMinutes,
  DocumentsCenter,
  EventsCalendar,
  OrganizationMarketplace,
  OrganizationMemberFees,
  GoalsPage,
  OrganizationSettingsPage,
  OrganizationProfilePage,
  SuperadminDashboard,
  MembersManagement,
  LedgerBookkeeping,
  DonorsPortal,
  GrantsTracker,
  AnnualReports,
  AssetManagementPage
} from "./dash";

import { V2AdvancedFeatures } from "./components/V2AdvancedFeatures";
import { AuditLogsDashboard } from "./components/AuditLogsDashboard";

// Guard Gatewards & Layouts
import { PrivateRoute, OrgRoute, AdminRoute, AccountantRoute, PlatformRoute, AuditorRoute } from "./components/guards";
import { DashboardLayout, OrgThemeInjector } from "./components/layout";
import { AuditorDashboard } from "./pages/auditorDashboard";

import { ToastProvider } from "./components/Toast";
import { initCrossTabSync } from "./lib/crossTabSync";
import { processOfflineQueue } from "./lib/offlineSync";
import { OfflineIndicator } from "./components/OfflineIndicator";
import { useAuthStore } from "./store/authStore";
import { useOrgStore } from "./store/orgStore";

import { MockDB } from "./lib/mockData";

// Public Organization Showcase Dispatcher
// Resolves /@slug, /@slug/checkin, /org/slug, and arbitrary public showcase urls directly
const PublicSlugRouter: React.FC = () => {
  const params = useParams();
  const location = useLocation();

  // Extract raw slug from param or pathname
  const rawParam = params.slug || params["*"] || "";
  const firstPathSegment = location.pathname.split("/").filter(Boolean)[0] || "";
  const candidate = rawParam || firstPathSegment;

  const reservedPaths = new Set([
    "login",
    "register",
    "signup",
    "forgot-password",
    "reset-password",
    "dashboard",
    "platform",
    "auditor",
    "verify",
    "org-picker",
    "landing",
    "app",
    "api"
  ]);

  const cleanSlug = candidate.replace(/^@/, "").toLowerCase().trim();

  // If candidate starts with '@' or is a non-reserved slug path, render PublicOrgPage
  if (candidate.startsWith("@") || (!reservedPaths.has(cleanSlug) && cleanSlug.length > 0)) {
    return <PublicOrgPage />;
  }

  return <Navigate to="/" replace />;
};

// Portal landing redirect: Send user directly to root portal entrance (sign-in)
const LandingExternalRedirect: React.FC = () => {
  return <Navigate to="/" replace />;
};

// Portal entrance: Direct unauthenticated users straight to Login form
const RootPortalEntrance: React.FC = () => {
  const { user } = useAuthStore();
  const { activeOrg } = useOrgStore();

  if (!user) {
    return <Login />;
  }

  if (user.is_superadmin) {
    return <Navigate to="/platform/admin" replace />;
  }

  if (user.platform_role === "auditor" || user.email?.includes("auditor")) {
    return <Navigate to="/auditor" replace />;
  }

  return <Navigate to="/dashboard" replace />;
};

// Prepare Query cache client with aggressive caching to minimize Supabase query frequency and egress
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false, // Prevent refetching when window regains focus to save egress
      refetchOnReconnect: false,   // Prevent refetching on network reconnect spikes
      retry: 0,                    // Do not loop on failures
      staleTime: 5 * 60 * 1000,    // 5 minutes stale time so data is served from local cache instantly
      gcTime: 30 * 60 * 1000,      // 30 minutes garbage collection cache retention
    }
  }
});

export default function App() {
  React.useEffect(() => {
    const cleanup = initCrossTabSync(queryClient);
    const handleOnline = () => {
      processOfflineQueue(queryClient);
    };
    window.addEventListener("online", handleOnline);
    if (navigator.onLine) {
      processOfflineQueue(queryClient);
    }
    return () => {
      cleanup();
      window.removeEventListener("online", handleOnline);
    };
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <OfflineIndicator />
        <Router>
          <OrgThemeInjector />
          <Routes>
            {/* ==========================================
                1. PORTAL ENTRANCE & VERIFICATION & PUBLIC PROFILE
                ========================================== */}
            <Route path="/" element={<RootPortalEntrance />} />
            <Route path="/landing" element={<LandingExternalRedirect />} />
            <Route path="/verify" element={<CertificateVerifyPage />} />
            <Route path="/verify/:code" element={<CertificateVerifyPage />} />
            <Route path="/meet" element={<MeetRoomPage />} />
            <Route path="/meet/:orgId" element={<MeetRoomPage />} />

            {/* Public Organization Showcase / Portal Routes */}
            <Route path="/org/:slug" element={<PublicOrgPage />} />
            <Route path="/org/:slug/*" element={<PublicOrgPage />} />
            <Route path="/public/:slug" element={<PublicOrgPage />} />
            <Route path="/public/:slug/*" element={<PublicOrgPage />} />
            <Route path="/:slug" element={<PublicSlugRouter />} />
            <Route path="/:slug/*" element={<PublicSlugRouter />} />

            {/* ==========================================
                2. PUBLIC AUTH GATES
                ========================================== */}
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/signup" element={<Register />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            
            <Route
              path="/org-picker"
              element={
                <PrivateRoute>
                  <OrgPicker />
                </PrivateRoute>
              }
            />

            {/* ==========================================
                3. SUPERADMIN & AUDITOR CONTROL PANELS
                ========================================== */}
            <Route
              path="/platform/admin"
              element={
                <PlatformRoute>
                  <SuperadminDashboard />
                </PlatformRoute>
              }
            />
            <Route
              path="/auditor"
              element={
                <AuditorRoute>
                  <AuditorDashboard />
                </AuditorRoute>
              }
            />
            <Route
              path="/platform/auditor"
              element={<Navigate to="/auditor" replace />}
            />

            {/* ==========================================
                4. ACTIVE ORGANIZATION BRANDED WORKSPACE
                ========================================== */}
            <Route
              path="/dashboard"
              element={
                <OrgRoute>
                  <DashboardLayout>
                    <DashboardHome />
                  </DashboardLayout>
                </OrgRoute>
              }
            />

            <Route
              path="/dashboard/news"
              element={
                <OrgRoute>
                  <DashboardLayout>
                    <NewsFeed />
                  </DashboardLayout>
                </OrgRoute>
              }
            />

            <Route
              path="/dashboard/chat"
              element={
                <OrgRoute>
                  <DashboardLayout>
                    <ChatRoom />
                  </DashboardLayout>
                </OrgRoute>
              }
            />

            <Route
              path="/dashboard/events"
              element={
                <OrgRoute>
                  <DashboardLayout>
                    <EventsCalendar />
                  </DashboardLayout>
                </OrgRoute>
              }
            />

            <Route
              path="/dashboard/meetings"
              element={<Navigate to="/dashboard/events" replace />}
            />

            <Route
              path="/dashboard/goals"
              element={
                <OrgRoute>
                  <DashboardLayout>
                    <GoalsTracker />
                  </DashboardLayout>
                </OrgRoute>
              }
            />

            <Route
              path="/dashboard/documents"
              element={
                <OrgRoute>
                  <DashboardLayout>
                    <DocumentsCenter />
                  </DashboardLayout>
                </OrgRoute>
              }
            />

            <Route
              path="/dashboard/impact"
              element={<Navigate to="/dashboard" replace />}
            />


            <Route
              path="/dashboard/marketplace"
              element={
                <OrgRoute>
                  <DashboardLayout>
                    <OrganizationMarketplace />
                  </DashboardLayout>
                </OrgRoute>
              }
            />

            <Route
              path="/dashboard/fees"
              element={
                <OrgRoute>
                  <DashboardLayout>
                    <OrganizationMemberFees />
                  </DashboardLayout>
                </OrgRoute>
              }
            />

            <Route
              path="/dashboard/v2-addons"
              element={<Navigate to="/dashboard/settings?tab=subscription" replace />}
            />

            {/* ==========================================
                5. ADMINISTRATIVE CONTROLS
                ========================================== */}
            <Route
              path="/dashboard/members"
              element={
                <AdminRoute>
                  <DashboardLayout>
                    <MembersManagement />
                  </DashboardLayout>
                </AdminRoute>
              }
            />
            <Route path="/admin/members" element={<Navigate to="/dashboard/members" replace />} />

            <Route
              path="/dashboard/assets"
              element={
                <AdminRoute>
                  <DashboardLayout>
                    <AssetManagementPage />
                  </DashboardLayout>
                </AdminRoute>
              }
            />
            <Route path="/dashboard/inventory" element={<Navigate to="/dashboard/assets" replace />} />

            <Route
              path="/dashboard/ledger"
              element={
                <AccountantRoute>
                  <DashboardLayout>
                    <LedgerBookkeeping />
                  </DashboardLayout>
                </AccountantRoute>
              }
            />

            <Route
              path="/dashboard/donors"
              element={
                <AdminRoute>
                  <DashboardLayout>
                    <DonorsPortal />
                  </DashboardLayout>
                </AdminRoute>
              }
            />

            <Route
              path="/dashboard/grants"
              element={
                <AccountantRoute>
                  <DashboardLayout>
                    <GrantsTracker />
                  </DashboardLayout>
                </AccountantRoute>
              }
            />

            <Route
              path="/dashboard/reports"
              element={
                <AdminRoute>
                  <DashboardLayout>
                    <AnnualReports />
                  </DashboardLayout>
                </AdminRoute>
              }
            />

            <Route
              path="/dashboard/audit-logs"
              element={
                <AdminRoute>
                  <DashboardLayout>
                    <AuditLogsDashboard />
                  </DashboardLayout>
                </AdminRoute>
              }
            />

            <Route
              path="/dashboard/goals"
              element={
                <DashboardLayout>
                  <GoalsPage />
                </DashboardLayout>
              }
            />
            <Route
              path="/dashboard/org-profile"
              element={
                <DashboardLayout>
                  <OrganizationProfilePage />
                </DashboardLayout>
              }
            />

            <Route
              path="/dashboard/profile"
              element={
                <OrgRoute>
                  <DashboardLayout>
                    <OrganizationSettingsPage />
                  </DashboardLayout>
                </OrgRoute>
              }
            />

            <Route
              path="/dashboard/settings"
              element={
                <OrgRoute>
                  <DashboardLayout>
                    <OrganizationSettingsPage />
                  </DashboardLayout>
                </OrgRoute>
              }
            />

            {/* Fallback catcher */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Router>
      </ToastProvider>
    </QueryClientProvider>
  );
}
