import { Button } from "@/components/ui/button";
import { PlusIcon } from "lucide-react";
import { useCreateTaskModel } from "../hooks/use-create-task-modal";

interface KanbanColumnHeaderProps {
  board: string;
  taskCount: number;
}

const columnNameMap: Record<string, string> = {
  "new-task": "New task",
  "scheduled": "Scheduled",
  "in-progress": "In progress",
  "completed": "Completed",
};

export const KanbanColumnHeader = ({
  board,
  taskCount
}: KanbanColumnHeaderProps) => {
  const { open } = useCreateTaskModel();
  const displayName = columnNameMap[board] || board;

  return (
    <div className="px-2 py-1.5 flex items-center justify-between">
      <div className="flex items-center gap-x-2">
        <h2 className="text-sm font-medium">
          {displayName}
        </h2>
        <div className="size-5 flex items-center justify-center rounded-md bg-neutral-200 text-xs text-neutral-700 font-medium">
          {taskCount}
        </div>
      </div>
      <Button onClick={open} variant="ghost" size="icon" className="size-5">
        <PlusIcon className="size-4 text-neutral-500" />
      </Button>
    </div>
  );
};
