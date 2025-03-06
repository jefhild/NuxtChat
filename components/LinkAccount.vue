<template>
	<v-card title="Link an account">
		<v-card-text>
			<v-row>
				<v-col justify="center">
					Please pick a provider
				</v-col>
			</v-row>
			<v-row>
				<v-col cols="4">
					<v-btn color="primary" @click="checkEmail">Email</v-btn>
				</v-col>
				<v-col cols="4">
					<v-btn color="primary" @click="checkGoogle">Google</v-btn>
				</v-col>
				<v-col cols="4">
					<v-btn color="primary" @click="checkFacebook">Facebook</v-btn>
				</v-col>
			</v-row>
		</v-card-text>
	</v-card>
	<v-dialog v-model="LoginEmailDialog" width="auto">
		<v-card title="Login with Email">
			<v-card-text>
				<LoginEmail />
			</v-card-text>
		</v-card>
	</v-dialog>
</template>

<script setup>
import { useRouter } from "vue-router";
import { useAuthStore } from "@/stores/authStore";
import LoginEmail from "@/components/LoginEmail.vue";

const router = useRouter();
const authStore = useAuthStore();
const LoginEmailDialog = ref(false);

const checkGoogle = async () =>
{
	try
	{
		await authStore.checkAuthGoogle();
	} catch (error)
	{
		console.error("Error submitting form:", error);
	}
};

const checkFacebook = async () =>
{
	try
	{
		await authStore.checkAuthFacebook();
	} catch (error)
	{
		console.error("Error submitting form:", error);
	}
};

const checkEmail = async () =>
{
	try
	{
		LoginEmailDialog.value = true;
		return LoginEmail;
	} catch (error)
	{
		console.error("Error submitting form:", error);
	}
};
</script>