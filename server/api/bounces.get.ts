export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig();

  // Setup the SendGrid API endpoint for fetching bounces
  const url = "https://api.sendgrid.com/v3/suppression/bounces";

  // Make the GET request to the SendGrid API
  const sgResponse = await $fetch(url, {
    method: "GET", // Use GET method for fetching data
    headers: {
      Authorization: "Bearer " + config.SENDGRID_API_KEY,
      Accept: "application/json",
    },
  }).catch((error) => {
    // Handle any errors that occur during the fetch
    console.error("Error fetching email bounces:", error);
    return error;
  });

  // Return the response from SendGrid API to your frontend
  return sgResponse;
});
