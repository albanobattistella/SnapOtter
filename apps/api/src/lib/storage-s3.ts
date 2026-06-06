import type { Readable } from "node:stream";
import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadBucketCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { env } from "../config.js";

let client: S3Client | null = null;

function getClient(): S3Client {
  if (!client) {
    client = new S3Client({
      region: env.S3_REGION,
      endpoint: env.S3_ENDPOINT || undefined,
      forcePathStyle: env.S3_FORCE_PATH_STYLE,
      credentials: {
        accessKeyId: env.S3_ACCESS_KEY_ID,
        secretAccessKey: env.S3_SECRET_ACCESS_KEY,
      },
    });
  }
  return client;
}

function fileKey(storedName: string): string {
  const prefix = env.S3_PREFIX ? `${env.S3_PREFIX}/` : "";
  return `${prefix}files/${storedName}`;
}

function thumbKey(storedName: string): string {
  const prefix = env.S3_PREFIX ? `${env.S3_PREFIX}/` : "";
  return `${prefix}thumbs/${storedName}.thumb.jpg`;
}

export async function checkConnection(): Promise<void> {
  await getClient().send(new HeadBucketCommand({ Bucket: env.S3_BUCKET }));
}

export async function putObject(storedName: string, buffer: Buffer): Promise<void> {
  await getClient().send(
    new PutObjectCommand({
      Bucket: env.S3_BUCKET,
      Key: fileKey(storedName),
      Body: buffer,
    }),
  );
}

export async function getObject(storedName: string): Promise<Buffer> {
  const response = await getClient().send(
    new GetObjectCommand({
      Bucket: env.S3_BUCKET,
      Key: fileKey(storedName),
    }),
  );
  return Buffer.from(await response.Body!.transformToByteArray());
}

export async function getObjectStream(storedName: string): Promise<Readable> {
  const response = await getClient().send(
    new GetObjectCommand({
      Bucket: env.S3_BUCKET,
      Key: fileKey(storedName),
    }),
  );
  return response.Body as Readable;
}

export async function deleteObject(storedName: string): Promise<void> {
  try {
    await getClient().send(
      new DeleteObjectCommand({
        Bucket: env.S3_BUCKET,
        Key: fileKey(storedName),
      }),
    );
  } catch {
    // Object already gone or doesn't exist
  }
}

export async function getThumbnail(storedName: string): Promise<Buffer | null> {
  try {
    const response = await getClient().send(
      new GetObjectCommand({
        Bucket: env.S3_BUCKET,
        Key: thumbKey(storedName),
      }),
    );
    return Buffer.from(await response.Body!.transformToByteArray());
  } catch {
    return null;
  }
}

export async function putThumbnail(storedName: string, buffer: Buffer): Promise<void> {
  await getClient().send(
    new PutObjectCommand({
      Bucket: env.S3_BUCKET,
      Key: thumbKey(storedName),
      Body: buffer,
      ContentType: "image/jpeg",
    }),
  );
}

export async function deleteThumbnail(storedName: string): Promise<void> {
  try {
    await getClient().send(
      new DeleteObjectCommand({
        Bucket: env.S3_BUCKET,
        Key: thumbKey(storedName),
      }),
    );
  } catch {
    // Thumbnail may not exist
  }
}
