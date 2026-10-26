// Daftar gambar di folder Cloudinary blog (terbaru dulu) untuk galeri di admin.
import { cloudinary, getSecret, isEditor, json } from "@/lib/cloudinary";
import type { APIRoute } from "astro";

export const prerender = false;

const search = async (expression: string, cursor: string, secret: string) => {
  const auth = Buffer.from(`${cloudinary.api_key}:${secret}`).toString("base64");
  return fetch(`https://api.cloudinary.com/v1_1/${cloudinary.cloud_name}/resources/search`, {
    method: "POST",
    headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      expression,
      sort_by: [{ created_at: "desc" }],
      max_results: 40,
      ...(cursor ? { next_cursor: cursor } : {}),
    }),
  });
};

export const GET: APIRoute = async ({ request, url }) => {
  if (!(await isEditor(request))) {
    return json({ error: "Tidak diizinkan. Login admin dengan akun GitHub yang punya akses ke repo." }, 401);
  }
  const secret = getSecret();
  if (!secret) {
    return json({ error: "CLOUDINARY_API_SECRET belum diset di environment Vercel." }, 500);
  }

  const cursor = url.searchParams.get("cursor") ?? "";
  const folder = cloudinary.folder;

  // akun Cloudinary baru memakai "dynamic folders" (asset_folder),
  // akun lama memakai "fixed folders" (folder) — coba keduanya
  let res = await search(`resource_type:image AND asset_folder="${folder}"`, cursor, secret);
  if (res.status === 400) {
    res = await search(`resource_type:image AND folder="${folder}"`, cursor, secret);
  }
  if (res.status === 401) {
    return json({ error: "CLOUDINARY_API_SECRET di Vercel tidak cocok dengan API key di config.json." }, 502);
  }
  if (!res.ok) {
    return json({ error: `Cloudinary menolak permintaan (${res.status}).` }, 502);
  }

  const data = await res.json();
  return json({
    next_cursor: data.next_cursor ?? null,
    resources: (data.resources ?? []).map((item: any) => ({
      url: item.secure_url,
      public_id: item.public_id,
      format: item.format,
      width: item.width,
      height: item.height,
      bytes: item.bytes,
      created_at: item.created_at,
    })),
  });
};
