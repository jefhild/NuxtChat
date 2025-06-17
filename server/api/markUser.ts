// server/api/admin/markUser.ts
import { createClient } from '@supabase/supabase-js';

export default defineEventHandler(async (event) =>
{
	const config = useRuntimeConfig();
	const body = await readBody(event);
	const { userId, deleteMe, deleteRequestedAt } = body;

	const supabaseAdmin = createClient(
		config.public.SUPABASE_URL!,
		config.SUPABASE_SERVICE_ROLE_KEY!
	);

	const { data, error } = await supabaseAdmin.auth.admin.updateUserById(userId, {
		user_metadata: {
			delete_me: deleteMe,
			delete_requested_at: deleteRequestedAt,
		},
	});

	if (data)
	{
		console.log('User metadata updated successfully:', data);
		const { error } = await supabaseAdmin
			.from('profiles')
			.update({ marked_for_deletion_at: deleteMe ? new Date().toISOString() : null })
			.eq('user_id', userId);
	}

	if (error)
	{
		console.error('Error updating user metadata:', error.message);
		return {
			statusCode: 500,
			body: { message: 'Failed to update user metadata' }
		};
	}

	return { success: true };
});