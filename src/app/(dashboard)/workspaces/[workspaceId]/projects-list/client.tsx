"use client";

import { useState, useMemo } from "react";
import { useGetProjects } from "@/features/projects/api/use-get-projects";
import { useWorkspaceId } from "@/features/workspaces/hooks/use-workspace-id";
import { useCreateProjectModel } from "@/features/projects/hooks/use-create-project-modal";
import { ProjectAvatar } from "@/features/projects/components/project-avatar";
import { Button } from "@/components/ui/button";
import { Plus, Mail, Rocket, Hourglass, CheckCircle2, ChevronDown, ChevronRight } from "lucide-react";
import Link from "next/link";
import { MemberAvatar } from "@/features/members/components/member-avatar";
import { useGetMembers } from "@/features/members/api/use-get-members";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useGetTasks } from "@/features/tasks/api/use-get-tasks";

type ProjectStatus = "New project" | "In Progress" | "On Hold" | "Completed";

const getStatusIcon = (status: ProjectStatus) => {
  switch (status) {
    case "New project":
      return <Mail className="size-3.5 text-gray-500" />;
    case "In Progress":
      return <Rocket className="size-3.5 text-blue-500" />;
    case "On Hold":
      return <Hourglass className="size-3.5 text-amber-500" />;
    case "Completed":
      return <CheckCircle2 className="size-3.5 text-emerald-500" />;
    default:
      return <Mail className="size-3.5 text-gray-500" />;
  }
};

const getStatusBadgeVariant = (status: ProjectStatus): "default" | "secondary" | "outline" => {
  switch (status) {
    case "New project":
      return "secondary";
    case "In Progress":
      return "default";
    case "On Hold":
      return "outline";
    case "Completed":
      return "secondary";
    default:
      return "secondary";
  }
};

