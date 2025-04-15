import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_KEY!
);

export async function getRegisteredUsersDisplaynames() {
  return await supabase.from("profiles").select("displayname, gender_id");
}
