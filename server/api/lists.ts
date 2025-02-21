export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig();

  const getUrl = "https://api.sendgrid.com/v3/marketing/lists";

  try {
    const response = await $fetch(getUrl, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${config.SENDGRID_API_KEY}`,
        "Content-Type": "application/json",
      },
    });

    return response;
  } catch (error) {
    console.error("Error fetching lists:", error);
    return createError({
      statusCode: 500,
      statusMessage: "Internal Server Error",
    });
  }
});
