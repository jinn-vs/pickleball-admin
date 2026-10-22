"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "../../lib/auth-context";
import { supabase } from "../../lib/supabase";
import ProtectedRoute from "../components/ProtectedRoute";

const AdminLayout = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [connectionStatus, setConnectionStatus] = useState("connecting");
  const [showUserMenu, setShowUserMenu] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  const {
    adminProfile,
    signOut,
    canManageAdmins,
    canManageContent,
    canModerate,
    isAuthenticated,
  } = useAuth();

  // Test Supabase connection
  useEffect(() => {
    const testConnection = async () => {
      try {
        const { data, error } = await supabase
          .from("categories")
          .select("count", { count: "exact", head: true });

        if (error) {
          console.error("Supabase connection error:", error);
          setConnectionStatus("error");
        } else {
          setConnectionStatus("connected");
        }
      } catch (err) {
        console.error("Connection test failed:", err);
        setConnectionStatus("error");
      }
    };

    if (isAuthenticated) {
      testConnection();
    }
  }, [isAuthenticated]);

  // Close user menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showUserMenu && !event.target.closest(".user-menu")) {
        setShowUserMenu(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showUserMenu]);

  const navigation = [
    { name: "Dashboard", href: "/admin", icon: "📊", role: "moderator" },
    { name: "Help Docs", href: "/admin/posts", icon: "📝", role: "admin" },
    {
      name: "Help Docs Categories",
      href: "/admin/categories",
      icon: "📂",
      role: "admin",
    },
    { name: "Help Docs Tags", href: "/admin/tags", icon: "🏷️", role: "admin" },
    { name: "Articles", href: "/admin/articles", icon: "📝", role: "admin" },
    {
      name: "Articles Categories",
      href: "/admin/article-categories",
      icon: "📂",
      role: "admin",
    },
    {
      name: "Articls Tags",
      href: "/admin/article-tags",
      icon: "🏷️",
      role: "admin",
    },
    {
      name: "Media",
      href: "/admin/media",
      icon: "🖼️",
      role: "admin",
    },
    { name: "Authors", href: "/admin/authors", icon: "👥", role: "admin" },

    { name: "Admins", href: "/admin/admins", icon: "👨‍💼", role: "super_admin" },
  ];

  // Filter navigation based on user permissions
  const filteredNavigation = navigation.filter((item) => {
    switch (item.role) {
      case "super_admin":
        return canManageAdmins();
      case "admin":
        return canManageContent();
      case "moderator":
        return canModerate();
      default:
        return false;
    }
  });

  const handleSignOut = async () => {
    const result = await signOut();
    if (result.success) {
      router.push("/admin/login");
    }
  };

  const getConnectionStatusColor = () => {
    switch (connectionStatus) {
      case "connected":
        return "bg-green-100 text-green-800";
      case "error":
        return "bg-red-100 text-red-800";
      default:
        return "bg-yellow-100 text-yellow-800";
    }
  };

  const getConnectionStatusText = () => {
    switch (connectionStatus) {
      case "connected":
        return "🟢 Connected";
      case "error":
        return "🔴 Connection Error";
      default:
        return "🟡 Connecting...";
    }
  };

  const getRoleColor = (role) => {
    switch (role) {
      case "super_admin":
        return "bg-red-100 text-red-800";
      case "admin":
        return "bg-blue-100 text-blue-800";
      case "moderator":
        return "bg-green-100 text-green-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  // Don't render layout for login page
  if (pathname === "/admin/login") {
    return children;
  }

  return (
    <ProtectedRoute requiredRole="authenticated">
      <div className="flex h-screen bg-gray-100">
        {/* Sidebar */}
        <div
          className={`${
            sidebarOpen ? "w-64" : "w-16"
          } bg-white shadow-lg transition-all duration-300`}
        >
          <div className="flex items-center justify-between p-4 border-b">
            <div className={`${!sidebarOpen && "hidden"}`}>
              <h1 className="font-bold text-xl">Admin Panel</h1>
              <div className="flex items-center mt-2">
                <span
                  className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getConnectionStatusColor()}`}
                >
                  {getConnectionStatusText()}
                </span>
              </div>
            </div>
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 rounded-lg hover:bg-gray-100"
            >
              {sidebarOpen ? "←" : "→"}
            </button>
          </div>

          <nav className="mt-4">
            {filteredNavigation.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center px-4 py-3 text-sm font-medium rounded-lg mx-2 mb-1 transition-colors ${
                  pathname === item.href
                    ? "bg-blue-50 text-blue-700 border-r-2 border-blue-700"
                    : "text-gray-700 hover:bg-gray-50"
                }`}
              >
                <span className="text-lg mr-3">{item.icon}</span>
                {sidebarOpen && <span>{item.name}</span>}
              </Link>
            ))}
          </nav>

          {/* User Info in Sidebar */}
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Header */}
          <header className="bg-white shadow-sm border-b px-6 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-semibold text-gray-900">
                  {filteredNavigation.find((item) => item.href === pathname)
                    ?.name || "Dashboard"}
                </h2>
                {connectionStatus === "error" && (
                  <p className="text-sm text-red-600 mt-1">
                    ⚠️ Database connection issue. Please check your Supabase
                    configuration.
                  </p>
                )}
              </div>

              <div className="flex items-center space-x-4">
                {/* Quick Action Button */}
                <Link
                  href={
                    pathname === "/admin/posts"
                      ? "/admin/posts"
                      : pathname === "/admin/web3-projects"
                      ? "/admin/web3-projects"
                      : pathname === "/admin/media"
                      ? "/admin/media"
                      : "/admin/posts"
                  }
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm"
                >
                  {pathname === "/admin/media"
                    ? "📤 Upload Media"
                    : "+ Quick Add"}
                </Link>

                {/* Connection Status Indicator */}
                <div className="flex items-center space-x-2">
                  <div
                    className={`w-3 h-3 rounded-full ${
                      connectionStatus === "connected"
                        ? "bg-green-500"
                        : connectionStatus === "error"
                        ? "bg-red-500"
                        : "bg-yellow-500"
                    }`}
                  ></div>
                  <span className="text-sm text-gray-600">
                    {connectionStatus === "connected" ? "Supabase" : "Database"}
                  </span>
                </div>

                {/* User Menu */}
                <div className="relative user-menu">
                  <button
                    onClick={() => setShowUserMenu(!showUserMenu)}
                    className="flex items-center space-x-2 bg-gray-50 rounded-lg px-3 py-2 hover:bg-gray-100 transition-colors"
                  >
                    {adminProfile?.avatar_url ? (
                      <Image
                        src={adminProfile.avatar_url}
                        alt={adminProfile.name}
                        className="w-8 h-8 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
                        <span className="text-sm font-medium text-gray-700">
                          {adminProfile?.name.charAt(0)}
                        </span>
                      </div>
                    )}
                    <div className="text-left">
                      <p className="text-sm font-medium text-gray-900">
                        {adminProfile?.name}
                      </p>
                      <p className="text-xs text-gray-500">
                        {adminProfile?.role.replace("_", " ")}
                      </p>
                    </div>
                    <span className="text-gray-400">▼</span>
                  </button>

                  {/* Dropdown Menu */}
                  {showUserMenu && (
                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
                      <div className="px-4 py-2 border-b border-gray-100">
                        <p className="text-sm font-medium text-gray-900">
                          {adminProfile?.name}
                        </p>
                        <p className="text-xs text-gray-500">
                          {adminProfile?.email}
                        </p>
                        <span
                          className={`inline-flex px-2 py-1 text-xs font-medium rounded-full mt-1 ${getRoleColor(
                            adminProfile?.role
                          )}`}
                        >
                          {adminProfile?.role.replace("_", " ").toUpperCase()}
                        </span>
                      </div>

                      <Link
                        href="/admin"
                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        onClick={() => setShowUserMenu(false)}
                      >
                        📊 Dashboard
                      </Link>

                      <div className="border-t border-gray-100 my-1"></div>

                      <button
                        onClick={() => {
                          setShowUserMenu(false);
                          handleSignOut();
                        }}
                        className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                      >
                        🚪 Sign Out
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </header>

          {/* Page Content */}
          <main className="flex-1 overflow-auto p-6">
            {connectionStatus === "error" ? (
              <div className="bg-red-50 border border-red-200 rounded-lg p-6 mb-6">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <span className="text-red-400 text-2xl">⚠️</span>
                  </div>
                  <div className="ml-3">
                    <h3 className="text-lg font-medium text-red-800">
                      Database Connection Error
                    </h3>
                    <div className="mt-2 text-sm text-red-700">
                      <p>Unable to connect to Supabase. Please check:</p>
                      <ul className="list-disc list-inside mt-2 space-y-1">
                        <li>Your Supabase project is running</li>
                        <li>
                          Environment variables are correctly set in{" "}
                          <code className="bg-red-100 px-1 rounded">
                            .env.local
                          </code>
                        </li>
                        <li>
                          Database tables have been created using the schema
                        </li>
                        <li>Network connectivity to Supabase</li>
                      </ul>
                    </div>
                    <div className="mt-4">
                      <button
                        onClick={() => window.location.reload()}
                        className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors text-sm"
                      >
                        Retry Connection
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ) : null}

            {children}
          </main>
        </div>
      </div>
    </ProtectedRoute>
  );
};

export default AdminLayout;
