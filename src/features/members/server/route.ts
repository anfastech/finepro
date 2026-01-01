import z from 'zod';
import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';

import { sessionMiddleware } from '@/lib/session-middleware';
import { createAdminClient } from '@/lib/appwrite';
import { getMember } from '../utils';
import { DATABASE_ID, MEMBERS_ID } from '@/config';
import { Query } from 'node-appwrite';
import { Member, MemberRole } from '../types';

const app = new Hono()
    .get(
        "/",
        sessionMiddleware,
        zValidator("query", z.object({ workspaceId: z.string()})),
        async (c) => {
            const { users } = await createAdminClient();
            const databases = c.get("database");
            const user = c.get("user");
            const workspaceId = c.req.valid("query").workspaceId;

            const member = await getMember({
                databases,
                workspaceId,
                userId: user.$id,
            });

            if (!member) {
                return c.json({ error: "Unauthorized" }, 401);
            }

            const members = await databases.listDocuments<Member>(
                DATABASE_ID,
                MEMBERS_ID,
                [Query.equal("workspaceId", workspaceId)],
            );

            // Batch fetch all users at once to avoid N+1 queries
            const userIds = members.documents.map(m => m.userId);
            const allUsers = await Promise.all(
                userIds.map(userId => users.get(userId).catch(() => null))
            );

            // Create a map for quick lookup
            const userMap = new Map();
            allUsers.forEach((user, index) => {
                if (user) {
                    userMap.set(userIds[index], user);
                }
            });

            // Populate members using the map
            const populatedMembers = members.documents.map((member) => {
                const user = userMap.get(member.userId);
                
                if (!user) {
                    // Fallback for deleted users
                    return {
                        ...member,
                        name: "Unknown User",
                        email: "unknown@example.com",
                        avatarColor: { bg: "bg-gray-100", text: "text-gray-700" },
                    };
                }
                
                const avatarColor = user.prefs?.avatarColor as { bg: string; text: string } | undefined;

                return {
                    ...member,
                    name: user.name || user.email,
                    email: user.email,
                    avatarColor,
                };
            });

            return c.json({
                data: {
                    ...members,
                    documents: populatedMembers,
                }
            });
        }
    )
    .delete(
        "/:memberId",
        sessionMiddleware,
        async (c) => {
            const { memberId } = c.req.param();
            const user = c.get("user");
            const databases = c.get("database");

            const memberToDelete = await databases.getDocument(
                DATABASE_ID,
                MEMBERS_ID,
                memberId
            );

            const allMembersInWorkspace = await databases.listDocuments(
                DATABASE_ID,
                MEMBERS_ID,
                [Query.equal("workspaceId", memberToDelete.workspaceId)]
            );

            const member = await getMember({
                databases,
                workspaceId: memberToDelete.workspaceId,
                userId: user.$id,
            });

            if (!member || (member.$id !== memberToDelete.$id && member.role !== MemberRole.ADMIN)) {
                return c.json({ error: "Unauthorized" }, 401);
            }

            if (allMembersInWorkspace.documents.length <= 1) {
                return c.json({ error: "Cannot delete the only member" }, 400);
            }

            await databases.deleteDocument(
                DATABASE_ID,
                MEMBERS_ID,
                memberId
            );

            return c.json({
                data: {
                    id: memberToDelete.$id,
                }
            });
        }
    )
    .patch(
        "/:memberId",
        sessionMiddleware,
        zValidator("json", z.object({ role: z.nativeEnum(MemberRole) })),
        async (c) => {
            const { memberId } = c.req.param();
            const { role } = c.req.valid("json");
            const user = c.get("user");
            const databases = c.get("database");

            const memberToUpdate = await databases.getDocument(
                DATABASE_ID,
                MEMBERS_ID,
                memberId
            );

            const allMembersInWorkspace = await databases.listDocuments(
                DATABASE_ID,
                MEMBERS_ID,
                [Query.equal("workspaceId", memberToUpdate.workspaceId)]
            );

            const member = await getMember({
                databases,
                workspaceId: memberToUpdate.workspaceId,
                userId: user.$id,
            });

            if (!member || (member.$id !== memberToUpdate.$id && member.role !== MemberRole.ADMIN)) {
                return c.json({ error: "Unauthorized" }, 401);
            }

            if (allMembersInWorkspace.documents.length <= 1) {
                return c.json({ error: "Cannot downgrade the only member" }, 400);
            }

            await databases.updateDocument(
                DATABASE_ID,
                MEMBERS_ID,
                memberId,
                {
                    role
                }
            );

            return c.json({
                data: {
                    id: memberToUpdate.$id,
                }
            });
        }
    );

export default app;