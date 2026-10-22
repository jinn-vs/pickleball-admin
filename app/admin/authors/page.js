"use client";
import { useState, useEffect } from "react";
import { db, subscribeToTable } from "../../../lib/supabase";

const AuthorsPage = () => {
  const [authors, setAuthors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingAuthor, setEditingAuthor] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    bio: "",
    avatar_url: "",
  });

  // Load authors from Supabase
  useEffect(() => {
    loadAuthors();

    // Set up real-time subscription
    const subscription = subscribeToTable("authors", (payload) => {
      console.log("Authors table changed:", payload);
      loadAuthors(); // Reload data when changes occur
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const loadAuthors = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await db.authors.getAll();

      // Add calculated fields (posts/projects count would need separate queries)
      const authorsWithCounts = data.map((author) => ({
        ...author,
        posts_count: 0, // TODO: Implement actual count queries
        projects_count: 0,
      }));

      setAuthors(authorsWithCounts);
    } catch (err) {
      console.error("Error loading authors:", err);
      setError("Failed to load authors. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      setSubmitting(true);
      setError(null);

      let result;

      if (editingAuthor) {
        // Update existing author
        result = await db.authors.update(editingAuthor.id, formData);
        setAuthors(
          authors.map((author) =>
            author.id === editingAuthor.id
              ? {
                  ...result,
                  posts_count: author.posts_count,
                  projects_count: author.projects_count,
                }
              : author
          )
        );
      } else {
        // Create new author
        result = await db.authors.create(formData);
        setAuthors([
          { ...result, posts_count: 0, projects_count: 0 },
          ...authors,
        ]);
      }

      resetForm();
    } catch (err) {
      console.error("Error saving author:", err);
      setError(err.message || "Failed to save author. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (author) => {
    setEditingAuthor(author);
    setFormData({
      name: author.name,
      email: author.email,
      bio: author.bio || "",
      avatar_url: author.avatar_url || "",
    });
    setShowForm(true);
    setError(null);
  };

  const handleDelete = async (authorId) => {
    const author = authors.find((a) => a.id === authorId);

    if (author && (author.posts_count > 0 || author.projects_count > 0)) {
      if (
        !confirm(
          `This author has ${
            author.posts_count + author.projects_count
          } associated items. Are you sure you want to delete them? This will also affect their posts and projects.`
        )
      ) {
        return;
      }
    } else if (!confirm("Are you sure you want to delete this author?")) {
      return;
    }

    try {
      setError(null);
      await db.authors.delete(authorId);
      setAuthors(authors.filter((author) => author.id !== authorId));
    } catch (err) {
      console.error("Error deleting author:", err);
      setError("Failed to delete author. Please try again.");
    }
  };

  const resetForm = () => {
    setShowForm(false);
    setEditingAuthor(null);
    setFormData({
      name: "",
      email: "",
      bio: "",
      avatar_url: "",
    });
    setError(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="flex items-center space-x-3">
          <div className="loading-spinner"></div>
          <span className="text-gray-600">Loading authors...</span>
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
        <h1 className="text-3xl font-bold text-gray-900">Authors Management</h1>
        <button
          onClick={() => setShowForm(true)}
          disabled={submitting}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
        >
          + Add New Author
        </button>
      </div>

      {/* Authors Grid */}
      {!showForm && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {authors.map((author) => (
            <div
              key={author.id}
              className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow"
            >
              <div className="p-6">
                <div className="flex items-center space-x-4 mb-4">
                  <div className="w-16 h-16 bg-gray-300 rounded-full flex items-center justify-center overflow-hidden">
                    {author.avatar_url ? (
                      <img
                        src={author.avatar_url}
                        alt={author.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-2xl font-bold text-gray-600">
                        {author.name.charAt(0)}
                      </span>
                    )}
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">
                      {author.name}
                    </h3>
                    <p className="text-sm text-gray-500">{author.email}</p>
                  </div>
                </div>

                {author.bio && (
                  <p className="text-sm text-gray-600 mb-4 line-clamp-3">
                    {author.bio}
                  </p>
                )}

                <div className="flex justify-between text-sm text-gray-500 mb-4">
                  <span>{author.posts_count} Posts</span>
                  <span>{author.projects_count} Projects</span>
                </div>

                <div className="text-xs text-gray-400 mb-4">
                  Joined: {new Date(author.created_at).toLocaleDateString()}
                </div>

                <div className="flex space-x-2">
                  <button
                    onClick={() => handleEdit(author)}
                    disabled={submitting}
                    className="flex-1 bg-blue-50 text-blue-600 px-3 py-2 rounded-md text-sm font-medium hover:bg-blue-100 transition-colors disabled:opacity-50"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(author.id)}
                    disabled={submitting}
                    className="flex-1 bg-red-50 text-red-600 px-3 py-2 rounded-md text-sm font-medium hover:bg-red-100 transition-colors disabled:opacity-50"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Author Form */}
      {showForm && (
        <div className="bg-white rounded-lg shadow p-6 max-w-2xl mx-auto">
          <h2 className="text-xl font-semibold mb-6">
            {editingAuthor ? "Edit Author" : "Add New Author"}
          </h2>

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
                  placeholder="Enter author name"
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
              {formData.avatar_url && (
                <div className="mt-2">
                  <img
                    src={formData.avatar_url}
                    alt="Avatar preview"
                    className="w-16 h-16 rounded-full object-cover border-2 border-gray-200"
                    onError={(e) => {
                      e.target.style.display = "none";
                    }}
                  />
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Bio
              </label>
              <textarea
                value={formData.bio}
                onChange={(e) =>
                  setFormData({ ...formData, bio: e.target.value })
                }
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Tell us about this author..."
                disabled={submitting}
              />
              <p className="mt-1 text-xs text-gray-500">
                Character count: {formData.bio.length}
              </p>
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
                disabled={submitting}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center space-x-2"
              >
                {submitting && <div className="loading-spinner"></div>}
                <span>{editingAuthor ? "Update Author" : "Create Author"}</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Empty State */}
      {!showForm && authors.length === 0 && !loading && (
        <div className="text-center py-12">
          <div className="w-24 h-24 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
            <span className="text-4xl">👥</span>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No authors yet
          </h3>
          <p className="text-gray-500 mb-4">
            Get started by adding your first author.
          </p>
          <button
            onClick={() => setShowForm(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Add Author
          </button>
        </div>
      )}
    </div>
  );
};

export default AuthorsPage;
