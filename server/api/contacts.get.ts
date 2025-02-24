export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig();

  // Setup the SendGrid API endpoint for fetching contacts
  const url = "https://api.sendgrid.com/v3/marketing/contacts";
    // const qs = {
    //   limit: 1000,
    // };

  // Make the GET request to the SendGrid API
  const sgResponse = await $fetch(url, {
    method: "GET", // Use GET method for fetching data
    headers: {
      Authorization: "Bearer " + config.SENDGRID_API_KEY,
      Accept: "application/json",
    },
    // query: qs,
  }).catch((error) => {
    // Handle any errors that occur during the fetch
    console.error("Error fetching contacts:", error);
    return error;
  });

  // Return the response from SendGrid API to your frontend
  return sgResponse;
});
