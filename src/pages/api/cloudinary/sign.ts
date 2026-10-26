// Membuat signature upload Cloudinary untuk admin.
// Browser mengirim file (sudah WebP) langsung ke Cloudinary memakai signature ini.
import { cloudinary, getSecret, isEditor, json, signParams } from "@/lib/cloudinary";
import type { APIRoute } from "astro";

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  if (!(await isEditor(request))) {
    return json({ error: "Tidak diizinkan. Login admin dengan akun GitHub yang punya akses ke repo." }, 401);
  }
  const secret = getSecret();
  if (!secret) {
    return json({ error: "CLOUDINARY_API_SECRET belum diset di environment Vercel." }, 500);
  }

  const body = await request.json().catch(() => ({}));
  const publicId = String(body?.public_id ?? "");
  if (!/^[a-z0-9][a-z0-9-]{0,99}$/.test(publicId)) {
    return json({ error: "Nama file tidak valid." }, 400);
  }

  const params = {
    folder: cloudinary.folder,
    format: "webp",
    public_id: publicId,
    timestamp: Math.round(Date.now() / 1000),
  };

  return json({
    ...params,
    cloud_name: cloudinary.cloud_name,
    api_key: cloudinary.api_key,
    signature: signParams(params, secret),
  });
};
