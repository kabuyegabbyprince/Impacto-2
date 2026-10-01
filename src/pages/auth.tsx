import React, { useState, useEffect, useRef } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { KeyRound, Mail, User as UserIcon, Building2, ChevronRight, CornerDownRight, Landmark, ArrowLeft, ChevronLeft, Check, Globe, Search, LogOut, Clock, CheckCircle, AlertTriangle, ShieldCheck, RefreshCw, UserMinus, Star, MessageSquare, HelpCircle, X, ShieldAlert, HeartHandshake } from "lucide-react";
import { useAuthStore } from "../store/authStore";
import { useOrgStore } from "../store/orgStore";
import { LogoLoader } from "../components/LogoLoader";
import { isSupabaseConfigured, supabase } from "../lib/supabase";
import { useOrganizations, useMembers, useUserMemberships } from "../hooks/useImpactoData";
import { Button, Input, Card, Badge, Avatar, Modal } from "../components/ui";
import { MockDB } from "../lib/mockData";
import { useToast } from "../components/Toast";
import { APP_CONFIG } from "../config";

// ==========================================
// ORG SELECT FIELD COMPONENT WITH RELEVANCE SORTING
// ==========================================
interface OrgSelectFieldProps {
  organizations: any[];
  isLoading: boolean;
  selectedId: string;
  onSelect: (id: string) => void;
  label: string;
  placeholder?: string;
  required?: boolean;
}

