"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { db, subscribeToTable } from "../../lib/supabase";

const DashboardPage = () => {
  const [stats, setStats] = useState({
    totalPosts: 0,
    publishedPosts: 0,
    draftPosts: 0,
    totalAuthors: 0,
    totalCategories: 0,
    totalTags: 0,
    totalAdmins: 0,
  });
  const [recentPosts, setRecentPosts] = useState([]);
  const [recentProjects, setRecentProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadDashboardData();

    // Set up real-time subscriptions for key tables
    const subscriptions = [
      subscribeToTable("posts", () => loadDashboardData()),
      subscribeToTable("authors", () => loadDashboardData()),
    ];

    return () => {
      subscriptions.forEach((sub) => sub.unsubscribe());
    };
  }, []);

  const loadDashboardData = async () => {
    try {
      setError(null);

      // Load all data in parallel
      const [posts, authors, categories, tags, admins] = await Promise.all([
        db.posts.getAll(),
        db.authors.getAll(),
        db.categories.getAll(),
        db.tags.getAll(),
        db.admins.getAll(),
      ]);

      // Calculate stats
      const publishedPosts = posts.filter((post) => post.published).length;
      const draftPosts = posts.length - publishedPosts;

      setStats({
        totalPosts: posts.length,
        publishedPosts,
        draftPosts,
        totalAuthors: authors.length,
        totalCategories: categories.length,
        totalTags: tags.length,
        totalAdmins: admins.length,
      });

      // Set recent posts (last 5)
      setRecentPosts(
        posts.slice(0, 5).map((post) => ({
          ...post,
          author_name: post.author?.name || "Unknown",
          views: Math.floor(Math.random() * 2000), // Placeholder - implement actual views tracking
        }))
      );
    } catch (err) {
      setError(err?.message || "Failed to load dashboard");
    } finally {
      setLoading(false);
    }
  };

  const quickActions = [
    {
      name: "Create Post",
      href: "/admin/posts",
      icon: "📝",
      color: "bg-blue-500",
    },

    {
      name: "New Author",
      href: "/admin/authors",
      icon: "👥",
      color: "bg-purple-500",
    },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="flex items-center space-x-3">
          <div className="loading-spinner"></div>
          <span className="text-gray-600">Loading dashboard...</span>
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

      {/* Welcome Section */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg p-6 text-white">
        <h1 className="text-3xl font-bold mb-2">Welcome back! 👋</h1>
        <p className="text-blue-100">
          Here's what's happening with your platform today.
        </p>
        <div className="mt-4 flex items-center space-x-4 text-sm">
          <span>🔄 Real-time updates enabled</span>
          <span>📊 {stats.totalPosts + stats.totalProjects} total items</span>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {quickActions.map((action, index) => (
          <Link
            key={index}
            href={action.href}
            className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow group"
          >
            <div className="flex items-center">
              <div
                className={`${action.color} p-3 rounded-lg text-white text-2xl group-hover:scale-110 transition-transform`}
              >
                {action.icon}
              </div>
              <div className="ml-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  {action.name}
                </h3>
                <p className="text-sm text-gray-500">Quick access</p>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* Main Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <span className="text-2xl">📝</span>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Total Posts</p>
              <p className="text-2xl font-semibold text-gray-900">
                {stats.totalPosts}
              </p>
              <p className="text-xs text-gray-500">
                {stats.publishedPosts} published, {stats.draftPosts} drafts
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-purple-100 rounded-lg">
              <span className="text-2xl">👥</span>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Authors</p>
              <p className="text-2xl font-semibold text-gray-900">
                {stats.totalAuthors}
              </p>
              <p className="text-xs text-gray-500">Active contributors</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <span className="text-2xl">🏷️</span>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Content Tags</p>
              <p className="text-2xl font-semibold text-gray-900">
                {stats.totalTags}
              </p>
              <p className="text-xs text-gray-500">
                {stats.totalCategories} categories
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Content Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Content Stats */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Content Overview
          </h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Categories</span>
              <span className="font-semibold">{stats.totalCategories}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Tags</span>
              <span className="font-semibold">{stats.totalTags}</span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Admins</span>
              <span className="font-semibold">{stats.totalAdmins}</span>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-gray-200">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Published Rate</span>
              <div className="flex items-center">
                <div className="w-20 bg-gray-200 rounded-full h-2 mr-2">
                  <div
                    className="bg-green-500 h-2 rounded-full"
                    style={{
                      width: `${
                        stats.totalPosts > 0
                          ? (stats.publishedPosts / stats.totalPosts) * 100
                          : 0
                      }%`,
                    }}
                  ></div>
                </div>
                <span className="text-sm font-medium">
                  {stats.totalPosts > 0
                    ? Math.round(
                        (stats.publishedPosts / stats.totalPosts) * 100
                      )
                    : 0}
                  %
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Quick Stats
          </h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Posts per Author</span>
              <span className="font-semibold">
                {stats.totalAuthors > 0
                  ? Math.round(stats.totalPosts / stats.totalAuthors)
                  : 0}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Tags per Post</span>
              <span className="font-semibold">
                {stats.totalPosts > 0
                  ? Math.round(stats.totalTags / Math.max(stats.totalPosts, 1))
                  : 0}
              </span>
            </div>

            <div className="pt-4 border-t border-gray-200">
              <button
                onClick={loadDashboardData}
                className="w-full bg-blue-50 text-blue-600 px-3 py-2 rounded-md text-sm font-medium hover:bg-blue-100 transition-colors"
              >
                🔄 Refresh Data
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Posts */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-gray-900">
              Recent Posts
            </h3>
            <Link
              href="/admin/posts"
              className="text-blue-600 hover:text-blue-800 text-sm font-medium"
            >
              View all →
            </Link>
          </div>
          <div className="space-y-3">
            {recentPosts.length > 0 ? (
              recentPosts.map((post) => (
                <div
                  key={post.id}
                  className="flex justify-between items-start p-3 border border-gray-100 rounded-lg hover:bg-gray-50"
                >
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-900 text-sm">
                      {post.title}
                    </h4>
                    <p className="text-xs text-gray-500 mt-1">
                      By {post.author_name} •{" "}
                      {new Date(post.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="ml-4 text-right">
                    <span
                      className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        post.published
                          ? "bg-green-100 text-green-800"
                          : "bg-yellow-100 text-yellow-800"
                      }`}
                    >
                      {post.published ? "Published" : "Draft"}
                    </span>
                    {post.published && (
                      <p className="text-xs text-gray-500 mt-1">
                        {post.views} views
                      </p>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <p className="text-gray-500 text-center py-4">No posts yet</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
