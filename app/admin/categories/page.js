"use client";
import { useState, useEffect } from "react";
import { db, subscribeToTable, supabase } from "../../../lib/supabase";

const CategoriesPage = () => {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [formData, setFormData] = useState({
    name: "",
  });

  useEffect(() => {
    loadCategories();

    // Set up real-time subscription
    const subscription = subscribeToTable("categories", (payload) => {
      console.log("Categories table changed:", payload);
      loadCategories();
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const loadCategories = async () => {
    try {
      setLoading(true);
      setError(null);

      // Get categories with post counts
      const categoriesData = await db.categories.getAll();

      // Get post counts for each category
      const categoriesWithCounts = await Promise.all(
        categoriesData.map(async (category) => {
          const { count } = await supabase
            .from("post_categories")
            .select("*", { count: "exact", head: true })
            .eq("category_id", category.id);

          return {
            ...category,
            post_count: count || 0,
          };
        })
      );

      setCategories(categoriesWithCounts);
    } catch (err) {
      console.error("Error loading categories:", err);
      setError("Failed to load categories. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      setSubmitting(true);
      setError(null);

      // Check for duplicate names
      const existingCategory = categories.find(
        (cat) =>
          cat.name.toLowerCase() === formData.name.toLowerCase() &&
          cat.id !== editingCategory?.id
      );

      if (existingCategory) {
        setError("A category with this name already exists.");
        return;
      }

      let result;

      if (editingCategory) {
        // Update existing category
        result = await db.categories.update(editingCategory.id, formData);
        setCategories(
          categories.map((category) =>
            category.id === editingCategory.id
              ? { ...result, post_count: category.post_count }
              : category
          )
        );
      } else {
        // Create new category
        result = await db.categories.create(formData);
        setCategories([{ ...result, post_count: 0 }, ...categories]);
      }

      resetForm();
    } catch (err) {
      console.error("Error saving category:", err);
      setError(err.message || "Failed to save category. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (category) => {
    setEditingCategory(category);
    setFormData({
      name: category.name,
      slug: category.slug,
      description: category.description,
    });
    setShowForm(true);
    setError(null);
  };

  const handleDelete = async (categoryId) => {
    const category = categories.find((c) => c.id === categoryId);

    if (category && category.post_count > 0) {
      if (
        !confirm(
          `This category has ${category.post_count} posts. Are you sure you want to delete it? Posts will lose this category association.`
        )
      ) {
        return;
      }
    } else if (!confirm("Are you sure you want to delete this category?")) {
      return;
    }

    try {
      setError(null);

      // Delete the category (cascade will handle post_categories)
      await db.categories.delete(categoryId);
      setCategories(
        categories.filter((category) => category.id !== categoryId)
      );
    } catch (err) {
      console.error("Error deleting category:", err);
      setError("Failed to delete category. Please try again.");
    }
  };

  const resetForm = () => {
    setShowForm(false);
    setEditingCategory(null);
    setFormData({ name: "", slug: "", description: "" });
    setError(null);
  };

  const totalPosts = categories.reduce((sum, cat) => sum + cat.post_count, 0);
  const avgPostsPerCategory =
    categories.length > 0 ? Math.round(totalPosts / categories.length) : 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="flex items-center space-x-3">
          <div className="loading-spinner"></div>
          <span className="text-gray-600">Loading categories...</span>
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
            Categories Management
          </h1>
          <p className="text-gray-600 mt-1">
            Organize your content with categories • {categories.length} total
            categories
          </p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          disabled={submitting}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
        >
          + Add New Category
        </button>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <span className="text-2xl">📂</span>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">
                Total Categories
              </p>
              <p className="text-2xl font-semibold text-gray-900">
                {categories.length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <span className="text-2xl">📝</span>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Total Posts</p>
              <p className="text-2xl font-semibold text-gray-900">
                {totalPosts}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <span className="text-2xl">📊</span>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">
                Avg Posts/Category
              </p>
              <p className="text-2xl font-semibold text-gray-900">
                {avgPostsPerCategory}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Categories Table */}
      {!showForm && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Category Name
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
              {categories.map((category) => (
                <tr key={category.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-8 w-8">
                        <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
                          <span className="text-sm font-medium text-blue-600">
                            {category.name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">
                          {category.name}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        category.post_count > 10
                          ? "bg-green-100 text-green-800"
                          : category.post_count > 5
                          ? "bg-yellow-100 text-yellow-800"
                          : category.post_count > 0
                          ? "bg-blue-100 text-blue-800"
                          : "bg-gray-100 text-gray-800"
                      }`}
                    >
                      {category.post_count} posts
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(category.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                    <button
                      onClick={() => handleEdit(category)}
                      disabled={submitting}
                      className="text-blue-600 hover:text-blue-900 transition-colors disabled:opacity-50"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(category.id)}
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

          {categories.length === 0 && (
            <div className="text-center py-12">
              <div className="w-24 h-24 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                <span className="text-4xl">📂</span>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No categories yet
              </h3>
              <p className="text-gray-500 mb-4">
                Create categories to organize your blog posts.
              </p>
              <button
                onClick={() => setShowForm(true)}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Add Category
              </button>
            </div>
          )}
        </div>
      )}

      {/* Category Form */}
      {showForm && (
        <div className="bg-white rounded-lg shadow p-6 max-w-md mx-auto">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold">
              {editingCategory ? "Edit Category" : "Add New Category"}
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
                Category Name *
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter category name"
                autoFocus
                disabled={submitting}
              />
              <p className="mt-1 text-xs text-gray-500">
                Choose a descriptive name for your category
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Slug
              </label>
              <input
                type="text"
                required
                value={formData.slug}
                onChange={(e) =>
                  setFormData({ ...formData, slug: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter category slug"
                autoFocus
                disabled={submitting}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                One line description
              </label>
              <input
                type="text"
                required
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter category desc"
                autoFocus
                disabled={submitting}
              />
            </div>

            {/* Preview */}
            {formData.name && (
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-600 mb-1">Preview:</p>
                <div className="flex items-center">
                  <div className="h-6 w-6 rounded-full bg-blue-100 flex items-center justify-center mr-2">
                    <span className="text-xs font-medium text-blue-600">
                      {formData.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm font-medium text-gray-900">
                      {formData.name}
                    </span>

                    <span className="text-xs font-medium text-gray-400">
                      {"/" + formData.slug}
                    </span>
                  </div>
                </div>
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
                <span>
                  {editingCategory ? "Update Category" : "Create Category"}
                </span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Usage Stats */}
      {!showForm && categories.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Category Usage
          </h3>
          <div className="space-y-3">
            {categories
              .sort((a, b) => b.post_count - a.post_count)
              .slice(0, 5)
              .map((category, index) => (
                <div
                  key={category.id}
                  className="flex items-center justify-between"
                >
                  <div className="flex items-center">
                    <span className="text-sm font-medium text-gray-600 w-4">
                      {index + 1}.
                    </span>
                    <span className="ml-2 text-sm font-medium text-gray-900">
                      {category.name}
                    </span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="w-24 bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-500 h-2 rounded-full"
                        style={{
                          width: `${
                            totalPosts > 0
                              ? (category.post_count / totalPosts) * 100
                              : 0
                          }%`,
                        }}
                      ></div>
                    </div>
                    <span className="text-sm font-medium text-gray-500 w-12 text-right">
                      {category.post_count} posts
                    </span>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default CategoriesPage;
