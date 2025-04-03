import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_KEY!
);

export async function getRegisteredUsersIds() {
  return await supabase.from("profiles").select("user_id");
}
