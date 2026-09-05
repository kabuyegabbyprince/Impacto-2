import {
  getSupabaseAdminClient,
  getSupabaseAnonClient,
  hasSupabaseCredentials,
  consolidateUserRecords,
  getSupabaseServiceRoleKey
} from "./supabaseAdmin";

export interface PasswordResetRecord {
  id: string;
  org_id: string;
  user_id: string | null;
  email: string;
  full_name: string;
  requested_password: string | null;
  reason: string;
  status: "pending" | "approved" | "completed" | "expired" | "rejected";
  requested_at: string;
  approved_at: string | null;
  expires_at: string | null;
  resolved_at: string | null;
  resolved_by: string | null;
}

export const localPwResetRequests: PasswordResetRecord[] = [];
export const localUserPasswords: Record<string, string> = {};

export interface RegisterOrgParams {
  adminEmail: string;
  adminPassword?: string;
  adminName?: string;
  orgName?: string;
  orgTagline?: string;
  orgCategory?: string;
  autoConfirmMembers?: boolean;
  generatedSlug?: string;
}

export async function registerOrganization(params: RegisterOrgParams) {
  const {
    adminEmail,
    adminPassword,
    adminName,
    orgName,
    orgTagline,
    orgCategory,
    autoConfirmMembers,
    generatedSlug
  } = params;

  if (!hasSupabaseCredentials()) {
    const mockOrg = {
      id: `org-${Date.now()}`,
      name: orgName || "New Organization",
      slug: generatedSlug || "new-org",
      tagline: orgTagline || "",
      description: orgTagline || "",
      org_category: orgCategory || "community",
      primary_color: "#16a34a",
      secondary_color: "#ca8a04",
      subscription_status: "trial",
      subscription_tier: "trial",
      subscription_ends_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      donations_enabled: true,
      auto_confirm_members: autoConfirmMembers ?? true,
      created_at: new Date().toISOString()
    };
    const mockUserId = `usr-${Date.now()}`;
    return { success: true, org: mockOrg, userId: mockUserId, localMode: true };
  }

  let dbClient: any = getSupabaseAdminClient();
  let userId: string | undefined;

  // Try service role client first
  if (dbClient) {
    try {
      const { data, error: sError } = await dbClient.auth.admin.createUser({
        email: adminEmail,
        password: adminPassword,
        email_confirm: true,
        user_metadata: { full_name: adminName }
      });
      if (!sError && data.user) {
        userId = data.user.id;
      } else if (sError) {
        console.warn("[Register API] Admin createUser failed, will attempt standard signUp:", sError.message);
      }
    } catch (adminErr: any) {
      console.warn("[Register API] Admin client failed:", adminErr.message);
    }
  }

  // If service role not available or failed, use anon client with signUp
  if (!userId) {
    dbClient = getSupabaseAnonClient();
    if (!dbClient) {
      throw new Error("Unable to initialize Supabase client.");
    }

    const { data: signUpData, error: signUpErr } = await dbClient.auth.signUp({
      email: adminEmail,
      password: adminPassword,
      options: {
        data: { full_name: adminName }
      }
    });

    if (signUpErr) {
      // If user already registered, try signing in to verify credentials
      const { data: signInData, error: signInErr } = await dbClient.auth.signInWithPassword({
        email: adminEmail,
        password: adminPassword
      });
      if (signInErr) {
        throw new Error(signUpErr.message || signInErr.message || "Failed to create authentication user.");
      }
      userId = signInData.user?.id;
    } else {
      userId = signUpData.user?.id;
    }
  }

  if (!userId) {
    throw new Error("Could not determine user ID during organization registration.");
  }

  // Upsert into public.users table
  const { error: dbUserErr } = await dbClient.from("users").upsert({
    id: userId,
    email: adminEmail,
    full_name: adminName,
    is_superadmin: false,
    auth_user_id: userId
  });
  if (dbUserErr) console.warn("[Register API] User upsert notice:", dbUserErr.message);

  // Insert into public.organizations table
  const { error: orgErr } = await dbClient.from("organizations").insert({
    name: orgName,
    slug: generatedSlug,
    tagline: orgTagline || "",
    description: orgTagline || "",
    org_category: orgCategory || "community",
    primary_color: "#16a34a",
    secondary_color: "#ca8a04",
    subscription_status: "trial",
    subscription_tier: "trial",
    subscription_ends_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    donations_enabled: true,
    auto_confirm_members: autoConfirmMembers ?? true
  });
  if (orgErr) console.warn("[Register API] Organization insert notice:", orgErr.message);

  // Fetch created org
  let { data: newDbOrg } = await dbClient.from("organizations").select("*").eq("slug", generatedSlug).maybeSingle();
  if (!newDbOrg) {
    const { data: orgByTitle } = await dbClient.from("organizations").select("*").eq("name", orgName).maybeSingle();
    newDbOrg = orgByTitle;
  }

  if (!newDbOrg) {
    newDbOrg = {
      id: `org-${Date.now()}`,
      name: orgName,
      slug: generatedSlug,
      tagline: orgTagline,
      description: orgTagline,
      org_category: orgCategory,
      primary_color: "#16a34a",
      secondary_color: "#ca8a04",
      subscription_status: "trial",
      subscription_tier: "trial",
      subscription_ends_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      donations_enabled: true,
      auto_confirm_members: autoConfirmMembers ?? true
    };
  }

  // Insert into public.org_members table
  const { error: memErr } = await dbClient.from("org_members").insert({
    org_id: newDbOrg.id,
    user_id: userId,
    role: "org_admin",
    status: "active"
  });
  if (memErr) console.warn("[Register API] Member insert notice:", memErr.message);

  return { success: true, org: newDbOrg, userId };
}

