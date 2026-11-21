import { S3Client, PutObjectCommand, GetObjectCommand, HeadObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
function client() {
  const account = process.env.R2_ACCOUNT_ID;
  const key = process.env.R2_ACCESS_KEY_ID;
  const secret = process.env.R2_SECRET_ACCESS_KEY;
  if (!account || !key || !secret) throw new Error("R2 storage is not configured");
  return new S3Client({
    region: "auto",
    endpoint: "https://" + account + ".r2.cloudflarestorage.com",
    credentials: { accessKeyId: key, secretAccessKey: secret },
  });
}
function bucket() {
  if (!process.env.R2_BUCKET) throw new Error("R2_BUCKET is not configured");
  return process.env.R2_BUCKET;
}
export async function signUpload(key: string, mime: string) {
  return getSignedUrl(client(), new PutObjectCommand({
    Bucket: bucket(), Key: key, ContentType: mime,
  }), { expiresIn: 600 });
}
export async function inspectUpload(key: string) {
  return client().send(new HeadObjectCommand({ Bucket: bucket(), Key: key }));
}
export async function signStream(key: string) {
  return getSignedUrl(client(), new GetObjectCommand({
    Bucket: bucket(), Key: key,
  }), { expiresIn: 900 });
}
