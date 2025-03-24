// stores/authStore.js
import { defineStore } from "pinia";
import { useUserProfile } from "~/composables/useUserProfile";

export const useAuthStore = defineStore("authStore", {
  state: () => ({
    user: null,
    userProfile: null,
    status: "offline",
    userLocation: null,
  }),
  getters: {
    isAuthenticated: (state) => !!state.user,
    isOnline: (state) => state.status === "online",
    isAnonymous: (state) => state.user?.user_metadata?.isAnonymous ?? false,
  },
  actions: {
    async fetchStatus() {
      const supabase = useSupabaseClient();
      // console.log("inside fetchStatus");
      if (this.user) {
        const { data, error } = await supabase
          .from("presence")
          .select("status")
          .eq("user_id", this.user.id)
          .single();
        if (data) {
          this.status = data.status;
        }
        console.log("User is online");
      } else {
        this.status = "offline";
        console.log("User is offline");
      }
    },

    async checkAuth() {
      const supabase = useSupabaseClient();
      const { data, error } = await supabase.auth.getUser();
      // console.log("inside checkAuth - user: ", data);

      if (data.user) {
        this.setUser(data.user);
        await this.fetchUserProfile();
      } else {
        this.clearUser();
        if (error) console.error("Check auth error:", error.message);
      }
    },

    async checkAuthEmail() {
      const supabase = useSupabaseClient();
      const { data, error } = await supabase.auth.getUser();
      // console.log("inside checkAuth - user: ", data);

      if (data.user) {
        this.setUser(data.user);
        await this.fetchUserProfileEmail(data.user.id);
        // console.log("data.user: ", data.user);
      } else {
        this.clearUser();
        if (error) console.error("Check auth error:", error.message);
      }
    },

    async checkAuthAnony({
      displayName,
      age,
      selectedGender,
      selectedStatus,
      avatarUrl,
      userLookingForIds = [],
      userDescriptionIds = [],
      bio
    }) {
      const supabase = useSupabaseClient();

      try {
        // Step 1: Try to get the current user
        const { data: currentUser, error: currentError } =
          await supabase.auth.getUser();

        if (currentError && currentError.message !== "Auth session missing!") {
          console.error("Error checking current user:", currentError);
          throw currentError;
        }

        if (currentUser && currentUser.user) {
          this.setUser(currentUser.user);
        } else {
          // Step 2: If no authenticated user, create an anonymous user
          const { data: userData, error: userError } =
            await supabase.auth.signInAnonymously();

          if (userError) {
            console.error("Error signing in anonymously:", userError);
            throw userError;
          }

          if (userData.user) {
            this.setUser(userData.user);
            await supabase.auth.updateUser({
              user_metadata: { isAnonymous: true },
            });
            // await this.trackPresence(userData.user.id);
          }
        }

        // Step 3: Create or use an existing profile
        // console.log(
        //   "inside checkAuthAnony - going into handleUserProfile: ",
        //   displayName
        // );
        await this.handleUserProfile({
          displayName,
          age,
          selectedGender,
          selectedStatus,
          avatarUrl,
          userLookingForIds,
          userDescriptionIds,
          bio
        });

        // Fetch the newly created or updated user profile
        await this.fetchUserProfile();
      } catch (error) {
        console.error("Error in checkAuthAnony:", error.message);
        throw error;
      }
    },

    async handleUserProfile({
      displayName,
      age,
      selectedGender,
      selectedStatus,
      avatarUrl,
      userLookingForIds = [],
      userDescriptionIds = [],
      bio
    }) {
      const supabase = useSupabaseClient();

      try {
        // Try creating the user profile
        await this.createUserProfile({
          displayName,
          age,
          selectedGender,
          selectedStatus,
          avatarUrl,
          userLookingForIds,
          userDescriptionIds,
          bio
        });
      } catch (error) {
        if (error.code === "23505") {
          console.error("Display Name already exists:", displayName);

          // Step 5: Fetch the existing profile with the display name
          const { data: existingProfile, error: fetchError } = await supabase
            .from("profiles")
            .select("*")
            .eq("displayname", displayName)
            .single();

          if (fetchError) {
            console.error(
              "Error fetching profile by display name:",
              fetchError.message
            );
            throw new Error(
              "This Display Name is already taken by another user. Please choose a different name."
            );
          }

          // Step 6: Check if the existing profile belongs to the current user
          if (existingProfile.user_id === this.user.id) {
            console.log(
              "Duplicate display name, but it's owned by the current user. Proceeding."
            );
            this.userProfile = existingProfile; // Use the existing profile
          } else {
            console.error(
              "Display name is taken by a different user. Cannot proceed."
            );
            throw new Error(
              "This Display Name is already taken by another user. Please choose a different name."
            );
          }
        } else {
          throw error; // Re-throw any other errors
        }
      }
    },

    
    async checkAuthGoogle() {
      const supabase = useSupabaseClient();
      const { data: sessionData, error: sessionError } =
        await supabase.auth.getSession();

      if (!sessionData?.session) {
        console.log("No active session. Initiating Google OAuth...");

        // Redirect to Google's OAuth
        await supabase.auth.signInWithOAuth({
          provider: "google",
          options: {
            redirectTo: `/login`, // Redirect after OAuth
          },
        });

        // Execution stops here due to redirection
        return;
      }

      console.log("Session detected. Linking Google identity...");

      const { data, error } = await supabase.auth.linkIdentity({
        provider: "google",
        options: {
          redirectTo: `/login`,
        },
      });

      if (error) {
        console.error("Error linking identity:", error.message);
        return;
      }

      // Add a return here to handle the redirect after linking
      if (data) {
        console.log("Identity linked successfully. Redirecting...");
        return;
      }

      // If no redirect occurs (unlikely but possible), continue here
      const { data: userData, error: userError } =
        await supabase.auth.getUser();
      if (userError || !userData?.user) {
        console.error(
          "Error fetching current user after linking:",
          userError?.message
        );
        return;
      }

      this.setUser(userData.user);

      // Update the profile with Google data
      const { email, app_metadata } = this.user;
      const provider = app_metadata.provider || "google";

      console.log("Linking complete. Updating profile...");
      await this.updateUserProfileAfterLinking({
        email,
        provider,
      });

      // Fetch the updated profile
      await this.fetchUserProfile();
    },

    async updateUserProfileAfterLinking({ email, provider }) {
      const supabase = useSupabaseClient();

      if (!this.user?.id || !this.userProfile) {
        console.error("No user or userProfile found for updating profile.");
        return;
      }

      try {
        // Perform a partial update to avoid overwriting existing profile data
        const { error } = await supabase
          .from("profiles")
          .update({
            username: email, // Update the email/username
            provider, // Update the provider
          })
          .eq("user_id", this.user.id);

        if (error) {
          console.error("Error updating user profile with Google data:", error);
          throw error;
        }

        console.log("User profile updated successfully with Google data.");
      } catch (error) {
        console.error("Exception while updating user profile:", error.message);
        throw error;
      }
    },

    async checkAuthFacebook() {
      const supabase = useSupabaseClient();
      // console.log("inside checkAuthGoogle - displayName: ");
      const { data: userData, error } = await supabase.auth.signInWithOAuth({
        provider: "facebook",
        options: {
          redirectTo: `https://imchatty.com/loginfacebook`,
        },
      });
      // console.log("checkAuthFacebook - userData: ", userData);
      // console.log("checkAuthFacebook - error: ", error);
    },

    async fetchUserProfile() {
      if (!this.user || !this.user.id) {
        console.log("No user or user.id found.");
        return;
      }

      const { fetchUserProfile } = useUserProfile();

      // Pass the user id to the composable
      const profile = await fetchUserProfile(this.user.id);
      // console.log("inside fetchUserProfile in auth store. Profile: ", profile);

      if (profile) {
        // Set the userProfile in the store
        this.userProfile = profile;
        // console.log(
        //   "User profile successfully set in the store: ",
        //   this.userProfile
        // );
      } else {
        console.log("Failed to fetch or set user profile.");
      }
    },

    async fetchUserProfileGoogle() {
      const supabase = useSupabaseClient();

      // Fetch the authenticated user
      const { data: userData, error: userError } =
        await supabase.auth.getUser();

      if (userError) {
        console.error("Error fetching user:", userError.message);
        return;
      }

      if (!userData.user) {
        this.clearUser();
        return;
      }

      this.user = userData.user;

      // Fetch the user profile
      const { data, error } = await supabase
        .from("profiles")
        .select(
          "*, genders(id, name), regions(id,name), subregions(id,name), countries(id,name), states(id,name), cities(id,name)"
        )
        .eq("user_id", this.user.id)
        .single();

      if (error) {
        if (error.code === "PGRST116") {
          try {
            await this.createUserProfile();

            // Fetch the profile again after creation
            const { data: newProfile, error: newProfileError } = await supabase
              .from("profiles")
              .select(
                "*, genders(id, name), regions(id,name), subregions(id,name), countries(id,name), states(id,name), cities(id,name)"
              )
              .eq("user_id", this.user.id)
              .single();

            if (newProfileError) {
              console.error(
                "Error fetching new user profile:",
                newProfileError
              );
            } else {
              this.userProfile = newProfile;
            }
          } catch (error) {
            console.error("Error creating user profile:", error.message);
          }
        } else {
          console.error("Error fetching user profile:", error.message);
        }
      } else {
        this.userProfile = data;
      }
    },
    async fetchUserProfileFacebook() {
      const supabase = useSupabaseClient();

      // Fetch the authenticated user
      const { data: userData, error: userError } =
        await supabase.auth.getUser();

      if (userError) {
        console.error("Error fetching user:", userError.message);
        return;
      }

      if (!userData.user) {
        this.clearUser();
        return;
      }

      this.user = userData.user;

      // Fetch the user profile
      const { data, error } = await supabase
        .from("profiles")
        .select(
          "*, genders(id, name), regions(id,name), subregions(id,name), countries(id,name), states(id,name), cities(id,name)"
        )
        .eq("user_id", this.user.id)
        .single();

      if (error) {
        if (error.code === "PGRST116") {
          try {
            await this.createUserProfile();

            // Fetch the profile again after creation
            const { data: newProfile, error: newProfileError } = await supabase
              .from("profiles")
              .select(
                "*, genders(id, name), regions(id,name), subregions(id,name), countries(id,name), states(id,name), cities(id,name)"
              )
              .eq("user_id", this.user.id)
              .single();

            if (newProfileError) {
              console.error(
                "Error fetching new user profile:",
                newProfileError
              );
            } else {
              this.userProfile = newProfile;
            }
          } catch (error) {
            console.error("Error creating user profile:", error.message);
          }
        } else {
          console.error("Error fetching user profile:", error.message);
        }
      } else {
        this.userProfile = data;
      }
    },

    async fetchUserProfileEmail(userId) {
      if (!userId) {
        this.clearUser();
        return;
      }

      // console.log("userId: ", userId);

      // this.user = userData.user;

      // Fetch the user profile
      const { data, error } = await supabase
        .from("profiles")
        .select(
          "*, genders(id, name), regions(id,name), subregions(id,name), countries(id,name), states(id,name), cities(id,name)"
        )
        .eq("user_id", userId)
        .single();

      // console.log("profile data: ", data);

      if (error) {
        if (error.code === "PGRST116") {
          try {
            await this.createUserProfile();

            // Fetch the profile again after creation
            const { data: newProfile, error: newProfileError } = await supabase
              .from("profiles")
              .select(
                "*, genders(id, name), regions(id,name), subregions(id,name), countries(id,name), states(id,name), cities(id,name)"
              )
              .eq("user_id", this.user.id)
              .single();

            if (newProfileError) {
              console.error(
                "Error fetching new user profile:",
                newProfileError
              );
            } else {
              this.userProfile = newProfile;
            }
          } catch (error) {
            console.error("Error creating user profile:", error.message);
          }
        } else {
          console.error("Error fetching user profile:", error.message);
        }
      } else {
        this.userProfile = data;
      }
    },

    async createUserProfile({
      displayName,
      age,
      selectedGender,
      selectedStatus,
      avatarUrl,
      userLookingForIds = [],
      userDescriptionIds = [],
      bio
    }) {
      const supabase = useSupabaseClient();
      await this.getRawLocationData();
      const locationData = this.userLocation;

      try {
        // Fetch country data
        const { data: countryData, error: countryError } = await supabase
          .from("countries")
          .select("*")
          .eq("iso2", locationData.country_code)
          .single();

        if (countryError || !countryData) {
          console.error("Error fetching country data:", countryError);
          this.setDefaultProfileData();
        }

        // Fetch state data
        let { data: stateData, error: stateError } = await supabase
          .from("states")
          .select("*")
          .eq("name", locationData.region)
          .eq("country_id", countryData.id)
          .single();

        if (stateError || !stateData) {
          console.error("Error fetching state data:", stateError);
          stateData = await this.setDefaultStateData(countryData.id);
        }

        // Fetch city data
        let { data: cityData, error: cityError } = await supabase
          .from("cities")
          .select("*")
          .eq("name", locationData.city)
          .eq("state_id", stateData ? stateData.id : null)
          .single();

        if (cityError || !cityData) {
          console.error("Error fetching city data:", cityError);
          cityData = await this.setDefaultCityData(countryData.id);
        }



        // Insert user profile data
        const { error: profileError } = await supabase
          .from("profiles")
          .insert([
            {
              gender_id: selectedGender,
              status_id: selectedStatus,
              age: age,
              country_id: countryData.id,
              state_id: stateData ? stateData.id : null,
              city_id: cityData ? cityData.id : null,
              username: this.user ? this.user.email : null,
              avatar_url: avatarUrl,
              user_id: this.user.id,
              provider: "anonymous",
              displayname: displayName,
              ip: locationData.ip,
              site_url: null,
              bio: bio,
            },
          ])
          .single();

        if (profileError) {
          console.error("Error inserting user profile:", profileError);
          throw profileError;
        }

        // console.log("lookingForIds: ", userLookingForIds);
        // Insert userLookingForIds into user_looking_for table
        const lookingForInserts = userLookingForIds.map((lookingForId) => ({
          user_id: this.user.id,
          looking_for_id: lookingForId,
        }));
        const { error: lookingForError } = await supabase
          .from("user_looking_for")
          .insert(lookingForInserts);

        if (lookingForError) {
          console.error(
            "Error inserting into user_looking_for:",
            lookingForError
          );
          throw lookingForError;
        }

        // Insert userDescriptionIds into user_descriptions table
        const descriptionInserts = userDescriptionIds.map((descriptionId) => ({
          user_id: this.user.id,
          descriptions_id: descriptionId,
        }));
        const { error: descriptionError } = await supabase
          .from("user_descriptions")
          .insert(descriptionInserts);

        if (descriptionError) {
          console.error(
            "Error inserting into user_descriptions:",
            descriptionError
          );
          throw descriptionError;
        }

        console.log("User profile and preferences created successfully");
      } catch (err) {
        console.error("Exception occurred while creating user profile:", err);
        throw err;
      }
    },

    // Helper methods for setting default data if country is not found
    setDefaultProfileData() {
      this.userProfile = {
        gender_id: 1,
        age: 18,
        country_id: 233,
        state_id: 1416,
        city_id: 111058,
        username: this.user ? this.user.email : null,
        avatar_url: this.user.user_metadata
          ? this.user.user_metadata.avatar_url
          : null,
        user_id: this.user.id,
        provider: this.user.app_metadata.provider ?? "anonymous",
        displayname: displayName,
        tagline: "Welcome to my profile!",
        site_url: null,
      };
      console.log("Default profile data set due to missing country data.");
    },

    async setDefaultStateData(countryId) {
      const supabase = useSupabaseClient();
      const { data: randomStateData, error } = await supabase
        .from("states")
        .select("*")
        .eq("country_id", countryId)
        .limit(1)
        .single();

      if (error || !randomStateData) {
        console.error("Error fetching random state data:", error);
        return null;
      }

      console.log(
        "Default state data set due to missing state data.",
        randomStateData
      );
      return randomStateData;
    },

    async setDefaultCityData(countryId) {
      const supabase = useSupabaseClient();
      const { data: randomCityData, error } = await supabase
        .from("cities")
        .select("*")
        .eq("country_id", countryId)
        .limit(1);

      if (error || !randomCityData || randomCityData.length === 0) {
        console.error(
          "Error fetching random city data or no cities found:",
          error
        );
        return null;
      }

      console.log(
        "Default city data set due to missing city data.",
        randomCityData[0]
      );
      return randomCityData[0];
    },

    async getRawLocationData() {
      try {
        const response = await $fetch("https://ipapi.co/json/");
        this.userLocation = response;
      } catch (error) {
        console.error("Error fetching IP location data:", error);
        this.userLocation = null;
      }
    },

    async updateUserProfile(updates) {
      const supabase = useSupabaseClient();

      // Sanitize updates to only include valid columns
      const validKeys = ["bio", "gender_id", "avatar_url"]; // Add all the valid column names here
      const sanitizedUpdates = Object.keys(updates)
        .filter((key) => validKeys.includes(key))
        .reduce((obj, key) => {
          obj[key] = updates[key];
          return obj;
        }, {});

      const { data, error } = await supabase
        .from("profiles")
        .update(sanitizedUpdates)
        .eq("id", this.userProfile.id);

      if (error) {
        console.error("Error updating user profile:", error);
      } else {
        this.userProfile = { ...this.userProfile, ...sanitizedUpdates };
        // console, log("authStore.updateUserProfile:", this.userProfile);
      }
    },

    async trackPresence(userId) {
      this.updatePresence(userId, "online")

      // not sure about this...
      window.addEventListener("beforeunload", () =>
        this.updatePresence(userId, "offline")
      );

      this.inactivityCheckInterval = setInterval(() => 
        this.checkInactivityForAllUsers(), 
        1800000 
      );
    },

    async updatePresence(userId, status) {
     //console.log("updatepresence : ");
     //console.log("status : ",status);
      const supabase = useSupabaseClient();
      const { error } = await supabase
        .from("presence")
        .upsert({ user_id: userId, status, last_active: new Date() });

      if (error) console.error("Error updating presence:", error);
    },

    async fetchLastActive(userId) {
      const supabase = useSupabaseClient();
      const { data, error } = await supabase
        .from("presence")
        .select("last_active")
        .eq("user_id", userId)
        .single();

      if (error) {
        console.error("Error fetching last active time:", error.message);
        return null;
      }
      return data.last_active;
    },

    async stopTracking()
    {
      if (this.inactivityCheckInterval)
      {
        clearInterval(this.inactivityCheckInterval);
      }
    },

    async checkInactivityForAllUsers()
    {
      console.log("checking inactivity for ALL users")
      const supabase = useSupabaseClient();

      // Get all online users
      const { data: onlineUsers, error } = await supabase
        .from("presence")
        .select("user_id, last_active")
        .eq("status", "online"); 

      if (error)
      {
        console.error("Error fetching online users:", error);
        return;
      }

      const now = new Date();

      for (const user of onlineUsers)
      {
        const lastActiveDate = new Date(user.last_active);
        lastActiveDate.setHours(lastActiveDate.getHours() + 1);
        const timeDifference = (now - lastActiveDate) / 1000; // Convert to seconds

        //console.log("now", now);
        //console.log("lastactive", lastActiveDate);
        //console.log("timedfference", timeDifference)
        //console.log("checkinactivityallusers");
        //30 minutes 
        if (timeDifference > 1800)
        {
          await this.updatePresence(user.user_id, "offline");
        }
      }
    },

    async insertFeedback(feedback) {
      const supabase = useSupabaseClient();
      const { error } = await supabase
      .from("feedback")
      .insert([
        {
          feedback_text: feedback,
        },
      ]);

      if (error) {
      console.error("Error inserting feedback:", error);
      }
    },

    async logout() {
      console.log("logout");
      if (this.user) {
        await this.updatePresence(this.user.id, "offline");
      }
      const supabase = useSupabaseClient();
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error("Error during logout:", error.message);
        return;
      } else {
        this.clearUser();
        this.clearCookies();
      }
    },

    setUser(user) {
      this.user = user;
      // console.log("inside authStore.setUser ", user);
      this.userProfile = this.fetchUserProfile();
    },

    clearUser() {
      this.user = null;
      this.userProfile = null;
      this.userLocation = null;
    },
    clearCookies() {
      // Clear all cookies
      document.cookie.split(";").forEach((c) => {
        document.cookie = c
          .replace(/^ +/, "")
          .replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
      });
    },
  },
});