export async function createPasswordResetRequest(params: {
  email: string;
  orgId?: string;
  reason?: string;
  newPassword?: string;
}) {
  const { email, orgId, reason, newPassword } = params;
  if (!email) {
    throw new Error("Email address is required.");
  }

  const reqId = "pw-req-" + Date.now() + "-" + Math.random().toString(36).substring(2, 7);
  const reqObj: PasswordResetRecord = {
    id: reqId,
    org_id: orgId || "org-default",
    user_id: null,
    email: email.trim().toLowerCase(),
    full_name: email.split("@")[0],
    requested_password: newPassword || null,
    reason: reason || "User requested admin-approved password reset",
    status: "pending",
    requested_at: new Date().toISOString(),
    approved_at: null,
    expires_at: null,
    resolved_at: null,
    resolved_by: null
  };

  if (!hasSupabaseCredentials()) {
    localPwResetRequests.unshift(reqObj);
    return {
      success: true,
      localMode: true,
      requestId: reqId,
      message: "Password reset request submitted successfully. Awaiting administrator approval."
    };
  }

  const client = getSupabaseAdminClient() || getSupabaseAnonClient()!;

  // Find user in users table
  const { data: matchedUser } = await client
    .from("users")
    .select("id, full_name, email")
    .eq("email", email.trim().toLowerCase())
    .maybeSingle();

  let targetOrgId = orgId;
  if (!targetOrgId && matchedUser) {
    const { data: memberRec } = await client
      .from("org_members")
      .select("org_id")
      .eq("user_id", matchedUser.id)
      .maybeSingle();
    if (memberRec) targetOrgId = memberRec.org_id;
  }

  if (!targetOrgId) {
    const { data: firstOrg } = await client.from("organizations").select("id").limit(1).maybeSingle();
    targetOrgId = firstOrg?.id || "org-default";
  }

  reqObj.org_id = targetOrgId;
  reqObj.user_id = matchedUser?.id || null;
  reqObj.full_name = matchedUser?.full_name || email.split("@")[0];

  const { error: insertErr } = await client.from("password_reset_requests").insert({
    id: reqId,
    org_id: targetOrgId,
    user_id: matchedUser?.id || null,
    email: email.trim().toLowerCase(),
    full_name: matchedUser?.full_name || email.split("@")[0],
    requested_password: newPassword || null,
    reason: reason || "User requested admin-approved password reset",
    status: "pending",
    requested_at: new Date().toISOString()
  });

  if (insertErr) {
    console.warn("[Password Reset API] Insert notice:", insertErr.message);
  }
  localPwResetRequests.unshift(reqObj);

  return {
    success: true,
    requestId: reqId,
    message: "Password reset request submitted to workspace administrator."
  };
}

