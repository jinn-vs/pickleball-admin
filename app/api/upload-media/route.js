import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { NextRequest, NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";

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

// Helper function to sanitize metadata values for S3
function sanitizeMetadata(value) {
  if (typeof value !== "string") return value;

  // Replace non-ASCII characters with safe alternatives
  return value
    .replace(/[^\x00-\x7F]/g, "_") // Replace non-ASCII chars with underscore
    .replace(/[\x00-\x1F\x7F]/g, "") // Remove control characters
    .trim();
}

export async function POST(request) {
  try {
    console.log("S3 Upload API called"); // Debug log

    const data = await request.formData();
    const file = data.get("file");

    console.log("File received:", file ? file.name : "No file"); // Debug log

    if (!file) {
      return NextResponse.json({ error: "No file received" }, { status: 400 });
    }

    // Validate file type
    const allowedTypes = ["image/png", "image/jpeg", "image/jpg", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        {
          error:
            "Invalid file type. Only PNG, JPEG, JPG, and WebP are allowed.",
        },
        { status: 400 }
      );
    }

    // Validate file size (10MB limit)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: "File size exceeds 10MB limit" },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    // Generate unique filename
    const fileExtension = file.name.split(".").pop();
    const sanitizedOriginalName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
    const uniqueId = uuidv4();
    const timestamp = Date.now();

    // Option 1: Use UUID for uniqueness
    const fileName = `${uniqueId}.${fileExtension}`;

    // Option 2: Use timestamp + sanitized name (similar to original)
    // const fileName = `${timestamp}_${sanitizedOriginalName}`;

    console.log("Generated filename:", fileName); // Debug log

    // Define S3 key (path in bucket)
    const s3Key = `images/${fileName}`;

    console.log("S3 key:", s3Key); // Debug log

    // Prepare S3 upload parameters
    const uploadParams = {
      Bucket: BUCKET_NAME,
      Key: s3Key,
      Body: buffer,
      ContentType: file.type,
      ContentLength: file.size,
      // Sanitize metadata values to ensure they contain only ASCII characters
      Metadata: {
        originalName: sanitizeMetadata(file.name),
        uploadedAt: new Date().toISOString(),
        uploadedBy: "web-app",
        // Add additional sanitized metadata if needed
        fileSize: file.size.toString(),
        contentType: sanitizeMetadata(file.type),
      },
      // Note: Using bucket policy for public access instead of ACL
    };

    // Upload to S3
    console.log("Uploading to S3..."); // Debug log
    const command = new PutObjectCommand(uploadParams);
    const uploadResult = await s3Client.send(command);

    console.log("S3 upload result:", uploadResult.$metadata?.httpStatusCode); // Debug log

    // Construct the public URL
    // Option 1: Direct S3 URL (for public buckets)
    const fileUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${BUCKET_NAME}/${s3Key}`;

    // Option 2: CloudFront URL (if using CloudFront distribution)
    // const fileUrl = `https://${process.env.CLOUDFRONT_DOMAIN}/${s3Key}`;

    console.log("File uploaded successfully. URL:", fileUrl); // Debug log

    return NextResponse.json({
      success: true,
      message: "File uploaded successfully to S3",
      url: fileUrl,
      key: s3Key, // Include S3 key for future operations
      fileName: fileName,
      originalName: file.name, // Return original unsanitized name for display
      sanitizedName: sanitizeMetadata(file.name), // Include sanitized version if needed
      size: file.size,
      type: file.type,
      etag: uploadResult.ETag?.replace(/"/g, ""), // Remove quotes from ETag
    });
  } catch (error) {
    console.error("S3 upload error:", error);

    // Handle specific S3 errors
    if (error.name === "NoSuchBucket") {
      return NextResponse.json(
        { error: "S3 bucket not found. Please check your configuration." },
        { status: 500 }
      );
    }

    if (error.name === "AccessDenied") {
      return NextResponse.json(
        { error: "Access denied to S3 bucket. Please check your credentials." },
        { status: 500 }
      );
    }

    if (error.name === "InvalidAccessKeyId") {
      return NextResponse.json(
        { error: "Invalid AWS credentials. Please check your access key." },
        { status: 500 }
      );
    }

    if (error.name === "SignatureDoesNotMatch") {
      return NextResponse.json(
        { error: "Invalid AWS secret key. Please check your credentials." },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { error: `Failed to upload file to S3: ${error.message}` },
      { status: 500 }
    );
  }
}

// Handle other methods
export async function GET(request) {
  return NextResponse.json(
    {
      error: "Method not allowed. Use POST to upload files to S3.",
      supportedMethods: ["POST"],
      endpoint: "/api/upload-media",
    },
    { status: 405 }
  );
}

export async function PUT(request) {
  return NextResponse.json(
    { error: "Method not allowed. Use POST to upload files." },
    { status: 405 }
  );
}

export async function DELETE(request) {
  return NextResponse.json(
    { error: "Method not allowed. Use POST to upload files." },
    { status: 405 }
  );
}
