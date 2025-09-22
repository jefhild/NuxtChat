// composables/useAuthFlow.js
import { useDb } from "@/composables/useDB";

export async function handleGoogleLoginRedirect() {
  const { authGetUser, signInWithOAuth } = useDb();
  const { data, error } = await authGetUser();

  if (error || !data?.user) {
    console.log("[AuthFlow] No session, redirecting to Google...");
    await signInWithOAuth("google", "/chat");
    return null; // Redirection in progress
  }

  return data.user;
}

export async function linkGoogleIdentity() {
  const { linkIdentity } = useDb();
  const { data, error } = await linkIdentity("google", "/login");

  if (error) {
    console.error("[AuthFlow] Identity link error:", error.message);
    return { success: false };
  }

  if (data) {
    console.log("[AuthFlow] Linked identity, redirecting...");
    return { success: false }; // Google will redirect
  }

  return { success: true };
}

export async function bootstrapUserProfile(user) {
  const { updateUserProfileAfterLinking } = useDb();
  const { email, app_metadata, id: user_id } = user;
  const provider = app_metadata?.provider || "google";

  await updateUserProfileAfterLinking({ user_id, email, provider });
  console.log("[AuthFlow] User profile bootstrapped.");
}
