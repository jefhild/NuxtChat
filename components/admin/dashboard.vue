<template>
	<v-container>
		<LoadingContainer v-if="isLoading"/>

		<v-row v-else>
			<v-col cols="12">
				<v-card>
					<v-tabs v-model="tab" bg-color="primary">
						<v-tab value="registered">Registered</v-tab>
						<v-tab value="ai">AI</v-tab>
					</v-tabs>

					<v-card-text>
						<v-text-field v-model="search" label="Search profiles..." variant="outlined" class="mb-6"
							clearable></v-text-field>

						<v-tabs-window v-model="tab">
							<v-tabs-window-item value="registered">
								<ProfileGrid delete :profiles="filteredRegistered" @user-deleted="handleUserDeleted" :limit="null"/>
							</v-tabs-window-item>

							<v-tabs-window-item value="ai">
								<ProfileGrid delete :profiles="filteredAI" @user-deleted="handleUserDeleted" :limit="null"/>
							</v-tabs-window-item>
						</v-tabs-window>
					</v-card-text>
				</v-card>
			</v-col>
		</v-row>
	</v-container>
</template>

<script setup>

const isLoading = ref(true);
const tab = ref('registered');
const profiles = ref([]);
const aiProfiles = ref([]);
const search = ref("");

const { getAllProfiles } = useDb();

onMounted(async () =>
{
	profiles.value = await getAllProfiles(false);
	aiProfiles.value = await getAllProfiles(true);
	isLoading.value = false;
});

const filteredRegistered = computed(() =>
	profiles.value.filter(
		p => p.provider !== "anonymous" &&
			(!search.value || p.displayname.toLowerCase().includes(search.value.toLowerCase()))
	)
);

const filteredAI = computed(() =>
	aiProfiles.value.filter(
		p => !search.value || p.displayname.toLowerCase().includes(search.value.toLowerCase())
	)
);

async function handleUserDeleted(userId) {
	try {
		profiles.value = profiles.value.map(profile =>
		{
			if (profile.user_id === userId)
			{
				// Mark as deleted (example: update local deletion styles)
				return {
					...profile,
					marked_for_deletion_at: new Date().toISOString()
				};
			}
			return profile;
		});
	} catch (error) {
		console.error("Error marking user for deletion:", error);
	} 
	
}
</script>