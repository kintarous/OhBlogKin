// Helper server untuk endpoint /api/cloudinary/*.
// API secret hanya dibaca di server (env CLOUDINARY_API_SECRET), tidak pernah dikirim ke browser.
import config from "@/config/config.json";
import { createHash } from "node:crypto";
import { CLOUDINARY_API_SECRET } from "astro:env/server";

export const cloudinary = config.cloudinary;

export const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });

// trim: buang spasi/baris baru yang ikut tertempel saat mengisi env di Vercel
export const getSecret = () => (CLOUDINARY_API_SECRET || "").trim();

// Signature Cloudinary: sha1 (default) atau sha256 dari parameter yang diurutkan + api secret
// https://cloudinary.com/documentation/authentication_signatures
export const signParams = (
  params: Record<string, string | number>,
  secret: string,
  algorithm: "sha1" | "sha256" = "sha1",
) => {
  const toSign = Object.keys(params)
    .filter((key) => params[key] !== "" && params[key] !== undefined)
    .sort()
    .map((key) => `${key}=${params[key]}`)
    .join("&");
  return createHash(algorithm).update(toSign + secret).digest("hex");
};

// Hanya pemegang token GitHub dengan akses tulis ke repo blog yang boleh memakai endpoint.
// Token diambil dari sesi login admin (Sveltia CMS) dan dikirim sebagai Bearer token.
export const isEditor = async (request: Request): Promise<boolean> => {
  const token = request.headers.get("Authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return false;
  try {
    const res = await fetch(`https://api.github.com/repos/${cloudinary.editor_repo}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
        "User-Agent": "ohblog-admin",
      },
    });
    if (!res.ok) return false;
    const repo = await res.json();
    return repo?.permissions?.push === true;
  } catch {
    return false;
  }
};
