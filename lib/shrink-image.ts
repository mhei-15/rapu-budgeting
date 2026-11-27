/** Browser only: shrinks a photo to about 1,600 px on the long side and returns base64 JPEG. */
export async function shrinkImage(file: File, maxSide = 1600): Promise<{ data: string; mediaType: "image/jpeg"; preview: string }> {
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas is not available");
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  const preview = canvas.toDataURL("image/jpeg", 0.85);
  return { data: preview.slice(preview.indexOf(",") + 1), mediaType: "image/jpeg", preview };
}
