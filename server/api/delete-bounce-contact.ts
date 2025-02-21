export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig();

  // Extract the email from the request
  const body = await readBody(event);
  const email = body.email;
  console.log("Email:", email);

  // Step 1: Optionally, verify the email is in the bounces list
  // Step 2: Delete the Email from Contacts
  // First, find the contact's ID using the email
  const contactId = await findContactId(email, config);
      console.log("contactId:", contactId);

  if (contactId) {
    // Delete the contact
     await deleteContact(contactId, config);
  }

  // // Step 3: Delete the Bounce
  await deleteBounce(email, config);

  // Return a success response or handle errors appropriately
  return { success: true };
});

async function findContactId(email, config) {
  const searchUrl = `https://api.sendgrid.com/v3/marketing/contacts/search/emails`;

  try {
    const searchResult = await $fetch(searchUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.SENDGRID_API_KEY}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({ emails: [email] }),
    });

    // Accessing the contact details object
    const contactDetails = searchResult.result[email].contact;

    // Accessing the ID from the contact details
    if (contactDetails && contactDetails.id) {
      const contactId = contactDetails.id;
      return contactId;
    } else {
      console.error(`Contact ID not found for email ${email}`);
      return null;
    }
  } catch (error) {
    console.error(`Error finding contact ID for email ${email}:`, error);
    return null; // Return null if there's an error or the contact isn't found
  }
}

async function deleteContact(contactId, config) {
  const deleteUrl = `https://api.sendgrid.com/v3/marketing/contacts?ids=${encodeURIComponent(
    contactId
  )}`;

  try {
    const deleteResult = await $fetch(deleteUrl, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${config.SENDGRID_API_KEY}`,
        Accept: "application/json",
      },
    });

    // Check the result here, if necessary
    console.log("Contact deleted successfully:", deleteResult);
    return deleteResult;
  } catch (error) {
    console.error(`Error deleting contact with ID ${contactId}:`, error);
    return null; // Return null if there's an error during deletion
  }
}


async function deleteBounce(email, config) {
  const deleteUrl = `https://api.sendgrid.com/v3/suppression/bounces/${encodeURIComponent(
    email
  )}`;

  try {
    const deleteResult = await $fetch(deleteUrl, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${config.SENDGRID_API_KEY}`,
        Accept: "application/json",
      },
    });

    // Check the result here, if necessary
    console.log("Bounce deleted successfully:", deleteResult);
    return deleteResult;
  } catch (error) {
    console.error(`Error deleting bounce for email ${email}:`, error);
    return null; // Return null if there's an error during deletion
  }
}

