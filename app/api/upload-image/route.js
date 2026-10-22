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

export async function POST(request) {
  try {
    console.log("=== S3 Upload API Called ===");
    console.log("Bucket:", BUCKET_NAME);
    console.log("Region:", process.env.AWS_REGION || "us-east-2");

    const formData = await request.formData();
    const file = formData.get("image");

    console.log(
      "File received:",
      file?.name,
      "Size:",
      file?.size,
      "Type:",
      file?.type
    );

    if (!file) {
      return NextResponse.json({ error: "No file received" }, { status: 400 });
    }

    // Validate file type
    if (!file.type.startsWith("image/")) {
      return NextResponse.json(
        { error: "File must be an image" },
        { status: 400 }
      );
    }

    // Validate file size (5MB limit)
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json(
        { error: "File size must be less than 5MB" },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    // Generate unique filename
    const fileExtension = file.name.split(".").pop();
    const uniqueId = uuidv4();
    const filename = `${uniqueId}.${fileExtension}`;

    // Add folder structure
    const key = `images/${filename}`;

    console.log("Generated key:", key);

    // Prepare S3 upload parameters (WITHOUT ACL)
    const uploadParams = {
      Bucket: BUCKET_NAME,
      Key: key,
      Body: buffer,
      ContentType: file.type,
      // Removed ACL - will use bucket policy for public access
    };

    console.log("Starting S3 upload...");

    // Upload to S3
    const command = new PutObjectCommand(uploadParams);
    const result = await s3Client.send(command);

    console.log("S3 upload successful:", result);

    // Construct the public URL using the correct region
    const imageUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${BUCKET_NAME}/${key}`;

    console.log("Generated URL:", imageUrl);

    return NextResponse.json({
      imageUrl,
      key,
      message: "Image uploaded successfully to S3",
    });
  } catch (error) {
    console.error("=== S3 Upload Error ===");
    console.error("Error name:", error.name);
    console.error("Error message:", error.message);
    console.error("Full error:", error);

    // Handle specific S3 errors
    if (error.name === "NoSuchBucket") {
      console.error("Bucket not found:", BUCKET_NAME);
      return NextResponse.json(
        {
          error: `S3 bucket '${BUCKET_NAME}' not found. Please check your bucket name.`,
        },
        { status: 500 }
      );
    }

    if (error.name === "AccessDenied") {
      console.error("Access denied to bucket:", BUCKET_NAME);
      return NextResponse.json(
        {
          error:
            "S3 access denied. Please check your credentials and bucket permissions.",
        },
        { status: 500 }
      );
    }

    if (error.name === "InvalidAccessKeyId") {
      console.error("Invalid access key");
      return NextResponse.json(
        { error: "Invalid AWS credentials. Please check your access key." },
        { status: 500 }
      );
    }

    if (error.name === "SignatureDoesNotMatch") {
      console.error("Invalid signature - wrong secret key");
      return NextResponse.json(
        { error: "Invalid AWS secret key. Please check your credentials." },
        { status: 500 }
      );
    }

    // Handle the ACL error specifically
    if (error.message?.includes("does not allow ACLs")) {
      console.error("ACL error - bucket doesn't allow ACLs");
      return NextResponse.json(
        {
          error:
            "Bucket does not allow ACLs. Please enable ACLs in your bucket settings or use bucket policy for public access.",
        },
        { status: 500 }
      );
    }

    // Handle region mismatch
    if (error.message?.includes("region")) {
      console.error("Region mismatch error");
      return NextResponse.json(
        {
          error:
            "Region mismatch. Please check your AWS_REGION environment variable.",
        },
        { status: 500 }
      );
    }

    // Generic error
    console.error("Generic S3 error:", error.message);
    return NextResponse.json(
      { error: `Error uploading image to S3: ${error.message}` },
      { status: 500 }
    );
  }
}
