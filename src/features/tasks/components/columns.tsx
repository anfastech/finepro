"use client";

import { ColumnDef } from "@tanstack/react-table";
import { ArrowUpDown, MoreVertical, Mail, Calendar, Rocket, CheckCircle2 } from "lucide-react";

import { MemberAvatar } from "@/features/members/components/member-avatar";
import { ProjectAvatar } from "@/features/projects/components/project-avatar";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { snakeCaseToTitleCase } from "@/lib/utils";

import { TaskDate } from "./task-date";

import { Task, TaskStatus } from "../types";
import { TaskActions } from "./task-actions";

const getStatusIcon = (status: TaskStatus) => {
  switch (status) {
    case TaskStatus.TODO:
    case TaskStatus.BACKLOG:
      return <Mail className="size-4" />;
    case TaskStatus.IN_PROGRESS:
      return <Rocket className="size-4" />;
    case TaskStatus.IN_REVIEW:
      return <Calendar className="size-4" />;
    case TaskStatus.DONE:
      return <CheckCircle2 className="size-4" />;
    default:
      return null;
  }
};

export const columns: ColumnDef<Task>[] = [
  {
    accessorKey: "name",
    header: "Task Name",
    cell: ({ row }) => {
      const name = row.original.name;
      // Placeholder: subtask indicators - would come from task.subtaskCompleted/totalSubtasks
      const subtaskCompleted = 0;
      const totalSubtasks = 0;
      const hasSubtasks = totalSubtasks > 0;

      return (
        <div className="flex items-center gap-2">
          <p className="line-clamp-1 font-medium text-gray-900">{name}</p>
          {hasSubtasks && (
            <span className="text-xs text-muted-foreground font-medium">
              ({subtaskCompleted}/{totalSubtasks})
            </span>
          )}
        </div>
      );
    },
  },
  {
    accessorKey: "status",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="h-8"
        >
          Status
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    cell: ({ row }) => {
      const status = row.original.status;
      const icon = getStatusIcon(status);

      return (
        <div className="flex items-center gap-2.5">
          <div className="text-gray-500">{icon}</div>
          <Badge variant={status} className="font-medium">
            {snakeCaseToTitleCase(status)}
          </Badge>
        </div>
      );
    },
  },
  {
    id: "type",
    header: "Type",
    cell: () => {
      // Placeholder - no type field in current schema
      return <span className="text-sm text-muted-foreground">Operational</span>;
    },
  },
  {
    accessorKey: "dueDate",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="h-8"
        >
          Due date
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    cell: ({ row }) => {
      const dueDate = row.original.dueDate;

      if (!dueDate) {
        return <span className="text-muted-foreground text-sm">No due date</span>;
      }

      return <TaskDate value={dueDate} />;
    },
  },
  {
    accessorKey: "assignee",
    header: "Responsible",
    cell: ({ row }) => {
      const assignee = row.original.assignee as
        | { name: string; avatarColor?: { bg: string; text: string } }
        | undefined;

      if (!assignee) {
        return <span className="text-muted-foreground text-sm">No assignee</span>;
      }

      return (
        <div className="flex items-center gap-x-2">
          <MemberAvatar
            className="size-6"
            fallbackClassName="text-xs"
            name={assignee.name}
            avatarColor={assignee.avatarColor}
          />
          <p className="line-clamp-1 text-sm">{assignee.name}</p>
        </div>
      );
    },
  },
  {
    id: "actions",
    cell: ({ row }) => {
      const id = row.original.$id;
      const projectId = row.original.projectId;

      // console.log(`🚩🚩🚩\n printing the row original \n 🏁 : ${JSON.stringify(row.original)} \n 🚩🚩`);
      // console.log(`☑️☑️☑️\n printing the id \n 🏁 : ${id} \n ☑️☑️`);
      // console.log(`✅✅✅\n printing the ProjectId \n 🏁 : ${projectId} \n ✅✅`);

      return (
        <TaskActions id={id} projectId={projectId}>
          <Button variant="ghost" className="size-8 p-0">
            <MoreVertical className="size-4" />
          </Button>
        </TaskActions>
      );
    },
  },
];
