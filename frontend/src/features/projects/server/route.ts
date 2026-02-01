import z from "zod";
import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { endOfMonth, startOfMonth, subMonths } from "date-fns";
import { createSupabaseClient } from "@/lib/supabase-server";
import { createProjectSchema, updateProjectSchema } from "../schemas";
import { Project } from "../types";
import { TaskStatus } from "@/features/tasks/types";

const app = new Hono()
    .post(
        "/",
        zValidator("json", createProjectSchema), // Changed from form to json for simplicity
        async (c) => {
            const supabase = await createSupabaseClient();
            
            // Get current user
            const { data: { user }, error: authError } = await supabase.auth.getUser();
            if (authError || !user) {
                return c.json({ error: "Unauthorized" }, 401);
            }

            // Extract validated form data
            const { name, workspaceId, teamId } = c.req.valid("json");

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

            // Create project document in database
            const { data: project, error: createError } = await supabase
                .from('projects')
                .insert({
                    name,
                    image_url: null, // TODO: Implement image upload with Supabase Storage
                    workspace_id: workspaceId,
                    team_id: teamId || null,
                })
                .select()
                .single();

            if (createError) {
                return c.json({ error: createError.message }, 500);
            }

            // Return created project data
            return c.json({
                data: project,
            });
        }
    )
    .get(
        "/",
        zValidator("query", z.object({ workspaceId: z.string(), teamId: z.string().nullish() })),
        async (c) => {
            const supabase = await createSupabaseClient();

            const { workspaceId, teamId } = c.req.valid("query");

            if (!workspaceId) {
                return c.json({
                    error: "Missing workspace ID",
                }, 400);
            }

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
                return c.json({
                    error: "Unauthorized",
                }, 401);
            }

            let query = supabase
                .from('projects')
                .select('*')
                .eq('workspace_id', workspaceId)
                .order('created_at', { ascending: false });

            if (teamId) {
                query = query.eq('team_id', teamId);
            }

            const { data: projects, error: projectsError } = await query;

            if (projectsError) {
                return c.json({ error: projectsError.message }, 500);
            }

            return c.json({ 
                data: {
                    documents: projects || [],
                    total: projects?.length || 0,
                }
            });
        }
    )
    .get(
        "/:projectId",
        async (c) => {
            const supabase = await createSupabaseClient();
            const { projectId } = c.req.param();

            // Get current user
            const { data: { user }, error: authError } = await supabase.auth.getUser();
            if (authError || !user) {
                return c.json({ error: "Unauthorized" }, 401);
            }

            // Get project
            const { data: project, error: projectError } = await supabase
                .from('projects')
                .select('*')
                .eq('id', projectId)
                .single();

            if (projectError || !project) {
                return c.json({ error: "Project not found" }, 404);
            }

            // Check if user is a member of this workspace
            const { data: member, error: memberError } = await supabase
                .from('members')
                .select('*')
                .eq('workspace_id', project.workspace_id)
                .eq('user_id', user.id)
                .single();

            if (memberError || !member) {
                return c.json({ error: "Unauthorized" }, 401);
            }

            return c.json({ data: project });
        }
    )
    .patch(
        "/:projectId",
        zValidator("json", updateProjectSchema),
        async (c) => {
            const supabase = await createSupabaseClient();

            // Get current user
            const { data: { user }, error: authError } = await supabase.auth.getUser();
            if (authError || !user) {
                return c.json({ error: "Unauthorized" }, 401);
            }

            const { projectId } = c.req.param();
            const { name, teamId } = c.req.valid("json");

            // Get existing project
            const { data: existingProject, error: projectError } = await supabase
                .from('projects')
                .select('*')
                .eq('id', projectId)
                .single();

            if (projectError || !existingProject) {
                return c.json({ error: "Project not found" }, 404);
            }

            // Check if user is a member of this workspace
            const { data: member, error: memberError } = await supabase
                .from('members')
                .select('*')
                .eq('workspace_id', existingProject.workspace_id)
                .eq('user_id', user.id)
                .single();

            if (memberError || !member) {
                return c.json({ error: "Unauthorized" }, 401);
            }

            const updateData: Record<string, unknown> = {
                name,
                updated_at: new Date().toISOString(),
            };
            
            if (teamId !== undefined) {
                updateData.team_id = teamId || null;
            }

            // Update project
            const { data: project, error: updateError } = await supabase
                .from('projects')
                .update(updateData)
                .eq('id', projectId)
                .select()
                .single();

            if (updateError) {
                return c.json({ error: updateError.message }, 500);
            }

            return c.json({
                data: project
            });
        }
    )
    .delete(
        "/:projectId",
        async (c) => {
            const supabase = await createSupabaseClient();

            // Get current user
            const { data: { user }, error: authError } = await supabase.auth.getUser();
            if (authError || !user) {
                return c.json({ error: "Unauthorized" }, 401);
            }

            const { projectId } = c.req.param();

            // Get existing project
            const { data: existingProject, error: projectError } = await supabase
                .from('projects')
                .select('*')
                .eq('id', projectId)
                .single();

            if (projectError || !existingProject) {
                return c.json({ error: "Project not found" }, 404);
            }

            // Check if user is a member of this workspace
            const { data: member, error: memberError } = await supabase
                .from('members')
                .select('*')
                .eq('workspace_id', existingProject.workspace_id)
                .eq('user_id', user.id)
                .single();

            if (memberError || !member) {
                return c.json({ error: "Unauthorized" }, 401);
            }

            // TODO: delete tasks, etc.

            // Delete project
            const { error: deleteError } = await supabase
                .from('projects')
                .delete()
                .eq('id', projectId);

            if (deleteError) {
                return c.json({ error: deleteError.message }, 500);
            }

            return c.json({ data: { id: existingProject.id } });  
        }
    )
    .get(
        "/:projectId/analytics",
        async (c) => {
            const supabase = await createSupabaseClient();

            // Get current user
            const { data: { user }, error: authError } = await supabase.auth.getUser();
            if (authError || !user) {
                return c.json({ error: "Unauthorized" }, 401);
            }

            const { projectId } = c.req.param();

            // Get project
            const { data: project, error: projectError } = await supabase
                .from('projects')
                .select('*')
                .eq('id', projectId)
                .single();

            if (projectError || !project) {
                return c.json({ error: "Project not found" }, 404);
            }

            // Check if user is a member of this workspace
            const { data: member, error: memberError } = await supabase
                .from('members')
                .select('*')
                .eq('workspace_id', project.workspace_id)
                .eq('user_id', user.id)
                .single();

            if (memberError || !member) {
                return c.json({ error: "Unauthorized" }, 401);
            }

            const now = new Date();
            const thisMonthStart = startOfMonth(now);
            const thisMonthEnd = endOfMonth(now);
            const lastMonthStart = startOfMonth(subMonths(now, 1));
            const lastMonthEnd = endOfMonth(subMonths(now, 1));

            // This month tasks
            const { data: thisMonthTasks, error: thisMonthError } = await supabase
                .from('tasks')
                .select('*')
                .eq('project_id', projectId)
                .gte('created_at', thisMonthStart.toISOString())
                .lte('created_at', thisMonthEnd.toISOString());

            // Last month tasks
            const { data: lastMonthTasks, error: lastMonthError } = await supabase
                .from('tasks')
                .select('*')
                .eq('project_id', projectId)
                .gte('created_at', lastMonthStart.toISOString())
                .lte('created_at', lastMonthEnd.toISOString());

            const taskCount = thisMonthTasks?.length || 0;
            const taskDifference = taskCount - (lastMonthTasks?.length || 0);

            // This month assigned tasks
            const { data: thisMonthAssignedTasks } = await supabase
                .from('tasks')
                .select('*')
                .eq('project_id', projectId)
                .eq('assignee_id', member.id)
                .gte('created_at', thisMonthStart.toISOString())
                .lte('created_at', thisMonthEnd.toISOString());

            const { data: lastMonthAssignedTasks } = await supabase
                .from('tasks')
                .select('*')
                .eq('project_id', projectId)
                .eq('assignee_id', member.id)
                .gte('created_at', lastMonthStart.toISOString())
                .lte('created_at', lastMonthEnd.toISOString());

            const assignedTaskCount = thisMonthAssignedTasks?.length || 0;
            const assignedTaskDifference = assignedTaskCount - (lastMonthAssignedTasks?.length || 0);

            // This month incomplete tasks
            const { data: thisMonthIncompleteTasks } = await supabase
                .from('tasks')
                .select('*')
                .eq('project_id', projectId)
                .neq('status', TaskStatus.DONE)
                .gte('created_at', thisMonthStart.toISOString())
                .lte('created_at', thisMonthEnd.toISOString());

            const { data: lastMonthIncompleteTasks } = await supabase
                .from('tasks')
                .select('*')
                .eq('project_id', projectId)
                .neq('status', TaskStatus.DONE)
                .gte('created_at', lastMonthStart.toISOString())
                .lte('created_at', lastMonthEnd.toISOString());

            const incompleteTaskCount = thisMonthIncompleteTasks?.length || 0;
            const incompleteTaskDifference = incompleteTaskCount - (lastMonthIncompleteTasks?.length || 0);

            // This month completed tasks
            const { data: thisMonthCompletedTasks } = await supabase
                .from('tasks')
                .select('*')
                .eq('project_id', projectId)
                .eq('status', TaskStatus.DONE)
                .gte('created_at', thisMonthStart.toISOString())
                .lte('created_at', thisMonthEnd.toISOString());

            const { data: lastMonthCompletedTasks } = await supabase
                .from('tasks')
                .select('*')
                .eq('project_id', projectId)
                .eq('status', TaskStatus.DONE)
                .gte('created_at', lastMonthStart.toISOString())
                .lte('created_at', lastMonthEnd.toISOString());

            const completedTaskCount = thisMonthCompletedTasks?.length || 0;
            const completedTaskDifference = completedTaskCount - (lastMonthCompletedTasks?.length || 0);

            // This month overdue tasks
            const { data: thisMonthOverdueTasks } = await supabase
                .from('tasks')
                .select('*')
                .eq('project_id', projectId)
                .neq('status', TaskStatus.DONE)
                .lt('due_date', now.toISOString())
                .gte('created_at', thisMonthStart.toISOString())
                .lte('created_at', thisMonthEnd.toISOString());

            const { data: lastMonthOverdueTasks } = await supabase
                .from('tasks')
                .select('*')
                .eq('project_id', projectId)
                .neq('status', TaskStatus.DONE)
                .lt('due_date', now.toISOString())
                .gte('created_at', lastMonthStart.toISOString())
                .lte('created_at', lastMonthEnd.toISOString());

            const overdueTaskCount = thisMonthOverdueTasks?.length || 0;
            const overdueTaskDifference = overdueTaskCount - (lastMonthOverdueTasks?.length || 0);

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