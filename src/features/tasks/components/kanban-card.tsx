import { MoreHorizontal, CheckCircle2, MessageCircle, Paperclip, AlertCircle } from "lucide-react";
import { Task, TaskStatus } from "../types";
import { TaskActions } from "./task-actions";
import { DottedSeparator } from "@/components/dotted-separator";
import { MemberAvatar } from "@/features/members/components/member-avatar";
import { ProjectAvatar } from "@/features/projects/components/project-avatar";
import { cn } from "@/lib/utils";
import { differenceInDays, format } from "date-fns";
import { Badge } from "@/components/ui/badge";

interface KanbanCardProps {
  task: Task;
}

// Color-coded backgrounds based on project name (placeholder logic - can be enhanced)
const getCardColor = (task: Task): string => {
  const projectName = task.project?.name?.toLowerCase() || "";
  const status = task.status;

  // Color based on project type
  if (projectName.includes("website")) {
    return "bg-blue-50 border-blue-200";
  }
  if (projectName.includes("training")) {
    return "bg-green-50 border-green-200";
  }
  if (projectName.includes("webinar")) {
    return "bg-purple-50 border-purple-200";
  }
  if (projectName.includes("blog")) {
    return "bg-orange-50 border-orange-200";
  }

  // Default based on status
  switch (status) {
    case TaskStatus.IN_PROGRESS:
      return "bg-yellow-50 border-yellow-200";
    case TaskStatus.DONE:
      return "bg-emerald-50 border-emerald-200";
    default:
      return "bg-white border-gray-200";
  }
};

// Get days left text
const getDaysLeft = (dueDate: string): { text: string; className: string } => {
  const today = new Date();
  const due = new Date(dueDate);
  const diffInDays = differenceInDays(due, today);

  if (diffInDays < 0) {
    return { text: "Overdue", className: "text-red-600" };
  }
  if (diffInDays === 0) {
    return { text: "Due today", className: "text-orange-600" };
  }
  if (diffInDays === 1) {
    return { text: "Due tomorrow", className: "text-orange-600" };
  }
  if (diffInDays <= 7) {
    return { text: `${diffInDays} days left`, className: "text-yellow-600" };
  }
  return { text: `${diffInDays} days left`, className: "text-muted-foreground" };
};

export const KanbanCard = ({ task }: KanbanCardProps) => {
  const cardColor = getCardColor(task);
  const daysLeft = task.dueDate ? getDaysLeft(task.dueDate) : null;

  // Placeholder values - would come from task data when available
  const progressCompleted = 0; // Placeholder: would be task.progressCompleted
  const progressTotal = 0; // Placeholder: would be task.progressTotal
  const hasProgress = progressTotal > 0;
  const commentCount = 0; // Placeholder: would be task.commentCount
  const attachmentCount = 0; // Placeholder: would be task.attachmentCount
  const isBlocked = false; // Placeholder: would be task.isBlocked
  const isASAP = false; // Placeholder: would be task.isASAP or due date < 2 days

  return (
    <div
      className={cn(
        "p-3 mb-2 rounded-md border shadow-sm hover:shadow-md transition-all cursor-pointer group",
        cardColor
      )}
    >
      {/* Header with task name and actions */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium line-clamp-2 text-gray-900">{task.name}</p>
          {/* Progress indicator */}
          {hasProgress && (
            <div className="flex items-center gap-1 mt-1.5">
              <CheckCircle2 className="size-3 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">
                {progressCompleted}/{progressTotal}
              </span>
            </div>
          )}
        </div>
        <TaskActions id={task.$id} projectId={task.projectId}>
          <MoreHorizontal className="size-4 shrink-0 text-gray-400 hover:text-gray-600 transition opacity-0 group-hover:opacity-100" />
        </TaskActions>
      </div>

      {/* Tags (ASAP, Blocked) */}
      {(isASAP || isBlocked) && (
        <div className="flex items-center gap-1.5 mb-2">
          {isASAP && (
            <Badge variant="destructive" className="text-[10px] px-1.5 py-0 h-5">
              ASAP
            </Badge>
          )}
          {isBlocked && (
            <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-5 border-red-300 text-red-700">
              <AlertCircle className="size-2.5 mr-1" />
              blocked
            </Badge>
          )}
        </div>
      )}

      {/* Days left / Due date */}
      {daysLeft && (
        <div className={cn("text-xs font-medium mb-2", daysLeft.className)}>
          {daysLeft.text}
        </div>
      )}

      <DottedSeparator className="my-2" />

      {/* Assignee and date */}
      <div className="flex items-center gap-2 mb-2">
        <MemberAvatar
          className="size-5"
          fallbackClassName="text-[10px]"
          name={task.assignee?.name || task.assignee?.email || "Unknown"}
          avatarColor={task.assignee?.avatarColor}
        />
        {task.dueDate && (
          <>
            <div className="size-1 rounded-full bg-gray-300" />
            <span className="text-xs text-muted-foreground">
              {format(new Date(task.dueDate), "d MMM")}
            </span>
          </>
        )}
      </div>

      {/* Project and indicators */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          {task.project && (
            <>
              <ProjectAvatar
                className="size-4"
                fallbackClassName="text-[8px]"
                name={task.project.name}
                image={task.project.imageUrl}
              />
              <span className="text-xs font-medium text-gray-700 truncate max-w-[120px]">
                {task.project.name}
              </span>
            </>
          )}
        </div>

        {/* Comment and attachment indicators */}
        <div className="flex items-center gap-1.5">
          {commentCount > 0 && (
            <div className="flex items-center gap-1">
              <MessageCircle className="size-3.5 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">{commentCount}</span>
            </div>
          )}
          {attachmentCount > 0 && (
            <div className="flex items-center gap-1">
              <Paperclip className="size-3.5 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">{attachmentCount}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
