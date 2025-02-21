// server/api/addContact.js

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig();

  const { email, listId } = await readBody(event);
  const url = "https://api.sendgrid.com/v3/marketing/contacts";

  const payload = {
    contacts: [{ email }],
    list_ids: [listId],
  };

  try {
    const response = await $fetch(url, {
      method: "PUT",
      headers: {
        Authorization: "Bearer " + config.SENDGRID_API_KEY,
        "Content-Type": "application/json",
      },
      body: payload,
    });

    if (response.errors) {
      // Handle SendGrid errors
      return { error: true, details: response.errors };
    }

    return { success: true, details: response };
  } catch (error) {
    return { error: true, details: error.message };
  }
});
