// perkiraan waktu baca, contoh: "5 menit baca"
const readingTime = (content: string = ""): string => {
  const words = content.split(/\s+/).filter((word) => /\w/.test(word)).length;
  const minutes = Math.max(1, Math.ceil(words / 200));
  return `${minutes} menit baca`;
};

export default readingTime;
