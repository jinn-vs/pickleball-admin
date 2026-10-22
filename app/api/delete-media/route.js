import {
  S3Client,
  DeleteObjectCommand,
  HeadObjectCommand,
} from "@aws-sdk/client-s3";
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

export async function DELETE(request) {
  try {
    const body = await request.json();
    const { key, fileName } = body;

    // Support both 'key' (preferred) and 'fileName' (backward compatibility)
    const objectKey = key || (fileName ? `images/${fileName}` : null);

    if (!objectKey) {
      return NextResponse.json(
        { error: "No object key or filename provided" },
        { status: 400 }
      );
    }

    // Validate the key format (basic security check)
    if (objectKey.includes("..") || objectKey.startsWith("/")) {
      return NextResponse.json(
        { error: "Invalid object key format" },
        { status: 400 }
      );
    }

    // Optional: Check if file exists before attempting deletion
    try {
      const headCommand = new HeadObjectCommand({
        Bucket: BUCKET_NAME,
        Key: objectKey,
      });
      await s3Client.send(headCommand);
    } catch (headError) {
      if (
        headError.name === "NotFound" ||
        headError.$metadata?.httpStatusCode === 404
      ) {
        return NextResponse.json(
          { error: "File not found in S3" },
          { status: 404 }
        );
      }
      // If it's another error, we'll still try to delete
      console.warn("Could not verify file existence:", headError.message);
    }

    // Delete the object from S3
    const deleteCommand = new DeleteObjectCommand({
      Bucket: BUCKET_NAME,
      Key: objectKey,
    });

    const deleteResult = await s3Client.send(deleteCommand);

    // S3 delete operation returns success even if the object doesn't exist
    // Check the response to provide better feedback
    const wasDeleted = deleteResult.$metadata?.httpStatusCode === 204;

    return NextResponse.json({
      message: wasDeleted
        ? "File deleted successfully"
        : "Delete operation completed",
      key: objectKey,
      fileName: objectKey.split("/").pop(), // Extract filename from key
      deleted: wasDeleted,
    });
  } catch (error) {
    console.error("S3 delete error:", error);

    // Handle specific S3 errors
    if (error.name === "NoSuchBucket") {
      return NextResponse.json(
        { error: "S3 bucket not found" },
        { status: 500 }
      );
    }

    if (error.name === "AccessDenied") {
      return NextResponse.json(
        { error: "Access denied to S3 bucket" },
        { status: 403 }
      );
    }

    if (error.name === "NoSuchKey") {
      return NextResponse.json(
        { error: "File not found in S3" },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { error: "Failed to delete file from S3" },
      { status: 500 }
    );
  }
}
