<template>
	<v-row dense>
		<v-col v-for="profile in profiles" :key="profile.user_id" cols="12" sm="6" md="4" lg="3"
			class="d-flex justify-center pa-4">
			<v-card :class="[
				'profile-card text-center d-flex flex-column justify-end',
				profile.marked_for_deletion_at ? 'marked-for-deletion' : ''
			]" elevation="2" :style="{ backgroundImage: `url(${profile.avatar_url || '/default-avatar.png'})` }">
				<div class="overlay">
					<v-row class="d-flex justify-center align-center">
						<NuxtLink :to="`/profiles/${profile.gender?.toLowerCase()}/${profile.displayname}`"
							class="font-weight-bold text-white mb-1 clickable-link">
							{{ profile.displayname }}
						</NuxtLink>
					</v-row>
					<v-row class="d-flex justify-center align-center">
						<div v-if="profile.marked_for_deletion_at" class="deletion-info mt-2">
							<div class="text-white text-caption">
								{{ timeLeft(profile.marked_for_deletion_at) }}
							</div>
							<v-btn size="x-small" color="green" @click.stop="unmarkDeletion(profile)">
								Undo Deletion
							</v-btn>

						</div>

						<v-btn v-if="delete" color="red" class="overlay  mb-5"
							@click.stop="openDeleteDialog(profile)">Delete</v-btn>

					</v-row>




				</div>

			</v-card>


		</v-col>
	</v-row>


	<v-dialog v-model="confirmDeleteDialog" max-width="400px" transition="dialog-transition">
		<v-card>
			<v-card-title class="headline">Confirm Deletion</v-card-title>

			<v-card-text>Are you sure you want to delete this user?</v-card-text>

			<v-card-actions>
				<v-spacer />
				<v-btn color="grey" text @click="confirmDeleteDialog = false">Cancel</v-btn>
				<v-btn color="red" text @click="confirmDelete">Delete</v-btn>
			</v-card-actions>
		</v-card>
	</v-dialog>
</template>



<script setup>
const props = defineProps({
	profiles: {
		type: Array,
		required: true
	},
	delete: {
		type: Boolean,
		default: false
	}
});

const emit = defineEmits(["user-deleted"]);


const { markUserForDeletion, unmarkUserForDeletion } = useDb(); 

const confirmDeleteDialog = ref(false);
const userToDelete = ref(null);
const now = ref(new Date());

function timeLeft()
{
	// Get the current time
	now.value = new Date();
	
	// Create a date object for midnight tonight
	const midnight = new Date();
	midnight.setHours(23, 59, 59, 999); // Set to end of day
	
	// Calculate time difference in hours
	const hoursLeft = (midnight.getTime() - now.value.getTime()) / (1000 * 60 * 60);
	
	// Format the result
	if (hoursLeft <= 0) return "Deleting soon...";
	
	// Show hours and minutes
	const hours = Math.floor(hoursLeft);
	const minutes = Math.floor((hoursLeft - hours) * 60);
	
	if (hours > 0) {
		return `${hours}h ${minutes}m left`;
	} else {
		return `${minutes}m left`;
	}
}

function openDeleteDialog(profile)
{
	userToDelete.value = profile;
	confirmDeleteDialog.value = true;
}

async function confirmDelete()
{
	if (!userToDelete.value) return;

	await markUserForDeletion(userToDelete.value.user_id);

	// Emit an event so the parent can update the data properly
	emit('user-deleted');

	confirmDeleteDialog.value = false;
};

async function unmarkDeletion(profile)
{
	try
	{
		await unmarkUserForDeletion(profile.user_id);
		profile.marked_for_deletion_at = null; // Update locally to hide the warning
		console.log('User unmarked successfully!');
	} catch (err)
	{
		console.error('Error unmarking user:', err);
	}
};

//So that it can be updated every minute
onMounted(() =>
{
	setInterval(() =>
	{
		now.value = new Date();
	}, 60000); // 1 minute
});
</script>

<style scoped>
.profile-card {
	width: 180px;
	height: 220px;
	background-size: cover;
	background-position: center;
	position: relative;
	cursor: pointer;
	transition: transform 0.2s ease;
	border-radius: 15px;
}

.profile-card:hover {
	transform: scale(1.03);
}

.profile-card::before {
	content: "";
	background: rgba(0, 0, 0, 0.15);
	position: absolute;
	inset: 0;
	z-index: 1;
	border-radius: 8px;
}

.overlay {
	z-index: 2;
	position: relative;
}

.clickable-link {
	cursor: pointer;
	text-decoration: none;
}
.marked-for-deletion {
	border: 2px solid red;
	box-shadow: 0 0 10px rgba(255, 0, 0, 0.7);
}
</style>
