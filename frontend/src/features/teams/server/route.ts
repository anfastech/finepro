import z from "zod";
import { Hono } from "hono";
import { ID, Query } from "node-appwrite";
import { zValidator } from "@hono/zod-validator";

import { getMember } from "@/features/members/utils";
import { DATABASE_ID, IMAGE_BUCKET_ID, TEAMS_ID, MEMBERS_ID } from "@/config";
import { sessionMiddleware } from "@/lib/session-middleware";
import { createTeamSchema, updateTeamSchema, addTeamMembersSchema, removeTeamMembersSchema } from "../schemas";
import { Team } from "../types";

const app = new Hono()
  .post(
    "/",
    sessionMiddleware,
    zValidator("form", createTeamSchema),
    async (c) => {
      const databases = c.get("database");
      const storage = c.get("storage");
      const user = c.get("user");

      const { name, workspaceId, description, image, color } = c.req.valid("form");

      const member = await getMember({
        databases,
        workspaceId,
        userId: user.$id,
      });

      if (!member) {
        return c.json({ error: "Unauthorized" }, 401);
      }

      let uploadedImageUrl: string | undefined;

      if (image instanceof File) {
        const file = await storage.createFile(
          IMAGE_BUCKET_ID,
          ID.unique(),
          image
        );
        uploadedImageUrl = `/api/workspaces/file/${file.$id}`;
      }

      const team = await databases.createDocument(
        DATABASE_ID,
        TEAMS_ID,
        ID.unique(),
        {
          name,
          workspaceId,
          description: description || undefined,
          imageUrl: uploadedImageUrl,
          memberIds: [],
          color: color || undefined,
        }
      );

      return c.json({ data: team });
    }
  )
  .get(
    "/",
    sessionMiddleware,
    zValidator("query", z.object({ workspaceId: z.string() })),
    async (c) => {
      const user = c.get("user");
      const databases = c.get("database");
      const { workspaceId } = c.req.valid("query");

      if (!workspaceId) {
        return c.json({ error: "Missing workspace ID" }, 400);
      }

      const member = await getMember({
        databases,
        workspaceId,
        userId: user.$id,
      });

      if (!member) {
        return c.json({ error: "Unauthorized" }, 401);
      }

      const teams = await databases.listDocuments<Team>(
        DATABASE_ID,
        TEAMS_ID,
        [
          Query.equal("workspaceId", workspaceId),
          Query.orderDesc("$createdAt"),
        ]
      );

      return c.json({ data: teams });
    }
  )
  .get(
    "/:teamId",
    sessionMiddleware,
    async (c) => {
      const user = c.get("user");
      const databases = c.get("database");
      const { teamId } = c.req.param();

      const team = await databases.getDocument<Team>(
        DATABASE_ID,
        TEAMS_ID,
        teamId
      );

      const member = await getMember({
        databases,
        workspaceId: team.workspaceId,
        userId: user.$id,
      });

      if (!member) {
        return c.json({ error: "Unauthorized" }, 401);
      }

      return c.json({ data: team });
    }
  )
  .patch(
    "/:teamId",
    sessionMiddleware,
    zValidator("form", updateTeamSchema),
    async (c) => {
      const databases = c.get("database");
      const storage = c.get("storage");
      const user = c.get("user");
      const { teamId } = c.req.param();
      const { name, description, image, color } = c.req.valid("form");

      const existingTeam = await databases.getDocument<Team>(
        DATABASE_ID,
        TEAMS_ID,
        teamId
      );

      const member = await getMember({
        databases,
        workspaceId: existingTeam.workspaceId,
        userId: user.$id,
      });

      if (!member) {
        return c.json({ error: "Unauthorized" }, 401);
      }

      let uploadedImageUrl: string | undefined;

      if (image instanceof File) {
        const file = await storage.createFile(
          IMAGE_BUCKET_ID,
          ID.unique(),
          image
        );
        uploadedImageUrl = `/api/workspaces/file/${file.$id}`;
      } else if (image !== undefined) {
        uploadedImageUrl = image;
      }

      const updateData: Record<string, unknown> = {};
      if (name !== undefined) updateData.name = name;
      if (description !== undefined) updateData.description = description;
      if (uploadedImageUrl !== undefined) updateData.imageUrl = uploadedImageUrl;
      if (color !== undefined) updateData.color = color;

      const team = await databases.updateDocument<Team>(
        DATABASE_ID,
        TEAMS_ID,
        teamId,
        updateData
      );

      return c.json({ data: team });
    }
  )
  .delete(
    "/:teamId",
    sessionMiddleware,
    async (c) => {
      const user = c.get("user");
      const databases = c.get("database");
      const { teamId } = c.req.param();

      const team = await databases.getDocument<Team>(
        DATABASE_ID,
        TEAMS_ID,
        teamId
      );

      const member = await getMember({
        databases,
        workspaceId: team.workspaceId,
        userId: user.$id,
      });

      if (!member) {
        return c.json({ error: "Unauthorized" }, 401);
      }

      await databases.deleteDocument(DATABASE_ID, TEAMS_ID, teamId);

      return c.json({ data: { $id: teamId } });
    }
  )
  .post(
    "/:teamId/members",
    sessionMiddleware,
    zValidator("json", addTeamMembersSchema),
    async (c) => {
      const databases = c.get("database");
      const user = c.get("user");
      const { teamId } = c.req.param();
      const { memberIds } = c.req.valid("json");

      const team = await databases.getDocument<Team>(
        DATABASE_ID,
        TEAMS_ID,
        teamId
      );

      const member = await getMember({
        databases,
        workspaceId: team.workspaceId,
        userId: user.$id,
      });

      if (!member) {
        return c.json({ error: "Unauthorized" }, 401);
      }

      // Validate that all memberIds are valid workspace members
      const workspaceMembers = await databases.listDocuments(
        DATABASE_ID,
        MEMBERS_ID,
        [Query.equal("workspaceId", team.workspaceId)]
      );

      const validMemberIds = workspaceMembers.documents.map((m) => m.$id);
      const invalidIds = memberIds.filter((id) => !validMemberIds.includes(id));

      if (invalidIds.length > 0) {
        return c.json(
          { error: `Invalid member IDs: ${invalidIds.join(", ")}` },
          400
        );
      }

      // Merge new memberIds with existing ones (no duplicates)
      const existingMemberIds = team.memberIds || [];
      const updatedMemberIds = [
        ...new Set([...existingMemberIds, ...memberIds]),
      ];

      const updatedTeam = await databases.updateDocument<Team>(
        DATABASE_ID,
        TEAMS_ID,
        teamId,
        {
          memberIds: updatedMemberIds,
        }
      );

      return c.json({ data: updatedTeam });
    }
  )
  .delete(
    "/:teamId/members",
    sessionMiddleware,
    zValidator("json", removeTeamMembersSchema),
    async (c) => {
      const databases = c.get("database");
      const user = c.get("user");
      const { teamId } = c.req.param();
      const { memberIds } = c.req.valid("json");

      const team = await databases.getDocument<Team>(
        DATABASE_ID,
        TEAMS_ID,
        teamId
      );

      const member = await getMember({
        databases,
        workspaceId: team.workspaceId,
        userId: user.$id,
      });

      if (!member) {
        return c.json({ error: "Unauthorized" }, 401);
      }

      // Remove memberIds from array
      const existingMemberIds = team.memberIds || [];
      const updatedMemberIds = existingMemberIds.filter(
        (id) => !memberIds.includes(id)
      );

      const updatedTeam = await databases.updateDocument<Team>(
        DATABASE_ID,
        TEAMS_ID,
        teamId,
        {
          memberIds: updatedMemberIds,
        }
      );

      return c.json({ data: updatedTeam });
    }
  );

export default app;

