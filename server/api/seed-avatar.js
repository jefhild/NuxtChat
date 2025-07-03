import { uploadAvatarFromURL } from "@/server/utils/avatar";

export default defineEventHandler(async (event) => {
  const { userId, seed } = await readBody(event);
  if (!userId || !seed) throw new Error("Missing userId or seed");

  const avatarUrl = `https://api.dicebear.com/6.x/fun-emoji/png?seed=${encodeURIComponent(
    seed
  )}`;
  const result = await uploadAvatarFromURL(userId, avatarUrl);

  if (!result) throw new Error("Upload failed");
  return { success: true, avatarUrl: result };
});
