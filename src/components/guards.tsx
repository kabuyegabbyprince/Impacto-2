import React from "react";
import { Navigate } from "react-router-dom";
import { useAuthStore } from "../store/authStore";
import { useOrgStore } from "../store/orgStore";
import { WaitRoomView } from "./WaitRoomView";

export const PrivateRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuthStore();
  if (!user || !user.id) {
    return <Navigate to="/" replace />;
  }
  return <>{children}</>;
};

export const OrgRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuthStore();
  const { activeOrg, activeMember } = useOrgStore();

  if (!user || !user.id) {
    return <Navigate to="/" replace />;
  }
  if (!activeOrg) {
    return <Navigate to="/org-picker" replace />;
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
  const { activeOrg, activeMember } = useOrgStore();

  if (!user || !user.id) {
    return <Navigate to="/" replace />;
  }
  if (!activeOrg) {
    return <Navigate to="/org-picker" replace />;
  }
  if ((activeMember?.role as string) !== "org_admin" && (activeMember?.role as string) !== "manager" && (activeMember?.role as string) !== "accountant" && !user?.is_superadmin) {
    return <Navigate to="/dashboard" replace />;
  }
  return <>{children}</>;
};

export const AccountantRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuthStore();
  const { activeOrg, activeMember } = useOrgStore();

  if (!user || !user.id) {
    return <Navigate to="/" replace />;
  }
  if (!activeOrg) {
    return <Navigate to="/org-picker" replace />;
  }
  if ((activeMember?.role as string) !== "accountant" && !user?.is_superadmin) {
    return <Navigate to="/dashboard" replace />;
  }
  return <>{children}</>;
};

export const PlatformRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuthStore();

  if (!user || !user.id || !user.is_superadmin) {
    return <Navigate to="/" replace />;
  }
  return <>{children}</>;
};

export const AuditorRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuthStore();

  if (!user || !user.id) {
    return <Navigate to="/" replace />;
  }
  
  // Superadmin or user with platform_role auditor or staff with auditor privileges
  const hasAuditorAccess =
    user.is_superadmin ||
    user.platform_role === "auditor" ||
    user.platform_role === "superadmin" ||
    user.email?.includes("auditor") ||
    user.email === "superadmin@impact-o.app";

  if (!hasAuditorAccess) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