export async function checkPasswordResetStatus(requestId?: string, email?: string) {
  let foundReq: any = null;

  if (requestId) {
    foundReq = localPwResetRequests.find(r => r.id === requestId);
  } else if (email) {
    foundReq = localPwResetRequests.find(r => r.email?.toLowerCase() === String(email).toLowerCase());
  }

  if (hasSupabaseCredentials()) {
    const client = getSupabaseAdminClient() || getSupabaseAnonClient()!;
    let query = client.from("password_reset_requests").select("*");
    if (requestId) {
      query = query.eq("id", requestId);
    } else if (email) {
      query = query.eq("email", String(email).toLowerCase()).order("requested_at", { ascending: false });
    }
    const { data } = await query.maybeSingle();
    if (data) {
      foundReq = { ...foundReq, ...data };
    }
  }

  if (!foundReq) {
    return null;
  }

  // Compute expiration for approved requests (5 minutes window)
  let timeRemainingSeconds = 0;
  if (foundReq.status === "approved" && foundReq.expires_at) {
    const expiryTime = new Date(foundReq.expires_at).getTime();
    const now = Date.now();
    timeRemainingSeconds = Math.max(0, Math.floor((expiryTime - now) / 1000));

    if (timeRemainingSeconds <= 0) {
      foundReq.status = "expired";
    }
  }

  return {
    id: foundReq.id,
    email: foundReq.email,
    full_name: foundReq.full_name,
    status: foundReq.status,
    requested_at: foundReq.requested_at,
    approved_at: foundReq.approved_at,
    expires_at: foundReq.expires_at,
    timeRemainingSeconds,
    isWindowActive: foundReq.status === "approved" && timeRemainingSeconds > 0
  };
}

export async function adminApprovePasswordReset(requestId: string, adminUserId?: string) {
  const now = Date.now();
  const approvedAt = new Date(now).toISOString();
  const expiresAt = new Date(now + 5 * 60 * 1000).toISOString(); // 5 minutes

  const locIdx = localPwResetRequests.findIndex(r => r.id === requestId);
  if (locIdx !== -1) {
    localPwResetRequests[locIdx].status = "approved";
    localPwResetRequests[locIdx].approved_at = approvedAt;
    localPwResetRequests[locIdx].expires_at = expiresAt;
    localPwResetRequests[locIdx].resolved_by = adminUserId || null;
  }

  if (hasSupabaseCredentials()) {
    const client = getSupabaseAdminClient() || getSupabaseAnonClient()!;
    await client
      .from("password_reset_requests")
      .update({
        status: "approved",
        approved_at: approvedAt,
        expires_at: expiresAt,
        resolved_by: adminUserId || null,
        resolved_at: approvedAt
      })
      .eq("id", requestId);
  }

  return {
    success: true,
    message: "Password reset request approved. The user now has a 5-minute window to set their new password.",
    expires_at: expiresAt,
    windowMinutes: 5
  };
}

