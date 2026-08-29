import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { createClient } from "@supabase/supabase-js";
import { uploadFile, getFileUrl } from "./src/lib/supabaseStorage";

// Local in-memory file cache fallback when B2 is not configured or fails
const localFiles = new Map<string, { buffer: Buffer; contentType: string }>();

// Persistent Local Disk Storage Fallback
const STORAGE_DIR = path.join(process.cwd(), ".data", "storage");
if (!fs.existsSync(STORAGE_DIR)) {
  fs.mkdirSync(STORAGE_DIR, { recursive: true });
}

function saveLocalFile(key: string, buffer: Buffer, contentType: string) {
  try {
    const safeKey = key.replace(/[^a-zA-Z0-9.-]/g, "_");
    const filePath = path.join(STORAGE_DIR, safeKey);
    fs.writeFileSync(filePath, buffer);
    fs.writeFileSync(filePath + ".meta", JSON.stringify({ contentType }));
    console.log(`[Disk Storage] Persisted file to disk: ${filePath}`);
  } catch (e) {
    console.error("[Disk Storage] Failed to write file to disk:", e);
  }
}

function getLocalFile(key: string): { buffer: Buffer; contentType: string } | null {
  try {
    const safeKey = key.replace(/[^a-zA-Z0-9.-]/g, "_");
    const filePath = path.join(STORAGE_DIR, safeKey);
    if (fs.existsSync(filePath)) {
      const buffer = fs.readFileSync(filePath);
      let contentType = "application/octet-stream";
      if (fs.existsSync(filePath + ".meta")) {
        const meta = JSON.parse(fs.readFileSync(filePath + ".meta", "utf8"));
        contentType = meta.contentType || contentType;
      }
      return { buffer, contentType };
    }
  } catch (e) {
    console.error("[Disk Storage] Failed to read file from disk:", e);
  }
  return null;
}

