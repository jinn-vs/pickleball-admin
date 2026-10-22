"use client";
import { useState, useRef, useCallback } from "react";

const MediaUpload = () => {
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({});
  const [error, setError] = useState("");
  const fileInputRef = useRef(null);

  // Accepted file types
  const acceptedTypes = ["image/png", "image/jpeg", "image/jpg", "image/webp"];
  const maxFileSize = 10 * 1024 * 1024; // 10MB

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
    handleFiles(files);
  }, []);

  // Handle file selection
  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files);
    handleFiles(files);
  };

  // Process selected files
  const handleFiles = async (files) => {
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
      await uploadFiles(validFiles);
    }
  };

  // Upload files to server
  const uploadFiles = async (files) => {
    setUploading(true);
    const newProgress = {};

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
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

        // Add to uploaded files list
        setUploadedFiles((prev) => [
          ...prev,
          {
            id: Date.now() + i,
            name: file.name,
            url: result.url,
            size: file.size,
            type: file.type,
            uploadedAt: new Date().toISOString(),
          },
        ]);

        newProgress[file.name] = 100;
        setUploadProgress({ ...newProgress });
      } catch (error) {
        console.error("Upload error:", error);
        setError(`Failed to upload ${file.name}: ${error.message}`);
        delete newProgress[file.name];
        setUploadProgress({ ...newProgress });
      }
    }

    setUploading(false);
    // Clear progress after a delay
    setTimeout(() => setUploadProgress({}), 2000);
  };

  // Format file size
  const formatFileSize = (bytes) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  // Copy URL to clipboard
  const copyToClipboard = async (url) => {
    try {
      await navigator.clipboard.writeText(url);
      // You could add a toast notification here
      alert("URL copied to clipboard!");
    } catch (err) {
      console.error("Failed to copy: ", err);
    }
  };

  // Delete uploaded file
  const deleteFile = async (fileId, fileName) => {
    try {
      const response = await fetch("/api/delete-media", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ fileName }),
      });

      if (response.ok) {
        setUploadedFiles((prev) => prev.filter((file) => file.id !== fileId));
      } else {
        const errorData = await response.json();
        setError(`Failed to delete file: ${errorData.error}`);
      }
    } catch (error) {
      console.error("Delete error:", error);
      setError("Failed to delete file");
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-lg">
        <div className="p-6 border-b border-gray-200">
          <h1 className="text-2xl font-bold text-gray-900">Media Upload</h1>
          <p className="text-gray-600 mt-2">
            Upload images in PNG, JPEG, JPG, or WebP format. Maximum file size:
            10MB.
          </p>
        </div>

        {/* Upload Area */}
        <div className="p-6">
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
                  {uploading ? "Uploading..." : "Browse Files"}
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

          {/* Error Message */}
          {error && (
            <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex">
                <span className="text-red-400 text-xl mr-3">⚠️</span>
                <p className="text-red-700">{error}</p>
              </div>
            </div>
          )}

          {/* Upload Progress */}
          {Object.keys(uploadProgress).length > 0 && (
            <div className="mt-6 space-y-2">
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
        </div>

        {/* Uploaded Files Grid */}
        {uploadedFiles.length > 0 && (
          <div className="border-t border-gray-200">
            <div className="p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                Uploaded Files ({uploadedFiles.length})
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {uploadedFiles.map((file) => (
                  <div
                    key={file.id}
                    className="bg-gray-50 rounded-lg p-4 border border-gray-200 hover:shadow-md transition-shadow"
                  >
                    <div className="aspect-square mb-3 rounded-lg overflow-hidden bg-gray-100">
                      <img
                        src={file.url}
                        alt={file.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="space-y-2">
                      <h3 className="font-medium text-gray-900 text-sm truncate">
                        {file.name}
                      </h3>
                      <p className="text-xs text-gray-500">
                        {formatFileSize(file.size)}
                      </p>
                      <div className="flex space-x-2">
                        <button
                          onClick={() => copyToClipboard(file.url)}
                          className="flex-1 bg-blue-600 text-white text-xs py-2 px-3 rounded hover:bg-blue-700 transition-colors"
                        >
                          📋 Copy URL
                        </button>
                        <button
                          onClick={() => deleteFile(file.id, file.name)}
                          className="bg-red-600 text-white text-xs py-2 px-3 rounded hover:bg-red-700 transition-colors"
                        >
                          🗑️
                        </button>
                      </div>
                      <div className="bg-gray-100 rounded p-2">
                        <p className="text-xs text-gray-600 font-mono break-all">
                          {file.url}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MediaUpload;
