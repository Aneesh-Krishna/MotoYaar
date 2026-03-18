import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const r2 = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
});

const BUCKET = process.env.R2_BUCKET_NAME!;

/**
 * Key naming conventions:
 *   - Documents: `{userId}/{documentId}/{filename}`
 *   - Receipts:  `{userId}/receipts/{expenseId}/{filename}`
 *
 * Auto-deletion of expired documents is handled by the daily cron job (Story 8.1).
 * Objects where `expiry_date < today - 10 days AND storage_url IS NOT NULL` are
 * deleted from R2 in that job. No native R2 lifecycle rule is used for MVP.
 */

/** Generate a pre-signed PUT URL for client-side upload (expires in 60s) */
export async function generateUploadUrl(
  key: string,
  contentType: string
): Promise<string> {
  const command = new PutObjectCommand({
    Bucket: BUCKET,
    Key: key,
    ContentType: contentType,
  });
  return getSignedUrl(r2, command, { expiresIn: 60 });
}

/** Generate a pre-signed GET URL for private document access (15-min TTL) */
export async function generateAccessUrl(key: string): Promise<string> {
  const command = new GetObjectCommand({ Bucket: BUCKET, Key: key });
  return getSignedUrl(r2, command, { expiresIn: 900 }); // 15 minutes
}

/** Delete an object from R2 */
export async function deleteObject(key: string): Promise<void> {
  await r2.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: key }));
}
