"use client";
import { useState, useEffect } from "react";
import { db, subscribeToTable, supabase } from "../../../lib/supabase";

const TagsPage = () => {
  const [tags, setTags] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingTag, setEditingTag] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [formData, setFormData] = useState({
    name: "",
  });

  useEffect(() => {
    loadTags();

    // Set up real-time subscription
    const subscription = subscribeToTable("tags", (payload) => {
      console.log("Tags table changed:", payload);
      loadTags();
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const loadTags = async () => {
    try {
      setLoading(true);
      setError(null);

      // Get tags with post counts
      const tagsData = await db.tags.getAll();

      // Get post counts for each tag
      const tagsWithCounts = await Promise.all(
        tagsData.map(async (tag) => {
          const { count } = await supabase
            .from("post_tags")
            .select("*", { count: "exact", head: true })
            .eq("tag_id", tag.id);

          return {
            ...tag,
            post_count: count || 0,
          };
        })
      );

      setTags(tagsWithCounts);
    } catch (err) {
      console.error("Error loading tags:", err);
      setError("Failed to load tags. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const filteredTags = tags.filter((tag) =>
    tag.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      setSubmitting(true);
      setError(null);

      const trimmedName = formData.name.trim().toLowerCase();

      // Check for duplicate
      const existingTag = tags.find(
        (tag) =>
          tag.name.toLowerCase() === trimmedName && tag.id !== editingTag?.id
      );

      if (existingTag) {
        setError("A tag with this name already exists.");
        return;
      }

      let result;

      if (editingTag) {
        // Update existing tag
        result = await db.tags.update(editingTag.id, { name: trimmedName });
        setTags(
          tags.map((tag) =>
            tag.id === editingTag.id
              ? { ...result, post_count: tag.post_count }
              : tag
          )
        );
      } else {
        // Create new tag
        result = await db.tags.create({ name: trimmedName });
        setTags([{ ...result, post_count: 0 }, ...tags]);
      }

      resetForm();
    } catch (err) {
      console.error("Error saving tag:", err);
      setError(err.message || "Failed to save tag. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (tag) => {
    setEditingTag(tag);
    setFormData({ name: tag.name });
    setShowForm(true);
    setError(null);
  };

  const handleDelete = async (tagId) => {
    const tag = tags.find((t) => t.id === tagId);

    if (tag && tag.post_count > 0) {
      if (
        !confirm(
          `This tag has ${tag.post_count} posts. Are you sure you want to delete it? Posts will lose this tag association.`
        )
      ) {
        return;
      }
    } else if (!confirm("Are you sure you want to delete this tag?")) {
      return;
    }

    try {
      setError(null);
      await db.tags.delete(tagId);
      setTags(tags.filter((tag) => tag.id !== tagId));
    } catch (err) {
      console.error("Error deleting tag:", err);
      setError("Failed to delete tag. Please try again.");
    }
  };

  const handleBulkDelete = async () => {
    const unusedTags = tags.filter((tag) => tag.post_count === 0);
    if (unusedTags.length === 0) {
      alert("No unused tags to delete.");
      return;
    }

    if (
      !confirm(
        `Delete ${unusedTags.length} unused tags? This action cannot be undone.`
      )
    ) {
      return;
    }

    try {
      setError(null);

      // Delete all unused tags
      await Promise.all(unusedTags.map((tag) => db.tags.delete(tag.id)));

      setTags(tags.filter((tag) => tag.post_count > 0));
    } catch (err) {
      console.error("Error bulk deleting tags:", err);
      setError("Failed to delete unused tags. Please try again.");
    }
  };

  const resetForm = () => {
    setShowForm(false);
    setEditingTag(null);
    setFormData({ name: "" });
    setError(null);
  };

  const getTagColor = (postCount) => {
    if (postCount >= 20) return "bg-red-100 text-red-800";
    if (postCount >= 10) return "bg-orange-100 text-orange-800";
    if (postCount >= 5) return "bg-yellow-100 text-yellow-800";
    if (postCount > 0) return "bg-green-100 text-green-800";
    return "bg-gray-100 text-gray-800";
  };

  const totalPosts = tags.reduce((sum, tag) => sum + tag.post_count, 0);
  const usedTags = tags.filter((tag) => tag.post_count > 0).length;
  const avgUsage = tags.length > 0 ? Math.round(totalPosts / tags.length) : 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="flex items-center space-x-3">
          <div className="loading-spinner"></div>
          <span className="text-gray-600">Loading tags...</span>
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
          <h1 className="text-3xl font-bold text-gray-900">Tags Management</h1>
          <p className="text-gray-600 mt-1">
            Tag your content for better organization • {tags.length} total tags
          </p>
        </div>
        <div className="flex space-x-2">
          {tags.filter((tag) => tag.post_count === 0).length > 0 && (
            <button
              onClick={handleBulkDelete}
              disabled={submitting}
              className="bg-red-100 text-red-700 px-4 py-2 rounded-lg hover:bg-red-200 transition-colors disabled:opacity-50"
            >
              Delete Unused ({tags.filter((tag) => tag.post_count === 0).length}
              )
            </button>
          )}
          <button
            onClick={() => setShowForm(true)}
            disabled={submitting}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            + Add New Tag
          </button>
        </div>
      </div>

      {/* Search and Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-1">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Search Tags
          </label>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search tags..."
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <p className="mt-1 text-xs text-gray-500">
            Showing {filteredTags.length} of {tags.length} tags
          </p>
        </div>

        <div className="lg:col-span-3 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <span className="text-xl">🏷️</span>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-500">Total Tags</p>
                <p className="text-xl font-semibold text-gray-900">
                  {tags.length}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <span className="text-xl">📝</span>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-500">Used Tags</p>
                <p className="text-xl font-semibold text-gray-900">
                  {usedTags}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <span className="text-xl">📊</span>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-500">Avg Usage</p>
                <p className="text-xl font-semibold text-gray-900">
                  {avgUsage}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tags Grid/Table View */}
      {!showForm && (
        <div className="bg-white rounded-lg shadow">
          {/* Mobile Card View */}
          <div className="block md:hidden p-4 space-y-4">
            {filteredTags.map((tag) => (
              <div
                key={tag.id}
                className="border border-gray-200 rounded-lg p-4"
              >
                <div className="flex justify-between items-start mb-2">
                  <span
                    className={`inline-flex px-3 py-1 text-sm font-medium rounded-full ${getTagColor(
                      tag.post_count
                    )}`}
                  >
                    #{tag.name}
                  </span>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleEdit(tag)}
                      disabled={submitting}
                      className="text-blue-600 hover:text-blue-900 text-sm disabled:opacity-50"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(tag.id)}
                      disabled={submitting}
                      className="text-red-600 hover:text-red-900 text-sm disabled:opacity-50"
                    >
                      Delete
                    </button>
                  </div>
                </div>
                <div className="text-sm text-gray-500">
                  {tag.post_count} posts • Created{" "}
                  {new Date(tag.created_at).toLocaleDateString()}
                </div>
              </div>
            ))}
          </div>

          {/* Desktop Table View */}
          <div className="hidden md:block overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tag Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Posts Count
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Created Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredTags.map((tag) => (
                  <tr key={tag.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex px-3 py-1 text-sm font-medium rounded-full ${getTagColor(
                          tag.post_count
                        )}`}
                      >
                        #{tag.name}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {tag.post_count} posts
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(tag.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                      <button
                        onClick={() => handleEdit(tag)}
                        disabled={submitting}
                        className="text-blue-600 hover:text-blue-900 transition-colors disabled:opacity-50"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(tag.id)}
                        disabled={submitting}
                        className="text-red-600 hover:text-red-900 transition-colors disabled:opacity-50"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {filteredTags.length === 0 && tags.length > 0 && (
              <div className="text-center py-12">
                <div className="w-24 h-24 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                  <span className="text-4xl">🔍</span>
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  No tags found
                </h3>
                <p className="text-gray-500 mb-4">
                  Try adjusting your search term.
                </p>
                <button
                  onClick={() => setSearchTerm("")}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Clear Search
                </button>
              </div>
            )}

            {tags.length === 0 && (
              <div className="text-center py-12">
                <div className="w-24 h-24 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                  <span className="text-4xl">🏷️</span>
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  No tags yet
                </h3>
                <p className="text-gray-500 mb-4">
                  Create tags to organize your content.
                </p>
                <button
                  onClick={() => setShowForm(true)}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Add Tag
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tag Form */}
      {showForm && (
        <div className="bg-white rounded-lg shadow p-6 max-w-md mx-auto">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold">
              {editingTag ? "Edit Tag" : "Add New Tag"}
            </h2>
            <button
              onClick={resetForm}
              className="text-gray-400 hover:text-gray-600"
            >
              ✕
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tag Name *
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter tag name (e.g., blockchain)"
                autoFocus
                disabled={submitting}
              />
              <p className="mt-1 text-xs text-gray-500">
                Use lowercase, single words or hyphenated phrases. No spaces or
                special characters.
              </p>
            </div>

            {formData.name && (
              <div className="p-3 bg-gray-50 rounded-md">
                <p className="text-sm text-gray-600 mb-1">Preview:</p>
                <span className="inline-flex px-3 py-1 text-sm font-medium rounded-full bg-blue-100 text-blue-800">
                  #{formData.name.trim().toLowerCase()}
                </span>
              </div>
            )}

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
                disabled={submitting || !formData.name.trim()}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center space-x-2"
              >
                {submitting && <div className="loading-spinner"></div>}
                <span>{editingTag ? "Update Tag" : "Create Tag"}</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Tag Usage Analytics */}
      {!showForm && tags.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Tag Usage Analytics
          </h3>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Most Used Tags */}
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-3">
                Most Used Tags
              </h4>
              <div className="space-y-2">
                {tags
                  .filter((tag) => tag.post_count > 0)
                  .sort((a, b) => b.post_count - a.post_count)
                  .slice(0, 5)
                  .map((tag, index) => (
                    <div
                      key={tag.id}
                      className="flex items-center justify-between"
                    >
                      <div className="flex items-center">
                        <span className="text-sm font-medium text-gray-600 w-4">
                          {index + 1}.
                        </span>
                        <span className="ml-2 text-sm font-medium text-gray-900">
                          #{tag.name}
                        </span>
                      </div>
                      <div className="flex items-center space-x-3">
                        <div className="w-20 bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-blue-500 h-2 rounded-full"
                            style={{
                              width: `${
                                totalPosts > 0
                                  ? (tag.post_count / totalPosts) * 100
                                  : 0
                              }%`,
                            }}
                          ></div>
                        </div>
                        <span className="text-sm font-medium text-gray-500 w-8 text-right">
                          {tag.post_count}
                        </span>
                      </div>
                    </div>
                  ))}
              </div>
            </div>

            {/* Unused Tags */}
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-3">
                Unused Tags ({tags.filter((tag) => tag.post_count === 0).length}
                )
              </h4>
              <div className="max-h-32 overflow-y-auto">
                <div className="flex flex-wrap gap-2">
                  {tags
                    .filter((tag) => tag.post_count === 0)
                    .slice(0, 10)
                    .map((tag) => (
                      <span
                        key={tag.id}
                        className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-600"
                      >
                        #{tag.name}
                      </span>
                    ))}
                  {tags.filter((tag) => tag.post_count === 0).length > 10 && (
                    <span className="text-xs text-gray-500">
                      +{tags.filter((tag) => tag.post_count === 0).length - 10}{" "}
                      more
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TagsPage;