function cleanValue(val: string | undefined): string | undefined {
  if (!val) return val;
  let s = val.trim();
  if (s.startsWith('"') && s.endsWith('"')) {
    s = s.slice(1, -1).trim();
  } else if (s.startsWith("'") && s.endsWith("'")) {
    s = s.slice(1, -1).trim();
  }
  return s;
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  // JSON parsing with a high limit for base64 file uploads
  app.use(express.json({ limit: "50mb" }));

  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  app.post(["/api/auth/register-org", "/api/auth/register-organization", "/api/auth/register-ngo"], async (req, res) => {
    try {
      const supabaseUrl = cleanValue(process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL);
      const serviceRoleKey = cleanValue(process.env.SUPABASE_SERVICE_ROLE_KEY);
      const anonKey = cleanValue(process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY);
      const { adminEmail, adminPassword, adminName, orgName, orgTagline, orgCategory, autoConfirmMembers, generatedSlug } = req.body;

      if (!supabaseUrl || (!serviceRoleKey && !anonKey) || supabaseUrl.startsWith("placeholder")) {
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
        return res.json({ success: true, org: mockOrg, userId: mockUserId, localMode: true });
      }

      let dbClient: any;
      let userId: string | undefined;

      // Try service role key if valid
      if (serviceRoleKey && !serviceRoleKey.startsWith("placeholder")) {
        try {
          dbClient = createClient(supabaseUrl, serviceRoleKey);
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
        dbClient = createClient(supabaseUrl, anonKey);
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

      res.json({ success: true, org: newDbOrg, userId });
    } catch (error: any) {
      console.error("[Register API] Error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  const localPwResetRequests: any[] = [];
  const localUserPasswords: Record<string, string> = {};

  async function consolidateUserRecords(client: any, email: string) {
    if (!email) return;
    try {
      const { data: userRecords } = await client.from("users").select("*").eq("email", email.toLowerCase());
      if (userRecords && userRecords.length > 1) {
        const primary = userRecords.find((u: any) => u.auth_user_id) || userRecords[0];
        for (let i = 0; i < userRecords.length; i++) {
          const u = userRecords[i];
          if (u.id !== primary.id) {
            await client.from("org_members").update({ user_id: primary.id }).eq("user_id", u.id);
            await client.from("member_fees").update({ member_id: primary.id }).eq("member_id", u.id);
            await client.from("goals").update({ user_id: primary.id }).eq("user_id", u.id);
            await client.from("ledger_entries").update({ user_id: primary.id }).eq("user_id", u.id);
            await client.from("users").delete().eq("id", u.id);
          }
        }
      }
    } catch (err) {
      console.warn("[ConsolidateUsers] Error:", err);
    }
  }

  // Request password reset (submitted to Workspace Administrator)
  app.post("/api/auth/request-password-reset", async (req, res) => {
    try {
      const supabaseUrl = cleanValue(process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL);
      const serviceRoleKey = cleanValue(process.env.SUPABASE_SERVICE_ROLE_KEY);
      const anonKey = cleanValue(process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY);
      const { email, orgId, reason, newPassword } = req.body;

      if (!email) {
        return res.status(400).json({ error: "Email address is required." });
      }

      const reqId = "pw-req-" + Date.now() + "-" + Math.random().toString(36).substring(2, 7);
      const reqObj = {
        id: reqId,
        org_id: orgId || "org-default",
        user_id: null as string | null,
        email: email.trim().toLowerCase(),
        full_name: email.split("@")[0],
        requested_password: newPassword || null,
        reason: reason || "User requested admin-approved password reset",
        status: "pending",
        requested_at: new Date().toISOString(),
        approved_at: null as string | null,
        expires_at: null as string | null,
        resolved_at: null as string | null,
        resolved_by: null as string | null
      };

      if (!supabaseUrl || (!serviceRoleKey && !anonKey) || supabaseUrl.startsWith("placeholder")) {
        localPwResetRequests.unshift(reqObj);
        return res.json({ 
          success: true, 
          localMode: true, 
          requestId: reqId,
          message: "Password reset request submitted successfully. Awaiting administrator approval." 
        });
      }

      const client = createClient(supabaseUrl, serviceRoleKey || anonKey);

      // Find user in users table
      const { data: matchedUser } = await client.from("users").select("id, full_name, email").eq("email", email.trim().toLowerCase()).maybeSingle();

      let targetOrgId = orgId;
      if (!targetOrgId && matchedUser) {
        const { data: memberRec } = await client.from("org_members").select("org_id").eq("user_id", matchedUser.id).maybeSingle();
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

      res.json({ 
        success: true, 
        requestId: reqId, 
        message: "Password reset request submitted to workspace administrator." 
      });
    } catch (error: any) {
      console.error("[Password Reset API] Error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Check live status of a password reset request
  app.get("/api/auth/check-password-reset-status", async (req, res) => {
    try {
      const { requestId, email } = req.query;
      const supabaseUrl = cleanValue(process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL);
      const serviceRoleKey = cleanValue(process.env.SUPABASE_SERVICE_ROLE_KEY);
      const anonKey = cleanValue(process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY);

      let foundReq: any = null;

      // Check local cache first
      if (requestId) {
        foundReq = localPwResetRequests.find(r => r.id === requestId);
      } else if (email) {
        foundReq = localPwResetRequests.find(r => r.email?.toLowerCase() === String(email).toLowerCase());
      }

      // Check Supabase if configured
      if (supabaseUrl && (serviceRoleKey || anonKey) && !supabaseUrl.startsWith("placeholder")) {
        const client = createClient(supabaseUrl, serviceRoleKey || anonKey);
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
        return res.status(404).json({ error: "Reset request not found." });
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

      res.json({
        id: foundReq.id,
        email: foundReq.email,
        full_name: foundReq.full_name,
        status: foundReq.status,
        requested_at: foundReq.requested_at,
        approved_at: foundReq.approved_at,
        expires_at: foundReq.expires_at,
        timeRemainingSeconds,
        isWindowActive: foundReq.status === "approved" && timeRemainingSeconds > 0
      });
    } catch (err: any) {
      console.error("[Check PW Reset Status] Error:", err);
      res.status(500).json({ error: err.message });
    }
  });

  // Admin approves password reset (unlocks 5-minute window for user)
  app.post("/api/auth/admin-approve-password-reset", async (req, res) => {
    try {
      const { requestId, adminUserId } = req.body;
      if (!requestId) {
        return res.status(400).json({ error: "requestId is required." });
      }

      const now = Date.now();
      const approvedAt = new Date(now).toISOString();
      const expiresAt = new Date(now + 5 * 60 * 1000).toISOString(); // exactly 5 minutes

      // Update in local memory
      const locIdx = localPwResetRequests.findIndex(r => r.id === requestId);
      if (locIdx !== -1) {
        localPwResetRequests[locIdx].status = "approved";
        localPwResetRequests[locIdx].approved_at = approvedAt;
        localPwResetRequests[locIdx].expires_at = expiresAt;
        localPwResetRequests[locIdx].resolved_by = adminUserId || null;
      }

      // Update in Supabase
      const supabaseUrl = cleanValue(process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL);
      const serviceRoleKey = cleanValue(process.env.SUPABASE_SERVICE_ROLE_KEY);
      const anonKey = cleanValue(process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY);

      if (supabaseUrl && (serviceRoleKey || anonKey) && !supabaseUrl.startsWith("placeholder")) {
        const client = createClient(supabaseUrl, serviceRoleKey || anonKey);
        await client.from("password_reset_requests").update({
          status: "approved",
          approved_at: approvedAt,
          expires_at: expiresAt,
          resolved_by: adminUserId || null,
          resolved_at: approvedAt
        }).eq("id", requestId);
      }

      res.json({
        success: true,
        message: "Password reset request approved. The user now has a 5-minute window to set their new password.",
        expires_at: expiresAt,
        windowMinutes: 5
      });
    } catch (err: any) {
      console.error("[Approve PW Reset API] Error:", err);
      res.status(500).json({ error: err.message });
    }
  });

  // User completes password reset within the active 5-minute approved window
  app.post("/api/auth/complete-password-reset", async (req, res) => {
    try {
      const { requestId, newPassword } = req.body;
      if (!requestId || !newPassword) {
        return res.status(400).json({ error: "requestId and newPassword are required." });
      }

      const supabaseUrl = cleanValue(process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL);
      const serviceRoleKey = cleanValue(process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY);
      const anonKey = cleanValue(process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY);

      let targetReq: any = localPwResetRequests.find(r => r.id === requestId);

      if (supabaseUrl && (serviceRoleKey || anonKey) && !supabaseUrl.startsWith("placeholder")) {
        const client = createClient(supabaseUrl, serviceRoleKey || anonKey);
        const { data: dbReq } = await client.from("password_reset_requests").select("*").eq("id", requestId).maybeSingle();
        if (dbReq) {
          targetReq = { ...targetReq, ...dbReq };
        }
      }

      if (!targetReq) {
        return res.status(404).json({ error: "Password reset request not found." });
      }

      if (targetReq.status !== "approved") {
        return res.status(400).json({ error: "This request has not been approved by an administrator yet." });
      }

      // Check if 5-minute window is expired
      if (targetReq.expires_at) {
        const expiryTime = new Date(targetReq.expires_at).getTime();
        if (Date.now() > expiryTime) {
          targetReq.status = "expired";
          return res.status(400).json({ error: "The 5-minute password reset window has expired. Please submit a new request." });
        }
      }

      let passwordUpdated = false;
      const targetEmail = targetReq.email ? targetReq.email.trim().toLowerCase() : "";

      if (targetEmail) {
        localUserPasswords[targetEmail] = newPassword;
      }

      // Update Supabase Auth if service role client is active
      if (supabaseUrl && serviceRoleKey && !serviceRoleKey.startsWith("placeholder")) {
        try {
          const adminClient = createClient(supabaseUrl, serviceRoleKey);
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

      // Mark request completed
      const completedAt = new Date().toISOString();
      const locIdx = localPwResetRequests.findIndex(r => r.id === requestId);
      if (locIdx !== -1) {
        localPwResetRequests[locIdx].status = "completed";
        localPwResetRequests[locIdx].resolved_at = completedAt;
      }

      if (supabaseUrl && (serviceRoleKey || anonKey) && !supabaseUrl.startsWith("placeholder")) {
        const client = createClient(supabaseUrl, serviceRoleKey || anonKey);
        await consolidateUserRecords(client, targetEmail);
        await client.from("password_reset_requests").update({
          status: "completed",
          resolved_at: completedAt
        }).eq("id", requestId);
      }

      res.json({
        success: true,
        email: targetEmail,
        newPassword,
        message: "Your password has been reset successfully! You can now log in with your new password.",
        passwordUpdated
      });
    } catch (err: any) {
      console.error("[Complete PW Reset API] Error:", err);
      res.status(500).json({ error: err.message });
    }
  });

  // GET password reset requests
  app.get("/api/auth/password-reset-requests", async (req, res) => {
    try {
      const { orgId } = req.query;
      const supabaseUrl = cleanValue(process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL);
      const serviceRoleKey = cleanValue(process.env.SUPABASE_SERVICE_ROLE_KEY);
      const anonKey = cleanValue(process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY);

      let dbRequests: any[] = [];
      if (supabaseUrl && (serviceRoleKey || anonKey) && !supabaseUrl.startsWith("placeholder")) {
        const client = createClient(supabaseUrl, serviceRoleKey || anonKey);
        let query = client.from("password_reset_requests").select("*").order("requested_at", { ascending: false });
        if (orgId) query = query.eq("org_id", orgId);
        const { data, error } = await query;
        if (!error && data) {
          dbRequests = data;
        }
      }

      // Merge local in-memory requests with db requests avoiding duplicate IDs
      const combined = [...dbRequests];
      for (const loc of localPwResetRequests) {
        if (!orgId || loc.org_id === orgId) {
          if (!combined.some(r => r.id === loc.id || (r.email === loc.email && r.requested_at === loc.requested_at))) {
            combined.push(loc);
          }
        }
      }

      res.json({ requests: combined });
    } catch (err: any) {
      res.json({ requests: localPwResetRequests });
    }
  });

  // Admin password reset override (Direct admin manual override)
  app.post("/api/auth/admin-reset-password", async (req, res) => {
    let passwordUpdated = false;
    try {
      const supabaseUrl = cleanValue(process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL);
      const serviceRoleKey = cleanValue(process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY);
      const anonKey = cleanValue(process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY);
      let { adminUserId, targetUserId, newPassword, requestId, email } = req.body;

      let requestEmail = email ? String(email).trim().toLowerCase() : "";

      if (requestId) {
        const locReq = localPwResetRequests.find(r => r.id === requestId);
        if (locReq) {
          if (!targetUserId) targetUserId = locReq.user_id;
          if (!newPassword) newPassword = locReq.requested_password;
          if (locReq.email) requestEmail = locReq.email.trim().toLowerCase();
        }
      }

      if (requestEmail && newPassword) {
        localUserPasswords[requestEmail] = newPassword;
      }

      if (!supabaseUrl || (!serviceRoleKey && !anonKey) || supabaseUrl.startsWith("placeholder")) {
        return res.json({ 
          success: true, 
          localMode: true, 
          email: requestEmail,
          newPassword,
          message: "Password reset override executed successfully." 
        });
      }

      const client = createClient(supabaseUrl, serviceRoleKey || anonKey);

      // If targetUserId or newPassword missing, fetch from password_reset_requests DB record
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

      // If service role key is available, lookup user auth id by email if needed
      if (serviceRoleKey && !serviceRoleKey.startsWith("placeholder")) {
        try {
          const adminClient = createClient(supabaseUrl, serviceRoleKey);
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

      res.json({
        success: true,
        email: requestEmail,
        newPassword,
        message: "User password updated successfully.",
        passwordUpdated
      });
    } catch (err: any) {
      console.error("[Admin Reset Password] Error:", err);
      res.status(500).json({ error: err.message });
    }
  });

  // User in-app password update endpoint
  app.post("/api/auth/update-password", async (req, res) => {
    try {
      const { email, userId, newPassword } = req.body;
      if (!newPassword || newPassword.length < 6) {
        return res.status(400).json({ error: "Password must be at least 6 characters." });
      }

      const targetEmail = email ? String(email).trim().toLowerCase() : "";
      if (targetEmail) {
        localUserPasswords[targetEmail] = newPassword;
      }

      const supabaseUrl = cleanValue(process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL);
      const serviceRoleKey = cleanValue(process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY);

      let passwordUpdated = false;
      if (supabaseUrl && serviceRoleKey && !serviceRoleKey.startsWith("placeholder")) {
        try {
          const adminClient = createClient(supabaseUrl, serviceRoleKey);
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
      }

      if (supabaseUrl && serviceRoleKey && !serviceRoleKey.startsWith("placeholder")) {
        const client = createClient(supabaseUrl, serviceRoleKey);
        await consolidateUserRecords(client, targetEmail);
      }

      res.json({
        success: true,
        email: targetEmail,
        passwordUpdated,
        message: "Password updated successfully."
      });
    } catch (err: any) {
      console.error("[Update Password] Error:", err);
      res.status(500).json({ error: err.message });
    }
  });

  // Create member fee API bypassing RLS with service role client
  app.post("/api/member-fees/create", async (req, res) => {
    try {
      const {
        id,
        org_id,
        member_id,
        amount,
        currency,
        payment_period,
        period_date,
        status,
        paid_at,
        due_date,
        is_recurring,
        admin_note,
        proof_url,
      } = req.body;

      if (!org_id || !member_id) {
        return res.status(400).json({ error: "Missing required parameters: org_id, member_id" });
      }

      const supabaseUrl = cleanValue(process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL);
      const supabaseKey = cleanValue(process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY);

      if (!supabaseUrl || !supabaseKey || supabaseUrl.startsWith("placeholder")) {
        return res.json({ success: true, bypassed: true });
      }

      const supabaseService = createClient(supabaseUrl, supabaseKey);

      const feeId = id || `fee-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
      const feePayload = {
        id: feeId,
        org_id,
        member_id,
        amount: amount || 0,
        currency: currency || "RWF",
        payment_period: payment_period || "monthly",
        period_date: period_date || new Date().toISOString().slice(0, 7),
        status: status || "pending",
        paid_at: paid_at || null,
        due_date: due_date || null,
        is_recurring: is_recurring ?? true,
        admin_note: admin_note || null,
        proof_url: proof_url || null,
        created_at: new Date().toISOString()
      };

      const { data, error } = await supabaseService
        .from("member_fees")
        .upsert(feePayload)
        .select();

      if (error) {
        console.error("[Fees API] Create error:", error);
        return res.status(400).json({ error: error.message });
      }

      res.json({ success: true, fee: data?.[0] || feePayload });
    } catch (error: any) {
      console.error("[Fees API] Create failed:", error);
      res.status(500).json({ error: "Failed to create member fee", details: error.message });
    }
  });

  // Update member fee status API bypassing RLS with service role client (or using authenticated user JWT context if falling back to anon key)
  app.post("/api/member-fees/update", async (req, res) => {
    try {
      const {
        id,
        org_id,
        member_id,
        amount,
        payment_period,
        period_date,
        status,
        paid_at,
        paid_by_method,
        transaction_reference,
        sender_info,
        reported_at,
        report_note,
        admin_note,
        proof_url,
      } = req.body;

      if (!id) {
        return res.status(400).json({ error: "Missing required parameter: id" });
      }

      const supabaseUrl = cleanValue(process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL);
      const supabaseKey = cleanValue(process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY);

      if (!supabaseUrl || !supabaseKey || supabaseUrl.startsWith("placeholder")) {
        // Fallback for mock demo mode
        return res.json({ success: true, bypassed: true });
      }

      const supabaseService = createClient(supabaseUrl, supabaseKey);

      // Build update payload dynamically
      const updateData: any = {
        status,
        paid_at: paid_at || null,
        paid_by_method: paid_by_method || null,
        transaction_reference: transaction_reference || null,
        sender_info: sender_info || null,
        reported_at: reported_at || null,
        report_note: report_note || null,
        admin_note: admin_note || null,
        proof_url: proof_url || null,
      };

      if (org_id) updateData.org_id = org_id;
      if (member_id) updateData.member_id = member_id;
      if (amount !== undefined) updateData.amount = amount;
      if (payment_period) updateData.payment_period = payment_period;
      if (period_date) updateData.period_date = period_date;

      // First attempt a direct update
      let { data, error } = await supabaseService
        .from("member_fees")
        .update(updateData)
        .eq("id", id)
        .select();

      // If no row was updated (e.g. fee record was only created locally), perform upsert
      if (!error && (!data || data.length === 0)) {
        const fullPayload = {
          id,
          org_id: org_id || "default-org",
          member_id: member_id || "default-mem",
          amount: amount || 0,
          currency: "RWF",
          payment_period: payment_period || "monthly",
          period_date: period_date || new Date().toISOString().slice(0, 7),
          ...updateData,
          created_at: new Date().toISOString()
        };

        const upsertRes = await supabaseService
          .from("member_fees")
          .upsert(fullPayload)
          .select();

        if (upsertRes.error) {
          console.error("[Fees API] Database upsert fallback error:", upsertRes.error);
        } else {
          data = upsertRes.data;
        }
      } else if (error) {
        console.error("[Fees API] Database update error:", error);
      }

      res.json({ success: true, fee: data?.[0] });
    } catch (error: any) {
      console.error("[Fees API] Update failed:", error);
      res.status(500).json({ error: "Failed to update member fee.", details: error.message });
    }
  });

  // Delete member fee API with service role client and ledger/audit cleanup
  app.post("/api/member-fees/delete", async (req, res) => {
    try {
      const { id, org_id, user_name, user_id, fee_amount, fee_ref, member_name } = req.body;
      if (!id) {
        return res.status(400).json({ error: "Missing required parameter: id" });
      }

      const supabaseUrl = cleanValue(process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL);
      const supabaseKey = cleanValue(process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY);

      if (supabaseUrl && supabaseKey && !supabaseUrl.startsWith("placeholder")) {
        const supabaseService = createClient(supabaseUrl, supabaseKey);

        // 1. Delete fee record
        const { error: deleteErr } = await supabaseService
          .from("member_fees")
          .delete()
          .eq("id", id);

        if (deleteErr) {
          console.warn("[Fees API] Direct delete warning:", deleteErr.message);
        }

        // 2. Also clean up any associated ledger entry if present
        if (org_id) {
          try {
            if (fee_ref) {
              await supabaseService
                .from("ledger_entries")
                .delete()
                .eq("org_id", org_id)
                .eq("reference", fee_ref);
            }
            await supabaseService
              .from("ledger_entries")
              .delete()
              .eq("org_id", org_id)
              .ilike("reference", `%${id.slice(0, 8)}%`);
          } catch (ledgerErr) {
            console.warn("[Fees API] Ledger cleanup notice:", ledgerErr);
          }
        }

        // 3. Record Audit Log in database
        if (org_id) {
          try {
            const auditPayload = {
              id: `audit-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
              org_id: org_id,
              user_id: user_id || null,
              actor_name: user_name || "Accountant",
              action_type: "fee_deleted",
              description: `Deleted fee due record (ID: ${id}) for member ${member_name || "N/A"} - Amount: ${fee_amount ? Number(fee_amount).toLocaleString() + " RWF" : "N/A"}`,
              metadata_json: { fee_id: id, amount: fee_amount, ref: fee_ref },
              created_at: new Date().toISOString()
            };
            await supabaseService.from("audit_logs").insert(auditPayload);
          } catch (auditErr) {
            console.warn("[Fees API] Audit log write warning:", auditErr);
          }
        }
      }

      res.json({ success: true, deletedId: id });
    } catch (error: any) {
      console.error("[Fees API] Delete failed:", error);
      res.status(500).json({ error: "Failed to delete member fee.", details: error.message });
    }
  });

  // Audit Logs Create API
  app.post("/api/audit-logs/create", async (req, res) => {
    try {
      const { id, org_id, user_id, actor_name, action_type, description, metadata_json, created_at } = req.body;
      if (!org_id || !action_type) {
        return res.status(400).json({ error: "Missing required parameters: org_id and action_type" });
      }

      const supabaseUrl = cleanValue(process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL);
      const supabaseKey = cleanValue(process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY);

      const logPayload = {
        id: id || `audit-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        org_id,
        user_id: user_id || null,
        actor_name: actor_name || "System User",
        action_type,
        description: description || action_type,
        metadata_json: metadata_json || {},
        created_at: created_at || new Date().toISOString()
      };

      if (supabaseUrl && supabaseKey && !supabaseUrl.startsWith("placeholder")) {
        const supabaseService = createClient(supabaseUrl, supabaseKey);
        const { data, error } = await supabaseService.from("audit_logs").upsert(logPayload).select();
        if (error) {
          console.warn("[Audit API] Error writing audit log:", error.message);
          return res.status(400).json({ error: error.message });
        }
        return res.json({ success: true, log: data?.[0] || logPayload });
      }

      res.json({ success: true, log: logPayload, bypassed: true });
    } catch (error: any) {
      console.error("[Audit API] Create failed:", error);
      res.status(500).json({ error: "Failed to create audit log.", details: error.message });
    }
  });

  // Dynamic environment variables endpoint for client-side consumption
  app.get("/env.js", (req, res) => {
    res.setHeader("Content-Type", "application/javascript");
    const env = {
      VITE_SUPABASE_URL: cleanValue(process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || ""),
      VITE_SUPABASE_ANON_KEY: cleanValue(process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || "")
    };
    res.send(`window.__RUNTIME_ENV__ = ${JSON.stringify(env)};`);
  });

  // Raw Local File Reader Fallback
  app.get("/api/storage/raw", (req, res) => {
    const { key } = req.query;
    if (!key || typeof key !== "string") {
      return res.status(400).send("Missing key query parameter");
    }

    let file = localFiles.get(key);
    if (!file) {
      file = getLocalFile(key) || undefined;
      if (file) {
        // Cache back to memory for fast subsequent requests
        localFiles.set(key, file);
      }
    }

    if (!file) {
      return res.status(404).send("File not found in local cache");
    }

    res.setHeader("Content-Type", file.contentType);
    res.setHeader("Cache-Control", "public, max-age=31536000");
    res.send(file.buffer);
  });

  // Supabase Storage Upload API
  app.post("/api/storage/upload", async (req, res) => {
    try {
      const { key, fileData, contentType } = req.body;
      if (!key || !fileData) {
        return res.status(400).json({ error: "Missing required fields: key and fileData are required." });
      }

      // Convert Base64 data string to buffer
      // If it has a data URL prefix (e.g. "data:image/png;base64,..."), strip it
      let base64String = fileData;
      if (base64String.includes(";base64,")) {
        base64String = base64String.split(";base64,")[1];
      }

      const buffer = Buffer.from(base64String, "base64");
      
      const supabaseUrl = cleanValue(process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL);
      const supabaseKey = cleanValue(process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY);

      if (!supabaseUrl || !supabaseKey || supabaseUrl.startsWith("placeholder")) {
        // Fall back to local in-memory & disk storage immediately if credentials aren't set
        localFiles.set(key, { buffer, contentType: contentType || "application/octet-stream" });
        saveLocalFile(key, buffer, contentType || "application/octet-stream");
        console.log(`[Supabase Storage Fallback] Stored file locally in-memory & disk (No Credentials) for key: ${key}`);
        return res.json({ success: true, key });
      }

      try {
        await uploadFile(key, buffer, contentType);
        console.log(`[Supabase Storage] Successfully uploaded file to key: ${key}`);
        res.json({ success: true, key });
      } catch (storageError: any) {
        console.warn("[Supabase Storage] Upload failed. Falling back to in-memory & disk local storage.", storageError.message);
        localFiles.set(key, { buffer, contentType: contentType || "application/octet-stream" });
        saveLocalFile(key, buffer, contentType || "application/octet-stream");
        res.json({ success: true, key });
      }
    } catch (error: any) {
      console.error("[Storage API] Upload failed:", error);
      res.status(500).json({ error: "Failed to upload file.", details: error.message });
    }
  });

  // Supabase Storage Signed URL API
  app.get("/api/storage/url", async (req, res) => {
    try {
      const { key, expires } = req.query;
      if (!key || typeof key !== "string") {
        return res.status(400).json({ error: "Missing required query parameter: key" });
      }

      if (localFiles.has(key) || getLocalFile(key)) {
        const localUrl = `/api/storage/raw?key=${encodeURIComponent(key)}`;
        return res.json({ success: true, url: localUrl });
      }

      const supabaseUrl = cleanValue(process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL);
      const supabaseKey = cleanValue(process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY);

      if (!supabaseUrl || !supabaseKey || supabaseUrl.startsWith("placeholder")) {
        const localUrl = `/api/storage/raw?key=${encodeURIComponent(key)}`;
        return res.json({ success: true, url: localUrl });
      }

      try {
        const expiresInSeconds = expires ? String(parseInt(expires as string, 10)) : "3600";
        const url = await getFileUrl(key, expiresInSeconds);
        res.json({ success: true, url });
      } catch (storageError: any) {
        console.warn("[Supabase Storage] Failed to generate signed URL. Returning local raw route.", storageError.message);
        const localUrl = `/api/storage/raw?key=${encodeURIComponent(key)}`;
        res.json({ success: true, url: localUrl });
      }
    } catch (error: any) {
      console.error("[Storage API] Failed to generate URL:", error);
      res.status(500).json({ error: "Failed to resolve URL.", details: error.message });
    }
  });

  // Custom middleware to handle SPA routing fallback for requests that do not match assets or API.
  // This is especially critical for paths like "/@slug" because Vite's fallback ignores paths starting with "/@" (treating them as Vite internals)
  app.use((req, res, next) => {
    const isApi = req.path.startsWith("/api");
    const isStaticAsset = req.path.includes(".") || req.path.startsWith("/assets");
    const isViteInternal = req.path.startsWith("/@vite") || req.path.startsWith("/@fs") || req.path.startsWith("/@id") || req.path.startsWith("/@react-refresh");
    
    if (!isApi && !isStaticAsset && !isViteInternal) {
      req.url = "/index.html";
    }
    next();
  });

  app.use("/app", express.static(path.join(process.cwd(), "app")));

  // Vite middleware for development, and static file server for production
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    
    // Serve static files from the dist folder
    app.use(express.static(distPath, {
      maxAge: "1d",
    }));

    // Fallback all unspecified routes to index.html for React Router to handle
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[Vite Full-stack Server] running on http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Critical server bootstrap failure:", err);
  process.exit(1);
});
