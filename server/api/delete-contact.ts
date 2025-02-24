export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig();

  // Extract the ID of the contact you want to delete from the request
  const body = await readBody(event);
  const contactIds = body.ids; // assuming this is a comma-separated string

  console.log("Contact IDs:", contactIds);

  // Validate that the contact ID is provided
  if (!contactIds) {
    console.error("Contact IDs not provided");
    return createError({
      statusCode: 400,
      statusMessage: "Contact IDs not provided",
    });
  }

  // Prepare the URL for deleting the contacts
  const deleteUrl = `https://api.sendgrid.com/v3/marketing/contacts?ids=${encodeURIComponent(
    contactIds
  )}`;

  // Make the DELETE request to the SendGrid API
  const sgResponse = await $fetch(deleteUrl, {
    method: "DELETE",
    headers: {
      Authorization: "Bearer " + config.SENDGRID_API_KEY,
      Accept: "application/json",
    },
  }).catch((error) => {
    console.error("Error deleting contact:", error);
    // If possible, include more details about the error
    return createError({
      statusCode: 500,
      statusMessage: "Internal Server Error",
    });
  });

  return sgResponse;
});
