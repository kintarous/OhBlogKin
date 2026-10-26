// sisipkan transformasi Cloudinary ke URL gambar, mis. "f_png,w_64,h_64,c_fill";
// URL selain Cloudinary dikembalikan apa adanya
const cloudinaryTransform = (url: string, transformation: string): string => {
  if (!url.includes("res.cloudinary.com") || !url.includes("/upload/")) return url;
  return url.replace("/upload/", `/upload/${transformation}/`);
};

export default cloudinaryTransform;
