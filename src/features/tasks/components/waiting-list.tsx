"use client";

import { Task } from "../types";
import { Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { WeeklyScheduleCard } from "./weekly-schedule-card";

interface WaitingListProps {
  tasks: Task[];
}

export const WaitingList = ({ tasks }: WaitingListProps) => {
  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-sm">
          Waiting list {tasks.length}
        </h3>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="size-6">
            <Plus className="size-4" />
          </Button>
          <Button variant="ghost" size="icon" className="size-6">
            <Search className="size-4" />
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto space-y-2">
        {tasks.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            No unscheduled tasks
          </p>
        ) : (
          tasks.map((task) => (
            <WeeklyScheduleCard key={task.$id} task={task} />
          ))
        )}
      </div>
    </div>
  );
};

