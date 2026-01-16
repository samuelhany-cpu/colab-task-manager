import { createClient } from "./supabase/server";

const BUCKET_NAME = process.env.SUPABASE_BUCKET_NAME || "colab-task-manager";

export async function uploadFile(key: string, buffer: Buffer) {
  const supabase = await createClient();

  const { data, error } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(key, buffer, {
      upsert: true,
    });

  if (error) throw error;
  return data;
}

export async function getUploadUrl(key: string) {
  const supabase = await createClient();

  const { data, error } = await supabase.storage
    .from(BUCKET_NAME)
    .createSignedUploadUrl(key);

  if (error) throw error;
  return data.signedUrl;
}

export async function getDownloadUrl(key: string) {
  const supabase = await createClient();

  const { data, error } = await supabase.storage
    .from(BUCKET_NAME)
    .createSignedUrl(key, 3600);

  if (error) throw error;
  return data.signedUrl;
}
