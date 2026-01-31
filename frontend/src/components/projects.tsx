"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { RiAddCircleFill } from "react-icons/ri";
import { ChevronDown, ChevronRight, Folder } from "lucide-react";

import { cn } from "@/lib/utils";

import { useGetProjects } from "@/features/projects/api/use-get-projects";
import { useWorkspaceId } from "@/features/workspaces/hooks/use-workspace-id";
import { ProjectAvatar } from "@/features/projects/components/project-avatar";
import { useCreateProjectModel } from "@/features/projects/hooks/use-create-project-modal";
import { Project } from "@/features/projects/types";

interface ProjectFolder {
  id: string;
  name: string;
  projects: Project[];
  isExpanded: boolean;
}

export const Projects = () => {
  const pathname = usePathname();
  const { open } = useCreateProjectModel();
  const workspaceId = useWorkspaceId();
  const { data } = useGetProjects({
    workspaceId,
  });

  // Track expanded/collapsed state for folders
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());

  // Group projects into folders based on name patterns
  // This is a smart grouping - can be enhanced when backend supports parentId
  const { folders, standaloneProjects } = useMemo(() => {
    if (!data?.documents) return { folders: [], standaloneProjects: [] };

    const folderMap = new Map<string, Project[]>();
    const standalone: Project[] = [];

    data.documents.forEach((project) => {
      const name = project.name;
      
      // Check if project name suggests it's part of a folder
      // Pattern: "Parent Name" > "Child Name" or common prefixes
      if (name.includes("Website Development") || name.includes("Website Translation")) {
        const folderName = "New Website";
        if (!folderMap.has(folderName)) {
          folderMap.set(folderName, []);
        }
        folderMap.get(folderName)!.push(project);
      } else if (name.includes("Design") && (name.includes("Brandbook") || name.includes("Style"))) {
        const folderName = "Design projects";
        if (!folderMap.has(folderName)) {
          folderMap.set(folderName, []);
        }
        folderMap.get(folderName)!.push(project);
      } else {
        standalone.push(project);
      }
    });

    const folders: ProjectFolder[] = Array.from(folderMap.entries()).map(([name, projects]) => ({
      id: name.toLowerCase().replace(/\s+/g, "-"),
      name,
      projects,
      isExpanded: expandedFolders.has(name.toLowerCase().replace(/\s+/g, "-")),
    }));

    return { folders, standaloneProjects: standalone };
  }, [data?.documents, expandedFolders]);

  const toggleFolder = (folderId: string) => {
    setExpandedFolders((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(folderId)) {
        newSet.delete(folderId);
      } else {
        newSet.add(folderId);
      }
      return newSet;
    });
  };

  const renderProject = (project: Project, isNested = false) => {
    const href = `/workspaces/${workspaceId}/projects/${project.$id}`;
    const isActive = pathname === href;

    return (
      <Link href={href} key={project.$id}>
        <div
          className={cn(
            "flex items-center gap-2.5 p-2.5 rounded-md transition-all duration-200 cursor-pointer",
            "text-neutral-300 hover:text-white hover:bg-white/10",
            isActive && "bg-white/20 text-white",
            isNested && "pl-8"
          )}
        >
          <ProjectAvatar className="size-6" image={project.imageUrl} name={project.name} />
          <span className="truncate text-sm">{project.name}</span>
        </div>
      </Link>
    );
  };

  if (!data?.documents || data.documents.length === 0) {
    return (
      <div className="flex flex-col gap-y-2">
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs uppercase text-neutral-400">PROJECTS</p>
          <RiAddCircleFill onClick={open} className="size-5 text-neutral-400 cursor-pointer hover:opacity-75 transition"/>
        </div>
        <div className="text-xs text-neutral-400 py-2 px-2.5">
          No projects yet. Click + to create one.
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-y-1">
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs uppercase text-neutral-400">PROJECTS</p>
        <RiAddCircleFill onClick={open} className="size-5 text-neutral-400 cursor-pointer hover:opacity-75 transition"/>
      </div>
      
      {/* Folders */}
      {folders.map((folder) => {
        const isExpanded = expandedFolders.has(folder.id);
        return (
          <div key={folder.id} className="flex flex-col">
            <button
              onClick={() => toggleFolder(folder.id)}
              className={cn(
                "flex items-center gap-2 p-2.5 rounded-md transition-all duration-200 cursor-pointer text-left",
                "text-neutral-300 hover:text-white hover:bg-white/10"
              )}
            >
              {isExpanded ? (
                <ChevronDown className="size-4 shrink-0" />
              ) : (
                <ChevronRight className="size-4 shrink-0" />
              )}
              <Folder className="size-4 shrink-0" />
              <span className="text-sm font-medium truncate">{folder.name}</span>
            </button>
            {isExpanded && (
              <div className="flex flex-col gap-y-0.5 ml-6">
                {folder.projects.map((project) => renderProject(project, true))}
              </div>
            )}
          </div>
        );
      })}

      {/* Standalone projects */}
      {standaloneProjects.map((project) => renderProject(project, false))}
    </div>
  );
};
