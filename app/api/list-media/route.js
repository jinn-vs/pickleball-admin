import {
  S3Client,
  ListObjectsV2Command,
  GetObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { NextRequest, NextResponse } from "next/server";

// Configure S3 client
const s3Client = new S3Client({
  region: process.env.AWS_REGION || "us-east-1",
  endpoint: process.env.S3_ENDPOINT, // Supabase S3-compatible endpoint
  forcePathStyle: true,              // required for Supabase / S3-compatible storage
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

const BUCKET_NAME = process.env.S3_BUCKET_NAME;

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const prefix = searchParams.get("prefix") || "images/";
    const maxKeys = parseInt(searchParams.get("limit")) || 1000;
    const continuationToken = searchParams.get("continuationToken");
    const generatePresignedUrls = searchParams.get("presigned") === "true";

    const listParams = {
      Bucket: BUCKET_NAME,
      Prefix: prefix,
      MaxKeys: maxKeys,
      ...(continuationToken && { ContinuationToken: continuationToken }),
    };

    const command = new ListObjectsV2Command(listParams);
    const response = await s3Client.send(command);

    let files = [];
    const imageExtensions = [".png", ".jpg", ".jpeg", ".webp", ".gif", ".svg"];

    if (response.Contents) {
      // Process files in parallel for better performance
      const filePromises = response.Contents.map(async (object) => {
        const key = object.Key;
        const fileName = key.split("/").pop();
        const ext = fileName
          ? "." + fileName.split(".").pop()?.toLowerCase()
          : "";

        if (imageExtensions.includes(ext) && fileName) {
          let mimeType = "";
          switch (ext) {
            case ".png":
              mimeType = "image/png";
              break;
            case ".jpg":
            case ".jpeg":
              mimeType = "image/jpeg";
              break;
            case ".webp":
              mimeType = "image/webp";
              break;
            case ".gif":
              mimeType = "image/gif";
              break;
            case ".svg":
              mimeType = "image/svg+xml";
              break;
          }

          let imageUrl;

          if (generatePresignedUrls) {
            // Generate presigned URL for private access
            const getObjectCommand = new GetObjectCommand({
              Bucket: BUCKET_NAME,
              Key: key,
            });
            imageUrl = await getSignedUrl(s3Client, getObjectCommand, {
              expiresIn: 3600, // 1 hour
            });
          } else {
            // Use direct S3 URL (for public buckets)
            imageUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${BUCKET_NAME}/${key}`;
          }

          return {
            id: key,
            name: fileName,
            key: key,
            url: imageUrl,
            size: object.Size || 0,
            type: mimeType,
            uploadedAt:
              object.LastModified?.toISOString() || new Date().toISOString(),
            createdAt:
              object.LastModified?.toISOString() || new Date().toISOString(),
            etag: object.ETag?.replace(/"/g, ""),
            isPresigned: generatePresignedUrls,
          };
        }
        return null;
      });

      const resolvedFiles = await Promise.all(filePromises);
      files = resolvedFiles.filter((file) => file !== null);
    }

    // Sort by upload date (newest first)
    files.sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt));

    return NextResponse.json({
      success: true,
      files: files,
      count: files.length,
      isTruncated: response.IsTruncated || false,
      nextContinuationToken: response.NextContinuationToken || null,
      totalObjects: response.KeyCount || 0,
      presignedUrls: generatePresignedUrls,
    });
  } catch (error) {
    console.error("List media error:", error);

    if (error.name === "NoSuchBucket") {
      return NextResponse.json(
        { success: false, error: "S3 bucket not found", files: [], count: 0 },
        { status: 500 }
      );
    }

    if (error.name === "AccessDenied") {
      return NextResponse.json(
        { success: false, error: "S3 access denied", files: [], count: 0 },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: "Failed to list media files from S3",
        files: [],
        count: 0,
      },
      { status: 500 }
    );
  }
}
