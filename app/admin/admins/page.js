"use client";
import { useState, useEffect } from "react";
import { db, subscribeToTable } from "../../../lib/supabase";
import Image from "next/image";

const AdminsPage = () => {
  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingAdmin, setEditingAdmin] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    role: "admin",
    avatar_url: "",
  });

  useEffect(() => {
    loadAdmins();

    // Set up real-time subscription
    const subscription = subscribeToTable("admins", (payload) => {
      console.log("Admins table changed:", payload);
      loadAdmins();
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const loadAdmins = async () => {
    try {
      setLoading(true);
      setError(null);

      const data = await db.admins.getAll();
      setAdmins(data);
    } catch (err) {
      console.error("Error loading admins:", err);
      setError("Failed to load admins. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      setSubmitting(true);
      setError(null);

      // Check for duplicate email
      const existingAdmin = admins.find(
        (admin) =>
          admin.email.toLowerCase() === formData.email.toLowerCase() &&
          admin.id !== editingAdmin?.id
      );

      if (existingAdmin) {
        setError("An admin with this email already exists.");
        return;
      }

      let adminData = {
        name: formData.name,
        email: formData.email,
        role: formData.role,
        avatar_url: formData.avatar_url || null,
      };

      // For new admins, include password hash (in production, hash this properly)
      if (!editingAdmin && formData.password) {
        // In production, you would hash the password here
        // For now, we'll just store it (NOT SECURE - for demo only)
        adminData.password_hash = `hashed_${formData.password}`;
      }

      let result;

      if (editingAdmin) {
        // Update existing admin
        result = await db.admins.update(editingAdmin.id, adminData);
        setAdmins(
          admins.map((admin) => (admin.id === editingAdmin.id ? result : admin))
        );
      } else {
        // Create new admin
        result = await db.admins.create(adminData);
        setAdmins([result, ...admins]);
      }

      resetForm();
    } catch (err) {
      console.error("Error saving admin:", err);
      setError(err.message || "Failed to save admin. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (admin) => {
    setEditingAdmin(admin);
    setFormData({
      name: admin.name,
      email: admin.email,
      password: "", // Never pre-fill password
      role: admin.role,
      avatar_url: admin.avatar_url || "",
    });
    setShowForm(true);
    setError(null);
  };

  const handleDelete = async (adminId) => {
    const admin = admins.find((a) => a.id === adminId);

    if (admin && admin.role === "super_admin") {
      alert("Cannot delete super admin account!");
      return;
    }

    if (
      !confirm(
        "Are you sure you want to delete this admin? This action cannot be undone."
      )
    ) {
      return;
    }

    try {
      setError(null);
      await db.admins.delete(adminId);
      setAdmins(admins.filter((admin) => admin.id !== adminId));
    } catch (err) {
      console.error("Error deleting admin:", err);
      setError("Failed to delete admin. Please try again.");
    }
  };

  const handleUpdateLastLogin = async (adminId) => {
    try {
      await db.admins.update(adminId, {
        last_login: new Date().toISOString(),
      });
      setAdmins(
        admins.map((admin) =>
          admin.id === adminId
            ? { ...admin, last_login: new Date().toISOString() }
            : admin
        )
      );
    } catch (err) {
      console.error("Error updating last login:", err);
    }
  };

  const resetForm = () => {
    setShowForm(false);
    setEditingAdmin(null);
    setFormData({
      name: "",
      email: "",
      password: "",
      role: "admin",
      avatar_url: "",
    });
    setShowPassword(false);
    setError(null);
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

  const formatLastLogin = (lastLogin) => {
    if (!lastLogin) return "Never";
    const date = new Date(lastLogin);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 1) return "Today";
    if (diffDays === 2) return "Yesterday";
    if (diffDays <= 7) return `${diffDays - 1} days ago`;
    return date.toLocaleDateString();
  };

  const superAdmins = admins.filter(
    (admin) => admin.role === "super_admin"
  ).length;
  const regularAdmins = admins.filter((admin) => admin.role === "admin").length;
  const moderators = admins.filter(
    (admin) => admin.role === "moderator"
  ).length;
  const activeToday = admins.filter(
    (admin) => formatLastLogin(admin.last_login) === "Today"
  ).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="flex items-center space-x-3">
          <div className="loading-spinner"></div>
          <span className="text-gray-600">Loading admins...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Error Alert */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <span className="text-red-400">❌</span>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Error</h3>
              <div className="mt-2 text-sm text-red-700">
                <p>{error}</p>
              </div>
            </div>
            <div className="ml-auto pl-3">
              <button
                onClick={() => setError(null)}
                className="text-red-400 hover:text-red-600"
              >
                ✕
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Admins Management
          </h1>
          <p className="text-gray-600 mt-1">
            Manage administrator accounts and permissions • {admins.length}{" "}
            total admins
          </p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          disabled={submitting}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
        >
          + Add New Admin
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <span className="text-2xl">👨‍💼</span>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Total Admins</p>
              <p className="text-2xl font-semibold text-gray-900">
                {admins.length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <span className="text-2xl">✅</span>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Active Today</p>
              <p className="text-2xl font-semibold text-gray-900">
                {activeToday}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-red-100 rounded-lg">
              <span className="text-2xl">👑</span>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Super Admins</p>
              <p className="text-2xl font-semibold text-gray-900">
                {superAdmins}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-purple-100 rounded-lg">
              <span className="text-2xl">🛡️</span>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Moderators</p>
              <p className="text-2xl font-semibold text-gray-900">
                {moderators}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Admins Table */}
      {!showForm && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Admin
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Role
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Last Login
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Created
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {admins.map((admin) => (
                <tr key={admin.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="h-10 w-10 flex-shrink-0">
                        {admin.avatar_url ? (
                          <Image
                            className="h-10 w-10 rounded-full object-cover"
                            src={admin.avatar_url}
                            alt=""
                          />
                        ) : (
                          <div className="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center">
                            <span className="text-sm font-medium text-gray-700">
                              {admin.name.charAt(0)}
                            </span>
                          </div>
                        )}
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">
                          {admin.name}
                        </div>
                        <div className="text-sm text-gray-500">
                          {admin.email}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getRoleColor(
                        admin.role
                      )}`}
                    >
                      {admin.role.replace("_", " ").toUpperCase()}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <div>
                      <div>{formatLastLogin(admin.last_login)}</div>
                      {admin.last_login && (
                        <div className="text-xs text-gray-400">
                          {new Date(admin.last_login).toLocaleTimeString()}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(admin.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleEdit(admin)}
                        disabled={submitting}
                        className="text-blue-600 hover:text-blue-900 transition-colors disabled:opacity-50"
                      >
                        Edit
                      </button>
                      {admin.role !== "super_admin" && (
                        <button
                          onClick={() => handleDelete(admin.id)}
                          disabled={submitting}
                          className="text-red-600 hover:text-red-900 transition-colors disabled:opacity-50"
                        >
                          Delete
                        </button>
                      )}
                      <button
                        onClick={() => handleUpdateLastLogin(admin.id)}
                        disabled={submitting}
                        className="text-green-600 hover:text-green-900 transition-colors disabled:opacity-50"
                        title="Simulate login"
                      >
                        Ping
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {admins.length === 0 && (
            <div className="text-center py-12">
              <div className="w-24 h-24 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                <span className="text-4xl">👨‍💼</span>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No admins yet
              </h3>
              <p className="text-gray-500 mb-4">
                Add administrators to manage your platform.
              </p>
              <button
                onClick={() => setShowForm(true)}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Add Admin
              </button>
            </div>
          )}
        </div>
      )}

      {/* Admin Form */}
      {showForm && (
        <div className="bg-white rounded-lg shadow p-6 max-w-2xl mx-auto">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold">
              {editingAdmin ? "Edit Admin" : "Add New Admin"}
            </h2>
            <button
              onClick={resetForm}
              className="text-gray-400 hover:text-gray-600"
            >
              ✕
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter admin name"
                  disabled={submitting}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email *
                </label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter email address"
                  disabled={submitting}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Role *
                </label>
                <select
                  required
                  value={formData.role}
                  onChange={(e) =>
                    setFormData({ ...formData, role: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={submitting}
                >
                  <option value="admin">Admin</option>
                  <option value="super_admin">Super Admin</option>
                  <option value="moderator">Moderator</option>
                </select>
                <p className="mt-1 text-xs text-gray-500">
                  Choose the appropriate role for this admin
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Avatar URL
                </label>
                <input
                  type="url"
                  value={formData.avatar_url}
                  onChange={(e) =>
                    setFormData({ ...formData, avatar_url: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="https://example.com/avatar.jpg"
                  disabled={submitting}
                />
              </div>
            </div>

            {!editingAdmin && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Password *
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    value={formData.password}
                    onChange={(e) =>
                      setFormData({ ...formData, password: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 pr-10"
                    placeholder="Enter secure password"
                    minLength="8"
                    disabled={submitting}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-sm leading-5"
                  >
                    {showPassword ? "🙈" : "👁️"}
                  </button>
                </div>
                <p className="mt-1 text-xs text-gray-500">
                  Minimum 8 characters required
                </p>
              </div>
            )}

            {editingAdmin && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <p className="text-sm text-yellow-800">
                  💡 Password changes are not supported in this demo. In
                  production, implement proper password reset flows.
                </p>
              </div>
            )}

            {/* Avatar Preview */}
            {formData.avatar_url && (
              <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                <Image
                  src={formData.avatar_url}
                  alt="Avatar preview"
                  className="w-12 h-12 rounded-full object-cover border-2 border-gray-200"
                  onError={(e) => {
                    e.target.style.display = "none";
                  }}
                />
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {formData.name}
                  </p>
                  <p className="text-sm text-gray-500">{formData.email}</p>
                  <span
                    className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getRoleColor(
                      formData.role
                    )}`}
                  >
                    {formData.role.replace("_", " ").toUpperCase()}
                  </span>
                </div>
              </div>
            )}

            {/* Role Permissions Info */}
            <div className="bg-blue-50 p-4 rounded-lg">
              <h4 className="text-sm font-medium text-blue-900 mb-2">
                Role Permissions:
              </h4>
              <div className="text-sm text-blue-800">
                {formData.role === "super_admin" && (
                  <ul className="list-disc list-inside space-y-1">
                    <li>Full access to all admin functions</li>
                    <li>Can manage other admins</li>
                    <li>System configuration access</li>
                    <li>Cannot be deleted by other admins</li>
                  </ul>
                )}
                {formData.role === "admin" && (
                  <ul className="list-disc list-inside space-y-1">
                    <li>Can manage posts, projects, and content</li>
                    <li>Can manage authors, categories, and tags</li>
                    <li>Cannot manage other admins</li>
                    <li>Limited system access</li>
                  </ul>
                )}
                {formData.role === "moderator" && (
                  <ul className="list-disc list-inside space-y-1">
                    <li>Can review and moderate content</li>
                    <li>Limited access to management functions</li>
                    <li>Cannot delete or manage admins</li>
                    <li>Read-only access to most settings</li>
                  </ul>
                )}
              </div>
            </div>

            <div className="flex justify-end space-x-4">
              <button
                type="button"
                onClick={resetForm}
                disabled={submitting}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={
                  submitting ||
                  !formData.name ||
                  !formData.email ||
                  (!editingAdmin && !formData.password)
                }
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center space-x-2"
              >
                {submitting && <div className="loading-spinner"></div>}
                <span>{editingAdmin ? "Update Admin" : "Create Admin"}</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Admin Activity */}
      {!showForm && admins.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Recent Admin Activity
          </h3>
          <div className="space-y-3">
            {admins
              .filter((admin) => admin.last_login)
              .sort((a, b) => new Date(b.last_login) - new Date(a.last_login))
              .slice(0, 5)
              .map((admin) => (
                <div
                  key={admin.id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <div className="flex items-center">
                    <div className="h-8 w-8 flex-shrink-0">
                      {admin.avatar_url ? (
                        <Image
                          className="h-8 w-8 rounded-full object-cover"
                          src={admin.avatar_url}
                          alt=""
                        />
                      ) : (
                        <div className="h-8 w-8 rounded-full bg-gray-300 flex items-center justify-center">
                          <span className="text-xs font-medium text-gray-700">
                            {admin.name.charAt(0)}
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="ml-3">
                      <p className="text-sm font-medium text-gray-900">
                        {admin.name}
                      </p>
                      <p className="text-xs text-gray-500">
                        {admin.role.replace("_", " ")}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-900">
                      {formatLastLogin(admin.last_login)}
                    </p>
                    <p className="text-xs text-gray-500">
                      {new Date(admin.last_login).toLocaleTimeString()}
                    </p>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminsPage;
