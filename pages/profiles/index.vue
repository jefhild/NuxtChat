<template>
	<v-container fluid>
		<HomeRow1 />
		<v-row>
			<v-col cols="12">
				<NewsContainer />
			</v-col>
		</v-row>

	</v-container>
</template>

<script setup>
const isAuthenticated = ref(false);
const authStore = useAuthStore();
const isLoading = ref(true);

onMounted(async () =>
{
	await authStore.checkAuth();
	isAuthenticated.value = authStore.user !== null;
	console.log("User authenticated:", isAuthenticated.value);
	isLoading.value = false;
});
</script>
  
