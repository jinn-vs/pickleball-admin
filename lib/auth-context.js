"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from "react";
import { supabase } from "./supabase";

const AuthContext = createContext(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [adminProfile, setAdminProfile] = useState(null);

  // For signIn / signOut actions
  const [loading, setLoading] = useState(false);

  // For loading admin row from "admins" table
  const [adminLoading, setAdminLoading] = useState(false);

  // For initial session loading
  const [initializing, setInitializing] = useState(true);

  const [error, setError] = useState(null);

  // --------- HELPERS ---------
  const normalizeRole = (role) => {
    if (!role) return "";
    const r = role.toLowerCase().trim();
    if (r === "super admin" || r === "super-admin") return "super_admin";
    return r;
  };

  // ---- ADMIN PROFILE LOADER ----
  const loadAdminProfile = useCallback(async (supabaseUser) => {
    console.log("🔵 loadAdminProfile called for:", supabaseUser?.email);
    if (!supabaseUser?.email) {
      setAdminProfile(null);
      console.log("🔵 loadAdminProfile: no email, skipping");
      return;
    }

    setAdminLoading(true);
    setError(null);

    try {
      console.log("🔵 loadAdminProfile: querying admins table...");

      // Add timeout to prevent hanging
      const queryPromise = supabase
        .from("admins")
        .select("*")
        .eq("email", supabaseUser.email)
        .single();

      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => {
          reject(new Error("Admin profile query timeout"));
        }, 5000); // 5 second timeout for profile query
      });

      const { data, error: profileError } = await Promise.race([
        queryPromise,
        timeoutPromise,
      ]);

      console.log("🔵 loadAdminProfile: query complete", { data, profileError });

      if (profileError) {
        if (profileError.code === "PGRST116") {
          setAdminProfile(null);
          setError("Admin profile not found. Please contact a super admin.");
        } else {
          console.error("🔴 Error loading admin profile:", profileError);
          setError("Unable to load admin profile.");
        }
        return;
      }

      setAdminProfile(data);
      console.log("🟢 loadAdminProfile: profile set successfully");
    } catch (err) {
      console.error("🔴 Exception loading admin profile:", err);
      setError(err.message || "Failed to load admin profile.");
      setAdminProfile(null);
    } finally {
      setAdminLoading(false);
      console.log("🟢 loadAdminProfile: complete, adminLoading=false");
    }
  }, []);

  // ---- INITIAL SESSION + LISTENER ----
  useEffect(() => {
    let mounted = true;
    let timeoutId;
    let initializingRef = false; // Guard against multiple simultaneous inits

    const init = async () => {
      if (initializingRef) {
        console.log("🟡 Init already in progress, skipping duplicate call");
        return;
      }

      initializingRef = true;
      console.log("🔵 Auth init started...");
      try {
        setError(null);

        // Set a timeout to prevent infinite loading
        const timeoutPromise = new Promise((_, reject) => {
          timeoutId = setTimeout(() => {
            reject(new Error("Authentication timeout - taking too long to connect"));
          }, 15000); // 15 second timeout (5s for session + 5s for profile + buffer)
        });

        console.log("🔵 Calling supabase.auth.getSession()...");
        const sessionPromise = supabase.auth.getSession();

        const {
          data: { session },
          error: sessionError,
        } = await Promise.race([sessionPromise, timeoutPromise]);

        clearTimeout(timeoutId);

        console.log("🔵 getSession() completed:", { session, sessionError });

        if (!mounted) {
          console.log("🔴 Component unmounted, aborting");
          return;
        }

        if (sessionError) {
          console.error("🔴 Session error:", sessionError);
          setError("Failed to get session.");
          setUser(null);
          setAdminProfile(null);
          setInitializing(false);
          return;
        }

        const currentUser = session?.user ?? null;
        console.log("🔵 Current user:", currentUser?.email || "none");

        setUser(currentUser);

        if (currentUser) {
          console.log("🔵 Loading admin profile for:", currentUser.email);
          await loadAdminProfile(currentUser);
          console.log("🔵 Admin profile loaded");
        } else {
          console.log("🔵 No user, skipping admin profile");
          setAdminProfile(null);
        }
      } catch (err) {
        if (!mounted) return;
        console.error("🔴 Initialization error:", err);
        setError(err.message || "Failed to initialize auth.");
        setUser(null);
        setAdminProfile(null);
      } finally {
        if (mounted) {
          console.log("🟢 Auth initialization complete, setting initializing=false");
          setInitializing(false);
        }
        if (timeoutId) clearTimeout(timeoutId);
        initializingRef = false;
      }
    };

    init();

    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return;

        const currentUser = session?.user ?? null;

        if (event === "SIGNED_OUT" || !currentUser) {
          setUser(null);
          setAdminProfile(null);
          setError(null);
          return;
        }

        // Only reload profile if user changed
        setUser((prevUser) => {
          if (prevUser?.id !== currentUser.id) {
            console.log("🔵 User changed, reloading admin profile...");
            loadAdminProfile(currentUser);
          } else {
            console.log("🟢 User unchanged, skipping profile reload");
          }
          return currentUser;
        });
      }
    );

    return () => {
      mounted = false;
      if (authListener) authListener.subscription.unsubscribe();
    };
  }, [loadAdminProfile]);

  // ---- AUTH ACTIONS ----
  const signIn = async (email, password) => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: signInError } =
        await supabase.auth.signInWithPassword({
          email,
          password,
        });

      if (signInError) {
        setError(signInError.message);
        return { success: false, error: signInError.message };
      }

      return { success: true, data };
    } catch (err) {
      console.error("🔴 signIn exception:", err);
      setError("An unexpected error occurred.");
      return { success: false, error: "An unexpected error occurred." };
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    try {
      setLoading(true);
      setError(null);

      const { error: signOutError } = await supabase.auth.signOut();

      if (signOutError) {
        console.error("🔴 signOut error:", signOutError);
        setError(signOutError.message);
        return { success: false, error: signOutError.message };
      }

      setUser(null);
      setAdminProfile(null);
      return { success: true };
    } catch (err) {
      console.error("🔴 signOut exception:", err);
      setError("Failed to sign out.");
      return { success: false, error: "Failed to sign out." };
    } finally {
      setLoading(false);
    }
  };

  // ---- PERMISSIONS ----
  const hasPermission = useCallback((requiredRole) => {
    const currentRole = normalizeRole(adminProfile?.role);
    const neededRole = normalizeRole(requiredRole);

    const roleHierarchy = {
      moderator: 1,
      admin: 2,
      super_admin: 3,
    };

    const userLevel = roleHierarchy[currentRole] || 0;
    const requiredLevel = roleHierarchy[neededRole] || 0;
    const allowed = userLevel >= requiredLevel;

    return allowed;
  }, [adminProfile?.role]);

  // Shortcuts
  const canManageAdmins = useCallback(() => hasPermission("super_admin"), [hasPermission]);
  const canManageContent = useCallback(() => hasPermission("admin"), [hasPermission]);
  const canModerate = useCallback(() => hasPermission("moderator"), [hasPermission]);
  const canCreatePosts = useCallback(() => hasPermission("admin"), [hasPermission]);
  const canManageAuthors = useCallback(() => hasPermission("admin"), [hasPermission]);
  const canManageCategories = useCallback(() => hasPermission("admin"), [hasPermission]);
  const canManageTags = useCallback(() => hasPermission("admin"), [hasPermission]);
  const canManageWeb3Projects = useCallback(() => hasPermission("admin"), [hasPermission]);
  const canManageMedia = useCallback(() => hasPermission("admin"), [hasPermission]);

  const authLoading = loading || adminLoading || initializing;

  const value = {
    user,
    adminProfile,

    // flags
    loading,
    adminLoading,
    authLoading,
    error,

    // actions
    signIn,
    signOut,

    // permission helpers
    hasPermission,
    canManageAdmins,
    canManageContent,
    canModerate,
    canCreatePosts,
    canManageAuthors,
    canManageCategories,
    canManageTags,
    canManageWeb3Projects,
    canManageMedia,

    // computed
    isAuthenticated: !!user,
    isAdmin: !!adminProfile,
    isSuperAdmin: normalizeRole(adminProfile?.role) === "super_admin",
    role: adminProfile?.role || "super_admin",
    currentProfile: adminProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
