import z from "zod";
import { Hono } from "hono";
import { Client, ID, Query, Storage } from "node-appwrite";
import { zValidator } from "@hono/zod-validator";
import { startOfMonth, endOfMonth, subMonths } from "date-fns";

import { getMember } from "@/features/members/utils";
import { MemberRole } from "@/features/members/types";

import { generateInviteCode } from "@/lib/utils";
import { sessionMiddleware } from "@/lib/session-middleware";
import { APPWRITE_ENDPOINT, APPWRITE_PROJECT_ID, DATABASE_ID, IMAGE_BUCKET_ID, MEMBERS_ID, TASKS_ID, WORKSPACES_ID } from "@/config";

import { createWorkspaceSchema, updateWorkspaceSchema } from "../schemas";
import { Workspace } from "../types";
import { TaskStatus } from "@/features/tasks/types";

// Create a Hono app for workspace-related API endpoints
const app = new Hono()
  // Endpoint to serve workspace images with authentication
  .get("/file/:fileId", async (c) => {
    const fileId = c.req.param("fileId");

    // Use an admin client so public image fetches don't require the user session cookie
    const client = new Client()
      .setEndpoint(APPWRITE_ENDPOINT)
      .setProject(APPWRITE_PROJECT_ID)
      .setKey(process.env.NEXT_APPWRITE_KEY!);

    const storage = new Storage(client);
    
    try {
      // Get file metadata from Appwrite storage
      const file = await storage.getFile(IMAGE_BUCKET_ID, fileId);
      // Get the actual file content as ArrayBuffer
      const arrayBuffer = await storage.getFileView(IMAGE_BUCKET_ID, fileId);
      
      // Clean the filename to remove special characters that break HTTP headers
      const safeFilename = file.name.replace(/[^\w\s.-]/g, "_");
      
      // Return the file as an HTTP response with proper headers
      return new Response(arrayBuffer, {
        headers: {
          "Content-Type": file.mimeType, // Tell browser what type of file this is
          "Content-Disposition": `inline; filename="${safeFilename}"`, // Display in browser instead of downloading
          "Cache-Control": "public, max-age=31536000", // Cache for 1 year to improve performance
        },
      });
    } catch (error) {
      console.error("Error serving file:", error);
      return c.json({ error: "File not found" }, 404);
    }
  })
  .get(
    "/:workspaceId",
    sessionMiddleware,
    async (c) => {
      const user = c.get("user");
      const databases = c.get("database");
      const { workspaceId } = c.req.param();

      const member = await getMember({
        databases,
        workspaceId,
        userId: user.$id,
      });

      if (!member) {
        return c.json({ error: "Unauthorized" }, 401);
      }

      const workspace = await databases.getDocument<Workspace>(
        DATABASE_ID,
        WORKSPACES_ID,
        workspaceId,
      );

      return c.json({ data: workspace });
    }
  )
  .get(
    "/:workspaceId/info",
    sessionMiddleware,
    async (c) => {
      const databases = c.get("database");
      const { workspaceId } = c.req.param();


      const workspace = await databases.getDocument<Workspace>(
        DATABASE_ID,
        WORKSPACES_ID,
        workspaceId,
      );

      return c.json({ 
        data: {
          $id: workspace.$id,
          name: workspace.name,
          imageUrl: workspace.imageUrl,
        }
      });
    }
  )
  .get("/", sessionMiddleware, async (c) => {
    const user = c.get("user");
    const databases = c.get("database");

    const members = await databases.listDocuments(
      DATABASE_ID,
      MEMBERS_ID,
      [Query.equal("userId", user.$id)]
    );

    if (!members.documents.length) {
      return c.json({
        data: { documents: [], total: 0 },
      });
    }

    const workspaceIds = members.documents.map((member) => member.workspaceId);

    const workspaces = await databases.listDocuments(
      DATABASE_ID,
      WORKSPACES_ID,
      [
        Query.orderDesc("$createdAt"),
        Query.contains("$id", workspaceIds),
      ],
    );

    return c.json({
      data: workspaces,
    });
  })
  // Endpoint to create a new workspace
  .post(
    "/",
    zValidator("form", createWorkspaceSchema), // Validate the form data
    sessionMiddleware, // Ensure user is authenticated
    async (c) => {
      const database = c.get("database");
      const storage = c.get("storage");
      const user = c.get("user");

      // Extract validated form data
      const { name, image } = c.req.valid("form");

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

      // Create the workspace document in the database
      const workspace = await database.createDocument(
        DATABASE_ID,
        WORKSPACES_ID,
        ID.unique(), // Generate unique workspace ID
        {
          name,
          userId: user.$id,
          imageUrl: uploadedImageUrl, // Store the file URL or undefined if no image
          inviteCode: generateInviteCode(6),
        }
      );

      await database.createDocument(
        DATABASE_ID,
        MEMBERS_ID,
        ID.unique(),
        {
          userId: user.$id,
          workspaceId: workspace.$id,
          role: MemberRole.ADMIN,
        }
      )

      // Return the created workspace data
      return c.json({
        data: workspace,
      });
    }
  )
  .patch(
    "/:workspaceId",
    sessionMiddleware,
    zValidator("form", updateWorkspaceSchema),
    async (c) => {
      const databases = c.get("database");
      const storage = c.get("storage");
      const user = c.get("user");

      const { workspaceId } = c.req.param();
      const { name, image } = c.req.valid("form");

      const member = await getMember({
        databases,
        workspaceId,
        userId: user.$id,
      });

      if (!member || member.role !== MemberRole.ADMIN) {
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

      const workspace = await databases.updateDocument(
        DATABASE_ID,
        WORKSPACES_ID,
        workspaceId,
        {
          name,
          imageUrl: uploadedImageUrl,
        }
      )

      return c.json({
        data: workspace
      });
    }
  )
  .delete("/:workspaceId",
     sessionMiddleware, 
     async (c) => {
      // wanna change database to databases, but why? find it out
      const databases = c.get("database");
      const user = c.get("user");

      const { workspaceId } = c.req.param();

      const member = await getMember({
        databases,
        workspaceId,
        userId: user.$id,
      });

      if (!member || member.role !== MemberRole.ADMIN) {
        return c.json({ error: "Unauthorized" }, 401);
      }

      // TODO: delete members, projects, tasks, etc.

      await databases.deleteDocument(
        DATABASE_ID,
        WORKSPACES_ID,
        workspaceId
      );

      return c.json({ data: { $id: workspaceId } });  
     }
  )
  .post("/:workspaceId/reset-invite-code",
     sessionMiddleware, 
     async (c) => {
      // wanna change database to databases, but why? find it out
      const databases = c.get("database");
      const user = c.get("user");

      const { workspaceId } = c.req.param();

      const member = await getMember({
        databases,
        workspaceId,
        userId: user.$id,
      });

      if (!member || member.role !== MemberRole.ADMIN) {
        return c.json({ error: "Unauthorized" }, 401);
      }

      const workspace =await databases.updateDocument(
        DATABASE_ID,
        WORKSPACES_ID,
        workspaceId,
        {
          inviteCode: generateInviteCode(6),
        },
      )

      return c.json({ data: workspace });  
     }
  )
  .post(
    "/:workspaceId/join",
    sessionMiddleware,
    zValidator("json", z.object({ code: z.string() })),
    async (c) => {
      const { workspaceId } = c.req.param();
      const { code } = c.req.valid("json");

      const databases = c.get("database");
      const user = c.get("user");

      const member = await getMember({
        databases,
        workspaceId,
        userId: user.$id,
      });

      if (member) {
        return c.json({ error: "Already a member" }, 400);
      }

      const workspace = await databases.getDocument<Workspace>(
        DATABASE_ID,
        WORKSPACES_ID,
        workspaceId
      );

      if ( workspace.inviteCode !== code ) {
        return c.json({ error: "Invalid invite code"}, 400)
      }

      await databases.createDocument(
        DATABASE_ID,
        MEMBERS_ID,
        ID.unique(),
        {
          workspaceId,
          userId: user.$id,
          role: MemberRole.MEMBER,
        },

      );

      return c.json({ data: workspace });
    }
  )
  .get(
        "/:workspaceId/analytics",
        sessionMiddleware,
        async (c) => {
          const databases = c.get("database");
          const user = c.get("user");
          const { workspaceId } = c.req.param();
  
          const member = await getMember({
            databases,
            workspaceId,
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

          // Execute all database queries in parallel for better performance
          // Wrap each query in a try-catch to prevent one failure from blocking all
          const queryPromises = [
            (async () => {
              try {
                return await databases.listDocuments(
                  DATABASE_ID,
                  TASKS_ID,
                  [
                    Query.equal("workspaceId", workspaceId),
                    Query.greaterThanEqual("$createdAt", thisMonthStart.toISOString()),
                    Query.lessThanEqual("$createdAt", thisMonthEnd.toISOString()),
                  ]
                );
              } catch (error) {
                // #region agent log
                fetch('http://127.0.0.1:7244/ingest/e8a9658a-4b0e-4637-8cf0-c9d4f92744ab',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'workspaces/server/route.ts:397',message:'Query 1 failed',data:{error:String(error)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
                // #endregion
                return { total: 0, documents: [] };
              }
            })(),
            (async () => {
              try {
                return await databases.listDocuments(
                  DATABASE_ID,
                  TASKS_ID,
                  [
                    Query.equal("workspaceId", workspaceId),
                    Query.greaterThanEqual("$createdAt", lastMonthStart.toISOString()),
                    Query.lessThanEqual("$createdAt", lastMonthEnd.toISOString()),
                  ]
                );
              } catch (error) {
                console.error("Analytics query 2 failed:", error);
                return { total: 0, documents: [] };
              }
            })(),
            (async () => {
              try {
                return await databases.listDocuments(
                  DATABASE_ID,
                  TASKS_ID,
                  [
                    Query.equal("workspaceId", workspaceId),
                    Query.equal("assigneeId", member.$id),
                    Query.greaterThanEqual("$createdAt", thisMonthStart.toISOString()),
                    Query.lessThanEqual("$createdAt", thisMonthEnd.toISOString()),
                  ]
                );
              } catch (error) {
                console.error("Analytics query 3 failed:", error);
                return { total: 0, documents: [] };
              }
            })(),
            (async () => {
              try {
                return await databases.listDocuments(
                  DATABASE_ID,
                  TASKS_ID,
                  [
                    Query.equal("workspaceId", workspaceId),
                    Query.equal("assigneeId", member.$id),
                    Query.greaterThanEqual("$createdAt", lastMonthStart.toISOString()),
                    Query.lessThanEqual("$createdAt", lastMonthEnd.toISOString()),
                  ]
                );
              } catch (error) {
                console.error("Analytics query 4 failed:", error);
                return { total: 0, documents: [] };
              }
            })(),
            (async () => {
              try {
                return await databases.listDocuments(
                  DATABASE_ID,
                  TASKS_ID,
                  [
                    Query.equal("workspaceId", workspaceId),
                    Query.notEqual("status", TaskStatus.DONE),
                    Query.greaterThanEqual("$createdAt", thisMonthStart.toISOString()),
                    Query.lessThanEqual("$createdAt", thisMonthEnd.toISOString()),
                  ]
                );
              } catch (error) {
                console.error("Analytics query 5 failed:", error);
                return { total: 0, documents: [] };
              }
            })(),
            (async () => {
              try {
                return await databases.listDocuments(
                  DATABASE_ID,
                  TASKS_ID,
                  [
                    Query.equal("workspaceId", workspaceId),
                    Query.notEqual("status", TaskStatus.DONE),
                    Query.greaterThanEqual("$createdAt", lastMonthStart.toISOString()),
                    Query.lessThanEqual("$createdAt", lastMonthEnd.toISOString()),
                  ]
                );
              } catch (error) {
                console.error("Analytics query 6 failed:", error);
                return { total: 0, documents: [] };
              }
            })(),
            (async () => {
              try {
                return await databases.listDocuments(
                  DATABASE_ID,
                  TASKS_ID,
                  [
                    Query.equal("workspaceId", workspaceId),
                    Query.equal("status", TaskStatus.DONE),
                    Query.greaterThanEqual("$createdAt", thisMonthStart.toISOString()),
                    Query.lessThanEqual("$createdAt", thisMonthEnd.toISOString()),
                  ]
                );
              } catch (error) {
                console.error("Analytics query 7 failed:", error);
                return { total: 0, documents: [] };
              }
            })(),
            (async () => {
              try {
                return await databases.listDocuments(
                  DATABASE_ID,
                  TASKS_ID,
                  [
                    Query.equal("workspaceId", workspaceId),
                    Query.equal("status", TaskStatus.DONE),
                    Query.greaterThanEqual("$createdAt", lastMonthStart.toISOString()),
                    Query.lessThanEqual("$createdAt", lastMonthEnd.toISOString()),
                  ]
                );
              } catch (error) {
                console.error("Analytics query 8 failed:", error);
                return { total: 0, documents: [] };
              }
            })(),
            (async () => {
              try {
                return await databases.listDocuments(
                  DATABASE_ID,
                  TASKS_ID,
                  [
                    Query.equal("workspaceId", workspaceId),
                    Query.notEqual("status", TaskStatus.DONE),
                    Query.lessThan("dueDate", now.toISOString()),
                    Query.greaterThanEqual("$createdAt", thisMonthStart.toISOString()),
                    Query.lessThanEqual("$createdAt", thisMonthEnd.toISOString()),
                  ]
                );
              } catch (error) {
                console.error("Analytics query 9 failed:", error);
                return { total: 0, documents: [] };
              }
            })(),
            (async () => {
              try {
                return await databases.listDocuments(
                  DATABASE_ID,
                  TASKS_ID,
                  [
                    Query.equal("workspaceId", workspaceId),
                    Query.notEqual("status", TaskStatus.DONE),
                    Query.lessThan("dueDate", now.toISOString()),
                    Query.greaterThanEqual("$createdAt", lastMonthStart.toISOString()),
                    Query.lessThanEqual("$createdAt", lastMonthEnd.toISOString()),
                  ]
                );
              } catch (error) {
                console.error("Analytics query 10 failed:", error);
                return { total: 0, documents: [] };
              }
            })()
          ];

          const [
            thisMonthTasks,
            lastMonthTasks,
            thisMonthAssignedTasks,
            lastMonthAssignedTasks,
            thisMonthIncompleteTasks,
            lastMonthIncompleteTasks,
            thisMonthCompletedTasks,
            lastMonthCompletedTasks,
            thisMonthOverdueTasks,
            lastMonthOverdueTasks
          ] = await Promise.all(queryPromises);

          const taskCount = thisMonthTasks.total;
          const taskDifference = taskCount - lastMonthTasks.total;
          const assignedTaskCount = thisMonthAssignedTasks.total;
          const assignedTaskDifference = assignedTaskCount - lastMonthAssignedTasks.total;
          const incompleteTaskCount = thisMonthIncompleteTasks.total;
          const incompleteTaskDifference = incompleteTaskCount - lastMonthIncompleteTasks.total;
          const completedTaskCount = thisMonthCompletedTasks.total;
          const completedTaskDifference = completedTaskCount - lastMonthCompletedTasks.total;
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
      );

export default app;