export async function completePasswordReset(requestId: string, newPassword: string) {
  let targetReq: any = localPwResetRequests.find(r => r.id === requestId);

  if (hasSupabaseCredentials()) {
    const client = getSupabaseAdminClient() || getSupabaseAnonClient()!;
    const { data: dbReq } = await client.from("password_reset_requests").select("*").eq("id", requestId).maybeSingle();
    if (dbReq) {
      targetReq = { ...targetReq, ...dbReq };
    }
  }

  if (!targetReq) {
    throw new Error("Password reset request not found.");
  }

  if (targetReq.status !== "approved") {
    throw new Error("This request has not been approved by an administrator yet.");
  }

  if (targetReq.expires_at) {
    const expiryTime = new Date(targetReq.expires_at).getTime();
    if (Date.now() > expiryTime) {
      targetReq.status = "expired";
      throw new Error("The 5-minute password reset window has expired. Please submit a new request.");
    }
  }

  let passwordUpdated = false;
  const targetEmail = targetReq.email ? targetReq.email.trim().toLowerCase() : "";

  if (targetEmail) {
    localUserPasswords[targetEmail] = newPassword;
  }

  const serviceRoleKey = getSupabaseServiceRoleKey();
  if (hasSupabaseCredentials() && serviceRoleKey && !serviceRoleKey.startsWith("placeholder")) {
    try {
      const adminClient = getSupabaseAdminClient()!;
      let authId: string | null = null;

      if (targetEmail) {
        const { data: listData } = await adminClient.auth.admin.listUsers();
        const foundUser = (listData?.users || []).find((u: any) => u.email?.toLowerCase() === targetEmail);
        if (foundUser) authId = foundUser.id;
      }

      if (!authId && targetReq.user_id) {
        authId = targetReq.user_id;
      }

      if (authId) {
        const { error: updateErr } = await adminClient.auth.admin.updateUserById(authId, {
          password: newPassword
        });
        if (!updateErr) {
          passwordUpdated = true;
        } else {
          console.warn("[Complete PW Reset API] UpdateUserById notice:", updateErr.message);
          if (targetEmail) {
            const { error: createErr } = await adminClient.auth.admin.createUser({
              email: targetEmail,
              password: newPassword,
              email_confirm: true,
              user_metadata: { full_name: targetReq.full_name || targetEmail.split("@")[0] }
            });
            if (!createErr) passwordUpdated = true;
          }
        }
      } else if (targetEmail) {
        const { error: createErr } = await adminClient.auth.admin.createUser({
          email: targetEmail,
          password: newPassword,
          email_confirm: true,
          user_metadata: { full_name: targetReq.full_name || targetEmail.split("@")[0] }
        });
        if (!createErr) passwordUpdated = true;
      }
    } catch (authErr: any) {
      console.warn("[Complete PW Reset API] Supabase auth exception:", authErr.message);
    }
  }

  const completedAt = new Date().toISOString();
  const locIdx = localPwResetRequests.findIndex(r => r.id === requestId);
  if (locIdx !== -1) {
    localPwResetRequests[locIdx].status = "completed";
    localPwResetRequests[locIdx].resolved_at = completedAt;
  }

  if (hasSupabaseCredentials()) {
    const client = getSupabaseAdminClient() || getSupabaseAnonClient()!;
    await consolidateUserRecords(client, targetEmail);
    await client
      .from("password_reset_requests")
      .update({
        status: "completed",
        resolved_at: completedAt
      })
      .eq("id", requestId);
  }

  return {
    success: true,
    email: targetEmail,
    newPassword,
    message: "Your password has been reset successfully! You can now log in with your new password.",
    passwordUpdated
  };
}

export async function getPasswordResetRequests(orgId?: string) {
  let dbRequests: any[] = [];
  if (hasSupabaseCredentials()) {
    const client = getSupabaseAdminClient() || getSupabaseAnonClient()!;
    let query = client.from("password_reset_requests").select("*").order("requested_at", { ascending: false });
    if (orgId) query = query.eq("org_id", orgId);
    const { data, error } = await query;
    if (!error && data) {
      dbRequests = data;
    }
  }

  const combined = [...dbRequests];
  for (const loc of localPwResetRequests) {
    if (!orgId || loc.org_id === orgId) {
      if (!combined.some(r => r.id === loc.id || (r.email === loc.email && r.requested_at === loc.requested_at))) {
        combined.push(loc);
      }
    }
  }

  return combined;
}

