"use client";
import { useState, useEffect } from "react";
import { db, subscribeToTable } from "../../../lib/supabase";
import { supabase } from "../../../lib/supabase";
import RichTextEditor from "../../components/RichTextEditor";

const PostsPage = () => {
  const [posts, setPosts] = useState([]);
  const [authors, setAuthors] = useState([]);
  const [categories, setCategories] = useState([]);
  const [tags, setTags] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingPost, setEditingPost] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [formData, setFormData] = useState({
    title: "",
    slug: "",
    content: "",
    excerpt: "",
    featured_image_url: "",
    published: false,
    author_id: "",
    selectedCategories: [],
    selectedTags: [],
    // SEO Fields
    seo_title: "",
    seo_description: "",
    seo_keywords: "",
  });

  // Character count states for SEO fields
  const [seoTitleCount, setSeoTitleCount] = useState(0);
  const [seoDescCount, setSeoDescCount] = useState(0);

  useEffect(() => {
    loadData();

    // Set up real-time subscriptions
    const subscriptions = [
      subscribeToTable("posts", () => loadPosts()),
      subscribeToTable("authors", () => loadAuthors()),
      subscribeToTable("categories", () => loadCategories()),
      subscribeToTable("tags", () => loadTags()),
    ];

    return () => {
      subscriptions.forEach((sub) => sub.unsubscribe());
    };
  }, []);

  // Update character counts when SEO fields change
  useEffect(() => {
    setSeoTitleCount(formData.seo_title.length);
  }, [formData.seo_title]);

  useEffect(() => {
    setSeoDescCount(formData.seo_description.length);
  }, [formData.seo_description]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      await Promise.all([
        loadPosts(),
        loadAuthors(),
        loadCategories(),
        loadTags(),
      ]);
    } catch (err) {
      console.error("Error loading data:", err);
      setError("Failed to load data. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Enhanced loadPosts to include categories and tags
  const loadPosts = async () => {
    try {
      const postsData = await db.posts.getAll();

      // Transform the data to match your expected format
      const formattedPosts = postsData.map((post) => ({
        ...post,
        categories: post.categories?.map((pc) => pc.category?.name) || [],
        tags: post.tags?.map((pt) => pt.tag?.name) || [],
      }));

      setPosts(formattedPosts);
    } catch (err) {
      console.error("Error loading posts:", err);
      setPosts([]);
    }
  };

  const loadAuthors = async () => {
    const data = await db.authors.getAll();
    setAuthors(data);
  };

  const loadCategories = async () => {
    const data = await db.categories.getAll();
    setCategories(data);
  };

  const loadTags = async () => {
    const data = await db.tags.getAll();
    setTags(data);
  };

  // Enhanced helper function to manage post categories
  const managePostCategories = async (postId, selectedCategoryNames) => {
    try {
      // First get all categories to map names to IDs
      const allCategories = await db.categories.getAll();

      // Find IDs for selected categories
      const selectedCategoryIds = selectedCategoryNames
        .map((name) => allCategories.find((c) => c.name === name)?.id)
        .filter(Boolean);

      // First delete all existing relationships
      const { error: deleteError } = await supabase
        .from("post_categories")
        .delete()
        .eq("post_id", postId);

      if (deleteError) throw deleteError;

      // Then insert new relationships if any
      if (selectedCategoryIds.length > 0) {
        const { error: insertError } = await supabase
          .from("post_categories")
          .insert(
            selectedCategoryIds.map((category_id) => ({
              post_id: postId,
              category_id,
            }))
          );

        if (insertError) throw insertError;
      }
    } catch (err) {
      console.error("Error managing post categories:", err);
      throw err;
    }
  };

  const managePostTags = async (postId, selectedTagNames) => {
    try {
      // First get all tags to map names to IDs
      const allTags = await db.tags.getAll();

      // Find IDs for selected tags
      const selectedTagIds = selectedTagNames
        .map((name) => allTags.find((t) => t.name === name)?.id)
        .filter(Boolean);

      // First delete all existing relationships
      const { error: deleteError } = await supabase
        .from("post_tags")
        .delete()
        .eq("post_id", postId);

      if (deleteError) throw deleteError;

      // Then insert new relationships if any
      if (selectedTagIds.length > 0) {
        const { error: insertError } = await supabase.from("post_tags").insert(
          selectedTagIds.map((tag_id) => ({
            post_id: postId,
            tag_id,
          }))
        );

        if (insertError) throw insertError;
      }
    } catch (err) {
      console.error("Error managing post tags:", err);
      throw err;
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      setSubmitting(true);
      setError(null);

      console.log("Submitting form data:", formData);

      // Validate that we have categories and tags data loaded
      if (categories.length === 0) {
        console.warn("No categories loaded");
      }
      if (tags.length === 0) {
        console.warn("No tags loaded");
      }

      // Prepare post data including SEO fields
      const postData = {
        title: formData.title,
        slug: formData.slug,
        content: formData.content,
        excerpt: formData.excerpt,
        featured_image_url: formData.featured_image_url || null,
        published: formData.published,
        author_id: formData.author_id,
        // Add SEO fields
        seo_title: formData.seo_title || null,
        seo_description: formData.seo_description || null,
        seo_keywords: formData.seo_keywords || null,
      };

      let result;
      let postId;

      if (editingPost) {
        // Update existing post
        result = await db.posts.update(editingPost.id, postData);
        postId = editingPost.id;
        console.log("Updated post:", postId);
      } else {
        // Create new post
        result = await db.posts.create(postData);
        postId = result.id;
        console.log("Created new post:", postId);
      }

      // Handle categories and tags relationships
      if (postId) {
        console.log("Managing relationships for post:", postId);

        // Manage categories
        await managePostCategories(postId, formData.selectedCategories);
        console.log("Categories managed successfully");

        // Manage tags
        await managePostTags(postId, formData.selectedTags);
        console.log("Tags managed successfully");

        // Reload the posts list to reflect changes
        await loadPosts();
        console.log("Posts reloaded");
      }

      resetForm();
    } catch (err) {
      console.error("Error saving post:", err);
      setError(err.message || "Failed to save post. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (post) => {
    console.log("Editing post:", post);
    setEditingPost(post);
    setFormData({
      title: post.title,
      slug: post.slug,
      content: post.content || "",
      excerpt: post.excerpt || "",
      featured_image_url: post.featured_image_url || "",
      published: post.published,
      author_id: post.author_id || "",
      selectedCategories: post.categories || [],
      selectedTags: post.tags || [],
      // Load SEO fields
      seo_title: post.seo_title || "",
      seo_description: post.seo_description || "",
      seo_keywords: post.seo_keywords || "",
    });
    setShowForm(true);
    setError(null);
  };

  const handleDelete = async (postId) => {
    const post = posts.find((p) => p.id === postId);
    if (
      !confirm(
        `Are you sure you want to delete "${post?.title}"? This action cannot be undone.`
      )
    ) {
      return;
    }

    try {
      setError(null);
      console.log("Starting deletion process for post:", postId);

      // If your db wrapper has methods for post_categories and post_tags
      // Use them instead of direct supabase calls

      // Delete related records first (due to foreign key constraints)
      console.log("Deleting post categories...");
      if (db.postCategories && db.postCategories.deleteByPostId) {
        await db.postCategories.deleteByPostId(postId);
      } else {
        // Fallback to direct supabase call
        const { error: categoriesError } = await supabase
          .from("post_categories")
          .delete()
          .eq("post_id", postId);
        if (categoriesError) throw categoriesError;
      }

      console.log("Deleting post tags...");
      if (db.postTags && db.postTags.deleteByPostId) {
        await db.postTags.deleteByPostId(postId);
      } else {
        // Fallback to direct supabase call
        const { error: tagsError } = await supabase
          .from("post_tags")
          .delete()
          .eq("post_id", postId);
        if (tagsError) throw tagsError;
      }

      // Delete the main post
      console.log("Deleting main post...");
      await db.posts.delete(postId);

      // Reload posts from database
      console.log("Reloading posts...");
      await loadPosts();

      console.log("Post deleted successfully");
    } catch (err) {
      console.error("Error deleting post:", err);
      setError(`Failed to delete post: ${err.message || "Unknown error"}`);

      // Try to reload posts anyway
      try {
        await loadPosts();
      } catch (loadErr) {
        console.error("Error reloading posts after failed deletion:", loadErr);
      }
    }
  };

  const handleTogglePublished = async (postId, currentStatus) => {
    try {
      setError(null);

      console.log(
        `Toggling post ${postId} from ${currentStatus} to ${!currentStatus}`
      );

      // Update in database
      const result = await db.posts.update(postId, {
        published: !currentStatus,
      });
      console.log("Database update result:", result);

      // Reload posts from database to ensure we have fresh data
      await loadPosts();

      console.log("Posts reloaded successfully");
    } catch (err) {
      console.error("Error updating post status:", err);
      setError(`Failed to update post status: ${err.message}`);

      // Reload posts anyway in case of partial update
      try {
        await loadPosts();
      } catch (loadErr) {
        console.error("Error reloading posts:", loadErr);
      }
    }
  };

  const resetForm = () => {
    setShowForm(false);
    setEditingPost(null);
    setFormData({
      title: "",
      slug: "",
      content: "",
      excerpt: "",
      featured_image_url: "",
      published: false,
      author_id: "",
      selectedCategories: [],
      selectedTags: [],
      // Reset SEO fields
      seo_title: "",
      seo_description: "",
      seo_keywords: "",
    });
    setError(null);
  };

  const generateSlug = (title) => {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
  };

  // Auto-fill SEO fields from content
  const autoFillSEO = () => {
    setFormData((prev) => ({
      ...prev,
      seo_title: prev.seo_title || prev.title,
      seo_description: prev.seo_description || prev.excerpt,
    }));
  };

  // Handle content change from RichTextEditor
  const handleContentChange = (content) => {
    console.log("Rich text editor content changed:", content); // Debug log
    setFormData((prev) => ({
      ...prev,
      content: content,
    }));
  };
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="flex items-center space-x-3">
          <div className="loading-spinner"></div>
          <span className="text-gray-600">Loading posts...</span>
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
          <h1 className="text-3xl font-bold text-gray-900">Posts Management</h1>
          <p className="text-gray-600 mt-1">
            {posts.length} total posts •{" "}
            {posts.filter((p) => p.published).length} published •{" "}
            {posts.filter((p) => !p.published).length} drafts
          </p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          disabled={submitting}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
        >
          + Add New Post
        </button>
      </div>

      {/* Posts Table */}
      {!showForm && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Post
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Author
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Categories & Tags
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
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
              {posts.map((post) => (
                <tr key={post.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="flex items-start space-x-3">
                      {post.featured_image_url && (
                        <img
                          src={post.featured_image_url}
                          alt=""
                          className="w-12 h-12 rounded object-cover"
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {post.title}
                        </p>
                        {post.excerpt && (
                          <p className="text-sm text-gray-500 line-clamp-2">
                            {post.excerpt}
                          </p>
                        )}
                        <p className="text-xs text-gray-400 mt-1">
                          /{post.slug}
                        </p>
                        {/* Show if SEO fields are set */}
                        {(post.seo_title ||
                          post.seo_description ||
                          post.seo_keywords) && (
                          <p className="text-xs text-green-600 mt-1">
                            ✓ SEO Optimized
                          </p>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <div className="flex items-center">
                      {post.author?.avatar_url && (
                        <img
                          src={post.author.avatar_url}
                          alt=""
                          className="w-6 h-6 rounded-full mr-2"
                        />
                      )}
                      {post.author?.name || "Unknown Author"}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    <div className="space-y-1">
                      {post.categories && post.categories.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {post.categories.map((category, index) => (
                            <span
                              key={index}
                              className="inline-flex px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded"
                            >
                              {category}
                            </span>
                          ))}
                        </div>
                      )}
                      {post.tags && post.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {post.tags.map((tag, index) => (
                            <span
                              key={index}
                              className="inline-flex px-2 py-1 text-xs font-medium bg-gray-100 text-gray-800 rounded"
                            >
                              #{tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <button
                      onClick={() =>
                        handleTogglePublished(post.id, post.published)
                      }
                      className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full cursor-pointer hover:opacity-80 ${
                        post.published
                          ? "bg-green-100 text-green-800"
                          : "bg-yellow-100 text-yellow-800"
                      }`}
                    >
                      {post.published ? "Published" : "Draft"}
                    </button>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(post.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                    <button
                      onClick={() => handleEdit(post)}
                      disabled={submitting}
                      className="text-blue-600 hover:text-blue-900 disabled:opacity-50"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(post.id)}
                      disabled={submitting}
                      className="text-red-600 hover:text-red-900 disabled:opacity-50"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {posts.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-500">
                No posts yet. Create your first post!
              </p>
            </div>
          )}
        </div>
      )}

      {/* Post Form */}
      {showForm && (
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold">
              {editingPost ? "Edit Post" : "Create New Post"}
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
                  Title *
                </label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => {
                    setFormData({
                      ...formData,
                      title: e.target.value,
                      slug: generateSlug(e.target.value),
                    });
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter post title"
                  disabled={submitting}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Slug
                </label>
                <input
                  type="text"
                  value={formData.slug}
                  onChange={(e) =>
                    setFormData({ ...formData, slug: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="post-url-slug"
                  disabled={submitting}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Author *
                </label>
                <select
                  required
                  value={formData.author_id}
                  onChange={(e) =>
                    setFormData({ ...formData, author_id: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={submitting}
                >
                  <option value="">Select Author</option>
                  {authors.map((author) => (
                    <option key={author.id} value={author.id}>
                      {author.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Featured Image URL
                </label>
                <input
                  type="url"
                  value={formData.featured_image_url}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      featured_image_url: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="https://example.com/image.jpg"
                  disabled={submitting}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Excerpt
              </label>
              <textarea
                value={formData.excerpt}
                onChange={(e) =>
                  setFormData({ ...formData, excerpt: e.target.value })
                }
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Brief description of the post..."
                disabled={submitting}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Content
              </label>
              <RichTextEditor
                value={formData.content}
                onChange={handleContentChange}
                disabled={submitting}
              />
            </div>

            {/* SEO Section */}
            <div className="border-t border-gray-200 pt-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">
                  SEO Settings
                </h3>
                <button
                  type="button"
                  onClick={autoFillSEO}
                  className="px-3 py-1 bg-gray-100 text-gray-700 rounded text-sm hover:bg-gray-200 transition-colors"
                >
                  Auto-fill from content
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    SEO Title
                    <span className="text-gray-400 font-normal ml-2">
                      ({seoTitleCount}/60 characters)
                    </span>
                  </label>
                  <input
                    type="text"
                    value={formData.seo_title}
                    onChange={(e) =>
                      setFormData({ ...formData, seo_title: e.target.value })
                    }
                    maxLength="60"
                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      seoTitleCount > 60 ? "border-red-300" : "border-gray-300"
                    }`}
                    placeholder="SEO optimized title (leave empty to use main title)"
                    disabled={submitting}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Recommended: 50-60 characters. This will appear in search
                    results.
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    SEO Description
                    <span className="text-gray-400 font-normal ml-2">
                      ({seoDescCount}/160 characters)
                    </span>
                  </label>
                  <textarea
                    value={formData.seo_description}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        seo_description: e.target.value,
                      })
                    }
                    maxLength="160"
                    rows="3"
                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      seoDescCount > 160 ? "border-red-300" : "border-gray-300"
                    }`}
                    placeholder="Meta description for search engines (leave empty to use excerpt)"
                    disabled={submitting}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Recommended: 150-160 characters. This will appear in search
                    results.
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    SEO Keywords
                  </label>
                  <input
                    type="text"
                    value={formData.seo_keywords}
                    onChange={(e) =>
                      setFormData({ ...formData, seo_keywords: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="keyword1, keyword2, keyword3"
                    disabled={submitting}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Comma-separated keywords for SEO optimization.
                  </p>
                </div>
              </div>
            </div>

            {/* Categories and Tags */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Categories
                  {formData.selectedCategories.length > 0 && (
                    <span className="text-xs text-gray-500 ml-2">
                      ({formData.selectedCategories.length} selected)
                    </span>
                  )}
                </label>
                <div className="border border-gray-300 rounded-md p-3 max-h-32 overflow-y-auto">
                  {categories.length === 0 ? (
                    <p className="text-sm text-gray-500">
                      No categories available
                    </p>
                  ) : (
                    categories.map((category) => (
                      <label
                        key={category.id}
                        className="flex items-center space-x-2 text-sm py-1 cursor-pointer hover:bg-gray-50 rounded px-1"
                      >
                        <input
                          type="checkbox"
                          checked={formData.selectedCategories.includes(
                            category.name
                          )}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setFormData({
                                ...formData,
                                selectedCategories: [
                                  ...formData.selectedCategories,
                                  category.name,
                                ],
                              });
                            } else {
                              setFormData({
                                ...formData,
                                selectedCategories:
                                  formData.selectedCategories.filter(
                                    (c) => c !== category.name
                                  ),
                              });
                            }
                          }}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                          disabled={submitting}
                        />
                        <span>{category.name}</span>
                      </label>
                    ))
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tags
                  {formData.selectedTags.length > 0 && (
                    <span className="text-xs text-gray-500 ml-2">
                      ({formData.selectedTags.length} selected)
                    </span>
                  )}
                </label>
                <div className="border border-gray-300 rounded-md p-3 max-h-32 overflow-y-auto">
                  {tags.length === 0 ? (
                    <p className="text-sm text-gray-500">No tags available</p>
                  ) : (
                    tags.map((tag) => (
                      <label
                        key={tag.id}
                        className="flex items-center space-x-2 text-sm py-1 cursor-pointer hover:bg-gray-50 rounded px-1"
                      >
                        <input
                          type="checkbox"
                          checked={formData.selectedTags.includes(tag.name)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setFormData({
                                ...formData,
                                selectedTags: [
                                  ...formData.selectedTags,
                                  tag.name,
                                ],
                              });
                            } else {
                              setFormData({
                                ...formData,
                                selectedTags: formData.selectedTags.filter(
                                  (t) => t !== tag.name
                                ),
                              });
                            }
                          }}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                          disabled={submitting}
                        />
                        <span>#{tag.name}</span>
                      </label>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* Display selected categories and tags */}
            {(formData.selectedCategories.length > 0 ||
              formData.selectedTags.length > 0) && (
              <div className="bg-gray-50 p-4 rounded-md">
                <h4 className="text-sm font-medium text-gray-700 mb-2">
                  Selected:
                </h4>
                <div className="space-y-2">
                  {formData.selectedCategories.length > 0 && (
                    <div>
                      <span className="text-xs text-gray-600">
                        Categories:{" "}
                      </span>
                      <div className="inline-flex flex-wrap gap-1">
                        {formData.selectedCategories.map((category, index) => (
                          <span
                            key={index}
                            className="inline-flex px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded"
                          >
                            {category}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  {formData.selectedTags.length > 0 && (
                    <div>
                      <span className="text-xs text-gray-600">Tags: </span>
                      <div className="inline-flex flex-wrap gap-1">
                        {formData.selectedTags.map((tag, index) => (
                          <span
                            key={index}
                            className="inline-flex px-2 py-1 text-xs font-medium bg-gray-100 text-gray-800 rounded"
                          >
                            #{tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="flex items-center">
              <input
                type="checkbox"
                id="published"
                checked={formData.published}
                onChange={(e) =>
                  setFormData({ ...formData, published: e.target.checked })
                }
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                disabled={submitting}
              />
              <label
                htmlFor="published"
                className="ml-2 block text-sm text-gray-900"
              >
                Publish immediately
              </label>
            </div>

            <div className="flex justify-end space-x-4">
              <button
                type="button"
                onClick={resetForm}
                disabled={submitting}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting || !formData.title || !formData.author_id}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center space-x-2"
              >
                {submitting && <div className="loading-spinner"></div>}
                <span>{editingPost ? "Update Post" : "Create Post"}</span>
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default PostsPage;
