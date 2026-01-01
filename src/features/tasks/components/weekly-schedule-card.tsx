"use client";

import { Task } from "../types";
import { ProjectAvatar } from "@/features/projects/components/project-avatar";
import { cn } from "@/lib/utils";
import { format, parseISO } from "date-fns";
import { MemberAvatar } from "@/features/members/components/member-avatar";
import { TaskStatus } from "../types";

interface WeeklyScheduleCardProps {
  task: Task;
  showTime?: boolean;
}

// Enhanced color coding system
const getTaskColor = (task: Task): string => {
  const projectName = task.project?.name?.toLowerCase() || "";
  const status = task.status;

  // Color based on project type with more variety
  if (projectName.includes("website")) {
    return "bg-blue-100 border-blue-300";
  }
  if (projectName.includes("training") || projectName.includes("employee")) {
    return "bg-green-100 border-green-300";
  }
  if (projectName.includes("webinar")) {
    return "bg-purple-100 border-purple-300";
  }
  if (projectName.includes("blog")) {
    return "bg-orange-100 border-orange-300";
  }
  if (projectName.includes("sales") || projectName.includes("funnel")) {
    return "bg-pink-100 border-pink-300";
  }
  if (projectName.includes("mobile") || projectName.includes("app")) {
    return "bg-indigo-100 border-indigo-300";
  }
  if (projectName.includes("crm") || projectName.includes("integration")) {
    return "bg-cyan-100 border-cyan-300";
  }

  // Fallback based on status
  switch (status) {
    case TaskStatus.IN_PROGRESS:
      return "bg-yellow-100 border-yellow-300";
    case TaskStatus.DONE:
      return "bg-emerald-100 border-emerald-300";
    case TaskStatus.IN_REVIEW:
      return "bg-blue-100 border-blue-300";
    default:
      return "bg-gray-100 border-gray-300";
  }
};

export const WeeklyScheduleCard = ({ task, showTime = false }: WeeklyScheduleCardProps) => {
  const colorClass = getTaskColor(task);
  
  // Check if task has a time (would come from task.startTime/endTime if available)
  const hasTime = showTime && task.dueDate;
  let timeDisplay = "";

  if (hasTime) {
    try {
      const taskDate = parseISO(task.dueDate);
      // Placeholder: would use actual startTime/endTime from task
      timeDisplay = format(taskDate, "HH:mm");
    } catch {
      // Invalid date
    }
  }

  return (
    <div
      className={cn(
        "p-2 rounded-md text-xs border cursor-pointer hover:shadow-md transition-all",
        colorClass
      )}
    >
      <div className="flex items-start justify-between gap-1">
        <div className="flex-1 min-w-0">
          {hasTime && timeDisplay && (
            <div className="text-[10px] text-muted-foreground mb-1 font-medium">
              {timeDisplay}
            </div>
          )}
          <div className="font-medium line-clamp-2 mb-1 text-gray-900">{task.name}</div>
          {task.project && (
            <div className="flex items-center gap-1 mt-1">
              <ProjectAvatar
                className="size-3"
                fallbackClassName="text-[8px]"
                name={task.project.name}
                image={task.project.imageUrl}
              />
              <span className="text-[10px] text-muted-foreground truncate">
                {task.project.name}
              </span>
            </div>
          )}
          {task.assignee && (
            <div className="flex items-center gap-1 mt-1">
              <MemberAvatar
                className="size-3"
                fallbackClassName="text-[8px]"
                name={task.assignee.name || task.assignee.email || ""}
                avatarColor={task.assignee.avatarColor}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
