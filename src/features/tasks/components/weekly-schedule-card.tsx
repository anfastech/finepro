"use client";

import { Task } from "../types";
import { ProjectAvatar } from "@/features/projects/components/project-avatar";
import { cn } from "@/lib/utils";
import { format, parseISO, differenceInDays } from "date-fns";
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

// Format duration to "Xh Ym" or "Xh" format
const formatDuration = (hours?: number): string => {
  if (!hours) return "";
  const wholeHours = Math.floor(hours);
  const minutes = Math.round((hours - wholeHours) * 60);
  
  if (minutes === 0) {
    return `${wholeHours}h`;
  }
  return `${wholeHours}h ${minutes}m`;
};

// Calculate days until due date
const getDaysLeft = (dueDate: string): number | null => {
  try {
    const due = parseISO(dueDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    due.setHours(0, 0, 0, 0);
    return differenceInDays(due, today);
  } catch {
    return null;
  }
};

export const WeeklyScheduleCard = ({ task, showTime = false }: WeeklyScheduleCardProps) => {
  const colorClass = getTaskColor(task);
  
  // Time range display
  let timeDisplay = "";
  if (task.startTime && task.endTime) {
    timeDisplay = `${task.startTime}-${task.endTime}`;
  } else if (task.startTime) {
    timeDisplay = task.startTime;
  }
  
  // Duration display
  const durationDisplay = task.duration ? formatDuration(task.duration) : "";
  
  // Progress indicator
  const showProgress = task.totalSubtasks !== undefined && task.totalSubtasks > 0;
  const progressDisplay = showProgress 
    ? `${task.completedSubtasks || 0}/${task.totalSubtasks}` 
    : "";
  
  // Priority/ASAP badge
  const showASAP = task.priority === "ASAP" || task.isUrgent;
  
  // Days left indicator
  const daysLeft = task.dueDate ? getDaysLeft(task.dueDate) : null;
  const showDaysLeft = daysLeft !== null && daysLeft >= 0;
  
  // Determine days left badge color
  const getDaysLeftColor = (days: number) => {
    if (days <= 1) return "bg-red-100 text-red-700";
    if (days <= 3) return "bg-orange-100 text-orange-700";
    if (days <= 7) return "bg-yellow-100 text-yellow-700";
    return "bg-gray-100 text-gray-700";
  };

  return (
    <div
      className={cn(
        "p-2 rounded-md text-xs border cursor-pointer hover:shadow-sm transition-all",
        colorClass
      )}
    >
      <div className="flex flex-col gap-1">
        {/* Time range */}
        {timeDisplay && (
          <div className="text-[10px] text-gray-600 font-medium">
            {timeDisplay}
          </div>
        )}
        
        {/* Task name */}
        <div className="font-medium line-clamp-2 text-gray-900 text-xs leading-tight">{task.name}</div>
        
        {/* Project information - moved up before badges */}
        {task.project && (
          <div className="flex items-center gap-1 mt-0.5">
            <ProjectAvatar
              className="size-3"
              fallbackClassName="text-[8px]"
              name={task.project.name}
              image={task.project.imageUrl}
            />
            <span className="text-[10px] text-gray-600 truncate">
              {task.project.name}
            </span>
          </div>
        )}
        
        {/* Badges row: ASAP, Progress, Days left */}
        <div className="flex items-center gap-1 flex-wrap mt-0.5">
          {showASAP && (
            <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-red-100 text-red-700">
              ASAP
            </span>
          )}
          {showProgress && (
            <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-blue-100 text-blue-700">
              {progressDisplay}
            </span>
          )}
          {showDaysLeft && (
            <span className={cn(
              "px-1.5 py-0.5 rounded text-[10px] font-medium",
              getDaysLeftColor(daysLeft)
            )}>
              {daysLeft === 0 ? "Today" : `${daysLeft} day${daysLeft === 1 ? "" : "s"} left`}
            </span>
          )}
        </div>
        
        {/* Duration */}
        {durationDisplay && (
          <div className="text-[10px] text-gray-600 font-medium mt-0.5">
            {durationDisplay}
          </div>
        )}
      </div>
    </div>
  );
};
