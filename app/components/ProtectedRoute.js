// app/admin/components/ProtectedRoute.jsx
"use client";

import { useEffect, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../lib/auth-context";

const ProtectedRoute = ({ children, requiredRole = "authenticated" }) => {
  const { isAuthenticated, hasPermission, role, authLoading } = useAuth();
  const router = useRouter();
  const hasCheckedAuth = useRef(false);
  const lastAuthState = useRef({ isAuthenticated: false, role: null });

  // Memoize permission check to avoid recalculating on every render
  const isAllowed = useMemo(() => {
    if (!isAuthenticated) return false;
    if (requiredRole === "authenticated") return true;
    return hasPermission(requiredRole);
  }, [isAuthenticated, requiredRole, hasPermission]);

  console.log("🔵 ProtectedRoute RENDER:", {
    isAuthenticated,
    role,
    requiredRole,
    authLoading,
    isAllowed,
    hasCheckedAuth: hasCheckedAuth.current,
  });

  useEffect(() => {
    // Wait for auth to finish loading before making any decisions
    if (authLoading) {
      console.log("🟡 Auth still loading, waiting...");
      return;
    }

    // Check if auth state actually changed
    const authStateChanged =
      lastAuthState.current.isAuthenticated !== isAuthenticated ||
      lastAuthState.current.role !== role;

    // If we've already checked and nothing changed, skip
    if (hasCheckedAuth.current && !authStateChanged) {
      console.log("🟢 Already authenticated, no state change, skipping re-check");
      return;
    }

    // Update last auth state
    lastAuthState.current = { isAuthenticated, role };

    console.log("🟣 ProtectedRoute effect - performing auth check:", {
      isAuthenticated,
      role,
      requiredRole,
      authLoading,
      isAllowed,
      authStateChanged,
    });

    // 1) Not logged in → go to login
    if (!isAuthenticated) {
      console.log("🔴 Not authenticated → redirect /admin/login");
      hasCheckedAuth.current = false;
      router.replace("/admin/login");
      return;
    }

    // 2) Logged in but missing role → unauthorized
    if (!isAllowed) {
      console.log(
        `🔴 No permission: user role "${role}" < required "${requiredRole}" → /admin/unauthorized`
      );
      hasCheckedAuth.current = false;
      router.replace("/admin/unauthorized");
      return;
    }

    // Mark that we've successfully checked authentication
    hasCheckedAuth.current = true;
    console.log("🟢 Access granted for this route");
  }, [isAuthenticated, role, requiredRole, isAllowed, router, authLoading]);

  // Show loading state ONLY if we are loading AND not authenticated
  // This prevents the loader from showing if we already have a user but are just re-validating in the background
  if (authLoading && !isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 bg-blue-100 rounded-full flex items-center justify-center">
            <div className="loading-spinner" />
          </div>
          <p className="text-gray-600 text-sm">Verifying authentication…</p>
        </div>
      </div>
    );
  }

  // While we're redirecting, you can show a small loader if unauthenticated:
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 bg-blue-100 rounded-full flex items-center justify-center">
            <div className="loading-spinner" />
          </div>
          <p className="text-gray-600 text-sm">Redirecting to login…</p>
        </div>
      </div>
    );
  }

  // Authenticated + allowed → render page
  return <>{children}</>;
};

export default ProtectedRoute;
