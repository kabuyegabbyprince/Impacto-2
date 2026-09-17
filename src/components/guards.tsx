import React from "react";
import { Navigate } from "react-router-dom";
import { useAuthStore } from "../store/authStore";
import { useOrgStore } from "../store/orgStore";
import { WaitRoomView } from "./WaitRoomView";
import { MockDB } from "../lib/mockData";

const ensureActiveOrg = (user: any, activeOrg: any, setActiveOrg: any) => {
  if (!activeOrg && user) {
    const orgs = MockDB.getOrgs();
    const members = MockDB.getMembers().filter(m => m.user_id === user.id && m.status === "active");
    const primaryId = user.primary_org_id || user.joined_org_ids?.[0] || members[0]?.org_id || orgs[0]?.id;
    const targetOrg = orgs.find(o => o.id === primaryId) || orgs[0];
    const targetMember = members.find(m => m.org_id === targetOrg?.id) || members[0] || {
      id: `mem-${Date.now()}`,
      org_id: targetOrg?.id || "org-1",
      user_id: user.id,
      role: "member" as const,
      status: "active" as const,
      joined_at: new Date().toISOString()
    };
    if (targetOrg) {
      setActiveOrg(targetOrg, targetMember);
    }
  }
};

export const PrivateRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuthStore();
  if (!user || !user.id) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
};

export const OrgRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuthStore();
  const { activeOrg, activeMember, setActiveOrg } = useOrgStore();

  if (!user || !user.id) {
    return <Navigate to="/login" replace />;
  }
  if (!activeOrg) {
    ensureActiveOrg(user, activeOrg, setActiveOrg);
  }

  // If user is not superadmin and not org_admin, verify their member status
  if (!user.is_superadmin && (activeMember?.role as string) !== "org_admin") {
    if (
      activeMember?.status === "pending" ||
      (activeMember?.status as string) === "awaiting_approval" ||
      activeMember?.status === "rejected"
    ) {
      return <WaitRoomView />;
    }
  }

  return <>{children}</>;
};

export const AdminRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuthStore();
  const { activeOrg, activeMember, setActiveOrg } = useOrgStore();

  if (!user || !user.id) {
    return <Navigate to="/login" replace />;
  }
  if (!activeOrg) {
    ensureActiveOrg(user, activeOrg, setActiveOrg);
  }
  if ((activeMember?.role as string) !== "org_admin" && (activeMember?.role as string) !== "manager" && (activeMember?.role as string) !== "accountant" && !user?.is_superadmin) {
    return <Navigate to="/dashboard" replace />;
  }
  return <>{children}</>;
};

export const AccountantRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuthStore();
  const { activeOrg, activeMember, setActiveOrg } = useOrgStore();

  if (!user || !user.id) {
    return <Navigate to="/login" replace />;
  }
  if (!activeOrg) {
    ensureActiveOrg(user, activeOrg, setActiveOrg);
  }
  if ((activeMember?.role as string) !== "accountant" && !user?.is_superadmin) {
    return <Navigate to="/dashboard" replace />;
  }
  return <>{children}</>;
};

export const PlatformRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuthStore();

  if (!user || !user.id || !user.is_superadmin) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
};

export const AuditorRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuthStore();

  if (!user || !user.id) {
    return <Navigate to="/login" replace />;
  }
  
  // Superadmin or user with platform_role auditor or staff with auditor privileges
  const hasAuditorAccess =
    user.is_superadmin ||
    user.platform_role === "auditor" ||
    user.platform_role === "superadmin" ||
    user.email?.includes("auditor") ||
    user.email === "superadmin@impact-o.app";

  if (!hasAuditorAccess) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};

