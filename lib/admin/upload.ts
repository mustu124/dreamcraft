/**
 * Upload a file to Supabase Storage via the /api/admin/upload Route Handler.
 * The Route Handler uses the service-role key, so no Storage INSERT policy
 * is needed on any bucket — authentication is enforced server-side.
 */
export async function uploadToStorage(file: File, bucket: string): Promise<string> {
  const fd = new FormData();
  fd.append("file",   file);
  fd.append("bucket", bucket);

  const res  = await fetch("/api/admin/upload", { method: "POST", body: fd });
  const json = await res.json() as { url?: string; error?: string };

  if (!res.ok) throw new Error(json.error ?? "Upload failed");
  return json.url!;
}
