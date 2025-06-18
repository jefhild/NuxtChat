import { ref } from "vue";
import { useSupabaseClient, useRuntimeConfig } from "#imports";

export function useProfilePhoto() {
  const supabase = useSupabaseClient();
  const config = useRuntimeConfig();
  const photopath = ref("");
  const genderId = ref(0);
  const file = ref(null);
  const selectedGender = ref("male");
  const avatars = ref([]);
  const avatarIndex = ref(0);

  const MAX_FILE_SIZE_MB = 2;
  const VALID_TYPES = ["image/jpeg", "image/png", "image/webp"];

  const getProfilePhoto = async (userId) => {
    const { data, error } = await supabase
      .from("profiles")
      .select("avatar_url, gender_id")
      .eq("user_id", userId)
      .single();

    if (error) {
      console.error("Error fetching profile photo:", error);
      return "";
    }

    if (data?.avatar_url) {
      photopath.value = data.avatar_url.startsWith("http")
        ? data.avatar_url
        : `${config.public.supabase.url}/storage/v1/object/public/avatars/${data.avatar_url}`;
    } else {
      photopath.value = "";
    }
    genderId.value = data?.gender_id || 0;
    return photopath.value;
  };

  const uploadImage = async (userId, emit) => {
    if (!file.value) return;

    const filePath = `${userId}/${file.value.name}`;

    const { error } = await supabase.storage
      .from("profile-images")
      .upload(filePath, file.value, { upsert: true });

    if (error) {
      console.error("Error uploading image:", error);
      return;
    }

    const publicURL = `${
      config.public.SUPABASE_BUCKET
    }${filePath}?t=${new Date().getTime()}`;

    const { error: updateError } = await supabase
      .from("profiles")
      .update({ avatar_url: publicURL })
      .eq("user_id", userId);

    if (updateError) {
      console.error("Error updating profile:", updateError);
      return;
    }

    photopath.value = publicURL;
    emit("updateAvatarUrl", publicURL);
  };

  const deletePhoto = async (userId) => {
    const { error: updateError } = await supabase
      .from("profiles")
      .update({ avatar_url: null })
      .eq("user_id", userId);

    if (updateError) {
      console.error("Error deleting photo:", updateError);
      return;
    }

    photopath.value = "";
  };

  const isValidFile = (file) => {
    const isSizeValid = file.size / 1024 / 1024 < MAX_FILE_SIZE_MB;
    const isTypeValid = VALID_TYPES.includes(file.type);
    return isSizeValid && isTypeValid;
  };

  const handleFileChangeAndUpload = async (selectedFile, userId, emit) => {
    if (!isValidFile(selectedFile)) {
      console.error("Invalid file: must be under 2MB and JPEG/PNG/WebP.");
      return false;
    }
    file.value = selectedFile;
    await uploadImage(userId, emit);
    return true;
  };

  return {
    photopath,
    file,
    getProfilePhoto,
    uploadImage,
    deletePhoto,
    handleFileChangeAndUpload,
  };
}
