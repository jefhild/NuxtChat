export const useDb = () =>
{
  const supabase = useSupabaseClient();

  const getStatuses = async () =>{
    const { data, error } = await supabase.from("status").select("*");
    if (error) throw error;

    return data;
  }

  const getGenders = async () =>{
    const { data, error } = await supabase.from("genders").select("*");
    if (error) throw error;
    return data;
  }

  const updateGender = async (genderID, userId) => {
    const { error } = await supabase
      .from("profiles")
      .update({ gender_id: genderID })
      .eq("user_id", userId);

    if (error)
    {
      console.error("Error updating gender in Supabase:", error);
    }
  }

  const updateTagline = async (tagline, userId) =>
  {
    console.log("Updating tagline:", tagline);
    console.log("User ID:", userId);

    const { data, error } = await supabase
      .from('profiles')
      .update({ tagline })
      .eq('user_id', userId);

    if (error)
    {
      console.error("Error updating tagline:", error);
    }
  };

  const updateSiteURL = async (siteUrl, userId) =>
  {
    console.log("Updating url:", siteUrl);
    console.log("User ID:", userId);
    const { error } = await supabase
      .from('profiles')
      .update({ site_url: siteUrl })
      .eq('user_id', userId);

    if (error) throw error;
  };

  const updateInterests = async (interestsArray,userId) =>
  {
    for (const interest of interestsArray)
    {
      const id = await getLookingForId(interest.trim());
      const { data, error } = await supabase
        .from("user_looking_for")
        .insert({ user_id: userId, looking_for_id: id });

      if (error) { console.error("Error inserting user looking for:", error); }
    }
  };

  const getLookingForId = async (name) => {
    const { data, error } = await supabase
      .from("looking_for")
      .select("id")
      .eq("name", name)
      .maybeSingle();

    if (error)
    {
      console.error("Error fetching looking for ID:", error);
      return null;
    }

    return data.id;
  };

  const checkDisplayNameExists = async (displayName) => {
    const { data, error } = await supabase
      .from("profiles")
      .select("displayname", { head: false }) 
      .eq("displayname", displayName) 
      .limit(1) 
      .maybeSingle(); 

    console.log("Checking displayname:", data);

    if (error && error.code !== "PGRST116")
    {
      console.error("Error checking displayname:", error);
    }

    return { data, error };
  };

  const hasInterests = async (userId) => {
    const supabase = useSupabaseClient();
    const { data, error } = await supabase
      .from("user_looking_for")
      .select("*")
      .eq("user_id", userId);

    if (error)
    {
      console.error("Error fetching user interests:", error);
      return false;
    }

    if (!data || data.length === 0)
    {
      return false;
    }

    return true;
  };

  const updateProfile = async (
    id,
    displayname,
    tagline,
    gender_id,
    status_id,
    age,
    bio,
    country_id,
    state_id,
    city_id,
    avatar_url,
    site_url
  ) => {
    const { error } = await supabase
      .from("profiles")
      .update({
        displayname: displayname,
        tagline: tagline,
        gender_id: gender_id,
        status_id: status_id,
        age: age,
        bio: bio,
        country_id: country_id,
        state_id: state_id,
        city_id: city_id,
        avatar_url: avatar_url,
        site_url: site_url,
      })
      .eq("id", id);
    if (error) throw error;
  };

  const authUpdateProfile = async (deleteMe, deleteRequestedAt) => {
    const { data, error } = await supabase.auth.updateUser({
      data: { delete_me: deleteMe, delete_requested_at: deleteRequestedAt },
    });

    if (error)
    {
      console.error("Error updating user metadata:", error);
    } else
    {
      console.log("User marked for deletion:", data);
      deleteDialog.value = false;
    }
  };

  return {
    getStatuses,
    getGenders,
    updateGender,
    updateTagline,
    updateSiteURL,
    updateInterests,
    getLookingForId,
    checkDisplayNameExists,
    hasInterests,
    updateProfile,
    authUpdateProfile
  };
};
