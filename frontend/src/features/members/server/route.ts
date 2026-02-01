import z from 'zod';
import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { createSupabaseClient } from '@/lib/supabase-server';
import { Member, MemberRole } from '../types';

const app = new Hono()
    .get(
        "/",
        zValidator("query", z.object({ workspaceId: z.string() })),
        async (c) => {
            const supabase = await createSupabaseClient();
            const { workspaceId } = c.req.valid("query");

            // Get current user
            const { data: { user }, error: authError } = await supabase.auth.getUser();
            if (authError || !user) {
                return c.json({ error: "Unauthorized" }, 401);
            }

            // Check if user is a member of this workspace
            const { data: member, error: memberError } = await supabase
                .from('members')
                .select('*')
                .eq('workspace_id', workspaceId)
                .eq('user_id', user.id)
                .single();

            if (memberError || !member) {
                return c.json({ error: "Unauthorized" }, 401);
            }

            // Get all members of the workspace
            const { data: members, error: membersError } = await supabase
                .from('members')
                .select(`
                    *,
                    users:profiles (
                        id,
                        name,
                        email,
                        avatar_color
                    )
                `)
                .eq('workspace_id', workspaceId);

            if (membersError) {
                return c.json({ error: membersError.message }, 500);
            }

            // Transform the data to match the expected format
            const populatedMembers = members.map((member: any) => {
                const userProfile = member.users;
                
                if (!userProfile) {
                    // Fallback for deleted users
                    return {
                        ...member,
                        name: "Unknown User",
                        email: "unknown@example.com",
                        avatarColor: { bg: "bg-gray-100", text: "text-gray-700" },
                    };
                }
                
                const avatarColor = userProfile.avatar_color as { bg: string; text: string } | undefined;

                return {
                    ...member,
                    name: userProfile.name || userProfile.email,
                    email: userProfile.email,
                    avatarColor,
                };
            });

            return c.json({
                data: {
                    documents: populatedMembers,
                    total: populatedMembers.length,
                }
            });
        }
    )
    .delete(
        "/:memberId",
        async (c) => {
            const { memberId } = c.req.param();
            const supabase = await createSupabaseClient();

            // Get current user
            const { data: { user }, error: authError } = await supabase.auth.getUser();
            if (authError || !user) {
                return c.json({ error: "Unauthorized" }, 401);
            }

            // Get member to delete
            const { data: memberToDelete, error: deleteError } = await supabase
                .from('members')
                .select('*')
                .eq('id', memberId)
                .single();

            if (deleteError || !memberToDelete) {
                return c.json({ error: "Member not found" }, 404);
            }

            // Check if current user is admin or the member being deleted
            const { data: currentUser, error: currentUserError } = await supabase
                .from('members')
                .select('*')
                .eq('workspace_id', memberToDelete.workspace_id)
                .eq('user_id', user.id)
                .single();

            if (currentUserError || !currentUser) {
                return c.json({ error: "Unauthorized" }, 401);
            }

            if (currentUser.id !== memberToDelete.id && currentUser.role !== MemberRole.ADMIN) {
                return c.json({ error: "Unauthorized" }, 401);
            }

            // Check if this is the last member
            const { count, error: countError } = await supabase
                .from('members')
                .select('*', { count: 'exact', head: true })
                .eq('workspace_id', memberToDelete.workspace_id);

            if (countError) {
                return c.json({ error: countError.message }, 500);
            }

            if (count && count <= 1) {
                return c.json({ error: "Cannot delete only member" }, 400);
            }

            // Delete the member
            const { error: finalDeleteError } = await supabase
                .from('members')
                .delete()
                .eq('id', memberId);

            if (finalDeleteError) {
                return c.json({ error: finalDeleteError.message }, 500);
            }

            return c.json({
                data: {
                    id: memberToDelete.id,
                }
            });
        }
    )
    .patch(
        "/:memberId",
        zValidator("json", z.object({ role: z.nativeEnum(MemberRole) })),
        async (c) => {
            const { memberId } = c.req.param();
            const { role } = c.req.valid("json");
            const supabase = await createSupabaseClient();

            // Get current user
            const { data: { user }, error: authError } = await supabase.auth.getUser();
            if (authError || !user) {
                return c.json({ error: "Unauthorized" }, 401);
            }

            // Get member to update
            const { data: memberToUpdate, error: updateError } = await supabase
                .from('members')
                .select('*')
                .eq('id', memberId)
                .single();

            if (updateError || !memberToUpdate) {
                return c.json({ error: "Member not found" }, 404);
            }

            // Check if current user is admin or the member being updated
            const { data: currentUser, error: currentUserError } = await supabase
                .from('members')
                .select('*')
                .eq('workspace_id', memberToUpdate.workspace_id)
                .eq('user_id', user.id)
                .single();

            if (currentUserError || !currentUser) {
                return c.json({ error: "Unauthorized" }, 401);
            }

            if (currentUser.id !== memberToUpdate.id && currentUser.role !== MemberRole.ADMIN) {
                return c.json({ error: "Unauthorized" }, 401);
            }

            // Check if this is the last member (can't downgrade only member)
            const { count, error: countError } = await supabase
                .from('members')
                .select('*', { count: 'exact', head: true })
                .eq('workspace_id', memberToUpdate.workspace_id);

            if (countError) {
                return c.json({ error: countError.message }, 500);
            }

            if (count && count <= 1) {
                return c.json({ error: "Cannot downgrade only member" }, 400);
            }

            // Update the member role
            const { error: finalUpdateError } = await supabase
                .from('members')
                .update({ role })
                .eq('id', memberId);

            if (finalUpdateError) {
                return c.json({ error: finalUpdateError.message }, 500);
            }

            return c.json({
                data: {
                    id: memberToUpdate.id,
                }
            });
        }
    );

export default app;