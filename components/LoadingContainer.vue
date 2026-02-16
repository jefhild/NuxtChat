<template>
	<v-container fluid class="d-flex align-center justify-center fill-height text-center">
		<v-row class="d-flex flex-column align-center" style="height: auto;">
			<v-col cols="12" class="d-flex justify-center">
				<img
					src="/images/robot.png"
					alt="ImChatty logo"
					width="40"
					height="40"
					style="filter: grayscale(100%) opacity(0.7);"
				/>
			</v-col>

			<v-col cols="6" class="d-flex justify-center">
				<v-progress-linear color="primary" height="6" rounded indeterminate style="width: 200px;" />
			</v-col>

			<v-col cols="12">
				<div class="text-h6">
					{{ text || $t('components.loadingContainer.loading') }}
				</div>
			</v-col>
		</v-row>
	</v-container>
</template>

<script setup>
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
defineProps({
	text: String,
})
</script>

<style scoped>
.v-container {
	background: rgb(var(--v-theme-surface));
	color: rgb(var(--v-theme-on-surface));
}

:deep(.v-progress-linear) {
	background-color: rgba(var(--v-theme-on-surface), 0.2) !important;
}
</style>
