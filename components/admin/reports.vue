<template>
	<v-card class="pa-4" elevation="2">
		<v-card-title>
			<v-icon class="mr-2">mdi-alert-circle-outline</v-icon>
			User Reports
		</v-card-title>

		<v-row class="mb-4" align="center">
			<v-col cols="12" sm="6" md="4">
				<v-select v-model="selectedCategory" :items="categoryOptions" label="Filter by Category"
					variant="outlined" clearable density="compact" hide-details prepend-inner-icon="mdi-filter" />
			</v-col>
		</v-row>

		<v-divider class="mb-4" />

		<v-progress-circular v-if="isLoading" indeterminate color="primary" class="ma-auto" />

		<v-alert v-else-if="reports.length === 0" type="info" class="mt-4">
			No reports found.
		</v-alert>

		<v-table v-else>
			<thead>
				<tr>
					<th>Reporter</th>
					<th>Reported</th>
					<th>Categories</th>
					<th>Reason</th>
					<th>Date</th>
					<th>Actions</th>
				</tr>
			</thead>
			<tbody>
				<tr v-for="report in filteredReports" :key="report.id">
					<td>{{ report.reporter_displayname}}</td>
					<td>{{ report.reported_displayname}}</td>
					<td>
						<v-chip v-for="cat in report.categories" :key="cat" class="ma-1" color="red lighten-2" label
							small>
							{{ cat }}
						</v-chip>
					</td>
					<td>{{ report.reason }}</td>
					<td>{{ formatDate(report.created_at) }}</td>
					<td>
						<v-btn @click="handleDeleteReport(report.id)" color="red"  small>
							Delete
						</v-btn>
					</td>
				</tr>
			</tbody>
		</v-table>
	</v-card>
</template>


<script setup>
const { getAllReports, getUserDisplayNameFromId, deleteReport } = useDb();

const isLoading = ref(true);
const reports = ref([]);
const selectedCategory = ref(null);

onMounted(async () =>
{
	const rawReports = await getAllReports();

	// Resolve display names
	const resolved = await Promise.all(
		rawReports.map(async (report) =>
		{
			const reporter_displayname = await getUserDisplayNameFromId(report.reporter_id);
			const reported_displayname = await getUserDisplayNameFromId(report.reported_user_id);
			return {
				...report,
				reporter_displayname: reporter_displayname ?? report.reporter_id,
				reported_displayname: reported_displayname ?? report.reported_user_id
			};
		})
	);

	reports.value = resolved
	isLoading.value = false;
});

function formatDate(dateString)
{
	const date = new Date(dateString);
	return date.toLocaleString(); // customize as needed
}

const categoryOptions = [
	'name',
	'photo',
	'descriptors',
	'actions'
];

const filteredReports = computed(() =>
{
	if (!selectedCategory.value) return reports.value;

	return reports.value.filter((report) =>
		report.categories.includes(selectedCategory.value)
	);
});

const handleDeleteReport = async (reportId) =>
{
	await deleteReport(reportId);
	reports.value = reports.value.filter((report) => report.id !== reportId);
};
</script>



<style scoped>
.v-table {
	font-size: 14px;
}

th {
	font-weight: bold;
}
</style>
