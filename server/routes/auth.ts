import { Router } from "express";
import {
  registerOrganization,
  createPasswordResetRequest,
  checkPasswordResetStatus,
  adminApprovePasswordReset,
  completePasswordReset,
  getPasswordResetRequests,
  adminResetPassword,
  updatePasswordInApp
} from "../services/authService";

const router = Router();

// Register organization endpoints
const handleRegister = async (req: any, res: any) => {
  try {
    const result = await registerOrganization(req.body);
    res.json(result);
  } catch (error: any) {
    console.error("[Register API] Error:", error);
    res.status(500).json({ error: error.message });
  }
};

router.post("/register-org", handleRegister);
router.post("/register-organization", handleRegister);
router.post("/register-ngo", handleRegister);

// Request password reset (submitted to Workspace Administrator)
router.post("/request-password-reset", async (req, res) => {
  try {
    const result = await createPasswordResetRequest(req.body);
    res.json(result);
  } catch (error: any) {
    console.error("[Password Reset API] Error:", error);
    res.status(error.message?.includes("required") ? 400 : 500).json({ error: error.message });
  }
});

// Check live status of a password reset request
router.get("/check-password-reset-status", async (req, res) => {
  try {
    const { requestId, email } = req.query;
    const result = await checkPasswordResetStatus(
      requestId ? String(requestId) : undefined,
      email ? String(email) : undefined
    );

    if (!result) {
      return res.status(404).json({ error: "Reset request not found." });
    }

    res.json(result);
  } catch (err: any) {
    console.error("[Check PW Reset Status] Error:", err);
    res.status(500).json({ error: err.message });
  }
});

// Admin approves password reset (unlocks 5-minute window for user)
router.post("/admin-approve-password-reset", async (req, res) => {
  try {
    const { requestId, adminUserId } = req.body;
    if (!requestId) {
      return res.status(400).json({ error: "requestId is required." });
    }

    const result = await adminApprovePasswordReset(requestId, adminUserId);
    res.json(result);
  } catch (err: any) {
    console.error("[Approve PW Reset API] Error:", err);
    res.status(500).json({ error: err.message });
  }
});

// User completes password reset within active 5-minute approved window
router.post("/complete-password-reset", async (req, res) => {
  try {
    const { requestId, newPassword } = req.body;
    if (!requestId || !newPassword) {
      return res.status(400).json({ error: "requestId and newPassword are required." });
    }

    const result = await completePasswordReset(requestId, newPassword);
    res.json(result);
  } catch (err: any) {
    console.error("[Complete PW Reset API] Error:", err);
    const isBadReq = err.message?.includes("not been approved") || err.message?.includes("expired") || err.message?.includes("not found");
    res.status(isBadReq ? 400 : 500).json({ error: err.message });
  }
});

// GET password reset requests
router.get("/password-reset-requests", async (req, res) => {
  try {
    const { orgId } = req.query;
    const requests = await getPasswordResetRequests(orgId ? String(orgId) : undefined);
    res.json({ requests });
  } catch (err: any) {
    console.error("[List PW Reset Requests API] Error:", err);
    res.json({ requests: [] });
  }
});

// Admin password reset override (Direct admin manual override)
router.post("/admin-reset-password", async (req, res) => {
  try {
    const result = await adminResetPassword(req.body);
    res.json(result);
  } catch (err: any) {
    console.error("[Admin Reset Password] Error:", err);
    res.status(500).json({ error: err.message });
  }
});

// User in-app password update endpoint
router.post("/update-password", async (req, res) => {
  try {
    const { email, userId, newPassword } = req.body;
    const result = await updatePasswordInApp(email, userId, newPassword);
    res.json(result);
  } catch (err: any) {
    console.error("[Update Password] Error:", err);
    const isBadReq = err.message?.includes("at least 6 characters");
    res.status(isBadReq ? 400 : 500).json({ error: err.message });
  }
});

export default router;
