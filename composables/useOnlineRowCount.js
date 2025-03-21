// composables/useOnlineRowCount.js


import { useFetchOnlineUsers } from "@/composables/useFetchOnlineUsers";

export function useOnlineRowCount() {
  const rowCount = ref(null);
  const loading = ref(false);
  const error = ref(null);
  const supabase = useSupabaseClient(); // This assumes you have set up Supabase client in your project
  let presenceChannel = null;

  const getOnlineRowCount = async () => {
    loading.value = true;
    error.value = null;
    try {
      const { count, error: supabaseError } = await supabase
        .from("presence") // Fixed table name
        .select("*", { count: "exact", head: true })
        .eq("status", "online"); // Fixed column name and value

      if (supabaseError) throw supabaseError;

      rowCount.value = count;
      // console.log("Online row count:", count);
    } catch (err) {
      error.value = err.message;
    } finally {
      loading.value = false;
    }
  };

  const subscribeToPresenceUpdates = () =>
  {
    presenceChannel = supabase
      .channel("online_users")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "presence" }, // Listen to any change in presence table
        async () =>
        {
          await getOnlineRowCount();
        }
      )
      .subscribe();
  };

  onMounted(() =>
  {
    getOnlineRowCount();
    subscribeToPresenceUpdates();
  });

  onUnmounted(() =>
  {
    if (presenceChannel) supabase.removeChannel(presenceChannel);
  })

  return { rowCount, getOnlineRowCount, loading, error };
}
