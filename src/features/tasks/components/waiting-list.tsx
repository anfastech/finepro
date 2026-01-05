"use client";

import { useState, useMemo } from "react";
import { Task } from "../types";
import { Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { WeeklyScheduleCard } from "./weekly-schedule-card";
import { useCreateTaskModel } from "../hooks/use-create-task-modal";
import { cn } from "@/lib/utils";

interface WaitingListProps {
  tasks: Task[];
}

export const WaitingList = ({ tasks }: WaitingListProps) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const { open: openCreateTask } = useCreateTaskModel();

  // Filter tasks by search query
  const filteredTasks = useMemo(() => {
    if (!searchQuery.trim()) return tasks;
    const query = searchQuery.toLowerCase();
    return tasks.filter((task) => 
      task.name.toLowerCase().includes(query) ||
      task.project?.name.toLowerCase().includes(query)
    );
  }, [tasks, searchQuery]);

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-sm text-gray-900">
          Waiting list {filteredTasks.length}
        </h3>
        <Button 
          variant="ghost" 
          size="sm"
          className="h-7 px-2"
          onClick={() => {
            if (isSearchOpen) {
              openCreateTask();
            } else {
              setIsSearchOpen(true);
            }
          }}
        >
          <Plus className="size-3.5 mr-1" />
          <Search className="size-3.5" />
        </Button>
      </div>

      {isSearchOpen && (
        <div className="mb-4">
          <Input
            placeholder="Search tasks..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-8 text-sm"
            autoFocus
            onBlur={() => {
              if (!searchQuery.trim()) {
                setIsSearchOpen(false);
              }
            }}
          />
        </div>
      )}

      <div className="flex-1 overflow-y-auto space-y-2">
        {filteredTasks.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            {searchQuery ? "No tasks found" : "No unscheduled tasks"}
          </p>
        ) : (
          filteredTasks.map((task) => (
            <WeeklyScheduleCard key={task.$id} task={task} />
          ))
        )}
      </div>
    </div>
  );
};