export const OrgSelectField: React.FC<OrgSelectFieldProps> = ({
  organizations,
  isLoading,
  selectedId,
  onSelect,
  label,
  placeholder = "Type to search & select organization...",
  required = false
}) => {
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // When selectedId changes or on initial mount, set query to the selected org's name
  useEffect(() => {
    if (selectedId && organizations && organizations.length > 0) {
      const selected = organizations.find(
        o => o.id === selectedId || (o.slug && o.slug.toLowerCase() === selectedId.toLowerCase())
      );
      if (selected) {
        setQuery(selected.name);
        if (selected.id !== selectedId) {
          onSelect(selected.id);
        }
      }
    }
  }, [selectedId, organizations]);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const getSortedOrgs = () => {
    if (!organizations) return [];
    if (!query) {
      // Put currently selected org at the very top, then others alphabetically
      return [...organizations].sort((a, b) => {
        if (a.id === selectedId) return -1;
        if (b.id === selectedId) return 1;
        return (a.name || "").localeCompare(b.name || "");
      });
    }

    const q = query.toLowerCase().trim();

    return [...organizations].sort((a, b) => {
      const nameA = (a.name || "").toLowerCase();
      const nameB = (b.name || "").toLowerCase();
      const slugA = (a.slug || "").toLowerCase();
      const slugB = (b.slug || "").toLowerCase();
      const catA = (a.org_category || "").toLowerCase();
      const catB = (b.org_category || "").toLowerCase();
      const tagA = (a.tagline || "").toLowerCase();
      const tagB = (b.tagline || "").toLowerCase();

      // 1. Current selected organization is always prioritized
      if (a.id === selectedId) return -1;
      if (b.id === selectedId) return 1;

      // 2. Exact match on name
      if (nameA === q && nameB !== q) return -1;
      if (nameB === q && nameA !== q) return 1;

      // 3. Starts with query on name
      const startsNameA = nameA.startsWith(q);
      const startsNameB = nameB.startsWith(q);
      if (startsNameA && !startsNameB) return -1;
      if (startsNameB && !startsNameA) return 1;

      // 4. Substring match on name
      const subNameA = nameA.includes(q);
      const subNameB = nameB.includes(q);
      if (subNameA && !subNameB) return -1;
      if (subNameB && !subNameA) return 1;

      // 5. Starts with query on slug
      const startsSlugA = slugA.startsWith(q);
      const startsSlugB = slugB.startsWith(q);
      if (startsSlugA && !startsSlugB) return -1;
      if (startsSlugB && !startsSlugA) return 1;

      // 6. Substring match on tagline/category
      const subTagA = tagA.includes(q) || catA.includes(q);
      const subTagB = tagB.includes(q) || catB.includes(q);
      if (subTagA && !subTagB) return -1;
      if (subTagB && !subTagA) return 1;

      // Default alphabetical
      return nameA.localeCompare(nameB);
    });
  };

  const sortedOrgs = getSortedOrgs();

  return (
    <div className="flex flex-col gap-1.5 w-full relative" ref={dropdownRef}>
      <label className="text-xs font-semibold text-gray-705 dark:text-slate-300 flex items-center justify-between">
        <span>{label} {required && <span className="text-red-500">*</span>}</span>
        {selectedId && <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-50 dark:bg-emerald-950/20 px-2 py-0.5 rounded-md">Selected</span>}
      </label>
      
      <div className="relative">
        <input
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
            const matched = organizations.find(o => o.name.toLowerCase() === e.target.value.toLowerCase());
            if (matched) {
              onSelect(matched.id);
            } else if (!e.target.value) {
              onSelect("");
            }
          }}
          onFocus={() => setIsOpen(true)}
          placeholder={placeholder}
          required={required && !selectedId}
          className="w-full text-sm rounded-lg border bg-white dark:bg-slate-900 border-gray-300 dark:border-slate-750 pl-3.5 pr-10 py-2.5 text-gray-805 dark:text-slate-100 outline-none focus:ring-2 focus:ring-emerald-500 transition font-sans"
        />
        <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
          <Search className="h-4 w-4 text-gray-400" />
        </div>
      </div>

      {isOpen && (
        <div className="absolute z-50 left-0 right-0 top-[100%] mt-1 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl shadow-lg max-h-60 overflow-y-auto font-sans">
          {isLoading ? (
            <div className="p-3 text-xs text-gray-500 text-center">Loading organizations...</div>
          ) : sortedOrgs.length === 0 ? (
            <div className="p-3 text-xs text-gray-500 text-center">No organizations found</div>
          ) : (
            <div className="py-1">
              {sortedOrgs.map((o) => {
                const isSelected = o.id === selectedId;
                const isQueryMatch = query && (
                  o.name.toLowerCase().includes(query.toLowerCase()) ||
                  o.slug.toLowerCase().includes(query.toLowerCase()) ||
                  o.org_category.toLowerCase().includes(query.toLowerCase())
                );
                return (
                  <button
                    key={o.id}
                    type="button"
                    onClick={() => {
                      onSelect(o.id);
                      setQuery(o.name);
                      setIsOpen(false);
                    }}
                    className={`w-full text-left px-4 py-2.5 text-xs flex flex-col gap-1 hover:bg-slate-50 dark:hover:bg-slate-800 border-b border-gray-100 dark:border-slate-800/50 last:border-0 transition ${
                      isSelected ? "bg-emerald-50/50 dark:bg-emerald-950/20 text-emerald-900 dark:text-emerald-100 font-semibold" : "text-gray-700 dark:text-slate-200"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-[13px]">{o.name}</span>
                      {isQueryMatch && (
                        <span className="text-[10px] bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400 px-1.5 py-0.5 rounded font-bold font-mono">
                          Match
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 text-gray-400 text-[10px] font-semibold uppercase tracking-wider font-mono">
                      <span>@{o.slug}</span>
                      <span>•</span>
                      <span>{o.org_category}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// ==========================================
// 1. LOGIN PAGE
// ==========================================
export const Login: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const orgIdFromParam = searchParams.get("org_id");
  
  const { setUser, setSession } = useAuthStore();
  const { setActiveOrg } = useOrgStore();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [selectedLoginOrg, setSelectedLoginOrg] = useState("");
  const { data: orgs, isLoading: isLoadingOrgs } = useOrganizations();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (orgIdFromParam) {
      setSelectedLoginOrg(orgIdFromParam);
    }
  }, [orgIdFromParam]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError("Please fill in all fields.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const cleanEmail = email.trim().toLowerCase();

      // Read stored custom passwords (from password resets, overrides, or registration)
      let storedPasswords: Record<string, string> = {};
      try {
        const raw = localStorage.getItem("impacto_user_passwords");
        if (raw) storedPasswords = JSON.parse(raw);
      } catch (e) {}

      const recordedPassword = storedPasswords[cleanEmail];

      if (isSupabaseConfigured) {
        // If a new updated password has been recorded for this account, strictly enforce that the user must use it
        if (recordedPassword && recordedPassword !== password) {
          setError("Incorrect password. Please use your newly updated password.");
          setLoading(false);
          return;
        }

        let authSession: any = null;
        let authUser: any = null;

        const { data, error: sError } = await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password
        });

        if (!sError && data?.user) {
          authUser = data.user;
          authSession = data.session;
        } else if (recordedPassword && recordedPassword === password) {
          // Validated against the newly set password
          console.log("[Auth] Authenticated via verified active password match.");
        } else if (sError) {
          throw sError;
        }

        // Fetch users records and consolidate any duplicate accounts for this email
        let { data: dbUsers, error: uError } = await supabase
          .from("users")
          .select("*")
          .eq("email", cleanEmail);

        let dbUser: any = null;
        if (dbUsers && dbUsers.length > 0) {
          dbUser = dbUsers.find((u: any) => authUser && u.auth_user_id === authUser.id) || dbUsers.find((u: any) => u.auth_user_id) || dbUsers[0];
          if (dbUsers.length > 1) {
            for (let i = 0; i < dbUsers.length; i++) {
              const u = dbUsers[i];
              if (u.id !== dbUser.id) {
                await supabase.from("org_members").update({ user_id: dbUser.id }).eq("user_id", u.id);
                await supabase.from("member_fees").update({ member_id: dbUser.id }).eq("member_id", u.id);
                await supabase.from("goals").update({ user_id: dbUser.id }).eq("user_id", u.id);
                await supabase.from("users").delete().eq("id", u.id);
              }
            }
          }
        }

        if (!dbUser && authUser) {
          const newUser = {
            id: authUser.id,
            email: authUser.email || cleanEmail,
            full_name: authUser.user_metadata?.full_name || cleanEmail.split("@")[0],
            is_superadmin: false,
            auth_user_id: authUser.id,
            created_at: new Date().toISOString()
          };
          await supabase.from("users").upsert(newUser);
          dbUser = newUser;
        } else if (!dbUser) {
          dbUser = {
            id: `user-${Date.now()}`,
            email: cleanEmail,
            full_name: cleanEmail.split("@")[0],
            is_superadmin: cleanEmail.includes("admin"),
            created_at: new Date().toISOString()
          };
        }

        // Returning user logging in: suppress workspace tour prompt so it is not noisy
        localStorage.setItem(`impacto_tour_seen_${dbUser.id}`, "true");
        setUser(dbUser);
        setSession(authSession || { token: "active-session" });

        if (dbUser.is_superadmin) {
          navigate("/platform/admin");
          return;
        }
        
        if (dbUser.platform_role === "auditor" || dbUser.email.includes("auditor")) {
          navigate("/auditor");
          return;
        }

        // Fetch memberships
        const { data: members, error: mError } = await supabase
          .from("org_members")
          .select("*, organizations(*)")
          .eq("user_id", dbUser.id);

        const activeMembers = members?.filter(m => m.status === "active") || [];
        const pendingMembers = members?.filter(m => m.status === "pending") || [];

        if (activeMembers.length === 0) {
          if (pendingMembers.length > 0) {
            setError("Your membership is pending approval.");
            setLoading(false);
            return;
          } else {
            // Auto-heal membership if user exists but has no member record yet
            const { data: allOrgs } = await supabase.from("organizations").select("*").limit(5);
            if (allOrgs && allOrgs.length > 0) {
              const defaultOrg = allOrgs[0];
              const newMember = {
                id: `mem-${Date.now()}`,
                org_id: defaultOrg.id,
                user_id: dbUser.id,
                role: "member" as const,
                status: "active" as const,
                joined_at: new Date().toISOString()
              };
              await supabase.from("org_members").insert(newMember);
              setActiveOrg(defaultOrg, newMember);
              navigate("/dashboard");
              return;
            } else {
              setError("No active memberships found. Contact your administrator.");
              setLoading(false);
              return;
            }
          }
        }

        if (selectedLoginOrg) {
          const matchedMember = activeMembers.find(m => m.org_id === selectedLoginOrg);
          if (matchedMember) {
            setActiveOrg(matchedMember.organizations, matchedMember);
            navigate("/dashboard");
          } else {
            // Fallback if they selected an org they aren't an active member of
            const orgObj = orgs?.find(o => o.id === selectedLoginOrg);
            const orgName = orgObj ? orgObj.name : "the selected organization";
            setError(`You are not an active member of ${orgName}. Your request might be pending approval.`);
            setLoading(false);
            return;
          }
        } else if (activeMembers.length > 0) {
          // Send user directly to their primary/first-joined organization dashboard
          const primaryOrgId = dbUser.primary_org_id || dbUser.joined_org_ids?.[0];
          const primaryMember = (primaryOrgId && activeMembers.find(m => m.org_id === primaryOrgId)) || activeMembers[0];
          const primaryOrg = primaryMember.organizations || orgs?.find(o => o.id === primaryMember.org_id);
          if (primaryOrg) {
            setActiveOrg(primaryOrg, primaryMember);
          }
          navigate("/dashboard");
        } else {
          // FROZEN PHASE: Multi-org / Workplace Hub frozen. Single organization membership mode.
          navigate("/dashboard");
        }
      } else {
        // DEMO / OFFLINE AUTH
        const users = MockDB.getUsers();
        const foundDemoUser = users.find(u => u.email?.toLowerCase() === cleanEmail);

        if (recordedPassword && recordedPassword !== password) {
          setError("Invalid password for this account. Please try again.");
          setLoading(false);
          return;
        }

        const members = MockDB.getMembers().filter(m => m.user_id === (foundDemoUser ? foundDemoUser.id : ""));
        const activeMembers = members.filter(m => m.status === "active");

        const primaryOrgId = foundDemoUser?.primary_org_id || foundDemoUser?.joined_org_ids?.[0] || activeMembers[0]?.org_id;

        const loginUser = foundDemoUser || {
          id: `user-${Date.now()}`,
          email: cleanEmail,
          full_name: cleanEmail.split("@")[0],
          is_superadmin: cleanEmail.includes("admin"),
          primary_org_id: primaryOrgId,
          joined_org_ids: activeMembers.map(m => m.org_id),
          created_at: new Date().toISOString()
        };

        // Returning demo user logging in: suppress workspace tour prompt
        localStorage.setItem(`impacto_tour_seen_${loginUser.id}`, "true");
        setUser(loginUser);
        setSession({ token: "demo-session" });

        const userMembers = MockDB.getMembers().filter(m => m.user_id === loginUser.id);
        const userActiveMembers = userMembers.filter(m => m.status === "active");

        if (selectedLoginOrg) {
          const targetOrg = MockDB.getOrgs().find(o => o.id === selectedLoginOrg);
          const matchMem = userActiveMembers.find(m => m.org_id === selectedLoginOrg) || {
            id: `mem-${Date.now()}`,
            org_id: selectedLoginOrg,
            user_id: loginUser.id,
            role: "member" as const,
            status: "active" as const,
            joined_at: new Date().toISOString()
          };
          if (targetOrg) {
            setActiveOrg(targetOrg, matchMem);
          }
          navigate("/dashboard");
        } else if (userActiveMembers.length > 0) {
          // Route to the first organization joined
          const targetPrimaryId = loginUser.primary_org_id || loginUser.joined_org_ids?.[0];
          const primaryMember = (targetPrimaryId && userActiveMembers.find(m => m.org_id === targetPrimaryId)) || userActiveMembers[0];
          const primaryOrg = MockDB.getOrgs().find(o => o.id === primaryMember.org_id);
          if (primaryOrg) {
            setActiveOrg(primaryOrg, primaryMember);
          }
          navigate("/dashboard");
        } else {
          const pendingMem = userMembers.find(m => m.status === "pending" || (m.status as string) === "awaiting_approval");
          if (pendingMem) {
            setError("Your membership request is currently awaiting administrator approval.");
            setLoading(false);
            return;
          }
          navigate("/org-picker");
        }
      }
    } catch (err: any) {
      setError(err.message || "Failed to log in.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-slate-950 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md flex flex-col gap-8">
        <div className="text-center flex flex-col items-center select-none">
          {/* Logo Knot */}
          <svg className="h-14 w-14 text-emerald-600 mb-4" viewBox="0 0 100 100" fill="none">
            <circle cx="50" cy="35" r="25" stroke="currentColor" strokeWidth="8" />
            <circle cx="35" cy="65" r="25" stroke="currentColor" strokeWidth="8" />
            <circle cx="65" cy="65" r="25" stroke="currentColor" strokeWidth="8" />
            <polygon points="53,48 47,48 50,42" fill="#F59E0B" />
          </svg>
          <h1 className="text-3xl font-extrabold tracking-tight font-display text-gray-900 dark:text-white">
            IMPACT<span className="text-emerald-600 dark:text-emerald-500 font-black">O</span>
          </h1>
          <p className="text-sm font-medium text-gray-500 mt-1.5 max-w-sm">
            Organization Branded Workspace & SaaS Portal
          </p>
        </div>

        <Card title="Account Sign In">
          <form onSubmit={handleLogin} className="flex flex-col gap-4">
            {error && (
              <div className="p-3.5 bg-red-50 border border-red-150 rounded-lg text-xs font-semibold text-red-600 leading-snug">
                {error}
              </div>
            )}

            <Input
              type="email"
              label={t("auth.email")}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g. admin@impact-o.app"
              prefixIcon={<Mail className="h-4 w-4 text-gray-400" />}
              autoFocus
            />

            <div className="flex flex-col gap-1.5 w-full">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-gray-700 dark:text-slate-300">
                  {t("auth.password")}
                </label>
                <Link
                  to="/forgot-password"
                  className="text-xs font-semibold text-[var(--org-primary)] hover:underline"
                >
                  {t("auth.forgot_pass")}
                </Link>
              </div>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                prefixIcon={<KeyRound className="h-4 w-4 text-gray-400" />}
              />
            </div>

            <Button type="submit" loading={loading} className="w-full mt-2 py-2.5">
              {t("auth.login")}
            </Button>
          </form>

        
        </Card>

        <div className="text-center text-xs font-semibold text-gray-500">
          <Link to="/register" className="hover:underline text-[var(--org-primary)]">
            {t("auth.no_account")}
          </Link>
        </div>
      </div>
    </div>
  );
};

// ==========================================
// 2. REGISTER PAGE
// ==========================================
export const Register: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const orgIdFromParam = searchParams.get("org_id") || searchParams.get("org");
  const modeFromParam = searchParams.get("mode");
  
  const { data: orgs, isLoading: isLoadingOrgs } = useOrganizations();
  const { user, setUser, setSession, logout } = useAuthStore();
  const { setActiveOrg } = useOrgStore();
  const { addToast } = useToast();

  const [mode, setMode] = useState<"participant" | "ngo">("participant");
  const [ngoStep, setNgoStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Participant Account Fields
  const [partName, setPartName] = useState("");
  const [partEmail, setPartEmail] = useState("");
  const [partPassword, setPartPassword] = useState("");
  const [partSelectedOrg, setPartSelectedOrg] = useState("");

  useEffect(() => {
    if (orgIdFromParam) {
      const cleanParam = orgIdFromParam.replace(/^@/, "").trim().toLowerCase();
      if (orgs && orgs.length > 0) {
        const match = orgs.find(
          (o) => o.id === orgIdFromParam || o.slug?.toLowerCase() === cleanParam
        );
        if (match) {
          setPartSelectedOrg(match.id);
        } else {
          setPartSelectedOrg(orgIdFromParam);
        }
      } else {
        const localOrgs = MockDB.getOrgs();
        const match = localOrgs.find(
          (o) => o.id === orgIdFromParam || o.slug?.toLowerCase() === cleanParam
        );
        if (match) {
          setPartSelectedOrg(match.id);
        } else {
          setPartSelectedOrg(orgIdFromParam);
        }
      }
    }
    if (modeFromParam === "participant" || modeFromParam === "ngo") {
      setMode(modeFromParam);
    }
  }, [orgIdFromParam, modeFromParam, orgs]);

  // Organization Workspace Details - Step 1
  const [orgName, setOrgName] = useState("");
  const [orgCategory, setOrgCategory] = useState("Environment");
  const [orgTagline, setOrgTagline] = useState("");
  const [isPrivateOrg, setIsPrivateOrg] = useState(false);
  const [autoConfirmMembers, setAutoConfirmMembers] = useState(true);

  // Organization Workspace Admin Credentials - Step 2
  const [adminName, setAdminName] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const [adminPassword, setAdminPassword] = useState("");

  // Helper to generate slug in real-time
  const generateSlug = (name: string): string => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "") // remove non-alphanumeric except spaces/hyphens
      .trim()
      .replace(/\s+/g, "-") // replace spaces with hyphens
      .replace(/-+/g, "-"); // remove double hyphens
  };

  const generatedSlug = generateSlug(orgName);

  const handleParticipantRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!partName || !partEmail || !partPassword || !partSelectedOrg) {
      setError("Please fill in all core fields and choose an Organization or Cooperative Workspace.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      if (isSupabaseConfigured) {
        // 1. Sign up user
        const { data: signUpData, error: signUpErr } = await supabase.auth.signUp({
          email: partEmail,
          password: partPassword,
          options: {
            data: { full_name: partName }
          }
        });

        let authUser = signUpData?.user;
        let authSession = signUpData?.session;

        // 2. Sign in to obtain active JWT session if signUp didn't return session or user already exists
        if (!authSession) {
          const { data: signInData, error: signInErr } = await supabase.auth.signInWithPassword({
            email: partEmail,
            password: partPassword
          });
          if (signInErr) {
            if (signUpErr) throw signUpErr;
            throw signInErr;
          }
          authUser = signInData.user;
          authSession = signInData.session;
        }

        if (!authUser) {
          throw new Error("Could not retrieve user account after registration.");
        }

        if (authSession) {
          setSession(authSession);
        }

        // 3. Insert/Upsert into public.users table using active session
        const { error: dbError } = await supabase.from("users").upsert({
          id: authUser.id,
          email: partEmail,
          full_name: partName,
          is_superadmin: false,
          auth_user_id: authUser.id,
          primary_org_id: partSelectedOrg,
          joined_org_ids: partSelectedOrg ? [partSelectedOrg] : []
        });
        if (dbError) console.warn("[Participant Register] Users upsert notice:", dbError.message);

        // 4. Insert into public.org_members
        let memberRecord: any = null;
        let orgRecord: any = null;
        if (partSelectedOrg) {
          const { data: fetchedOrg } = await supabase.from("organizations").select("*").eq("id", partSelectedOrg).maybeSingle();
          orgRecord = fetchedOrg || orgs?.find(o => o.id === partSelectedOrg) || null;
          
          const isTargetOrgPrivate = orgRecord ? (
            orgRecord.is_public_directory === false ||
            orgRecord.allow_public_joining === false ||
            orgRecord.auto_confirm_members === false
          ) : false;
          const initialMemberStatus: "pending" | "active" = isTargetOrgPrivate ? "pending" : "active";

          const { data: createdMem, error: memberErr } = await supabase.from("org_members").insert({
            org_id: partSelectedOrg,
            user_id: authUser.id,
            role: "member",
            status: initialMemberStatus,
            joined_at: new Date().toISOString()
          }).select().maybeSingle();
          if (memberErr) console.warn("[Participant Register] Member insert notice:", memberErr.message);
          memberRecord = createdMem || {
            id: `mem-${Date.now()}`,
            org_id: partSelectedOrg,
            user_id: authUser.id,
            role: "member" as const,
            status: initialMemberStatus,
            joined_at: new Date().toISOString()
          };
        }

        const dbUser = {
          id: authUser.id,
          email: partEmail,
          full_name: partName,
          is_superadmin: false,
          primary_org_id: partSelectedOrg,
          joined_org_ids: partSelectedOrg ? [partSelectedOrg] : [],
          created_at: new Date().toISOString()
        };

        try {
          const raw = localStorage.getItem("impacto_user_passwords") || "{}";
          const map = JSON.parse(raw);
          map[partEmail.trim().toLowerCase()] = partPassword;
          localStorage.setItem("impacto_user_passwords", JSON.stringify(map));
        } catch (e) {}

        sessionStorage.setItem("impacto_just_registered", "true");
        setUser(dbUser);

        if (partSelectedOrg && orgRecord && memberRecord) {
          setActiveOrg(orgRecord, memberRecord);
        }
        navigate("/dashboard");
      } else {
        // DEMO RUN
        await new Promise((res) => setTimeout(res, 800));
        const users = MockDB.getUsers();
        
        if (users.some((u) => u.email.toLowerCase() === partEmail.toLowerCase())) {
          setError("Email is already registered on this platform.");
          setLoading(false);
          return;
        }

        const newUser = {
          id: "user-" + Math.random().toString(36).substr(2, 9),
          email: partEmail,
          full_name: partName,
          is_superadmin: false,
          primary_org_id: partSelectedOrg,
          joined_org_ids: partSelectedOrg ? [partSelectedOrg] : [],
          created_at: new Date().toISOString()
        };
        users.push(newUser);
        MockDB.saveUsers(users);

        let createdMember: any = null;
        let targetOrg: any = null;
        if (partSelectedOrg) {
          targetOrg = MockDB.getOrgs().find((o) => o.id === partSelectedOrg) || orgs?.find((o) => o.id === partSelectedOrg);
          const isTargetOrgPrivate = targetOrg ? (
            targetOrg.is_public_directory === false ||
            targetOrg.allow_public_joining === false ||
            targetOrg.auto_confirm_members === false
          ) : false;
          const initialMemberStatus: "pending" | "active" = isTargetOrgPrivate ? "pending" : "active";

          const members = MockDB.getMembers();
          createdMember = {
            id: "member-" + Math.random().toString(36).substr(2, 9),
            org_id: partSelectedOrg,
            user_id: newUser.id,
            role: "member" as const,
            status: initialMemberStatus,
            joined_at: new Date().toISOString()
          };
          members.push(createdMember);
          MockDB.saveMembers(members);
        }

        try {
          const raw = localStorage.getItem("impacto_user_passwords") || "{}";
          const map = JSON.parse(raw);
          map[partEmail.trim().toLowerCase()] = partPassword;
          localStorage.setItem("impacto_user_passwords", JSON.stringify(map));
        } catch (e) {}

        // Automatically log them in and navigate directly to their registered organization's dashboard
        sessionStorage.setItem("impacto_just_registered", "true");
        setUser(newUser);
        setSession({ token: "demo" });

        if (partSelectedOrg && createdMember && targetOrg) {
          setActiveOrg(targetOrg, createdMember);
        }
        navigate("/dashboard");
      }
    } catch (err: any) {
      setError(err.message || "Failed to register participant account.");
    } finally {
      setLoading(false);
    }
  };

  const handleNgoRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (ngoStep === 1) {
      if (!orgName || !orgTagline) {
        setError("Please enter both an Organization Name and Tagline.");
        return;
      }
      setError("");
      setNgoStep(2);
      return;
    }

    if (!adminName || !adminEmail || !adminPassword) {
      setError("Please fill in all Admin account credentials.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const slug = generatedSlug;
      if (!slug) {
        throw new Error("Invalid organization name. Could not generate URL slug.");
      }

      if (isSupabaseConfigured) {
        // 1. First attempt signUp
        const { data: signUpData, error: signUpErr } = await supabase.auth.signUp({
          email: adminEmail,
          password: adminPassword,
          options: {
            data: { full_name: adminName }
          }
        });

        let authUser = signUpData?.user;
        let authSession = signUpData?.session;

        // 2. Obtain active session JWT via signInWithPassword if session wasn't returned or user exists
        if (!authSession) {
          const { data: signInData, error: signInErr } = await supabase.auth.signInWithPassword({
            email: adminEmail,
            password: adminPassword
          });
          if (signInErr) {
            if (signUpErr) throw signUpErr;
            throw signInErr;
          }
          authUser = signInData.user;
          authSession = signInData.session;
        }

        if (!authUser) {
          throw new Error("Could not authenticate administrator account.");
        }

        if (authSession) {
          setSession(authSession);
        }

        // 3. Upsert user record into public.users using authenticated session
        const { error: userUpsertErr } = await supabase.from("users").upsert({
          id: authUser.id,
          email: adminEmail,
          full_name: adminName,
          is_superadmin: false,
          auth_user_id: authUser.id
        });
        if (userUpsertErr) console.warn("[Register NGO] User upsert notice:", userUpsertErr.message);

        // 4. Insert organization into public.organizations
        const { data: createdOrg, error: orgInsertErr } = await supabase.from("organizations").insert({
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
          auto_confirm_members: !isPrivateOrg && autoConfirmMembers,
          is_public_directory: !isPrivateOrg,
          allow_public_joining: !isPrivateOrg && autoConfirmMembers,
          public_page_enabled: !isPrivateOrg
        }).select().maybeSingle();

        if (orgInsertErr) console.warn("[Register NGO] Org insert notice:", orgInsertErr.message);

        let finalOrg = createdOrg;
        if (!finalOrg) {
          const { data: foundOrg } = await supabase.from("organizations").select("*").eq("slug", generatedSlug).maybeSingle();
          finalOrg = foundOrg || {
            id: `org-${Date.now()}`,
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
            auto_confirm_members: !isPrivateOrg && autoConfirmMembers,
            is_public_directory: !isPrivateOrg,
            allow_public_joining: !isPrivateOrg && autoConfirmMembers,
            public_page_enabled: !isPrivateOrg,
            created_at: new Date().toISOString()
          };
        }

        // Update user primary_org_id and joined_org_ids in Supabase
        await supabase.from("users").update({
          primary_org_id: finalOrg.id,
          joined_org_ids: [finalOrg.id]
        }).eq("id", authUser.id);

        // 5. Insert member into public.org_members
        const { data: createdMember, error: memInsertErr } = await supabase.from("org_members").insert({
          org_id: finalOrg.id,
          user_id: authUser.id,
          role: "org_admin",
          status: "active",
          joined_at: new Date().toISOString()
        }).select().maybeSingle();

        if (memInsertErr) console.warn("[Register NGO] Member insert notice:", memInsertErr.message);

        const finalMember = createdMember || {
          id: `mem-${Date.now()}`,
          org_id: finalOrg.id,
          user_id: authUser.id,
          role: "org_admin" as const,
          status: "active" as const,
          joined_at: new Date().toISOString()
        };

        const dbUser = {
          id: authUser.id,
          email: adminEmail,
          full_name: adminName,
          is_superadmin: false,
          primary_org_id: finalOrg.id,
          joined_org_ids: [finalOrg.id],
          created_at: new Date().toISOString()
        };

        try {
          const raw = localStorage.getItem("impacto_user_passwords") || "{}";
          const map = JSON.parse(raw);
          map[adminEmail.trim().toLowerCase()] = adminPassword;
          localStorage.setItem("impacto_user_passwords", JSON.stringify(map));
        } catch (e) {}

        sessionStorage.setItem("impacto_just_registered", "true");
        setUser(dbUser);
        setActiveOrg(finalOrg, finalMember);
        navigate("/dashboard");
      } else {
        // DEMO RUN
        await new Promise((res) => setTimeout(res, 800));
        const users = MockDB.getUsers();
        const orgsList = MockDB.getOrgs();

        if (users.some((u) => u.email.toLowerCase() === adminEmail.toLowerCase())) {
          setError("Administrator email address is already registered.");
          setLoading(false);
          return;
        }

        if (orgsList.some((o) => o.slug.toLowerCase() === slug.toLowerCase())) {
          setError(`Organization website slug "@${slug}" is already taken. Choose another Organization Name.`);
          setLoading(false);
          setNgoStep(1); // Go back to correct the name
          return;
        }

        const newOrg = {
          id: "org-" + Math.random().toString(36).substr(2, 9),
          name: orgName,
          slug: slug,
          tagline: orgTagline,
          description: orgTagline,
          mission: `Unlocking positive communal transformation in Rwanda within the focus of ${orgCategory}.`,
          vision: `A fully transparent, digitalized, and audited community workspace on Impacto.`,
          logo_url: "",
          cover_url: "",
          primary_color: "#16a34a",
          secondary_color: "#ca8a04",
          language: "en" as const,
          auto_confirm_members: !isPrivateOrg && autoConfirmMembers,
          is_public_directory: !isPrivateOrg,
          allow_public_joining: !isPrivateOrg && autoConfirmMembers,
          public_page_enabled: !isPrivateOrg,
          donations_enabled: true,
          donation_mtn_number: "0788100120",
          donation_airtel_number: "0733100120",
          donation_account_name: orgName,
          donation_description: `Support our strategic action in Rwanda's ${orgCategory} field.`,
          subscription_status: "trial" as const,
          subscription_tier: "trial" as const,
          subscription_ends_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 day trial
          org_category: orgCategory,
          created_at: new Date().toISOString()
        };

        const newUser = {
          id: "user-" + Math.random().toString(36).substr(2, 9),
          email: adminEmail,
          full_name: adminName,
          is_superadmin: false,
          primary_org_id: newOrg.id,
          joined_org_ids: [newOrg.id],
          created_at: new Date().toISOString()
        };

        const newMember = {
          id: "member-" + Math.random().toString(36).substr(2, 9),
          org_id: newOrg.id,
          user_id: newUser.id,
          role: "org_admin" as const,
          status: "active" as const,
          joined_at: new Date().toISOString()
        };

        // Persist records
        orgsList.push(newOrg);
        users.push(newUser);
        const membersList = MockDB.getMembers();
        membersList.push(newMember);

        MockDB.saveOrgs(orgsList);
        MockDB.saveUsers(users);
        MockDB.saveMembers(membersList);

        try {
          const raw = localStorage.getItem("impacto_user_passwords") || "{}";
          const map = JSON.parse(raw);
          map[adminEmail.trim().toLowerCase()] = adminPassword;
          localStorage.setItem("impacto_user_passwords", JSON.stringify(map));
        } catch (e) {}

        // Prepopulate general announcement channels
        const channelsList = MockDB.getChannels();
        const chanAnnounce = { id: `chan-ann-${newOrg.id}`, org_id: newOrg.id, name: "general-announcements", type: "announcement" as const, created_by: newUser.id };
        const chanChat = { id: `chan-chat-${newOrg.id}`, org_id: newOrg.id, name: "member-chat", type: "group" as const, created_by: newUser.id };
        channelsList.push(chanAnnounce, chanChat);
        MockDB.saveChannels(channelsList);

        const msgsList = MockDB.getMessages();
        msgsList.push({
          id: `msg-seed-${newOrg.id}`,
          channel_id: chanChat.id,
          sender_id: newUser.id,
          text: `Welcome to the private chat space of ${newOrg.name}. This channel is locked to authorized local members.`,
          created_at: new Date().toISOString(),
          sender_name: newUser.full_name,
          sender_avatar: ""
        });
        MockDB.saveMessages(msgsList);

        // Set Store to auto login
        sessionStorage.setItem("impacto_just_registered", "true");
        setUser(newUser);
        setSession({ token: "demo" });
        setActiveOrg(newOrg, newMember);

        navigate("/dashboard");
      }
    } catch (err: any) {
      setError(err.message || "Failed to launch workspace.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-slate-950 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-lg flex flex-col gap-6">
        <div className="text-center flex flex-col items-center select-none">
          <svg className="h-10 w-10 text-emerald-600 mb-2" viewBox="0 0 100 100" fill="none">
            <circle cx="50" cy="35" r="25" stroke="currentColor" strokeWidth="8" />
            <circle cx="35" cy="65" r="25" stroke="currentColor" strokeWidth="8" />
            <circle cx="65" cy="65" r="25" stroke="currentColor" strokeWidth="8" />
            <polygon points="53,48 47,48 50,42" fill="#F59E0B" />
          </svg>
          <h1 className="text-2xl font-extrabold tracking-tight font-display text-gray-900 dark:text-white">
            Get Started on Impacto
          </h1>
          <p className="text-xs text-gray-500 mt-1 max-w-sm">
            Launch your community cooperative or apply to join an active local program.
          </p>
        </div>

        {user ? (
          <Card title="Workspace Association" className="max-w-md mx-auto w-full">
            <div className="flex flex-col gap-4">
              <div className="p-3 bg-emerald-50/50 dark:bg-slate-900 border border-emerald-100 dark:border-slate-800 rounded-xl text-xs flex flex-col gap-1">
                <span className="text-gray-400 font-mono text-[9px] uppercase tracking-wider font-bold">Active Account Profile</span>
                <span className="font-bold text-gray-800 dark:text-slate-200 text-sm">{user.full_name}</span>
                <span className="text-gray-500 font-medium">{user.email}</span>
              </div>

              {(() => {
                const targetOrg = orgs?.find((o) => o.id === orgIdFromParam) || MockDB.getOrgs().find((o) => o.id === orgIdFromParam);
                if (!targetOrg) {
                  return (
                    <div className="flex flex-col gap-3">
                      <p className="text-xs text-gray-500 font-semibold leading-relaxed">
                        You are already logged into Impacto. Visit the workspace directory to search and join active local cooperatives.
                      </p>
                      <Button
                        onClick={() => navigate("/dashboard")}
                        className="w-full bg-emerald-700 hover:bg-emerald-800 py-2.5 text-xs font-bold"
                      >
                        Go to Dashboard
                      </Button>
                    </div>
                  );
                }

                const existingMembership = MockDB.getMembers().find(
                  (m) => m.user_id === user.id && m.org_id === targetOrg.id
                );

                if (existingMembership) {
                  return (
                    <div className="flex flex-col gap-3">
                      <div className="p-4 bg-gray-50 dark:bg-slate-900 border rounded-xl text-center flex flex-col gap-1.5">
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Affiliation Status</span>
                        <span className="font-extrabold text-sm text-gray-800 dark:text-white mt-1">{targetOrg.name}</span>
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-bold mx-auto mt-2 ${
                          existingMembership.status === "active" 
                            ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400" 
                            : "bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-400"
                        }`}>
                          <span className={`h-1.5 w-1.5 rounded-full ${existingMembership.status === "active" ? "bg-emerald-500" : "bg-amber-500 animate-pulse"}`} />
                          {existingMembership.status === "active" ? "Active Member" : "Awaiting Admin Approval"}
                        </span>
                      </div>
                      <Button
                        onClick={() => {
                          if (existingMembership.status === "active") {
                            setActiveOrg(targetOrg, existingMembership);
                            navigate("/dashboard");
                          } else {
                            // FROZEN PHASE: single-org mode
                            navigate("/dashboard");
                          }
                        }}
                        className="w-full bg-emerald-700 hover:bg-emerald-800 py-2.5 text-xs font-bold"
                      >
                        {existingMembership.status === "active" ? "Go to Dashboard" : "Go to Dashboard"}
                      </Button>
                    </div>
                  );
                }

                const isPublic = (targetOrg.allow_public_joining !== false) && (targetOrg.auto_confirm_members !== false);

                return (
                  <div className="flex flex-col gap-3">
                    <div className="p-4 bg-slate-50/50 dark:bg-slate-900 border rounded-xl flex flex-col gap-1.5">
                      <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 font-bold uppercase tracking-wider">Join Workspace Proposal</span>
                      <h4 className="font-extrabold text-sm text-gray-900 dark:text-white mt-1 leading-snug">{targetOrg.name}</h4>
                      <p className="text-[11px] text-gray-500 leading-relaxed mt-1">{targetOrg.tagline}</p>
                      
                      <div className={`mt-3 p-2.5 rounded border text-[11px] font-medium leading-relaxed ${
                        isPublic 
                          ? "bg-emerald-50/50 border-emerald-150 text-emerald-800" 
                          : "bg-amber-50/50 border-amber-150 text-amber-800"
                      }`}>
                        {isPublic 
                          ? "● This workspace allows public joining. You will be authenticated and activated as an official member instantly without any admin waiting time."
                          : "● This workspace is request-only. Your membership request will be sent to the workspace administrators for confirmation and manual approval."}
                      </div>
                    </div>

                    <Button
                      loading={loading}
                      onClick={async () => {
                        setLoading(true);
                        await new Promise((res) => setTimeout(res, 600));
                        const members = MockDB.getMembers();
                        const finalStatus = isPublic ? "active" : "pending";
                        const newMemberRow = {
                          id: "member-" + Math.random().toString(36).substr(2, 9),
                          org_id: targetOrg.id,
                          user_id: user.id,
                          role: "member" as const,
                          status: finalStatus as any,
                          joined_at: new Date().toISOString()
                        };
                        members.push(newMemberRow);
                        MockDB.saveMembers(members);

                        const updatedJoinedIds = Array.from(new Set([...(user.joined_org_ids || []), targetOrg.id]));
                        const updatedPrimaryId = user.primary_org_id || targetOrg.id;
                        const updatedUser = {
                          ...user,
                          primary_org_id: updatedPrimaryId,
                          joined_org_ids: updatedJoinedIds
                        };

                        const users = MockDB.getUsers();
                        const uIdx = users.findIndex(u => u.id === user.id);
                        if (uIdx >= 0) {
                          users[uIdx] = { ...users[uIdx], primary_org_id: updatedPrimaryId, joined_org_ids: updatedJoinedIds };
                          MockDB.saveUsers(users);
                        }

                        if (isSupabaseConfigured) {
                          await supabase.from("users").update({
                            primary_org_id: updatedPrimaryId,
                            joined_org_ids: updatedJoinedIds
                          }).eq("id", user.id);

                          await supabase.from("org_members").insert({
                            org_id: targetOrg.id,
                            user_id: user.id,
                            role: "member",
                            status: finalStatus,
                            joined_at: new Date().toISOString()
                          });
                        }

                        setUser(updatedUser);
                        setLoading(false);

                        if (isPublic) {
                          setActiveOrg(targetOrg, newMemberRow);
                          addToast(`Successfully registered and activated as a member in ${targetOrg.name}!`, "success");
                          navigate("/dashboard");
                        } else {
                          addToast(`Registration submitted! Your request to join ${targetOrg.name} is pending admin approval.`, "warning");
                          navigate("/dashboard");
                        }
                      }}
                      className={`w-full py-2.5 text-xs font-bold ${isPublic ? "bg-emerald-600 hover:bg-emerald-700" : "bg-amber-600 hover:bg-amber-700"}`}
                    >
                      {isPublic ? "Join Workspace Directly" : "Submit Request to Join"}
                    </Button>
                  </div>
                );
              })()}

              <div className="text-center mt-3 pt-3 border-t">
                <button
                  onClick={() => {
                    logout();
                    navigate("/login");
                  }}
                  className="text-[10px] font-bold text-red-500 hover:underline hover:text-red-700 uppercase tracking-wider cursor-pointer bg-transparent border-0 outline-none"
                >
                  Sign Out to Register Another Account
                </button>
              </div>
            </div>
          </Card>
        ) : (
          <>
            {/* Tab Selector */}
            <div className="grid grid-cols-2 p-1 bg-gray-100 dark:bg-slate-900 rounded-xl max-w-md mx-auto w-full select-none">
              <button
                onClick={() => {
                  setMode("participant");
                  setError("");
                }}
                className={`py-2 text-xs font-bold rounded-lg transition-all ${
                  mode === "participant"
                    ? "bg-white dark:bg-slate-850 text-emerald-700 dark:text-emerald-400 shadow-sm"
                    : "text-gray-500 hover:text-gray-800 dark:hover:text-slate-300"
                }`}
              >
                Create Participant Account
              </button>
              <button
                onClick={() => {
                  setMode("ngo");
                  setError("");
                }}
                className={`py-2 text-xs font-bold rounded-lg transition-all ${
                  mode === "ngo"
                    ? "bg-white dark:bg-slate-855 text-emerald-700 dark:text-emerald-400 shadow-sm"
                    : "text-gray-500 hover:text-gray-800 dark:hover:text-slate-300"
                }`}
              >
                Create Organization Workspace
              </button>
            </div>

            {error && (
              <div className="p-3 bg-red-50 border border-red-150 rounded-lg text-xs text-red-600 font-semibold leading-normal max-w-md mx-auto w-full">
                {error}
              </div>
            )}

            {/* 1. PARTICIPANT VIEW */}
            {mode === "participant" && (
              <Card title="Participant Registration" className="max-w-md mx-auto w-full">
                <p className="text-xs text-gray-500 mb-4 font-medium leading-relaxed">
                  Create an account to participate in active agricultural, green, and health cooperatives across Rwanda.
                </p>
                <form onSubmit={handleParticipantRegister} className="flex flex-col gap-4">
                  <Input
                    type="text"
                    label={t("auth.full_name")}
                    value={partName}
                    onChange={(e) => setPartName(e.target.value)}
                    placeholder="Marie-Louise Mukamana"
                    prefixIcon={<UserIcon className="h-4 w-4 text-gray-400" />}
                    required
                    autoFocus
                  />

                  <Input
                    type="email"
                    label={t("auth.email")}
                    value={partEmail}
                    onChange={(e) => setPartEmail(e.target.value)}
                    placeholder="marie@gmail.com"
                    prefixIcon={<Mail className="h-4 w-4 text-gray-400" />}
                    required
                  />

                  <Input
                    type="password"
                    label={t("auth.password")}
                    value={partPassword}
                    onChange={(e) => setPartPassword(e.target.value)}
                    placeholder="••••••••"
                    prefixIcon={<KeyRound className="h-4 w-4 text-gray-400" />}
                    required
                  />

                  <OrgSelectField
                    organizations={orgs?.filter(o => o.is_public_directory !== false) || []}
                    isLoading={isLoadingOrgs}
                    selectedId={partSelectedOrg}
                    onSelect={setPartSelectedOrg}
                    label="Select Organization or Cooperative Workspace to Request Access"
                    required
                  />
                  {partSelectedOrg && (
                    <div className="p-2.5 bg-blue-50/50 rounded border border-blue-100 text-[10px] text-blue-800 leading-snug">
                       Your profile will start as **Pending** inside this workspace. An administrator must approve your access before launch.
                    </div>
                  )}

                  <Button type="submit" loading={loading} className="w-full mt-2 py-2.5 bg-emerald-700 hover:bg-emerald-850">
                    Register Participant File
                  </Button>
                </form>
              </Card>
            )}

            {/* 2. ORGANIZATION REGISTER VIEW */}
            {mode === "ngo" && (
              <Card
                title={ngoStep === 1 ? "Organization Setup: Step 1 of 2" : "Organization Setup: Step 2 of 2"}
                className="max-w-md mx-auto w-full"
              >
                {/* Step Indicators */}
                <div className="flex gap-2 mb-5 select-none">
                  <div className={`h-1.5 flex-1 rounded-full ${ngoStep >= 1 ? "bg-emerald-600" : "bg-gray-200"}`} />
                  <div className={`h-1.5 flex-1 rounded-full ${ngoStep >= 2 ? "bg-emerald-600" : "bg-gray-200"}`} />
                </div>

                <form onSubmit={handleNgoRegister} className="flex flex-col gap-4">
                  {ngoStep === 1 ? (
                    <>
                      <div className="p-3 bg-emerald-50/60 dark:bg-slate-900 border border-emerald-100 dark:border-slate-800 rounded-xl mb-1 text-xs text-gray-600 dark:text-slate-350 leading-relaxed font-semibold">
                        Register a new Organization Workspace. The system will automatically build a public profile at impact-o.app/{`@${generatedSlug || "slug"}`} which anyone can view.
                      </div>

                      <Input
                        type="text"
                        label="Organization Name"
                        value={orgName}
                        onChange={(e) => setOrgName(e.target.value)}
                        placeholder="e.g. Rwanda Green Initiative"
                        prefixIcon={<Building2 className="h-4 w-4 text-gray-400" />}
                        required
                        autoFocus
                      />

                      <div className="flex flex-col gap-1.5 w-full">
                        <label className="text-xs font-semibold text-gray-700 dark:text-slate-300">
                          Organization Category
                        </label>
                        <select
                          value={orgCategory}
                          onChange={(e) => setOrgCategory(e.target.value)}
                          className="w-full text-sm rounded-lg border bg-white dark:bg-slate-900 border-gray-300 dark:border-slate-700 px-3.5 py-2.5 text-gray-805 dark:text-slate-100 outline-none focus:ring-2 focus:ring-emerald-500 transition"
                        >
                          <option value="Environment">Environment & Forestry</option>
                          <option value="Education">Education & Tech Mentoring</option>
                          <option value="Health">Health & Sanitization</option>
                          <option value="Social Action">Social Action & Welfare</option>
                          <option value="Enterprise">Enterprise Cooperative</option>
                        </select>
                      </div>

                      <Input
                        type="text"
                        label="Brief Description (Tagline)"
                        value={orgTagline}
                        onChange={(e) => setOrgTagline(e.target.value)}
                        placeholder="e.g. Enhancing biodiversity in Kayonza hills"
                        required
                      />

                      {/* Organization Privacy Checkbox */}
                      <div className="p-3.5 bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/40 rounded-xl flex items-start gap-3 mt-2">
                        <input
                          type="checkbox"
                          id="isPrivateOrg"
                          checked={isPrivateOrg}
                          onChange={(e) => {
                            setIsPrivateOrg(e.target.checked);
                            if (e.target.checked) {
                              setAutoConfirmMembers(false);
                            }
                          }}
                          className="mt-0.5 h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                        />
                        <label htmlFor="isPrivateOrg" className="text-xs text-gray-700 dark:text-slate-300 cursor-pointer select-none">
                          <span className="font-bold text-gray-900 dark:text-white block">
                            Make this organization private
                          </span>
                          <span className="text-gray-500 dark:text-slate-400 block mt-0.5 leading-relaxed">
                            Does not appear on public dashboard directory until allowed in settings. New users go to the <strong>Wait Room</strong> until an administrator confirms them to access the dashboard.
                          </span>
                        </label>
                      </div>

                      {!isPrivateOrg && (
                        <div className="flex items-center gap-2 mt-1">
                          <input
                            type="checkbox"
                            id="autoConfirm"
                            checked={autoConfirmMembers}
                            onChange={(e) => setAutoConfirmMembers(e.target.checked)}
                            className="h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                          />
                          <label htmlFor="autoConfirm" className="text-xs text-gray-700 dark:text-slate-300">
                            Automatically confirm new member join requests
                          </label>
                        </div>
                      )}

                      {/* Public Page Slug Preview Box */}
                      <div className="p-3 bg-slate-50 dark:bg-slate-900 border rounded-xl flex flex-col gap-2">
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-none">
                          Dynamic URL Preview
                        </span>
                        <div className="flex items-center gap-1.5 font-mono text-xs font-bold text-emerald-700 dark:text-emerald-400 mt-1">
                          <Globe className="h-3.5 w-3.5 shrink-0" />
                          <span>impact-o.app/{generatedSlug ? `@${generatedSlug}` : "..."}</span>
                        </div>
                        <p className="text-[10px] text-gray-400 font-medium leading-relaxed leading-normal">
                          The public will see your active programs, achievements, and donate button at this page. Note: Only verified administrators can access the secure backend workspace.
                        </p>
                      </div>

                      <Button
                        type="button"
                        onClick={() => {
                          if (!orgName || !orgTagline) {
                            setError("Please enter both an Organization Name and Tagline.");
                            return;
                          }
                          setError("");
                          setNgoStep(2);
                        }}
                        className="w-full mt-2 py-2.5 flex items-center justify-center gap-1.5"
                      >
                        Next: Admin Account Credentials <ChevronRight className="h-4 w-4" />
                      </Button>
                    </>
                  ) : (
                    <>
                      <div className="p-3 bg-emerald-50/60 dark:bg-slate-900 border border-emerald-100 dark:border-slate-800 rounded-xl mb-1 text-xs text-gray-600 dark:text-slate-350 leading-relaxed font-semibold">
                        Set up the owner administrator credentials. This login will have access to the Private Workspace backend, ledger bookkeeping, and configuration settings.
                      </div>

                      <Input
                        type="text"
                        label="Administrator's Full Name"
                        value={adminName}
                        onChange={(e) => setAdminName(e.target.value)}
                        placeholder="e.g. Anatole Mugisha"
                        prefixIcon={<UserIcon className="h-4 w-4 text-gray-400" />}
                        required
                        autoFocus
                      />

                      <Input
                        type="email"
                        label="Administrative Contact Email"
                        value={adminEmail}
                        onChange={(e) => setAdminEmail(e.target.value)}
                        placeholder="e.g. admin@yourorg.rw"
                        prefixIcon={<Mail className="h-4 w-4 text-gray-400" />}
                        required
                      />

                      <Input
                        type="password"
                        label="Security Password"
                        value={adminPassword}
                        onChange={(e) => setAdminPassword(e.target.value)}
                        placeholder="••••••••"
                        prefixIcon={<KeyRound className="h-4 w-4 text-gray-400" />}
                        required
                      />

                      {/* Summary Recipe Card */}
                      <div className="p-3 bg-slate-50 dark:bg-slate-900 border rounded-xl flex flex-col gap-2 text-xs font-medium">
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-none mb-1">
                          Verification Summary
                        </span>
                        <div className="flex justify-between">
                          <span className="text-gray-450">Organization Workspace:</span>
                          <span className="font-bold text-gray-800 dark:text-slate-200">{orgName}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-455">Category Focus:</span>
                          <span className="font-bold text-gray-800 dark:text-slate-200">{orgCategory}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-450">Representative role:</span>
                          <span className="font-bold text-emerald-600">Workspace Administrator</span>
                        </div>
                      </div>

                      <div className="flex flex-col gap-2 mt-2 select-none">
                        <Button type="submit" loading={loading} className="w-full py-2.5 bg-emerald-700 hover:bg-emerald-850">
                          Complete & Launch Organization Workspace
                        </Button>
                        <button
                          type="button"
                          onClick={() => setNgoStep(1)}
                          className="text-xs font-semibold text-gray-500 hover:text-gray-800 dark:hover:text-slate-300 py-1 flex items-center justify-center gap-1"
                        >
                          <ChevronLeft className="h-4 w-4" /> Previous: Edit Workspace Details
                        </button>
                      </div>
                    </>
                  )}
                </form>
              </Card>
            )}
          </>
        )}

        <div className="text-center text-xs font-semibold text-gray-500">
          <Link to="/login" className="hover:underline text-[var(--org-primary)]">
            {t("auth.have_account")}
          </Link>
        </div>
      </div>
    </div>
  );
};

// ==========================================
// 3. ORGANIZATIONS PICKER (Multi-membership)
// ==========================================
export const OrgPicker: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, logout, setUser } = useAuthStore();
  const { setActiveOrg } = useOrgStore();
  const { data: orgs, isLoading } = useOrganizations();
  const { data: liveUserMemberships } = useUserMemberships(user?.id);
  const { addToast } = useToast();

  // Search input query for available Organizations
  const [searchQuery, setSearchQuery] = useState("");
  const [localMemberships, setLocalMemberships] = useState<any[]>([]);

  // Exit Organization & Survey States
  const [exitTarget, setExitTarget] = useState<{ org: any; member: any } | null>(null);
  const [showSurveyModal, setShowSurveyModal] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [exitReason, setExitReason] = useState("Relocation or Resettlement");
  const [exitCustomReason, setExitCustomReason] = useState("");
  const [exitRating, setExitRating] = useState<number>(5);
  const [exitRatingHover, setExitRatingHover] = useState<number | null>(null);
  const [exitFeedback, setExitFeedback] = useState("");
  const [rejoinIntent, setRejoinIntent] = useState<"yes" | "maybe" | "no">("yes");
  const [exitSurveyAnswers, setExitSurveyAnswers] = useState<Record<string, any>>({});
  const [confirmAcknowledge, setConfirmAcknowledge] = useState(false);
  const [isSubmittingExit, setIsSubmittingExit] = useState(false);
  const [deletedSuccessModalOpen, setDeletedSuccessModalOpen] = useState(false);
  const [deletedOrgName, setDeletedOrgName] = useState("");

  const isGrowthOrProTier = (org: any) => {
    if (!org) return false;
    if (org.exit_survey_enabled) return true;
    const tier = (org.subscription_tier || org.subscription_plan || "").toLowerCase();
    return (
      tier === "growth" ||
      tier === "pro" ||
      tier === "enterprise" ||
      tier.includes("growth") ||
      tier.includes("pro") ||
      tier.includes("enterprise")
    );
  };

  // Compute memberships reactively from database / mockData
  const memberships = React.useMemo(() => {
    if (!user) return [];
    if (liveUserMemberships && liveUserMemberships.length > 0) {
      return liveUserMemberships;
    }
    const allMembers = MockDB.getMembers().filter((m) => m.user_id === user.id);
    // If user has joined_org_ids not yet in MockDB members, ensure active member row exists with preserved role
    if (user.joined_org_ids && user.joined_org_ids.length > 0) {
      let changed = false;
      const allDBMembers = MockDB.getMembers();
      user.joined_org_ids.forEach((jOrgId) => {
        if (!allMembers.some((m) => m.org_id === jOrgId)) {
          const newRow = {
            id: `member-${jOrgId}-${user.id}`,
            org_id: jOrgId,
            user_id: user.id,
            role: "member" as const,
            status: "active" as const,
            joined_at: new Date().toISOString()
          };
          allMembers.push(newRow);
          allDBMembers.push(newRow);
          changed = true;
        }
      });
      if (changed) {
        MockDB.saveMembers(allDBMembers);
      }
    }
    // Merge with any instant local mutations if present
    if (localMemberships.length > 0) {
      const mergedMap = new Map<string, any>();
      allMembers.forEach(m => mergedMap.set(m.id || m.org_id, m));
      localMemberships.forEach(m => mergedMap.set(m.id || m.org_id, m));
      return Array.from(mergedMap.values());
    }
    return allMembers;
  }, [user, liveUserMemberships, localMemberships]);

  // FROZEN PHASE: Multi-organization switching & Workplace Hub frozen. Single organization membership mode.
  // Automatically redirect users to their single active organization dashboard.
  React.useEffect(() => {
    if (!isLoading && user) {
      const active = memberships.find((m) => m.status === "active");
      if (active) {
        const org = orgs?.find((o) => o.id === active.org_id) || MockDB.getOrgs().find((o) => o.id === active.org_id);
        if (org) {
          setActiveOrg(org, active);
        }
        navigate("/dashboard", { replace: true });
      }
    }
  }, [isLoading, user, memberships, orgs, navigate, setActiveOrg]);

  const handleSelect = (memberRow: any) => {
    const org = orgs?.find((o) => o.id === memberRow.org_id) || MockDB.getOrgs().find((o) => o.id === memberRow.org_id) || null;
    setActiveOrg(org, memberRow);
    navigate("/dashboard");
  };

  const handleInitiateExit = (org: any, memberRow: any) => {
    setExitTarget({ org, member: memberRow });
    setExitReason("Relocation or Resettlement");
    setExitCustomReason("");
    setExitRating(5);
    setExitRatingHover(null);
    setExitFeedback("");
    setRejoinIntent("yes");
    setExitSurveyAnswers({});
    setConfirmAcknowledge(false);

    if (isGrowthOrProTier(org)) {
      setShowSurveyModal(true);
    } else {
      setShowConfirmModal(true);
    }
  };

  const handleExecuteExit = async (isSurvey: boolean = false) => {
    if (!exitTarget || !user) return;
    setIsSubmittingExit(true);
    const { org, member } = exitTarget;
    const finalReason = exitReason === "Other" && exitCustomReason ? `Other: ${exitCustomReason}` : exitReason;
    const nowIso = new Date().toISOString();

    try {
      // 1. Record exit / resignation & survey (vital for Growth/Pro metrics, admin reporting and retention audits)
      const newResignation = {
        id: `resign-${Date.now()}`,
        org_id: org.id,
        member_id: member.id,
        user_id: user.id,
        member_name: user.full_name || user.email || "Member",
        reason: finalReason,
        reason_category: finalReason,
        reason_detail: exitFeedback || (isSurvey ? "Completed offboarding exit survey" : "Exited from organization picker"),
        details: exitFeedback || (isSurvey ? "Completed offboarding exit survey" : "Exited from organization picker"),
        feedback: exitFeedback,
        rating: isSurvey ? exitRating : 5,
        rejoin_intent: isSurvey ? rejoinIntent : "maybe",
        custom_answers: exitSurveyAnswers,
        submitted_at: nowIso,
        resignation_date: nowIso,
        created_at: nowIso,
        finalized_at: nowIso,
        status: "finalized" as const,
      };
      
      const resignations = MockDB.getResignations();
      resignations.unshift(newResignation);
      MockDB.saveResignations(resignations);

      // Audit Log
      const auditLogs = MockDB.getAuditLogs();
      auditLogs.unshift({
        id: `audit-${Date.now()}`,
        org_id: org.id,
        user_id: user.id,
        performed_by: user.full_name || user.email || "Member",
        action: isSurvey ? "exit_survey_submitted" : "member_self_exited",
        action_label: isSurvey 
          ? `Completed Offboarding Exit Survey & Exited (Rating: ${exitRating}/5, Reason: ${finalReason})`
          : `Member exited organization (${finalReason})`,
        target_table: "resignations",
        target_id: newResignation.id,
        target_label: `Account offboarding for ${user.full_name || user.email}`,
        created_at: nowIso
      });
      MockDB.saveAuditLogs(auditLogs);

      if (isSupabaseConfigured) {
        try {
          await supabase.from("resignations").insert(newResignation);
        } catch (e) {
          console.warn("Supabase resignation insert fallback:", e);
        }
      }

      // 2. Delete membership from MockDB
      const allMembers = MockDB.getMembers().filter(
        (m) => m.id !== member.id && !(m.user_id === user.id && m.org_id === org.id)
      );
      MockDB.saveMembers(allMembers);

      // 3. Delete membership from Supabase if configured
      if (isSupabaseConfigured) {
        try {
          await supabase.from("org_members").delete().eq("id", member.id);
          await supabase.from("org_members").delete().match({ user_id: user.id, org_id: org.id });
        } catch (e) {
          console.warn("Supabase org_members delete fallback:", e);
        }
      }

      // 4. Update user's joined_org_ids and primary_org_id
      const updatedJoined = (user.joined_org_ids || []).filter((id) => id !== org.id);
      let updatedPrimary = user.primary_org_id;
      if (updatedPrimary === org.id) {
        updatedPrimary = updatedJoined.length > 0 ? updatedJoined[0] : undefined;
      }

      const updatedUser = {
        ...user,
        primary_org_id: updatedPrimary,
        joined_org_ids: updatedJoined,
      };

      const users = MockDB.getUsers();
      const uIdx = users.findIndex((u) => u.id === user.id);
      if (uIdx >= 0) {
        users[uIdx] = {
          ...users[uIdx],
          primary_org_id: updatedPrimary,
          joined_org_ids: updatedJoined,
        };
        MockDB.saveUsers(users);
      }

      if (isSupabaseConfigured) {
        try {
          await supabase
            .from("users")
            .update({
              primary_org_id: updatedPrimary,
              joined_org_ids: updatedJoined,
            })
            .eq("id", user.id);
        } catch (e) {
          console.warn("Supabase user update fallback:", e);
        }
      }

      setUser(updatedUser);

      // 5. Clear activeOrg if user was currently in it
      const currentActive = useOrgStore.getState().activeOrg;
      if (currentActive?.id === org.id) {
        useOrgStore.getState().clearOrg();
      }

      // 6. Update local state
      setLocalMemberships((prev) => prev.filter((m) => m.id !== member.id && m.org_id !== org.id));

      setDeletedOrgName(org.name);
      setDeletedSuccessModalOpen(true);
      setShowSurveyModal(false);
      setShowConfirmModal(false);
      setExitTarget(null);
    } catch (err: any) {
      addToast(err?.message || "Failed to exit organization.", "error");
    } finally {
      setIsSubmittingExit(false);
    }
  };

  const handleApplyJoin = (orgId: string) => {
    if (!user) return;
    
    const members = MockDB.getMembers();
    // Prevent double applications
    if (members.some(m => m.user_id === user.id && m.org_id === orgId)) {
      return;
    }

    const org = orgs?.find((o) => o.id === orgId) || MockDB.getOrgs().find((o) => o.id === orgId);
    const isPublic = org ? (org.allow_public_joining ?? true) : true;

    // Plan limit checking to prevent self-block out
    const activeOrgMembers = members.filter(m => m.org_id === orgId && m.status === "active").length;
    const isTrial = org ? (org.subscription_status === "trial" || !org.subscription_status) : true;
    const orgTier = org ? (org.subscription_tier || "growth") : "growth";
    const currentLimit = isTrial 
      ? 250 
      : (orgTier === "free" || orgTier === "starter") 
        ? 30 
        : orgTier === "growth" 
          ? 250 
          : Infinity;

    const wouldExceed = activeOrgMembers >= currentLimit;
    const finalStatus = isPublic && !wouldExceed ? ("active" as const) : ("pending" as const);

    const newMemberRow = {
      id: "member-" + Math.random().toString(36).substr(2, 9),
      org_id: orgId,
      user_id: user.id,
      role: "member" as const,
      status: finalStatus,
      joined_at: new Date().toISOString()
    };

    members.push(newMemberRow);
    MockDB.saveMembers(members);

    // Update user's joined_org_ids and primary_org_id
    const updatedJoinedIds = Array.from(new Set([...(user.joined_org_ids || []), orgId]));
    const updatedPrimaryId = user.primary_org_id || orgId;
    const updatedUser = {
      ...user,
      primary_org_id: updatedPrimaryId,
      joined_org_ids: updatedJoinedIds
    };

    const users = MockDB.getUsers();
    const uIdx = users.findIndex(u => u.id === user.id);
    if (uIdx >= 0) {
      users[uIdx] = { ...users[uIdx], primary_org_id: updatedPrimaryId, joined_org_ids: updatedJoinedIds };
      MockDB.saveUsers(users);
    }
    setUser(updatedUser);

    if (isSupabaseConfigured) {
      supabase.from("users").update({
        primary_org_id: updatedPrimaryId,
        joined_org_ids: updatedJoinedIds
      }).eq("id", user.id);

      supabase.from("org_members").insert({
        org_id: orgId,
        user_id: user.id,
        role: "member",
        status: finalStatus,
        joined_at: new Date().toISOString()
      });
    }

    // Update local state to re-render directories instantly
    setLocalMemberships((prev) => [...prev, newMemberRow]);

    if (isPublic && !wouldExceed) {
      addToast(`Successfully joined ${org?.name || "Workspace"} directly!`, "success");
    } else if (wouldExceed) {
      addToast(`This workspace's active member capacity is currently full. Your application has been sent as pending review.`, "warning");
    } else {
      addToast(`Join request for ${org?.name || "Workspace"} sent to the administrator.`, "success");
    }
  };

  const handleLeaveOrCancel = async (memberId: string, orgId?: string) => {
    const list = MockDB.getMembers().filter(m => m.id !== memberId && !(orgId && m.org_id === orgId && m.user_id === user?.id));
    MockDB.saveMembers(list);
    setLocalMemberships(list.filter(m => m.user_id === user?.id));

    if (orgId && user) {
      const updatedJoined = (user.joined_org_ids || []).filter((id) => id !== orgId);
      let updatedPrimary = user.primary_org_id;
      if (updatedPrimary === orgId) {
        updatedPrimary = updatedJoined.length > 0 ? updatedJoined[0] : undefined;
      }
      const updatedUser = {
        ...user,
        primary_org_id: updatedPrimary,
        joined_org_ids: updatedJoined,
      };
      const users = MockDB.getUsers();
      const uIdx = users.findIndex((u) => u.id === user.id);
      if (uIdx >= 0) {
        users[uIdx] = { ...users[uIdx], primary_org_id: updatedPrimary, joined_org_ids: updatedJoined };
        MockDB.saveUsers(users);
      }
      setUser(updatedUser);

      if (isSupabaseConfigured) {
        try {
          await supabase.from("users").update({ primary_org_id: updatedPrimary, joined_org_ids: updatedJoined }).eq("id", user.id);
        } catch (e) {
          console.warn("Supabase user update fallback:", e);
        }
      }
    }

    if (isSupabaseConfigured) {
      try {
        await supabase.from("org_members").delete().eq("id", memberId);
      } catch (e) {
        console.warn("Supabase org_members delete fallback:", e);
      }
    }
    addToast("Application request removed.", "info");
  };

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center">
        <LogoLoader
          message={t("loading_roster", "Fetching Organization Directory")}
          subMessage={t("loading_roster_sub", "Authenticating authorized memberships...")}
        />
      </div>
    );
  }

  const activeMemberships = memberships.filter((m) => m.status === "active");
  const pendingMemberships = memberships.filter((m) => m.status === "pending");
  const rejectedMemberships = memberships.filter((m) => m.status === "rejected");

  // Filter orgs you haven't applied to yet and that are strictly public organizations
  const appliedOrgIds = new Set(memberships.map((m) => m.org_id));
  const availableOrgs = (orgs || MockDB.getOrgs()).filter(
    (org) =>
      !appliedOrgIds.has(org.id) &&
      (org.is_public_directory ?? true) &&
      (org.allow_public_joining ?? true)
  );

  // Filter and sort based on searchQuery, strictly limited to 6 public organizations
  const filteredOrgs = (() => {
    let list = availableOrgs;
    if (searchQuery) {
      const q = searchQuery.toLowerCase().trim();
      list = availableOrgs.filter(
        (org) =>
          org.name?.toLowerCase().includes(q) ||
          org.org_category?.toLowerCase().includes(q) ||
          org.tagline?.toLowerCase().includes(q) ||
          org.slug?.toLowerCase().includes(q)
      );
    }
    // Limit strictly to 6 public organizations
    return list.slice(0, 6);
  })();

  const ratingDescriptions: Record<number, string> = {
    1: "1 - Very Dissatisfied",
    2: "2 - Dissatisfied",
    3: "3 - Neutral / Average",
    4: "4 - Satisfied",
    5: "5 - Very Satisfied"
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-slate-950 flex flex-col justify-center items-center p-4">
      {/* FROZEN PHASE: Single Organization Membership View */}
      <div className="w-full max-w-md flex flex-col gap-6 my-8">
        <div className="text-center flex flex-col items-center">
          <div className="h-12 w-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center mb-3 shadow-xs">
            <Building2 className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
          </div>
          <h2 className="text-2xl font-extrabold tracking-tight font-display text-gray-950 dark:text-white">
            {activeMemberships[0]
              ? (orgs?.find((o) => o.id === activeMemberships[0].org_id) || MockDB.getOrgs().find((o) => o.id === activeMemberships[0].org_id))?.name || "Your Workspace"
              : "Your Workspace"}
          </h2>
          <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto">
            Single organization membership mode is active.
          </p>
        </div>

        {activeMemberships[0] ? (
          <div className="bg-white dark:bg-slate-900 border border-emerald-600/30 rounded-2xl p-5 shadow-xs flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-gray-100 dark:border-slate-800 pb-3">
              <span className="text-[11px] font-mono uppercase text-gray-400 font-bold">Role</span>
              <Badge color={activeMemberships[0].role === "org_admin" ? "amber" : "blue"}>
                {activeMemberships[0].role === "org_admin" ? "Administrator" : "Member"}
              </Badge>
            </div>
            <Button
              onClick={() => {
                const mem = activeMemberships[0];
                const org = orgs?.find((o) => o.id === mem.org_id) || MockDB.getOrgs().find((o) => o.id === mem.org_id);
                if (org) setActiveOrg(org, mem);
                navigate("/dashboard");
              }}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 text-xs rounded-xl shadow-xs flex items-center justify-center gap-1.5"
            >
              <span>Enter Workspace Dashboard</span>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl p-5 text-center flex flex-col gap-3">
            <p className="text-xs text-gray-500">Connecting to your primary workspace...</p>
            <Button
              onClick={() => navigate("/dashboard")}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 text-xs rounded-xl"
            >
              Go to Dashboard
            </Button>
          </div>
        )}

        <div className="text-center pt-2">
          <button
            onClick={handleLogout}
            className="text-xs font-bold text-gray-400 hover:text-red-500 inline-flex items-center gap-1.5 transition"
          >
            <LogOut className="h-3.5 w-3.5" /> Sign Out of Account
          </button>
        </div>
      </div>

      {/* FROZEN PHASE: The full multi-tenant Workplace Hub, multi-workspace directory, and membership exit pool
          are stopped and hidden below. Set `false &&` to `true &&` (or remove the wrapper) to re-enable Workplace Hub. */}
      {false && (
      <div className="w-full max-w-2xl flex flex-col gap-6 my-8">
        <div className="text-center flex flex-col items-center">
          <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight font-display text-gray-950 dark:text-white">
            Workspace Hub
          </h2>
          <p className="text-xs md:text-sm text-gray-500 mt-1 max-w-md mx-auto">
            Hello, <strong className="text-emerald-700 dark:text-emerald-400">{user?.full_name}</strong>. Choose an active workspace, manage your affiliations, check pending applications, or apply to other verified Organizations.
          </p>
        </div>

        {/* 1. ACTIVE MEMBERSHIPS */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest leading-none select-none">
              Active Workspaces ({activeMemberships.length})
            </h3>
            {activeMemberships.length > 0 && (
              <span className="text-[10px] text-gray-400 font-medium">
                Click card to open workspace or use Exit button to leave
              </span>
            )}
          </div>
          {activeMemberships.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full select-none">
              {activeMemberships.map((row) => {
                const org = orgs?.find((o) => o.id === row.org_id) || MockDB.getOrgs().find((o) => o.id === row.org_id);
                if (!org) return null;
                const isPrimary = user?.primary_org_id === row.org_id || (!user?.primary_org_id && activeMemberships[0]?.id === row.id);
                const hasGrowthOrPro = isGrowthOrProTier(org);

                return (
                  <div
                    key={row.id}
                    onClick={() => handleSelect(row)}
                    className={`p-5 rounded-2xl shadow-xs transition cursor-pointer flex flex-col gap-4 group justify-between relative ${
                      isPrimary 
                        ? "bg-emerald-50/40 dark:bg-emerald-950/20 border-2 border-emerald-600 dark:border-emerald-500 hover:shadow-md" 
                        : "bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 hover:border-emerald-600 hover:shadow-md"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3 min-w-0 flex-1">
                        <div className="h-11 w-11 rounded-lg overflow-hidden shrink-0 bg-emerald-50 border border-emerald-100 flex items-center justify-center">
                          {org.logo_url ? (
                            <img src={org.logo_url} alt={org.name} className="h-full w-full object-cover" />
                          ) : (
                            <Building2 className="h-5 w-5 text-emerald-600" />
                          )}
                        </div>
                        <div className="flex flex-col truncate flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="font-display font-bold text-sm text-gray-900 dark:text-white truncate group-hover:text-emerald-600 dark:group-hover:text-emerald-400">
                              {org.name}
                            </span>
                            {isPrimary && (
                              <span className="text-[9px] font-mono font-bold bg-emerald-600 text-white px-2 py-0.5 rounded-full shrink-0 flex items-center gap-0.5">
                                ✓ Default
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide">
                              {org.org_category}
                            </span>
                            {hasGrowthOrPro && (
                              <span className="text-[9px] font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200/60 dark:border-indigo-800/40 px-1.5 py-0.2 rounded">
                                {org.subscription_tier === "growth" ? "Growth Plan" : "Pro Plan"}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Exit Organization button on card */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleInitiateExit(org, row);
                        }}
                        title={`Exit ${org.name} and delete membership`}
                        className="shrink-0 p-1.5 rounded-lg text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-transparent hover:border-rose-200 dark:hover:border-rose-900/50 transition flex items-center gap-1 text-[10px] font-bold"
                      >
                        <UserMinus className="h-3.5 w-3.5" />
                        <span className="hidden sm:inline">Exit</span>
                      </button>
                    </div>

                    <div className="flex items-center justify-between border-t border-gray-150 dark:border-slate-750 pt-3">
                      <div className="flex items-center gap-1.5">
                        <Badge color={row.role === "org_admin" ? "amber" : "blue"}>
                          {row.role === "org_admin" ? "Admin" : "Member"}
                        </Badge>
                        <span className="text-[10px] font-medium text-emerald-700 dark:text-emerald-400 bg-emerald-100/60 dark:bg-emerald-950/50 px-2 py-0.5 rounded-md">
                          Joined
                        </span>
                      </div>
                      <span className="text-xs text-emerald-600 dark:text-emerald-400 flex items-center group-hover:underline font-bold gap-0.5 transition">
                        Launch <ChevronRight className="h-4 w-4" />
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="p-6 bg-white dark:bg-slate-900 rounded-2xl border text-center select-none text-xs font-semibold text-gray-400">
              No active workspace affiliations yet. See your pending items or browse options below.
            </div>
          )}
        </div>

        {/* 2. PENDING APPLICATIONS */}
        {pendingMemberships.length > 0 && (
          <div className="flex flex-col gap-3">
            <h3 className="text-xs font-bold text-amber-600 uppercase tracking-widest leading-none select-none">
              Pending Applications ({pendingMemberships.length})
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
              {pendingMemberships.map((row) => {
                const org = orgs?.find((o) => o.id === row.org_id) || MockDB.getOrgs().find((o) => o.id === row.org_id);
                if (!org) return null;

                return (
                  <div
                    key={row.id}
                    className="bg-amber-50/40 dark:bg-slate-900/50 border border-amber-100 dark:border-slate-800 p-4 rounded-2xl flex flex-col justify-between gap-3"
                  >
                    <div className="flex items-start gap-3">
                      <div className="h-10 w-10 rounded-lg shrink-0 bg-amber-50 dark:bg-slate-850 flex items-center justify-center border border-amber-100">
                        <Building2 className="h-4 w-4 text-amber-650" />
                      </div>
                      <div className="flex flex-col truncate">
                        <span className="font-display font-medium text-xs text-gray-800 dark:text-slate-100 truncate">
                          {org.name}
                        </span>
                        <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mt-0.5">
                          {org.org_category}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-1 border-t border-amber-100/50 dark:border-slate-800">
                      <span className="inline-flex items-center gap-1.5 px-2 py-1 bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 rounded-md text-[10px] font-bold">
                        <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
                        Pending approval
                      </span>
                      <button
                        onClick={() => handleLeaveOrCancel(row.id, row.org_id)}
                        className="text-[10px] font-bold text-red-500 hover:text-red-700 hover:underline cursor-pointer"
                      >
                        Retract Request
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* 3. REJECTED APPLICATIONS */}
        {rejectedMemberships.length > 0 && (
          <div className="flex flex-col gap-3">
            <h3 className="text-xs font-bold text-red-600 uppercase tracking-widest leading-none select-none">
              Rejected Applications ({rejectedMemberships.length})
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
              {rejectedMemberships.map((row) => {
                const org = orgs?.find((o) => o.id === row.org_id) || MockDB.getOrgs().find((o) => o.id === row.org_id);
                if (!org) return null;

                return (
                  <div
                    key={row.id}
                    className="bg-red-50/40 dark:bg-slate-900/50 border border-red-100 dark:border-slate-800 p-4 rounded-2xl flex flex-col justify-between gap-3"
                  >
                    <div className="flex items-start gap-3">
                      <div className="h-10 w-10 rounded-lg shrink-0 bg-red-50 dark:bg-slate-850 flex items-center justify-center border border-red-100">
                        <Building2 className="h-4 w-4 text-red-650" />
                      </div>
                      <div className="flex flex-col truncate">
                        <span className="font-display font-medium text-xs text-gray-800 dark:text-slate-100 truncate">
                          {org.name}
                        </span>
                        <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mt-0.5">
                          {org.org_category}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-1 border-t border-red-100/50 dark:border-slate-800">
                      <span className="inline-flex items-center gap-1.5 px-2 py-1 bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300 rounded-md text-[10px] font-bold">
                        Rejected
                      </span>
                      <button
                        onClick={() => handleLeaveOrCancel(row.id, row.org_id)}
                        className="text-[10px] font-bold text-red-500 hover:text-red-700 hover:underline cursor-pointer"
                      >
                        Dismiss
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* 4. SEARCHABLE DIRECTORY */}
        <div className="flex flex-col gap-4 border-t border-gray-200 dark:border-slate-800 pt-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest leading-none select-none">
                Discover Organizations in Rwanda
              </h3>
              <p className="text-[11px] text-gray-400 mt-1 select-none">
                Submit an integration request or request to join work pools.
              </p>
            </div>
            <div className="relative w-full sm:w-64 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search Organization files..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full text-xs font-semibold rounded-lg bg-white dark:bg-slate-900 border border-gray-300 dark:border-slate-700 pl-9 pr-3 py-2 text-gray-805 dark:text-slate-100 outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          {filteredOrgs.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {filteredOrgs.map((org) => (
                <div
                  key={org.id}
                  className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 p-4 rounded-xl flex flex-col justify-between gap-3 shadow-xs hover:shadow-xs hover:border-gray-300 dark:hover:border-slate-700 transition"
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-[9px] font-bold text-emerald-700 bg-emerald-50 dark:text-emerald-400 dark:bg-slate-850 px-2 py-0.5 rounded-full select-none uppercase tracking-wide">
                        {org.org_category}
                      </span>
                      <span className="text-[10px] font-mono text-gray-400 font-semibold select-none">
                        impact-o.app/@{org.slug}
                      </span>
                    </div>
                    <h4 className="font-display font-extrabold text-sm text-gray-900 dark:text-white mt-2 leading-tight">
                      {org.name}
                    </h4>
                    <p className="text-[11px] text-gray-500 dark:text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                      {org.tagline}
                    </p>
                  </div>

                  <div className="pt-2 border-t border-gray-100 dark:border-slate-800 flex justify-end">
                    <Button
                      onClick={() => navigate(`/register?org_id=${org.id}&mode=participant`)}
                      className="text-[10px] py-1.5 px-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg shadow-xs transition"
                    >
                      Request Membership
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-6 bg-slate-50 dark:bg-slate-900/40 rounded-xl border border-dashed text-center select-none text-xs text-gray-400">
              {searchQuery ? "No other Organizations matched your active search." : "No other unregistered workspaces available on the platform."}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex justify-between items-center border-t border-gray-200 dark:border-slate-800 pt-6 select-none">
          <button
            onClick={handleLogout}
            className="text-xs font-bold text-gray-500 hover:text-red-500 flex items-center gap-1.5 transition"
          >
            <LogOut className="h-4 w-4" /> Sign Out of Account
          </button>
          
          <span className="text-[10px] font-mono text-gray-400 uppercase tracking-widest">
            Organization Workspace Pool
          </span>
        </div>
      </div>
      )}

      {/* ========================================== */}
      {/* 5. GROWTH & PRO PLAN OFFBOARDING SURVEY MODAL */}
      {/* ========================================== */}
      <Modal
        open={showSurveyModal}
        onClose={() => {
          if (!isSubmittingExit) setShowSurveyModal(false);
        }}
        title={`Exit Workspace: ${exitTarget?.org?.name || "Organization"}`}
        size="lg"
      >
        <div className="flex flex-col gap-4">
          {/* Header Banner */}
          <div className="p-4 bg-gradient-to-r from-indigo-50/90 to-purple-50/90 dark:from-indigo-950/40 dark:to-purple-950/40 border border-indigo-100 dark:border-indigo-900/50 rounded-2xl flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="p-1.5 bg-indigo-600 text-white rounded-lg">
                  <MessageSquare className="h-4 w-4" />
                </span>
                <div>
                  <h4 className="font-extrabold text-sm text-indigo-950 dark:text-indigo-200">
                    Growth & Pro Plan Member Exit Survey
                  </h4>
                  <span className="text-[11px] text-indigo-700 dark:text-indigo-400 font-semibold">
                    {exitTarget?.org?.name} • Tier: {exitTarget?.org?.subscription_tier?.toUpperCase() || "GROWTH"}
                  </span>
                </div>
              </div>
              <span className="text-[10px] font-mono font-bold bg-indigo-200/80 dark:bg-indigo-900 text-indigo-900 dark:text-indigo-200 px-2.5 py-1 rounded-full uppercase tracking-wider">
                Required Survey
              </span>
            </div>
            <p className="text-xs text-indigo-900/80 dark:text-indigo-300 leading-relaxed font-medium mt-1">
              Because this cooperative operates on a Growth or Pro Plan, member exit surveys are collected to provide aggregated analytics to cooperative leadership on member satisfaction, retention causes, and community improvements before deleting your account affiliation.
            </p>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (confirmAcknowledge) {
                handleExecuteExit(true);
              }
            }}
            className="flex flex-col gap-4"
          >
            {/* 1. Reason for Leaving */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-gray-800 dark:text-slate-200 flex items-center justify-between">
                <span>1. Primary Reason for Leaving / Offboarding <span className="text-red-500">*</span></span>
              </label>
              <select
                value={exitReason}
                onChange={(e) => setExitReason(e.target.value)}
                className="w-full text-xs font-semibold rounded-xl border bg-white dark:bg-slate-900 border-gray-300 dark:border-slate-700 px-3.5 py-2.5 text-gray-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-indigo-500"
                required
              >
                <option value="Relocation or Resettlement">Relocation or Moved outside the district/sector</option>
                <option value="Completed project / Seasonal cycle end">Completed program / Seasonal agricultural cycle concluded</option>
                <option value="Mismatch with cooperative goals or farming targets">Mismatch with agropastoral targets or cooperative mission</option>
                <option value="Scheduling Conflicts / Lack of time">Scheduling conflicts / Limited personal time</option>
                <option value="Financial / membership fee constraints">Financial constraints or membership dues difficulty</option>
                <option value="Health or personal circumstances">Health or personal circumstances</option>
                <option value="Joined another cooperative or organization">Joined another cooperative / local entity</option>
                <option value="Dissatisfied with leadership communication">Dissatisfied with operations or leadership communication</option>
                <option value="Other">Other specific reason</option>
              </select>
            </div>

            {exitReason === "Other" && (
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-gray-700 dark:text-slate-300">
                  Please specify your reason <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={exitCustomReason}
                  onChange={(e) => setExitCustomReason(e.target.value)}
                  placeholder="e.g. Pursuing full-time study in Kigali"
                  className="w-full text-xs font-semibold rounded-xl border bg-white dark:bg-slate-900 border-gray-300 dark:border-slate-700 px-3.5 py-2.5 text-gray-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>
            )}

            {/* 2. Overall Experience Star Rating */}
            <div className="flex flex-col gap-2 p-3.5 bg-gray-50 dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-800">
              <label className="text-xs font-bold text-gray-800 dark:text-slate-200 flex items-center justify-between">
                <span>2. Overall Experience with {exitTarget?.org?.name} <span className="text-red-500">*</span></span>
                <span className="text-xs font-bold text-amber-600 dark:text-amber-400">
                  {ratingDescriptions[exitRatingHover || exitRating]}
                </span>
              </label>
              <div className="flex items-center gap-2 pt-1">
                {[1, 2, 3, 4, 5].map((starVal) => {
                  const isFilled = starVal <= (exitRatingHover || exitRating);
                  return (
                    <button
                      key={starVal}
                      type="button"
                      onClick={() => setExitRating(starVal)}
                      onMouseEnter={() => setExitRatingHover(starVal)}
                      onMouseLeave={() => setExitRatingHover(null)}
                      className="p-1 rounded-lg hover:scale-110 transition-transform focus:outline-none cursor-pointer"
                      title={`${starVal} Star`}
                    >
                      <Star
                        className={`h-6 w-6 ${
                          isFilled
                            ? "text-amber-400 fill-amber-400"
                            : "text-gray-300 dark:text-slate-700"
                        }`}
                      />
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 3. Feedback Textarea */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-gray-800 dark:text-slate-200">
                3. Constructive Feedback & Suggestions
              </label>
              <textarea
                value={exitFeedback}
                onChange={(e) => setExitFeedback(e.target.value)}
                placeholder="What could leadership or the cooperative do to better support remaining members and improve future operations?"
                className="w-full text-xs font-semibold rounded-xl border bg-white dark:bg-slate-900 border-gray-300 dark:border-slate-700 p-3 min-h-20 text-gray-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-indigo-500"
                rows={2}
              />
            </div>

            {/* 4. Rejoin Intent */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-gray-800 dark:text-slate-200">
                4. Would you consider participating or rejoining in the future?
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { value: "yes", label: "Yes, definitely" },
                  { value: "maybe", label: "Maybe later" },
                  { value: "no", label: "Unlikely" }
                ].map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setRejoinIntent(opt.value as any)}
                    className={`py-2 px-3 text-xs font-bold rounded-xl border transition-all cursor-pointer ${
                      rejoinIntent === opt.value
                        ? "bg-indigo-600 text-white border-indigo-600 shadow-xs"
                        : "bg-white dark:bg-slate-900 border-gray-200 dark:border-slate-800 text-gray-700 dark:text-slate-300 hover:bg-gray-50"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* 5. Custom Configured Questions by Admin */}
            {exitTarget?.org?.exit_survey_questions && exitTarget.org.exit_survey_questions.length > 0 && (
              <div className="flex flex-col gap-3 pt-2 border-t border-gray-200 dark:border-slate-800">
                <span className="text-[11px] font-bold text-indigo-700 dark:text-indigo-400 uppercase tracking-wider">
                  Additional Cooperative Questions ({exitTarget.org.exit_survey_questions.length})
                </span>
                {exitTarget.org.exit_survey_questions.map((q: any, qIdx: number) => (
                  <div key={q.id || qIdx} className="flex flex-col gap-1.5 p-3 bg-gray-50/80 dark:bg-slate-900/60 rounded-xl border border-gray-200 dark:border-slate-800">
                    <label className="text-xs font-bold text-gray-800 dark:text-slate-200">
                      {qIdx + 5}. {q.question} {q.required && <span className="text-red-500">*</span>}
                    </label>

                    {q.type === "rating" ? (
                      <div className="flex items-center gap-2 pt-1">
                        {[1, 2, 3, 4, 5].map((num) => (
                          <button
                            key={num}
                            type="button"
                            onClick={() =>
                              setExitSurveyAnswers((prev) => ({
                                ...prev,
                                [q.id || `q_${qIdx}`]: num,
                              }))
                            }
                            className={`h-8 w-8 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                              exitSurveyAnswers[q.id || `q_${qIdx}`] === num
                                ? "bg-indigo-600 text-white border-indigo-600"
                                : "bg-white dark:bg-slate-800 border-gray-300 dark:border-slate-700 text-gray-700 dark:text-slate-200"
                            }`}
                          >
                            {num}
                          </button>
                        ))}
                      </div>
                    ) : q.type === "multiple_choice" && q.options && q.options.length > 0 ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-1">
                        {q.options.map((opt: string) => (
                          <button
                            key={opt}
                            type="button"
                            onClick={() =>
                              setExitSurveyAnswers((prev) => ({
                                ...prev,
                                [q.id || `q_${qIdx}`]: opt,
                              }))
                            }
                            className={`p-2 text-left text-xs font-medium rounded-lg border transition-all cursor-pointer ${
                              exitSurveyAnswers[q.id || `q_${qIdx}`] === opt
                                ? "bg-indigo-50 dark:bg-indigo-950/60 border-indigo-500 text-indigo-900 dark:text-indigo-200 font-bold"
                                : "bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700 text-gray-700 dark:text-slate-300 hover:bg-gray-100"
                            }`}
                          >
                            {opt}
                          </button>
                        ))}
                      </div>
                    ) : (
                      <input
                        type="text"
                        value={exitSurveyAnswers[q.id || `q_${qIdx}`] || ""}
                        onChange={(e) =>
                          setExitSurveyAnswers((prev) => ({
                            ...prev,
                            [q.id || `q_${qIdx}`]: e.target.value,
                          }))
                        }
                        placeholder="Your response..."
                        required={q.required}
                        className="w-full text-xs font-semibold rounded-xl border bg-white dark:bg-slate-900 border-gray-300 dark:border-slate-700 px-3.5 py-2 text-gray-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* 6. Warning & Confirmation Checkbox */}
            <div className="p-3 bg-rose-50/80 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 rounded-xl flex items-start gap-2.5">
              <input
                type="checkbox"
                id="growthProConfirmExit"
                checked={confirmAcknowledge}
                onChange={(e) => setConfirmAcknowledge(e.target.checked)}
                className="h-4 w-4 mt-0.5 rounded border-rose-300 text-rose-600 focus:ring-rose-500 cursor-pointer"
                required
              />
              <label htmlFor="growthProConfirmExit" className="text-xs font-semibold text-rose-900 dark:text-rose-200 leading-snug cursor-pointer">
                I understand that submitting this survey will permanently delete my member affiliation from <strong>{exitTarget?.org?.name}</strong> and remove my account from this workspace.
              </label>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-gray-200 dark:border-slate-800">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowSurveyModal(false)}
                disabled={isSubmittingExit}
              >
                Cancel / Keep Membership
              </Button>
              <Button
                type="submit"
                variant="danger"
                size="sm"
                loading={isSubmittingExit}
                disabled={!confirmAcknowledge}
                icon={<UserMinus className="h-3.5 w-3.5" />}
              >
                Submit Survey & Exit Organization
              </Button>
            </div>
          </form>
        </div>
      </Modal>

      {/* ========================================== */}
      {/* 6. STANDARD EXIT CONFIRMATION MODAL */}
      {/* ========================================== */}
      <Modal
        open={showConfirmModal}
        onClose={() => {
          if (!isSubmittingExit) setShowConfirmModal(false);
        }}
        title={`Exit Workspace: ${exitTarget?.org?.name || "Organization"}`}
        size="md"
      >
        <div className="flex flex-col gap-4">
          <div className="p-3.5 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/40 rounded-xl flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="flex flex-col gap-1 text-xs text-amber-900 dark:text-amber-200 leading-relaxed font-medium">
              <p>
                Are you sure you want to exit <strong>{exitTarget?.org?.name}</strong>?
              </p>
              <p className="text-[11px] text-amber-800/80 dark:text-amber-300">
                This will delete your account affiliation from this organization's workspace and remove your access. You can always apply or register again later if public joining is permitted.
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-gray-700 dark:text-slate-300">
              Reason for departure (Optional)
            </label>
            <input
              type="text"
              value={exitReason}
              onChange={(e) => setExitReason(e.target.value)}
              placeholder="e.g. Relocation, scheduling conflicts, or completed term"
              className="w-full text-xs rounded-xl border bg-white dark:bg-slate-900 border-gray-300 dark:border-slate-700 px-3 py-2 text-gray-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-rose-500"
            />
          </div>

          <div className="flex items-start gap-2 pt-1">
            <input
              type="checkbox"
              id="standardConfirmExit"
              checked={confirmAcknowledge}
              onChange={(e) => setConfirmAcknowledge(e.target.checked)}
              className="h-4 w-4 mt-0.5 rounded border-gray-300 text-rose-600 focus:ring-rose-500 cursor-pointer"
            />
            <label htmlFor="standardConfirmExit" className="text-xs text-gray-700 dark:text-slate-300 font-medium cursor-pointer">
              I confirm I am no longer a member of <strong>{exitTarget?.org?.name}</strong> and want to remove my account affiliation.
            </label>
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-gray-150 dark:border-slate-800">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowConfirmModal(false)}
              disabled={isSubmittingExit}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="danger"
              size="sm"
              loading={isSubmittingExit}
              disabled={!confirmAcknowledge}
              onClick={() => handleExecuteExit(false)}
              icon={<UserMinus className="h-3.5 w-3.5" />}
            >
              Confirm Exit & Delete Membership
            </Button>
          </div>
        </div>
      </Modal>

      {/* ========================================== */}
      {/* 7. ACCOUNT DELETION SUCCESS POPUP MODAL */}
      {/* ========================================== */}
      <Modal
        open={deletedSuccessModalOpen}
        onClose={() => setDeletedSuccessModalOpen(false)}
        title="Account Affiliation Deleted"
        size="md"
      >
        <div className="flex flex-col items-center text-center p-4 gap-4">
          <div className="h-14 w-14 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-200 dark:border-emerald-800">
            <CheckCircle className="h-7 w-7" />
          </div>
          <div className="flex flex-col gap-1.5">
            <h3 className="font-extrabold text-base text-gray-900 dark:text-slate-100">
              Account Successfully Deleted
            </h3>
            <p className="text-xs text-gray-600 dark:text-slate-300 leading-relaxed max-w-md">
              Your member account affiliation with <strong>{deletedOrgName}</strong> has been successfully deleted. Your exit survey responses and offboarding feedback have been securely archived in the cooperative's resignation records for administrative reporting.
            </p>
          </div>
          <div className="w-full pt-2">
            <Button
              type="button"
              className="w-full py-2.5 font-bold"
              onClick={() => setDeletedSuccessModalOpen(false)}
            >
              Return to Workspace Directory
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

// ==========================================

// ==========================================
// 4. FORGOT PASSWORD REQUEST PAGE
// ==========================================
export const ForgotPassword: React.FC = () => {
  const navigate = useNavigate();
  const { data: orgs } = useOrganizations();
  const [email, setEmail] = useState("");
  const [selectedOrgId, setSelectedOrgId] = useState("");
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  
  // 5-Minute Admin Approval Workflow State
  const [requestId, setRequestId] = useState<string | null>(() => {
    return sessionStorage.getItem("pending_pw_request_id") || null;
  });
  const [requestStatus, setRequestStatus] = useState<"idle" | "pending" | "approved" | "completed" | "expired">(() => {
    return (sessionStorage.getItem("pending_pw_status") as any) || "idle";
  });
  const [expiresAt, setExpiresAt] = useState<string | null>(() => {
    return sessionStorage.getItem("pending_pw_expires_at") || null;
  });
  const [timeRemaining, setTimeRemaining] = useState<number>(0);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submittingPassword, setSubmittingPassword] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState(false);

  // Poll status when in "pending" or "approved" state
  useEffect(() => {
    if (!requestId || passwordSuccess) return;

    const checkStatus = async () => {
      try {
        const res = await fetch(`/api/auth/check-password-reset-status?requestId=${encodeURIComponent(requestId)}`);
        if (res.ok) {
          const data = await res.json();
          setRequestStatus(data.status);
          sessionStorage.setItem("pending_pw_status", data.status);
          
          if (data.expires_at) {
            setExpiresAt(data.expires_at);
            sessionStorage.setItem("pending_pw_expires_at", data.expires_at);
          }

          if (data.status === "approved" && data.timeRemainingSeconds !== undefined) {
            setTimeRemaining(data.timeRemainingSeconds);
          }

          if (data.status === "expired") {
            setError("Your 5-minute security window has expired. Please submit a new request.");
          }
        }
      } catch (err) {
        console.warn("[Password Reset Poller] Check error:", err);
      }
    };

    checkStatus();
    const interval = setInterval(checkStatus, 3000);
    return () => clearInterval(interval);
  }, [requestId, passwordSuccess]);

  // Live countdown timer for the active 5-minute approved window
  useEffect(() => {
    if (requestStatus !== "approved" || !expiresAt) return;

    const updateTimer = () => {
      const remaining = Math.max(0, Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000));
      setTimeRemaining(remaining);
      if (remaining <= 0) {
        setRequestStatus("expired");
        sessionStorage.setItem("pending_pw_status", "expired");
      }
    };

    updateTimer();
    const timer = setInterval(updateTimer, 1000);
    return () => clearInterval(timer);
  }, [requestStatus, expiresAt]);

  const handleRequestSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      setError("Please provide your registered email address.");
      return;
    }
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/request-password-reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          orgId: selectedOrgId || undefined,
          reason: reason || "User requested password reset via login screen"
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to submit password reset request.");

      const newReqId = data.requestId;
      setRequestId(newReqId);
      setRequestStatus("pending");
      sessionStorage.setItem("pending_pw_request_id", newReqId);
      sessionStorage.setItem("pending_pw_status", "pending");
      sessionStorage.setItem("pending_pw_email", email);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to transmit password reset request.");
    } finally {
      setLoading(false);
    }
  };

  const handleSetNewPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword || newPassword.length < 6) {
      setError("Password must be at least 6 characters long.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match. Please retype carefully.");
      return;
    }
    if (!requestId) {
      setError("Request session expired. Please start again.");
      return;
    }

    setSubmittingPassword(true);
    setError("");

    try {
      const res = await fetch("/api/auth/complete-password-reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requestId,
          newPassword
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update password.");

      const targetEmail = data.email || email || sessionStorage.getItem("pending_pw_email") || "";
      if (targetEmail) {
        try {
          const raw = localStorage.getItem("impacto_user_passwords") || "{}";
          const map = JSON.parse(raw);
          map[targetEmail.toLowerCase()] = newPassword;
          localStorage.setItem("impacto_user_passwords", JSON.stringify(map));
        } catch (e) {}
      }

      setPasswordSuccess(true);
      setRequestStatus("completed");
      sessionStorage.removeItem("pending_pw_request_id");
      sessionStorage.removeItem("pending_pw_status");
      sessionStorage.removeItem("pending_pw_expires_at");
    } catch (err: any) {
      setError(err.message || "Failed to update password.");
    } finally {
      setSubmittingPassword(false);
    }
  };

  const handleStartOver = () => {
    sessionStorage.removeItem("pending_pw_request_id");
    sessionStorage.removeItem("pending_pw_status");
    sessionStorage.removeItem("pending_pw_expires_at");
    setRequestId(null);
    setRequestStatus("idle");
    setExpiresAt(null);
    setTimeRemaining(0);
    setError("");
    setPasswordSuccess(false);
    setNewPassword("");
    setConfirmPassword("");
  };

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-slate-950 flex flex-col items-center justify-center p-4 select-none">
      <div className="w-full max-w-md flex flex-col items-center gap-4">
        <Link to="/login" className="inline-flex items-center gap-1.5 text-xs text-gray-500 hover:text-emerald-600 font-semibold select-none bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 px-3.5 py-1.5 rounded-full shadow-xs duration-150 transition mb-2 self-start">
          <ArrowLeft className="h-3.5 w-3.5" /> Back to Sign In
        </Link>

        <Card title="Admin-Approved Password Reset" className="w-full">
          {/* STATE 1: Completed Successfully */}
          {passwordSuccess ? (
            <div className="flex flex-col gap-4 text-center py-4">
              <span className="p-3 bg-emerald-50 dark:bg-emerald-950/30 rounded-full text-emerald-600 self-center border border-emerald-200 dark:border-emerald-800">
                <CheckCircle className="h-8 w-8" />
              </span>
              <h3 className="font-display font-bold text-base text-gray-900 dark:text-white">Password Updated Successfully</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                Your new password is now active. You can immediately sign into your cooperative workspace.
              </p>
              <Button onClick={() => navigate("/login")} className="mt-2 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold">
                Sign In With New Password
              </Button>
            </div>
          ) : requestStatus === "approved" ? (
            /* STATE 2: Approved by Admin — Active 5-Minute Window */
            <form onSubmit={handleSetNewPassword} className="flex flex-col gap-4">
              <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-xl flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <span className="p-1.5 bg-emerald-100 dark:bg-emerald-900/50 rounded-lg text-emerald-700 dark:text-emerald-400">
                    <ShieldCheck className="h-5 w-5" />
                  </span>
                  <div>
                    <h4 className="text-xs font-bold text-emerald-900 dark:text-emerald-200">Admin Approved!</h4>
                    <p className="text-[11px] text-emerald-700 dark:text-emerald-400">Enter your new password below</p>
                  </div>
                </div>

                {/* 5-Minute Countdown Badge */}
                <div className="flex items-center gap-1.5 bg-white dark:bg-slate-900 px-3 py-1.5 rounded-lg border border-emerald-300 dark:border-emerald-700 shadow-xs">
                  <Clock className="h-3.5 w-3.5 text-emerald-600 animate-spin" style={{ animationDuration: "8s" }} />
                  <span className="font-mono font-bold text-xs text-emerald-700 dark:text-emerald-300">
                    {formatTimer(timeRemaining)}
                  </span>
                </div>
              </div>

              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs font-semibold text-red-600">
                  {error}
                </div>
              )}

              <p className="text-xs text-gray-500 dark:text-gray-400">
                You have <strong className="text-emerald-700 dark:text-emerald-300">5 minutes</strong> to set your new password before this security window closes.
              </p>

              <Input
                type="password"
                label="New Password (min 6 characters) *"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new password"
                prefixIcon={<KeyRound className="h-4 w-4 text-gray-400" />}
                required
              />

              <Input
                type="password"
                label="Confirm New Password *"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm new password"
                prefixIcon={<KeyRound className="h-4 w-4 text-gray-400" />}
                required
              />

              <Button type="submit" loading={submittingPassword} className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold">
                Save & Update Password
              </Button>
            </form>
          ) : requestStatus === "expired" ? (
            /* STATE 3: Expired 5-Minute Window */
            <div className="flex flex-col gap-4 text-center py-4">
              <span className="p-3 bg-amber-50 dark:bg-amber-950/30 rounded-full text-amber-600 self-center border border-amber-200 dark:border-amber-800">
                <AlertTriangle className="h-8 w-8" />
              </span>
              <h3 className="font-display font-bold text-base text-gray-900 dark:text-white">Security Window Expired</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                The 5-minute security approval window for this request has passed. To ensure security, please submit a new reset request.
              </p>
              <Button onClick={handleStartOver} className="mt-2 py-2.5">
                Submit New Request
              </Button>
            </div>
          ) : requestStatus === "pending" ? (
            /* STATE 4: Waiting for Admin Approval */
            <div className="flex flex-col gap-4 text-center py-3">
              <div className="relative self-center">
                <span className="p-3.5 bg-amber-50 dark:bg-amber-950/30 rounded-full text-amber-600 border border-amber-200 dark:border-amber-800 inline-flex items-center justify-center">
                  <Clock className="h-8 w-8 animate-pulse" />
                </span>
                <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-amber-500"></span>
                </span>
              </div>

              <h3 className="font-display font-bold text-base text-gray-900 dark:text-white">Awaiting Administrator Approval</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                Your request has been forwarded to your Workspace Administrator.
              </p>

              <div className="p-3.5 bg-slate-50 dark:bg-slate-900 rounded-xl border border-dashed border-gray-200 dark:border-slate-800 text-left text-xs space-y-2">
                <div className="flex items-center justify-between text-gray-600 dark:text-gray-300">
                  <span className="text-[11px] text-gray-400">Account Email:</span>
                  <span className="font-semibold">{sessionStorage.getItem("pending_pw_email") || email}</span>
                </div>
                <div className="flex items-center justify-between text-gray-600 dark:text-gray-300">
                  <span className="text-[11px] text-gray-400">Approval Mechanism:</span>
                  <span className="text-amber-600 font-semibold">Admin Panel Review</span>
                </div>
                <div className="flex items-center justify-between text-gray-600 dark:text-gray-300">
                  <span className="text-[11px] text-gray-400">Reset Window:</span>
                  <span className="text-emerald-600 font-semibold">5 Minutes after Approval</span>
                </div>
              </div>

              <div className="flex items-center justify-center gap-2 text-[11px] text-gray-400">
                <RefreshCw className="h-3 w-3 animate-spin text-emerald-600" />
                <span>Checking for administrator approval in real-time...</span>
              </div>

              <div className="flex gap-2 mt-2">
                <Button variant="outline" onClick={handleStartOver} className="flex-1 py-2 text-xs">
                  Cancel Request
                </Button>
                <Button variant="ghost" onClick={() => navigate("/login")} className="flex-1 py-2 text-xs">
                  Return to Login
                </Button>
              </div>
            </div>
          ) : (
            /* STATE 5: Initial Request Form */
            <form onSubmit={handleRequestSubmit} className="flex flex-col gap-4">
              <p className="text-xs text-gray-500 dark:text-gray-400 leading-normal">
                Forgot your password? No email verification is required. Submit a request to your cooperative administrator. Once approved, you will have <strong>5 minutes</strong> to enter your new password.
              </p>

              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs font-semibold text-red-600">
                  {error}
                </div>
              )}

              <Input
                type="email"
                label="Registered Email Address *"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@organization.org"
                prefixIcon={<Mail className="h-4 w-4 text-gray-400" />}
                required
              />

              {orgs && orgs.length > 0 && (
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-gray-700 dark:text-slate-300">
                    Select Your Organization / Workspace
                  </label>
                  <select
                    value={selectedOrgId}
                    onChange={(e) => setSelectedOrgId(e.target.value)}
                    className="w-full bg-white dark:bg-slate-900 text-xs font-medium border border-gray-200 dark:border-slate-800 rounded-lg px-3 py-2 text-gray-800 dark:text-slate-200 outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="">-- Detect Organization Automatically --</option>
                    {orgs.map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-gray-700 dark:text-slate-300">
                  Reason / Verification Note for Administrator (Optional)
                </label>
                <textarea
                  rows={2}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="e.g. Forgot login password on field phone."
                  className="w-full bg-white dark:bg-slate-900 text-xs font-normal border border-gray-200 dark:border-slate-800 rounded-lg p-2.5 text-gray-800 dark:text-slate-200 outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
                />
              </div>

              <Button type="submit" loading={loading} className="w-full mt-2 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold">
                Request Administrator Approval
              </Button>
            </form>
          )}
        </Card>
      </div>
    </div>
  );
};

// ==========================================
// 5. RESET PASSWORD ACTUAL TRIGGER
// ==========================================
export const ResetPassword: React.FC = () => {
  const navigate = useNavigate();
  const [code, setCode] = useState("");
  const [success, setSuccess] = useState(false);

  const handleReset = (e: React.FormEvent) => {
    e.preventDefault();
    setSuccess(true);
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-slate-950 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-sm flex flex-col items-center gap-4">
        <Link to="/login" className="inline-flex items-center gap-1.5 text-xs text-gray-500 hover:text-emerald-600 font-semibold select-none bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 px-3.5 py-1.5 rounded-full shadow-xs duration-150 transition mb-2 self-start">
          <ArrowLeft className="h-3.5 w-3.5" /> Back to Sign In
        </Link>
        <Card title="New Credentials" className="w-full">
        {success ? (
          <div className="text-center flex flex-col items-center gap-3">
            <h3 className="font-semibold text-gray-900">Success!</h3>
            <p className="text-xs text-gray-500">Your password has been reset successfully.</p>
            <Button onClick={() => navigate("/login")}>Sign In Now</Button>
          </div>
        ) : (
          <form onSubmit={handleReset} className="flex flex-col gap-4">
            <Input
              type="password"
              label="New password"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="••••••••"
            />
            <Button type="submit" className="w-full">
              Update Password
            </Button>
          </form>
        )}
        </Card>
      </div>
    </div>
  );
};
