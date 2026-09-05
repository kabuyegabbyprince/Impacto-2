import React from "react";
import { Navigate } from "react-router-dom";
import { useAuthStore } from "../store/authStore";
import { useOrgStore } from "../store/orgStore";

export const PrivateRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuthStore();
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
};

export const OrgRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuthStore();
  const { activeOrg } = useOrgStore();

  if (!user) {
    return <Navigate to="/login" replace />;
  }
  if (!activeOrg) {
    return <Navigate to="/org-picker" replace />;
  }
  return <>{children}</>;
};

export const AdminRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuthStore();
  const { activeOrg, activeMember } = useOrgStore();

  if (!user) {
    return <Navigate to="/login" replace />;
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

  if (!user) {
    return <Navigate to="/login" replace />;
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

  if (!user || !user.is_superadmin) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
};

export const AuditorRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuthStore();

  if (!user) {
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

