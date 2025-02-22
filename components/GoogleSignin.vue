<template>
  <v-container fluid>
    <v-row align="center" justify="center">
      <v-col cols="12" md="12">
        <v-btn @click="handleGoogleSignIn" color="blue" dark>
          Sign in with Google
        </v-btn>
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup>
const supabase = useSupabaseClient();

const handleGoogleSignIn = async () => {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `https://imchatty.com/login`,
      // redirectTo: `http://localhost:3000/login`,
    },
  });

  if (error) {
    console.error("Login error:", error.message);
  }
  
};
</script>