export async function adminResetPassword(params: {
  adminUserId?: string;
  targetUserId?: string;
  newPassword?: string;
  requestId?: string;
  email?: string;
}) {
  let { adminUserId, targetUserId, newPassword, requestId, email } = params;
  let requestEmail = email ? String(email).trim().toLowerCase() : "";
  let passwordUpdated = false;

  if (requestId) {
    const locReq = localPwResetRequests.find(r => r.id === requestId);
    if (locReq) {
      if (!targetUserId) targetUserId = locReq.user_id || undefined;
      if (!newPassword) newPassword = locReq.requested_password || undefined;
      if (locReq.email) requestEmail = locReq.email.trim().toLowerCase();
    }
  }

  if (requestEmail && newPassword) {
    localUserPasswords[requestEmail] = newPassword;
  }

  if (!hasSupabaseCredentials()) {
    return {
      success: true,
      localMode: true,
      email: requestEmail,
      newPassword,
      message: "Password reset override executed successfully."
    };
  }

  const client = getSupabaseAdminClient() || getSupabaseAnonClient()!;

  if (requestId) {
    const { data: reqRec } = await client.from("password_reset_requests").select("*").eq("id", requestId).maybeSingle();
    if (reqRec) {
      if (!targetUserId) targetUserId = reqRec.user_id;
      if (!newPassword) newPassword = reqRec.requested_password;
      if (reqRec.email) requestEmail = reqRec.email.trim().toLowerCase();
    }
  }

  if (!targetUserId && requestEmail) {
    const { data: userRec } = await client.from("users").select("id").eq("email", requestEmail).maybeSingle();
    if (userRec?.id) targetUserId = userRec.id;
  }

  const serviceRoleKey = getSupabaseServiceRoleKey();
  if (serviceRoleKey && !serviceRoleKey.startsWith("placeholder")) {
    try {
      const adminClient = getSupabaseAdminClient()!;
      let authId = null;

      if (requestEmail) {
        const { data: listData } = await adminClient.auth.admin.listUsers();
        const foundUser = (listData?.users || []).find((u: any) => u.email?.toLowerCase() === requestEmail);
        if (foundUser) authId = foundUser.id;
      }

      if (!authId && targetUserId) {
        authId = targetUserId;
      }

      if (authId && newPassword) {
        const { error: updateErr } = await adminClient.auth.admin.updateUserById(authId, {
          password: newPassword
        });
        if (!updateErr) {
          passwordUpdated = true;
        } else {
          console.warn("[Admin Reset PW API] Admin updateUserById notice:", updateErr.message);
          if (requestEmail) {
            const { error: createErr } = await adminClient.auth.admin.createUser({
              email: requestEmail,
              password: newPassword,
              email_confirm: true
            });
            if (!createErr) passwordUpdated = true;
          }
        }
      } else if (requestEmail && newPassword) {
        const { error: createErr } = await adminClient.auth.admin.createUser({
          email: requestEmail,
          password: newPassword,
          email_confirm: true
        });
        if (!createErr) passwordUpdated = true;
      }
    } catch (err: any) {
      console.warn("[Admin Reset PW API] Admin client exception:", err.message);
    }
  }

  if (requestId) {
    await client.from("password_reset_requests").update({
      status: "approved",
      resolved_at: new Date().toISOString(),
      resolved_by: adminUserId || null
    }).eq("id", requestId);

    const locIdx = localPwResetRequests.findIndex(r => r.id === requestId);
    if (locIdx !== -1) {
      localPwResetRequests[locIdx].status = "approved";
    }
  }

  return {
    success: true,
    email: requestEmail,
    newPassword,
    message: "User password updated successfully.",
    passwordUpdated
  };
}

export async function updatePasswordInApp(email?: string, userId?: string, newPassword?: string) {
  if (!newPassword || newPassword.length < 6) {
    throw new Error("Password must be at least 6 characters.");
  }

  const targetEmail = email ? String(email).trim().toLowerCase() : "";
  if (targetEmail) {
    localUserPasswords[targetEmail] = newPassword;
  }

  let passwordUpdated = false;
  const serviceRoleKey = getSupabaseServiceRoleKey();
  if (hasSupabaseCredentials() && serviceRoleKey && !serviceRoleKey.startsWith("placeholder")) {
    try {
      const adminClient = getSupabaseAdminClient()!;
      let authId = null;

      if (targetEmail) {
        const { data: listData } = await adminClient.auth.admin.listUsers();
        const foundUser = (listData?.users || []).find((u: any) => u.email?.toLowerCase() === targetEmail);
        if (foundUser) authId = foundUser.id;
      }

      if (!authId && userId) {
        authId = userId;
      }

      if (authId) {
        const { error: updateErr } = await adminClient.auth.admin.updateUserById(authId, {
          password: newPassword
        });
        if (!updateErr) passwordUpdated = true;
      } else if (targetEmail) {
        const { error: createErr } = await adminClient.auth.admin.createUser({
          email: targetEmail,
          password: newPassword,
          email_confirm: true
        });
        if (!createErr) passwordUpdated = true;
      }
    } catch (err: any) {
      console.warn("[Update PW API] Supabase auth update error:", err.message);
    }

    const client = getSupabaseAdminClient()!;
    await consolidateUserRecords(client, targetEmail);
  }

  return {
    success: true,
    email: targetEmail,
    passwordUpdated,
    message: "Password updated successfully."
  };
}
