import { createClient } from "@supabase/supabase-js";

export const uploadAvatarFromURL = async (userId, avatarUrl) => {
  try {
    const config = useRuntimeConfig(); // ✅ now inside the function
    const supabase = createClient(
      config.public.SUPABASE_URL,
      config.SUPABASE_SERVICE_ROLE_KEY
    );

    const response = await fetch(avatarUrl);
    if (!response.ok) throw new Error("Failed to fetch avatar from URL.");

    const blob = await response.blob();
    const filePath = `avatars/${userId}.png`;

    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(filePath, blob, {
        cacheControl: "3600",
        upsert: true,
        contentType: blob.type,
      });

    if (uploadError) throw uploadError;

    const { data: publicUrlData } = supabase.storage
      .from("avatars")
      .getPublicUrl(filePath);

    const { error: updateError } = await supabase
      .from("profiles")
      .update({ avatar_url: publicUrlData.publicUrl })
      .eq("id", userId);

    if (updateError) throw updateError;

    return publicUrlData.publicUrl;
  } catch (error) {
    console.error("uploadAvatarFromURL error:", error);
    return null;
  }
};
