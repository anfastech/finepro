"use client";

import { ChevronDown } from "lucide-react";

import { useGetWorkspaces } from "@/features/workspaces/api/use-get-workspaces";
import { useWorkspaceId } from "@/features/workspaces/hooks/use-workspace-id";
import { WorkspaceAvatar } from "@/features/workspaces/components/workspace-avatar";
import { Workspace } from "@/features/workspaces/types";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useRouter } from "next/navigation";

export const WorkspaceSwitcher = () => {
  const workspaceId = useWorkspaceId();
  const router = useRouter();
  const { data: workspaces } = useGetWorkspaces();

  const onSelect = (id: string) => {
    router.push(`/workspaces/${id}`);
  };

  const currentWorkspace = workspaces?.documents.find((w: any) => w.$id === workspaceId);

  return (
    <Select onValueChange={onSelect} value={workspaceId}>
      <SelectTrigger className="w-full bg-blue-400 hover:bg-blue-500 border-0 text-white font-medium p-3 rounded-lg transition-colors duration-200">
        <div className="flex items-center gap-3 w-full">
          {currentWorkspace && (
            <>
              <WorkspaceAvatar
                name={currentWorkspace.name}
                image={currentWorkspace.imageUrl}
                className="size-6 shrink-0"
              />
              <SelectValue placeholder="Select a workspace" className="flex-1 text-left">
                {currentWorkspace.name}
              </SelectValue>
            </>
          )}
          {!currentWorkspace && (
            <SelectValue placeholder="Select a workspace" className="flex-1 text-left" />
          )}
          <ChevronDown className="size-4 shrink-0" />
        </div>
      </SelectTrigger>
      <SelectContent>
        {workspaces?.documents.map((workspace: any) => (
          <SelectItem key={workspace.$id} value={workspace.$id}>
            <div className="flex justify-start items-center gap-3 font-medium">
              <WorkspaceAvatar
                name={workspace.name}
                image={workspace.imageUrl}
              />
              <span className="truncate">{workspace.name}</span>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};
