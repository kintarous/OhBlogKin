// warna titik chip kategori/tag ala Byte (stabil untuk nama yang sama)
const palette = ["#d08b5b", "#3178c6", "#2c7a5f", "#e3c220", "#00add8", "#b4394d", "#6d4aa3", "#d67e2b"];

const chipColor = (name: string): string => {
  let hash = 0;
  for (const ch of name.toLowerCase()) {
    hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  }
  return palette[hash % palette.length];
};

export default chipColor;
