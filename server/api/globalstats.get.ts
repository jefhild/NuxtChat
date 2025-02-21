export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig();

  // Setup the SendGrid API endpoint for fetching bounces
  // const url = "https://api.sendgrid.com/v3/stats";
  // Extract query parameters from the incoming request
  const queryParams = event.node.req.url
    ? new URL(event.node.req.url, `http://${event.node.req.headers.host}`)
        .searchParams
    : new URLSearchParams();

  // console.log("queryParams", Object.fromEntries(queryParams));
  // Construct the query string
  const queryString = queryParams.toString();

  // Setup the SendGrid API endpoint for fetching stats with query parameters
  const url = `https://api.sendgrid.com/v3/stats?${queryString}`;
  // Make the GET request to the SendGrid API
  const sgResponse = await $fetch(url, {
    method: "GET", // Use GET method for fetching data
    headers: {
      Authorization: "Bearer " + config.SENDGRID_API_KEY,
      Accept: "application/json",
    },
  }).catch((error) => {
    // Handle any errors that occur during the fetch
    console.error("Error fetching global stats:", error);
    return error;
  });

  // Return the response from SendGrid API to your frontend
  return sgResponse;
});
