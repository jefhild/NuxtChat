export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig();

  const deleteResult = await deleteAllBounces(config.SENDGRID_API_KEY);

  if (deleteResult) {
    return { success: true };
  } else {
    // Handle error response
    return { success: false, error: "Failed to delete blocks." };
  }
});

async function deleteAllBounces(sendgridApiKey: string) {
  const deleteUrl = `https://api.sendgrid.com/v3/suppression/bounces`;

  const data = {
    delete_all: true,
    emails: [],
  };

  try {
    const deleteResult = await $fetch(deleteUrl, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${sendgridApiKey}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(data),
    });

    console.log("Blocks deleted successfully:", deleteResult);
    return deleteResult;
  } catch (error) {
    console.error("Error deleting SendGrid blocks", error);
    return null;
  }
}
