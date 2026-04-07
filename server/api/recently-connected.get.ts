import { getServiceRoleClient } from "~/server/utils/aiBots";

const WINDOW_HOURS = 24;
const GENDER_LIMIT = 12;

export default defineEventHandler(async (event) => {
  try {
    const supabase = await getServiceRoleClient(event);
    const cutoff = new Date(
      Date.now() - WINDOW_HOURS * 60 * 60 * 1000
    ).toISOString();

    const fields =
      "user_id, displayname, avatar_url, gender_id, last_active, countries:country_id(emoji)";

    const [maleRes, femaleRes] = await Promise.all([
      supabase
        .from("profiles")
        .select(fields)
        .eq("gender_id", 1)
        .gte("last_active", cutoff)
        .not("displayname", "is", null)
        .order("last_active", { ascending: false })
        .limit(GENDER_LIMIT),
      supabase
        .from("profiles")
        .select(fields)
        .eq("gender_id", 2)
        .gte("last_active", cutoff)
        .not("displayname", "is", null)
        .order("last_active", { ascending: false })
        .limit(GENDER_LIMIT),
    ]);

    const males = (maleRes.data || []).slice(0, GENDER_LIMIT);
    const females = (femaleRes.data || []).slice(0, GENDER_LIMIT);

    // Interleave female-first for visual variety
    const mixed: any[] = [];
    const maxLen = Math.max(males.length, females.length);
    for (let i = 0; i < maxLen; i++) {
      if (i < females.length) mixed.push(females[i]);
      if (i < males.length) mixed.push(males[i]);
    }

    const users = mixed
      .map((p: any) => ({
        id: p.user_id,
        displayname: String(p.displayname || "").trim().slice(0, 18),
        avatar_url: p.avatar_url || null,
        gender_id: p.gender_id ?? null,
        flag: p.countries?.emoji || null,
        last_active: p.last_active,
      }))
      .filter((p) => p.displayname);

    return { success: true, data: users };
  } catch (error) {
    const err = error as any;
    console.error("[recently-connected] error:", err);
    return { success: true, data: [] };
  }
});
