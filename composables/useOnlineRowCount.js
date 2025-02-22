// composables/useOnlineRowCount.js



export function useOnlineRowCount() {
  const rowCount = ref(null);
  const loading = ref(false);
  const error = ref(null);
  const supabase = useSupabaseClient(); // This assumes you have set up Supabase client in your project

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

  return { rowCount, getOnlineRowCount, loading, error };
}
