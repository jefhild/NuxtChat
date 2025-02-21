import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_KEY!; // Use anon key or service role key as appropriate
const supabase = createClient(supabaseUrl, supabaseKey);

interface EventData {
  email: string;
  timestamp: number;
  event: string;
  category: string[];
  mc_auto_name: string;
}

export default defineEventHandler(async (event) => {
  const body = await readBody(event);

  if (Array.isArray(body)) {
    for (const item of body) {
      if (item.event) {
        const listIds = await findContactId(item);
        await insertEventToSupabase(item, listIds);
      }
    }
  }

  return { success: true };
});

async function insertEventToSupabase(eventData: EventData, listIds: string[]) {
  let contactId;

  // Check if the contact exists in the contacts table
  const { data: contactData, error: contactError } = await supabase
    .from("contacts")
    .select("id")
    .eq("email", eventData.email);

  if (contactError) {
    console.error("Error checking contact in Supabase:", contactError);
    return;
  }

  if (contactData.length === 0) {
    // If the contact doesn't exist, add it to the contacts table
    const { data: insertContactData, error: insertContactError } =
      await supabase.from("contacts").upsert([
        {
          email: eventData.email,
          list_ids: listIds,
         
           // Use the correct list_id
          // Other contact information...
        },
      ]);
    console.log("Event Data: ", eventData);

    if (insertContactError) {
      console.error("Error inserting contact to Supabase:", insertContactError);
      return;
    }

    console.log("Contact inserted to Supabase:", insertContactData);

    // Get the inserted contact data by querying for it
    const insertedContact = await supabase
      .from("contacts")
      .select("*")
      .eq("email", eventData.email)
      .single();

    if (insertedContact) {
      contactId = insertedContact.id;
    }
  } else {
    // Use the existing contact_id if the contact already exists
    contactId = contactData[0].id;
  }

  // Insert the event into the events table with the correct contact_id
  const { data, error } = await supabase.from("events").insert([
    {
      email: eventData.email,
      contact_id: contactId, // Use the correct contact_id
      timestamp: eventData.timestamp,
      event: eventData.event,
      category: eventData.category,
      list_name: eventData.mc_auto_name,
    },
  ]);

  if (error) {
    console.error("Error inserting event to Supabase:", error);
  } else {
    console.log("Event inserted to Supabase:", data);
  }
}

async function findContactId(eventData: EventData) {
  const email = eventData.email; // Get the email from the event data
  const searchUrl = `https://api.sendgrid.com/v3/marketing/contacts/search/emails`;

  try {
    const searchResult = await fetch(searchUrl, {
      method: "POST",
      headers: {
        Authorization: "Bearer " + process.env.SENDGRID_API_KEY, // Use the SendGrid API key from your environment
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ emails: [email] }),
    });

    // Check if the response is successful
    if (searchResult.ok) {
      const resultData = await searchResult.json();
      const contactDetails = resultData.result[email]?.contact;

      // Check if contactDetails and list_ids exist
      if (contactDetails && contactDetails.list_ids) {
        const listIds = contactDetails.list_ids;
        console.log("List IDs for email", email, ":", listIds);
        return listIds;

      } else {
        console.error(`ListIds not found for email ${email}`);
        return null;
      }
    } else {
      console.error(
        `Error finding contact for email ${email}:`,
        searchResult.statusText
      );
      return null; // Return null if there's an error or the contact isn't found
    }
  } catch (error) {
    console.error(`Error finding contact ID for email ${email}:`, error);
    return null; // Return null if there's an error or the contact isn't found
  }
}
