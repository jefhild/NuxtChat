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
    async checkAuth()
    {
      const {authGetUser} = useDb();
      const { data, error } = await authGetUser();
      // console.log("inside checkAuth - user: ", data);

      if (data.user)
      {
        this.setUser(data.user);
        await this.fetchUserProfile();
      } else
      {
        this.clearUser();
        if (error) console.error("Check auth error:", error.message);
      }
    },

    async checkAuthEmail()
    {
      const { authGetUser } = useDb();
      const { data, error } = await authGetUser();
      // console.log("inside checkAuth - user: ", data);

      if (data.user)
      {
        this.setUser(data.user);
        await this.fetchUserProfileEmail(data.user.id);
        // console.log("data.user: ", data.user);
      } else
      {
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
    })
    {
      const { authGetUser} = useDb();

      try
      {
        // Step 1: Try to get the current user
        const { data: currentUser, error: currentError } = await authGetUser();

        if (currentError && currentError.message !== "Auth session missing!")
        {
          console.error("Error checking current user:", currentError);
          throw currentError;
        }

        if (currentUser && currentUser.user)
        {
          this.setUser(currentUser.user);
        } else
        {
          const { signInAnonymously } = useDb();
          // Step 2: If no authenticated user, create an anonymous user
          const { data: userData, error: userError } = await signInAnonymously();

          if (userError)
          {
            console.error("Error signing in anonymously:", userError);
            throw userError;
          }

          if (userData.user)
          {
            this.setUser(userData.user);
            const { authMarkUserAsAnonymous } = useDb();
            authMarkUserAsAnonymous();
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
      } catch (error)
      {
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
    })
    {
      try
      {
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
      } catch (error)
      {
        if (error.code === "23505")
        {
          console.error("Display Name already exists:", displayName);

          const { getUserFromName } = useDb();
          // Step 5: Fetch the existing profile with the display name
          const { data: existingProfile } = await getUserFromName(displayName); 
          
          // Step 6: Check if the existing profile belongs to the current user
          if (existingProfile.user_id === this.user.id)
          {
            console.log(
              "Duplicate display name, but it's owned by the current user. Proceeding."
            );
            this.userProfile = existingProfile; // Use the existing profile
          } else
          {
            console.error(
              "Display name is taken by a different user. Cannot proceed."
            );
            throw new Error(
              "This Display Name is already taken by another user. Please choose a different name."
            );
          }
        } else
        {
          throw error; // Re-throw any other errors
        }
      }
    },


    async checkAuthGoogle()
    {
      const { authGetSession } = useDb();
      const { data: sessionData, error: sessionError } = await authGetSession();

      if (!sessionData?.session)
      {
        console.log("No active session. Initiating Google OAuth...");

        const { signInWithOAuth } = useDb();
        // Redirect to Google's OAuth
        await signInWithOAuth("google", `/login`);
        // Execution stops here due to redirection
        return;
      }

      console.log("Session detected. Linking Google identity...");

      const { linkIdentity } = useDb();
      const { data, error } = await linkIdentity("google",`/login`);

      if (error)
      {
        console.error("Error linking identity:", error.message);
        return;
      }

      // Add a return here to handle the redirect after linking
      if (data)
      {
        console.log("Identity linked successfully. Redirecting...");
        return;
      }

      const { authGetUser } = useDb();
      // If no redirect occurs (unlikely but possible), continue here
      const { data: userData, error: userError } = await authGetUser();

      if (userError || !userData?.user)
      {
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

    async updateUserProfileAfterLinking({ email, provider })
    {
      if (!this.user?.id || !this.userProfile)
      {
        console.error("No user or userProfile found for updating profile.");
        return;
      }

      try
      {
        const { updateUsername, updateProvider } = useDb();
        // Perform a partial update to avoid overwriting existing profile data
        await updateUsername(email, this.user.id,);
        await updateProvider(provider, this.user.id,);

        console.log("User profile updated successfully with Google data.");
      } catch (error)
      {
        console.error("Exception while updating user profile:", error.message);
        throw error;
      }
    },

    async checkAuthFacebook()
    {
      const { signInWithOAuth } = useDb();
      // console.log("inside checkAuthGoogle - displayName: ");
      await signInWithOAuth("facebook", `/loginfacebook`);
      // console.log("checkAuthFacebook - userData: ", userData);
      // console.log("checkAuthFacebook - error: ", error);
    },

    async fetchUserProfile()
    {
      if (!this.user || !this.user.id)
      {
        console.log("No user or user.id found.");
        return;
      }

      const { fetchUserProfile } = useUserProfile();

      // Pass the user id to the composable
      const profile = await fetchUserProfile(this.user.id);
      // console.log("inside fetchUserProfile in auth store. Profile: ", profile);

      if (profile)
      {
        // Set the userProfile in the store
        this.userProfile = profile;
        // console.log(
        //   "User profile successfully set in the store: ",
        //   this.userProfile
        // );
      } else
      {
        console.log("Failed to fetch or set user profile.");
      }
    },

    async fetchUserProfileGoogle()
    {
      const { authGetUser } = useDb();
      // Fetch the authenticated user
      const { data: userData, error: userError } = await authGetUser();

      if (userError)
      {
        console.error("Error fetching user:", userError.message);
        return;
      }

      if (!userData.user)
      {
        this.clearUser();
        return;
      }

      this.user = userData.user;

      // Fetch the user profile
      const { getUserProfileFromId } = useDb();
      const { data, error } = await getUserProfileFromId(this.user.id);

      if (error)
      {
        if (error.code === "PGRST116")
        {
          try
          {
            await this.createUserProfile();

            // Fetch the profile again after creation
            const { data: newProfile, error: newProfileError } = await getUserProfileFromId(this.user.id);

            if (newProfileError)
            {
              console.error(
                "Error fetching new user profile:",
                newProfileError
              );
            } else
            {
              this.userProfile = newProfile;
            }
          } catch (error)
          {
            console.error("Error creating user profile:", error.message);
          }
        } else
        {
          console.error("Error fetching user profile:", error.message);
        }
      } else
      {
        this.userProfile = data;
      }
    },

    async fetchUserProfileFacebook()
    {
      const { authGetUser } = useDb();
      // Fetch the authenticated user
      const { data: userData, error: userError } = await authGetUser();

      if (userError)
      {
        console.error("Error fetching user:", userError.message);
        return;
      }

      if (!userData.user)
      {
        this.clearUser();
        return;
      }

      this.user = userData.user;

      // Fetch the user profile
      const { getUserProfileFromId } = useDb();
      const { data, error } = await getUserProfileFromId(this.user.id);

      if (error)
      {
        if (error.code === "PGRST116")
        {
          try
          {
            await this.createUserProfile();

            // Fetch the profile again after creation
            const { data: newProfile, error: newProfileError } = await getUserProfileFromId(this.user.id);

            if (newProfileError)
            {
              console.error(
                "Error fetching new user profile:",
                newProfileError
              );
            } else
            {
              this.userProfile = newProfile;
            }
          } catch (error)
          {
            console.error("Error creating user profile:", error.message);
          }
        } else
        {
          console.error("Error fetching user profile:", error.message);
        }
      } else
      {
        this.userProfile = data;
      }
    },

    async fetchUserProfileEmail(userId)
    {
      if (!userId)
      {
        this.clearUser();
        return;
      }

      // console.log("userId: ", userId);

      // this.user = userData.user;

      // Fetch the user profile
      const { getUserProfileFromId } = useDb();
      const { data, error } = await getUserProfileFromId(userId);

      // console.log("profile data: ", data);

      if (error)
      {
        if (error.code === "PGRST116")
        {
          try
          {
            await this.createUserProfile();

            // Fetch the profile again after creation
            const { data: newProfile, error: newProfileError } = await getUserProfileFromId(userId);

            if (newProfileError)
            {
              console.error(
                "Error fetching new user profile:",
                newProfileError
              );
            } else
            {
              this.userProfile = newProfile;
            }
          } catch (error)
          {
            console.error("Error creating user profile:", error.message);
          }
        } else
        {
          console.error("Error fetching user profile:", error.message);
        }
      } else
      {
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
    })
    {
      await this.getRawLocationData();
      const locationData = this.userLocation;

      try
      {
        const { getCountryByIsoCode } = useDb();
        // Fetch country data
        const { data: countryData, error: countryError } = await getCountryByIsoCode(locationData.country_code);


        if (countryError || !countryData)
        {
          console.error("Error fetching country data:", countryError);
          this.setDefaultProfileData();
        }

        // Fetch state data
        const { getStateByNameAndCountry } = useDb();
        let { data: stateData, error: stateError } = await getStateByNameAndCountry(locationData.region, countryData.id);

        if (stateError || !stateData)
        {
          console.error("Error fetching state data:", stateError);
          stateData = await this.setDefaultStateData(countryData.id);
        }

        // Fetch city data
        const { getCityByNameAndState } = useDb();
        let { data: cityData, error: cityError } = await getCityByNameAndState(locationData.city, stateData ? stateData.id : null);

        if (cityError || !cityData)
        {
          console.error("Error fetching city data:", cityError);
          cityData = await this.setDefaultCityData(countryData.id);
        }

        // Insert user profile data
        const { insertProfile } = useDb();
        const { error: profileError } = await insertProfile(
          selectedGender, selectedStatus, age, countryData.id, stateData ? stateData.id : null, cityData ? cityData.id : null,
          this.user ? this.user.email : null, avatarUrl, this.user.id, "anonymous", displayName, locationData.ip, null, bio
        ); 

        if (profileError)
        {
          console.error("Error inserting user profile:", profileError);
          throw profileError;
        }

        // console.log("lookingForIds: ", userLookingForIds);
        // Insert userLookingForIds into user_looking_for table
        const { insertUserInterest } = useDb();
        userLookingForIds.forEach(async (lookingForId) => {
          await insertUserInterest(this.user.id, lookingForId);
        });

        // Insert userDescriptionIds into user_descriptions table
        const { insertUserDescription } = useDb();
        userDescriptionIds.forEach(async (descriptionId) => {
          await insertUserDescription(this.user.id, descriptionId);
        });

        console.log("User profile and preferences created successfully");
      } catch (err)
      {
        console.error("Exception occurred while creating user profile:", err);
        throw err;
      }
    },

    // Helper methods for setting default data if country is not found
    setDefaultProfileData()
    {
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

    async setDefaultStateData(countryId)
    {
      const { getStateFromCountryId } = useDb();
      const { data: randomStateData, error } = await getStateFromCountryId(countryId);

      if (error || !randomStateData)
      {
        console.error("Error fetching random state data:", error);
        return null;
      }

      console.log(
        "Default state data set due to missing state data.",
        randomStateData
      );
      return randomStateData;
    },

    async setDefaultCityData(countryId)
    {
      const { getCitiesFromCountryId } = useDb();
      const { data: randomCityData, error } = await getCitiesFromCountryId(countryId);

      if (error || !randomCityData || randomCityData.length === 0)
      {
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

    async getRawLocationData()
    {
      try
      {
        const response = await $fetch("https://ipapi.co/json/");
        this.userLocation = response;
      } catch (error)
      {
        console.error("Error fetching IP location data:", error);
        this.userLocation = null;
      }
    },

    async logout()
    {
      console.log("logout");
      const { updatePresence } = useDb();
      await updatePresence(this.user.id, "offline");
      const { authSignOut } = useDb();
      const { error } = authSignOut;
      if (error)
      {
        console.error("Error during logout:", error.message);
        return;
      } else
      {
        this.clearUser();
        this.clearCookies();
      }
    },
    setUser(user)
    {
      this.user = user;
      // console.log("inside authStore.setUser ", user);
      this.userProfile = this.fetchUserProfile();
    },

    clearUser()
    {
      this.user = null;
      this.userProfile = null;
      this.userLocation = null;
    },
    clearCookies()
    {
      // Clear all cookies
      document.cookie.split(";").forEach((c) =>
      {
        document.cookie = c
          .replace(/^ +/, "")
          .replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
      });
    },
  },
});
