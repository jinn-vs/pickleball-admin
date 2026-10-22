"use client";
import { useState, useEffect, useRef, useCallback } from "react";

const MediaPage = () => {
  const [mediaFiles, setMediaFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showUpload, setShowUpload] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({});
  const [selectedFiles, setSelectedFiles] = useState([]);
  const fileInputRef = useRef(null);

  // Accepted file types
  const acceptedTypes = ["image/png", "image/jpeg", "image/jpg", "image/webp"];
  const maxFileSize = 10 * 1024 * 1024; // 10MB

  // Load media files
  useEffect(() => {
    loadMediaFiles();
  }, []);

  const loadMediaFiles = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch("/api/list-media");
      if (!response.ok) {
        throw new Error("Failed to load media files");
      }

      const data = await response.json();
      setMediaFiles(data.files || []);
    } catch (err) {
      console.error("Error loading media files:", err);
      setError("Failed to load media files. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Validate file
  const validateFile = (file) => {
    if (!acceptedTypes.includes(file.type)) {
      return "Please upload PNG, JPEG, JPG, or WebP images only.";
    }
    if (file.size > maxFileSize) {
      return "File size must be less than 10MB.";
    }
    return null;
  };

  // Handle drag events
  const handleDrag = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  // Handle drop
  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const files = Array.from(e.dataTransfer.files);
    handleFileSelection(files);
  }, []);

  // Handle file selection
  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files);
    handleFileSelection(files);
  };

  // Process selected files
  const handleFileSelection = (files) => {
    setError("");
    const validFiles = [];

    for (const file of files) {
      const validationError = validateFile(file);
      if (validationError) {
        setError(validationError);
        return;
      }
      validFiles.push(file);
    }

    if (validFiles.length > 0) {
      setSelectedFiles(validFiles);
      setShowUpload(true);
    }
  };

  // Upload files
  const handleUpload = async () => {
    if (selectedFiles.length === 0) return;

    setUploading(true);
    const newProgress = {};
    const uploadedFiles = [];

    for (let i = 0; i < selectedFiles.length; i++) {
      const file = selectedFiles[i];
      newProgress[file.name] = 0;
      setUploadProgress({ ...newProgress });

      try {
        const formData = new FormData();
        formData.append("file", file);

        const response = await fetch("/api/upload-media", {
          method: "POST",
          body: formData,
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Upload failed");
        }

        const result = await response.json();

        uploadedFiles.push({
          id: Date.now() + i,
          name: file.name,
          url: result.url,
          size: file.size,
          type: file.type,
          uploadedAt: new Date().toISOString(),
          fileName: result.fileName,
        });

        newProgress[file.name] = 100;
        setUploadProgress({ ...newProgress });
      } catch (error) {
        console.error("Upload error:", error);
        setError(`Failed to upload ${file.name}: ${error.message}`);
        delete newProgress[file.name];
        setUploadProgress({ ...newProgress });
      }
    }

    // Add uploaded files to the list
    setMediaFiles((prev) => [...uploadedFiles, ...prev]);

    setUploading(false);
    setTimeout(() => {
      setUploadProgress({});
      resetUpload();
    }, 2000);
  };

  // Delete file
  const handleDelete = async (mediaId, fileName) => {
    const media = mediaFiles.find((m) => m.id === mediaId);

    if (
      !confirm(
        `Are you sure you want to delete "${media.name}"? This action cannot be undone.`
      )
    ) {
      return;
    }

    try {
      setError(null);

      const response = await fetch("/api/delete-media", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ fileName }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Delete failed");
      }

      setMediaFiles(mediaFiles.filter((media) => media.id !== mediaId));
    } catch (err) {
      console.error("Error deleting media:", err);
      setError("Failed to delete media file. Please try again.");
    }
  };

  // Copy URL to clipboard
  const copyToClipboard = async (url) => {
    try {
      await navigator.clipboard.writeText(url);
      // You could add a toast notification here
      alert("URL copied to clipboard!");
    } catch (err) {
      console.error("Failed to copy: ", err);
      setError("Failed to copy URL to clipboard");
    }
  };

  // Reset upload form
  const resetUpload = () => {
    setShowUpload(false);
    setSelectedFiles([]);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // Format file size
  const formatFileSize = (bytes) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  // Get file type stats
  const getFileStats = () => {
    const stats = {
      total: mediaFiles.length,
      png: mediaFiles.filter((f) => f.type?.includes("png")).length,
      jpeg: mediaFiles.filter(
        (f) => f.type?.includes("jpeg") || f.type?.includes("jpg")
      ).length,
      webp: mediaFiles.filter((f) => f.type?.includes("webp")).length,
      totalSize: mediaFiles.reduce(
        (total, file) => total + (file.size || 0),
        0
      ),
    };
    return stats;
  };

  const stats = getFileStats();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="flex items-center space-x-3">
          <div className="loading-spinner"></div>
          <span className="text-gray-600">Loading media files...</span>
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
          <h1 className="text-3xl font-bold text-gray-900">Media Management</h1>
          <p className="text-gray-600 mt-1">
            Upload and manage images for your content
          </p>
        </div>
        <button
          onClick={() => setShowUpload(true)}
          disabled={uploading}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
        >
          📤 Upload Media
        </button>
      </div>

      {/* Stats Cards */}
      {!showUpload && mediaFiles.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-2xl font-bold text-blue-600">
              {stats.total}
            </div>
            <div className="text-blue-600 text-sm">Total Files</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-2xl font-bold text-green-600">{stats.png}</div>
            <div className="text-green-600 text-sm">PNG Files</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-2xl font-bold text-yellow-600">
              {stats.jpeg}
            </div>
            <div className="text-yellow-600 text-sm">JPEG Files</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-2xl font-bold text-purple-600">
              {stats.webp}
            </div>
            <div className="text-purple-600 text-sm">WebP Files</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-2xl font-bold text-gray-600">
              {formatFileSize(stats.totalSize)}
            </div>
            <div className="text-gray-600 text-sm">Total Size</div>
          </div>
        </div>
      )}

      {/* Media Grid */}
      {!showUpload && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {mediaFiles.map((media) => (
            <div
              key={media.id}
              className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow"
            >
              <div className="aspect-square bg-gray-100 overflow-hidden">
                <img
                  src={media.url}
                  alt={media.name}
                  className="w-full h-full object-cover hover:scale-105 transition-transform duration-200"
                />
              </div>

              <div className="p-4">
                <h3 className="font-medium text-gray-900 text-sm truncate mb-2">
                  {media.name}
                </h3>

                <div className="text-xs text-gray-500 space-y-1 mb-4">
                  <div>Size: {formatFileSize(media.size)}</div>
                  <div>Type: {media.type?.split("/")[1]?.toUpperCase()}</div>
                  <div>
                    Uploaded: {new Date(media.uploadedAt).toLocaleDateString()}
                  </div>
                </div>

                <div className="bg-gray-50 rounded p-2 mb-4">
                  <p className="text-xs text-gray-600 font-mono break-all">
                    {media.url}
                  </p>
                </div>

                <div className="flex space-x-2">
                  <button
                    onClick={() => copyToClipboard(media.url)}
                    disabled={uploading}
                    className="flex-1 bg-blue-50 text-blue-600 px-3 py-2 rounded-md text-sm font-medium hover:bg-blue-100 transition-colors disabled:opacity-50"
                  >
                    📋 Copy URL
                  </button>
                  <button
                    onClick={() =>
                      handleDelete(media.id, media.fileName || media.name)
                    }
                    disabled={uploading}
                    className="bg-red-50 text-red-600 px-3 py-2 rounded-md text-sm font-medium hover:bg-red-100 transition-colors disabled:opacity-50"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Upload Form */}
      {showUpload && (
        <div className="bg-white rounded-lg shadow p-6 max-w-4xl mx-auto">
          <h2 className="text-xl font-semibold mb-6">Upload Media Files</h2>

          {/* File Selection Area */}
          {selectedFiles.length === 0 && (
            <div
              className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                dragActive
                  ? "border-blue-500 bg-blue-50"
                  : "border-gray-300 hover:border-gray-400"
              } ${uploading ? "opacity-50 pointer-events-none" : ""}`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              <div className="space-y-4">
                <div className="text-6xl">📤</div>
                <div>
                  <p className="text-lg font-medium text-gray-900">
                    Drag and drop your images here
                  </p>
                  <p className="text-gray-500">or</p>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                    disabled={uploading}
                  >
                    Browse Files
                  </button>
                </div>
                <p className="text-sm text-gray-400">
                  Supports: PNG, JPEG, JPG, WebP (Max 10MB each)
                </p>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept=".png,.jpg,.jpeg,.webp"
                onChange={handleFileSelect}
                className="hidden"
              />
            </div>
          )}

          {/* Selected Files Preview */}
          {selectedFiles.length > 0 && !uploading && (
            <div className="space-y-4">
              <h3 className="font-medium text-gray-900">
                Selected Files ({selectedFiles.length})
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {selectedFiles.map((file, index) => (
                  <div key={index} className="border rounded-lg p-3">
                    <div className="aspect-square bg-gray-100 rounded mb-2 overflow-hidden">
                      <img
                        src={URL.createObjectURL(file)}
                        alt={file.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <p className="text-sm font-medium truncate">{file.name}</p>
                    <p className="text-xs text-gray-500">
                      {formatFileSize(file.size)}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Upload Progress */}
          {Object.keys(uploadProgress).length > 0 && (
            <div className="space-y-2">
              <h3 className="font-medium text-gray-900">Upload Progress</h3>
              {Object.entries(uploadProgress).map(([fileName, progress]) => (
                <div key={fileName} className="bg-gray-50 rounded-lg p-3">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm text-gray-700">{fileName}</span>
                    <span className="text-sm text-gray-500">{progress}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${progress}%` }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Form Actions */}
          <div className="flex justify-end space-x-4 mt-6">
            <button
              type="button"
              onClick={resetUpload}
              disabled={uploading}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            {selectedFiles.length > 0 && !uploading && (
              <button
                onClick={handleUpload}
                disabled={uploading}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center space-x-2"
              >
                <span>
                  Upload {selectedFiles.length} File
                  {selectedFiles.length > 1 ? "s" : ""}
                </span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Empty State */}
      {!showUpload && mediaFiles.length === 0 && !loading && (
        <div className="text-center py-12">
          <div className="w-24 h-24 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
            <span className="text-4xl">🖼️</span>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No media files yet
          </h3>
          <p className="text-gray-500 mb-4">
            Get started by uploading your first image.
          </p>
          <button
            onClick={() => setShowUpload(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            📤 Upload Media
          </button>
        </div>
      )}
    </div>
  );
};

export default MediaPage;
