import z from "zod";
import { Hono } from "hono";
import { ID, Query } from "node-appwrite";
import { zValidator } from "@hono/zod-validator";
import { endOfMonth, startOfMonth, subMonths } from "date-fns";

import { getMember } from "@/features/members/utils";

import { DATABASE_ID, IMAGE_BUCKET_ID, PROJECTS_ID, TASKS_ID } from "@/config";
import { sessionMiddleware } from "@/lib/session-middleware";
import { createProjectSchema, updateProjectSchema } from "../schemas";
import { Project } from "../types";
import { TaskStatus } from "@/features/tasks/types";

const app = new Hono()
    .post(
        "/",
        sessionMiddleware,
        zValidator("form", createProjectSchema),
        async (c) => {
            const databases = c.get("database");
            const storage = c.get("storage");
            const user = c.get("user");
      
            // Extract validated form data
            const { name, image, workspaceId, teamId } = c.req.valid("form");

            const member = await getMember({
                databases,
                workspaceId,
                userId: user.$id
            });

            if (!member) {
                return c.json({ error: "Unathorized"}, 401);
            }
      
            let uploadedImageUrl: string | undefined;
      
            // If user uploaded an image file
            if (image instanceof File) {
              // Upload the file to Appwrite storage bucket
              const file = await storage.createFile(
                IMAGE_BUCKET_ID,
                ID.unique(), // Generate unique file ID
                image
              );
      
              // Create a URL that points to our file serving endpoint
              // This URL will work because it goes through our authenticated API
              uploadedImageUrl = `/api/workspaces/file/${file.$id}`;
            }
      
            // Create the project document in the database
            const project = await databases.createDocument(
              DATABASE_ID,
              PROJECTS_ID,
              ID.unique(), // Generate unique workspace ID
              {
                name,
                imageUrl: uploadedImageUrl, // Store the file URL or undefined if no image
                workspaceId,
                teamId: teamId || undefined,
              }
            );
      
            // Return the created project data
            return c.json({
              data: project,
            });
          }
    )
    .get(
        "/",
        sessionMiddleware,
        zValidator("query", z.object({ workspaceId: z.string(), teamId: z.string().nullish() })),
        async (c) => {
            const user = c.get("user");
            const databases = c.get("database");

            const { workspaceId, teamId } = c.req.valid("query");

            if (!workspaceId) {
                return c.json({
                    error: "Missing workspace ID",
                }, 400);
            }

            const member = await getMember({
                databases,
                workspaceId,
                userId: user.$id,
            });

            if (!member) {
                return c.json({
                    error: "Unauthorized",
                }, 401);
            }

            const query = [
                Query.equal("workspaceId", workspaceId),
                Query.orderDesc("$createdAt"),
            ];

            if (teamId) {
                query.push(Query.equal("teamId", teamId));
            }

            const projects = await databases.listDocuments<Project>(
                DATABASE_ID,
                PROJECTS_ID,
                query
            );


            return c.json({ data: projects });
        }
    )
    .get(
      "/:projectId",
      sessionMiddleware,
      async (c) => {
        const user = c.get("user");
        const databases = c.get("database");
        const { projectId } = c.req.param();

        const project = await databases.getDocument<Project>(
          DATABASE_ID,
          PROJECTS_ID,
          projectId
        );

        const member = await getMember({
          databases,
          workspaceId: project.workspaceId,
          userId: user.$id,
        });

        if (!member) {
          return c.json({ error: "Unauthorized" }, 401);
        }

        return c.json({ data: project });
      }
    )
    .patch(
    "/:projectId",
    sessionMiddleware,
    zValidator("form", updateProjectSchema),
    async (c) => {
      const databases = c.get("database");
      const storage = c.get("storage");
      const user = c.get("user");

      const { projectId } = c.req.param();
      const { name, image, teamId } = c.req.valid("form");

      const existingProject = await databases.getDocument<Project>(
        DATABASE_ID,
        PROJECTS_ID,
        projectId,
      );

      const member = await getMember({
        databases,
        workspaceId: existingProject.workspaceId,
        userId: user.$id,
      });

      if (!member) {
        return c.json({ error: "Unauthorized" }, 401);
      }

      let uploadedImageUrl: string | undefined;

      // If user uploaded an image file
      if (image instanceof File) {
        // Upload the file to Appwrite storage bucket
        const file = await storage.createFile(
          IMAGE_BUCKET_ID,
          ID.unique(), // Generate unique file ID
          image
        );

        // Create a URL that points to our file serving endpoint
        // This URL will work because it goes through our authenticated API
        uploadedImageUrl = `/api/workspaces/file/${file.$id}`;
      } else {
        uploadedImageUrl = image;
      }

      const updateData: Record<string, unknown> = {
        name,
        imageUrl: uploadedImageUrl,
      };
      
      if (teamId !== undefined) {
        updateData.teamId = teamId || undefined;
      }

      const project = await databases.updateDocument(
        DATABASE_ID,
        PROJECTS_ID,
        projectId,
        updateData
      )

      return c.json({
        data: project
      });
    }
    )
    .delete(
      "/:projectId",
    sessionMiddleware, 
    async (c) => {
     // wanna change database to databases, but why? find it out
     const databases = c.get("database");
     const user = c.get("user");

     const { projectId } = c.req.param();

     const existingProject = await databases.getDocument<Project>(
      DATABASE_ID,
      PROJECTS_ID,
      projectId,
    );

     const member = await getMember({
       databases,
       workspaceId: existingProject.workspaceId,
       userId: user.$id,
     });

     if (!member) {
       return c.json({ error: "Unauthorized" }, 401);
     }

     // TODO: delete tasks, etc.

     await databases.deleteDocument(
       DATABASE_ID,
       PROJECTS_ID,
       projectId
     );

     return c.json({ data: { $id: existingProject.$id } });  
    }
    )
    .get(
      "/:projectId/analytics",
      sessionMiddleware,
      async (c) => {
        const databases = c.get("database");
        const user = c.get("user");
        const { projectId } = c.req.param();

        const project = await databases.getDocument<Project>(
          DATABASE_ID,
          PROJECTS_ID,
          projectId
        );

        const member = await getMember({
          databases,
          workspaceId: project.workspaceId,
          userId: user.$id,
        });

        if (!member) {
          return c.json({ error: "Unauthorized" }, 401);
        }

        const now = new Date();
        const thisMonthStart = startOfMonth(now);
        const thisMonthEnd = endOfMonth(now);
        const lastMonthStart = startOfMonth(subMonths(now, 1));
        const lastMonthEnd = endOfMonth(subMonths(now, 1));

        const thisMonthTasks = await databases.listDocuments(
          DATABASE_ID,
          TASKS_ID,
          [
            Query.equal("projectId", projectId),
            Query.greaterThanEqual("$createdAt", thisMonthStart.toISOString()),
            Query.lessThanEqual("$createdAt", thisMonthEnd.toISOString()),
          ]
        );

        const lastMonthTasks = await databases.listDocuments(
          DATABASE_ID,
          TASKS_ID,
          [
            Query.equal("projectId", projectId),
            Query.greaterThanEqual("$createdAt", lastMonthStart.toISOString()),
            Query.lessThanEqual("$createdAt", lastMonthEnd.toISOString()),
          ]
        );

        const taskCount = thisMonthTasks.total;
        const taskDifference = taskCount - lastMonthTasks.total;

        const thisMonthAssignedTasks = await databases.listDocuments(
          DATABASE_ID,
          TASKS_ID,
          [
            Query.equal("projectId", projectId),
            Query.equal("assigneeId", member.$id),
            Query.greaterThanEqual("$createdAt", thisMonthStart.toISOString()),
            Query.lessThanEqual("$createdAt", thisMonthEnd.toISOString()),
          ]
        );

        const lastMonthAssignedTasks = await databases.listDocuments(
          DATABASE_ID,
          TASKS_ID,
          [
            Query.equal("projectId", projectId),
            Query.equal("assigneeId", member.$id),
            Query.greaterThanEqual("$createdAt", lastMonthStart.toISOString()),
            Query.lessThanEqual("$createdAt", lastMonthEnd.toISOString()),
          ]
        );

        const assignedTaskCount = thisMonthAssignedTasks.total;
        const assignedTaskDifference = assignedTaskCount - lastMonthAssignedTasks.total;

        const thisMonthIncompleteTasks = await databases.listDocuments(
          DATABASE_ID,
          TASKS_ID,
          [
            Query.equal("projectId", projectId),
            Query.notEqual("status", TaskStatus.DONE),
            Query.greaterThanEqual("$createdAt", thisMonthStart.toISOString()),
            Query.lessThanEqual("$createdAt", thisMonthEnd.toISOString()),
          ]
        );

        const lastMonthIncompleteTasks = await databases.listDocuments(
          DATABASE_ID,
          TASKS_ID,
          [
            Query.equal("projectId", projectId),
            Query.notEqual("status", TaskStatus.DONE),
            Query.greaterThanEqual("$createdAt", lastMonthStart.toISOString()),
            Query.lessThanEqual("$createdAt", lastMonthEnd.toISOString()),
          ]
        );

        const incompleteTaskCount = thisMonthIncompleteTasks.total;
        const incompleteTaskDifference = incompleteTaskCount - lastMonthIncompleteTasks.total;

        const thisMonthCompletedTasks = await databases.listDocuments(
          DATABASE_ID,
          TASKS_ID,
          [
            Query.equal("projectId", projectId),
            Query.equal("status", TaskStatus.DONE),
            Query.greaterThanEqual("$createdAt", thisMonthStart.toISOString()),
            Query.lessThanEqual("$createdAt", thisMonthEnd.toISOString()),
          ]
        );

        const lastMonthCompletedTasks = await databases.listDocuments(
          DATABASE_ID,
          TASKS_ID,
          [
            Query.equal("projectId", projectId),
            Query.equal("status", TaskStatus.DONE),
            Query.greaterThanEqual("$createdAt", lastMonthStart.toISOString()),
            Query.lessThanEqual("$createdAt", lastMonthEnd.toISOString()),
          ]
        );

        const completedTaskCount = thisMonthCompletedTasks.total;
        const completedTaskDifference = completedTaskCount - lastMonthCompletedTasks.total;

        const thisMonthOverdueTasks = await databases.listDocuments(
          DATABASE_ID,
          TASKS_ID,
          [
            Query.equal("projectId", projectId),
            Query.notEqual("status", TaskStatus.DONE),
            Query.lessThan("dueDate", now.toISOString()),
            Query.greaterThanEqual("$createdAt", thisMonthStart.toISOString()),
            Query.lessThanEqual("$createdAt", thisMonthEnd.toISOString()),
          ]
        );

        const lastMonthOverdueTasks = await databases.listDocuments(
          DATABASE_ID,
          TASKS_ID,
          [
            Query.equal("projectId", projectId),
            Query.notEqual("status", TaskStatus.DONE),
            Query.lessThan("dueDate", now.toISOString()),
            Query.greaterThanEqual("$createdAt", lastMonthStart.toISOString()),
            Query.lessThanEqual("$createdAt", lastMonthEnd.toISOString()),
          ]
        );

        const overdueTaskCount = thisMonthOverdueTasks.total;
        const overdueTaskDifference = overdueTaskCount - lastMonthOverdueTasks.total;

        return c.json({
          data: {
            taskCount,
            taskDifference,
            assignedTaskCount,
            assignedTaskDifference,
            completedTaskCount,
            completedTaskDifference,
            incompleteTaskCount,
            incompleteTaskDifference,
            overdueTaskCount,
            overdueTaskDifference,
          }
        });
      }
    )
  


export default app;