export const ProjectsListClient = () => {
  const workspaceId = useWorkspaceId();
  const { data: projects } = useGetProjects({ workspaceId });
  const { data: members } = useGetMembers({ workspaceId });
  const { data: tasks } = useGetTasks({ workspaceId });
  const { open: openCreateProject } = useCreateProjectModel();
  const [activeExpanded, setActiveExpanded] = useState(true);
  const [closedExpanded, setClosedExpanded] = useState(false);

  // Map member ID to member for owner lookup
  const membersMap = new Map(
    members?.documents.map((m) => [m.userId, m]) || []
  );

  // Calculate progress based on tasks (completed / total)
  const projectProgressMap = useMemo(() => {
    const map = new Map<string, { completed: number; total: number; percentage: number }>();
    
    if (!tasks) return map;

    tasks.forEach((task) => {
      const projectId = task.projectId;
      if (!projectId) return;

      const current = map.get(projectId) || { completed: 0, total: 0, percentage: 0 };
      current.total += 1;
      if (task.status === "DONE") {
        current.completed += 1;
      }
      current.percentage = current.total > 0 ? Math.round((current.completed / current.total) * 100) : 0;
      map.set(projectId, current);
    });

    return map;
  }, [tasks]);

  // Get project status (placeholder - would come from project.status field)
  const getStatus = (project: any): ProjectStatus => {
    // Placeholder logic: could check project status field when available
    const progress = projectProgressMap.get(project.$id);
    if (progress?.percentage === 100) return "Completed";
    if (progress && progress.total > 0) return "In Progress";
    return "New project";
  };

  // Get project owner (placeholder - projects don't have ownerId yet)
  const getOwner = (project: any) => {
    // Placeholder: would get from project.ownerId
    return members?.documents[0];
  };

  // Separate active and closed projects
  const { activeProjects, closedProjects } = useMemo(() => {
    if (!projects?.documents) return { activeProjects: [], closedProjects: [] };

    const active: typeof projects.documents = [];
    const closed: typeof projects.documents = [];

    projects.documents.forEach((project) => {
      const status = getStatus(project);
      if (status === "Completed") {
        closed.push(project);
      } else {
        active.push(project);
      }
    });

    return { activeProjects: active, closedProjects: closed };
  }, [projects?.documents, projectProgressMap]);

  const renderProjectRow = (project: any) => {
    const progress = projectProgressMap.get(project.$id) || { percentage: 0, completed: 0, total: 0 };
    const status = getStatus(project);
    const owner = getOwner(project);
    const createdDate = project.$createdAt ? format(new Date(project.$createdAt), "d MMM yyyy") : "-";
    const dueDate = project.dueDate ? format(new Date(project.dueDate), "d MMM yyyy") : "-";

    return (
      <tr key={project.$id} className="hover:bg-gray-50 transition-colors">
        <td className="p-3">
          <Link
            href={`/workspaces/${workspaceId}/projects/${project.$id}`}
            className="flex items-center gap-2 hover:underline"
          >
            <ProjectAvatar
              className="size-8"
              name={project.name}
              image={project.imageUrl}
            />
            <span className="font-medium text-gray-900">{project.name}</span>
          </Link>
        </td>
        <td className="p-3">
          <Badge variant={getStatusBadgeVariant(status)} className="flex items-center gap-1.5 w-fit">
            {getStatusIcon(status)}
            <span>{status}</span>
          </Badge>
        </td>
        <td className="p-3">
          <div className="flex items-center gap-2">
            <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className={cn(
                  "h-full transition-all",
                  progress.percentage === 100 ? "bg-emerald-600" : "bg-blue-600"
                )}
                style={{ width: `${progress.percentage}%` }}
              />
            </div>
            <span className="text-sm text-gray-700 font-medium">{progress.percentage}%</span>
            {progress.total > 0 && (
              <span className="text-xs text-muted-foreground">
                ({progress.completed}/{progress.total})
              </span>
            )}
          </div>
        </td>
        <td className="p-3 text-sm text-gray-700">
          {createdDate}
        </td>
        <td className="p-3 text-sm text-gray-700">
          {dueDate !== "-" ? dueDate : <span className="text-muted-foreground">-</span>}
        </td>
        <td className="p-3">
          {owner ? (
            <div className="flex items-center gap-2">
              <MemberAvatar
                className="size-6"
                name={owner.name || owner.email || ""}
                avatarColor={owner.avatarColor}
              />
              <span className="text-sm text-gray-700">{owner.name || owner.email}</span>
            </div>
          ) : (
            <span className="text-sm text-muted-foreground">-</span>
          )}
        </td>
      </tr>
    );
  };

  return (
    <div className="h-full flex flex-col">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">All projects</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage and track all your projects in one place
          </p>
        </div>
        <Button onClick={openCreateProject} className="bg-blue-600 hover:bg-blue-700 text-white">
          <Plus className="size-4 mr-2" />
          Add new
        </Button>
      </div>

      <div className="flex-1 border rounded-lg bg-white shadow-sm">
        <div className="p-4">
          {/* Active Projects Section */}
          <div className="mb-6">
            <button
              onClick={() => setActiveExpanded(!activeExpanded)}
              className="flex items-center justify-between w-full mb-3 hover:opacity-80 transition-opacity"
            >
              <div className="flex items-center gap-2">
                {activeExpanded ? (
                  <ChevronDown className="size-5 text-gray-600" />
                ) : (
                  <ChevronRight className="size-5 text-gray-600" />
                )}
                <h2 className="text-lg font-semibold text-gray-900">
                  Active projects ({activeProjects.length})
                </h2>
              </div>
            </button>

            {activeExpanded && (
              <div className="border rounded-lg overflow-hidden">
                {activeProjects.length > 0 ? (
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b">
                      <tr>
                        <th className="text-left p-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                          Project name
                        </th>
                        <th className="text-left p-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                          Project status
                        </th>
                        <th className="text-left p-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                          Progress
                        </th>
                        <th className="text-left p-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                          Start date
                        </th>
                        <th className="text-left p-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                          Due date
                        </th>
                        <th className="text-left p-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                          Project owner
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y bg-white">
                      {activeProjects.map(renderProjectRow)}
                    </tbody>
                  </table>
                ) : (
                  <div className="p-8 text-center text-muted-foreground">
                    <p>No active projects yet. Create your first project to get started!</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Closed Projects Section */}
          {closedProjects.length > 0 && (
            <div>
              <button
                onClick={() => setClosedExpanded(!closedExpanded)}
                className="flex items-center justify-between w-full mb-3 hover:opacity-80 transition-opacity"
              >
                <div className="flex items-center gap-2">
                  {closedExpanded ? (
                    <ChevronDown className="size-5 text-gray-600" />
                  ) : (
                    <ChevronRight className="size-5 text-gray-600" />
                  )}
                  <h2 className="text-lg font-semibold text-gray-900">
                    Closed projects ({closedProjects.length})
                  </h2>
                </div>
              </button>

              {closedExpanded && (
                <div className="border rounded-lg overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b">
                      <tr>
                        <th className="text-left p-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                          Project name
                        </th>
                        <th className="text-left p-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                          Project status
                        </th>
                        <th className="text-left p-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                          Progress
                        </th>
                        <th className="text-left p-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                          Start date
                        </th>
                        <th className="text-left p-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                          Due date
                        </th>
                        <th className="text-left p-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                          Project owner
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y bg-white">
                      {closedProjects.map(renderProjectRow)}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
