import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
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

// Public Portal Pages
import {
  Landing,
  OrgPublicPage,
  DonatePage,
  EventCheckinPage
} from "./pages/public";

// Active Dashboard Pages
import {
  DashboardHome,
  NewsFeed,
  ChatRoom,
  GoalsTracker,
  MeetingsMinutes,
  DocumentsCenter,
  EventsCalendar
} from "./pages/dashboard";

import { OrganizationMarketplace } from "./pages/marketplace";
import { OrganizationMemberFees } from "./pages/fees";
import { V2AdvancedFeatures } from "./components/V2AdvancedFeatures";

// Administrative Modules
import {
  MembersManagement,
  LedgerBookkeeping,
  DonorsPortal,
  GrantsTracker,
  AnnualReports
} from "./pages/admin-modules";

// Organization Brand Settings
import { OrganizationSettingsPage } from "./pages/settings";
import { OrganizationProfilePage } from "./pages/org-profile";
import { GoalsPage } from "./pages/goals";

// Platform Operators Control
import { SuperadminDashboard } from "./pages/superadmin";

// Guard Gatewards & Layouts
import { PrivateRoute, OrgRoute, AdminRoute, AccountantRoute, PlatformRoute } from "./components/guards";
import { DashboardLayout } from "./components/layout";

import { ToastProvider } from "./components/Toast";
import { initCrossTabSync } from "./lib/crossTabSync";

// Prepare Query cache client with aggressive caching to minimize Supabase query frequency and egress
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false, // Prevent refetching when window regains focus to save egress
      refetchOnReconnect: false,   // Prevent refetching on network reconnect spikes
      retry: 1,                    // Limit retries
      staleTime: 5 * 60 * 1000,    // 5 minutes stale time so data is served from local cache instantly
      gcTime: 30 * 60 * 1000,      // 30 minutes garbage collection cache retention
    }
  }
});

export default function App() {
  React.useEffect(() => {
    const cleanup = initCrossTabSync(queryClient);
    return () => cleanup();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <Router>
          <Routes>
            {/* ==========================================
                1. PUBLIC DISCOVERY & WHITE-LABELED PORTALS
                ========================================== */}
            <Route path="/" element={<Landing />} />
            <Route path="/@:slug" element={<OrgPublicPage />} />
            <Route path="/@:slug/donate" element={<DonatePage />} />
            <Route path="/@:slug/checkin" element={<EventCheckinPage />} />
            <Route path="/:slug" element={<OrgPublicPage />} />
            <Route path="/:slug/donate" element={<DonatePage />} />
            <Route path="/:slug/checkin" element={<EventCheckinPage />} />

            {/* ==========================================
                2. PUBLIC AUTH GATES
                ========================================== */}
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
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
                3. SUPERADMIN CONTROL PANELS
                ========================================== */}
            <Route
              path="/platform/admin"
              element={
                <PlatformRoute>
                  <SuperadminDashboard />
                </PlatformRoute>
              }
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
              element={
                <OrgRoute>
                  <DashboardLayout>
                    <V2AdvancedFeatures />
                  </DashboardLayout>
                </OrgRoute>
              }
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
              path="/dashboard/settings"
              element={
                <AdminRoute>
                  <DashboardLayout>
                    <OrganizationSettingsPage />
                  </DashboardLayout>
                </AdminRoute>
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
