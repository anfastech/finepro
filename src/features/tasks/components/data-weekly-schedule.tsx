"use client";

import { useState, useMemo } from "react";
import { format, startOfWeek, endOfWeek, addWeeks, subWeeks, eachDayOfInterval, isSameDay, parseISO } from "date-fns";
import { ChevronLeft, ChevronRight, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Task } from "../types";
import { WeeklyScheduleCard } from "./weekly-schedule-card";
import { WaitingList } from "./waiting-list";
import { cn } from "@/lib/utils";
import { MemberAvatar } from "@/features/members/components/member-avatar";

interface DataWeeklyScheduleProps {
  data: Task[];
}

export const DataWeeklySchedule = ({ data }: DataWeeklyScheduleProps) => {
  const [currentWeek, setCurrentWeek] = useState(new Date());

  const weekStart = startOfWeek(currentWeek, { weekStartsOn: 1 }); // Monday
  const weekEnd = endOfWeek(currentWeek, { weekStartsOn: 1 });
  const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });

  // Group tasks by assignee
  const tasksByAssignee = useMemo(() => {
    const grouped: Record<string, Task[]> = {};
    
    data.forEach((task) => {
      const assigneeId = task.assigneeId || "unassigned";
      if (!grouped[assigneeId]) {
        grouped[assigneeId] = [];
      }
      grouped[assigneeId].push(task);
    });

    return grouped;
  }, [data]);

  // Get tasks for a specific day and assignee
  const getTasksForDay = (assigneeId: string, day: Date) => {
    const assigneeTasks = tasksByAssignee[assigneeId] || [];
    return assigneeTasks.filter((task) => {
      if (!task.dueDate) return false;
      const taskDate = parseISO(task.dueDate);
      return isSameDay(taskDate, day);
    });
  };

  // Get unscheduled tasks (no due date or due date outside current week)
  const unscheduledTasks = useMemo(() => {
    return data.filter((task) => {
      if (!task.dueDate) return true;
      const taskDate = parseISO(task.dueDate);
      return taskDate < weekStart || taskDate > weekEnd;
    });
  }, [data, weekStart, weekEnd]);

  const handlePrevWeek = () => {
    setCurrentWeek(subWeeks(currentWeek, 1));
  };

  const handleNextWeek = () => {
    setCurrentWeek(addWeeks(currentWeek, 1));
  };

  const handleToday = () => {
    setCurrentWeek(new Date());
  };

  const assignees = Object.keys(tasksByAssignee);

  return (
    <div className="flex gap-4 h-full">
      <div className="flex-1 overflow-x-auto">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handlePrevWeek}>
              <ChevronLeft className="size-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={handleToday}>
              <Calendar className="size-4 mr-2" />
              Today
            </Button>
            <Button variant="outline" size="sm" onClick={handleNextWeek}>
              <ChevronRight className="size-4" />
            </Button>
            <span className="ml-4 text-sm font-medium">
              {format(weekStart, "d MMM")} - {format(weekEnd, "d MMM yyyy")}
            </span>
          </div>
        </div>

        <div className="border rounded-lg overflow-hidden bg-white overflow-x-auto">
          <div className="grid grid-cols-8 min-w-[800px] border-b bg-gray-50">
            <div className="p-3 border-r font-medium text-sm text-gray-700 sticky left-0 bg-gray-50 z-10">Responsible</div>
            {weekDays.map((day) => (
              <div
                key={day.toISOString()}
                className={cn(
                  "p-3 text-center border-l font-medium text-sm",
                  isSameDay(day, new Date()) && "bg-blue-100 text-blue-700"
                )}
              >
                <div className="text-xs text-muted-foreground">
                  {format(day, "EEE")}
                </div>
                <div className="text-sm font-semibold mt-1 text-gray-900">
                  {format(day, "d")}
                </div>
              </div>
            ))}
          </div>

          {assignees.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              <p className="text-sm font-medium mb-1">No tasks scheduled for this week</p>
              <p className="text-xs">Tasks with due dates in this week will appear here</p>
            </div>
          ) : (
            <div className="divide-y">
              {assignees.map((assigneeId) => {
                const assigneeTasks = tasksByAssignee[assigneeId] || [];
                const assignee = assigneeTasks[0]?.assignee;
                const assigneeName = assignee?.name || assignee?.email || "Unassigned";

                // Calculate total hours per day (placeholder - tasks don't have duration yet)
                const dailyTotals = weekDays.map((day) => {
                  const dayTasks = getTasksForDay(assigneeId, day);
                  return dayTasks.length; // Placeholder for hours
                });

                return (
                  <div key={assigneeId} className="grid grid-cols-8 min-w-[800px]">
                    <div className="p-3 border-r bg-gray-50 sticky left-0 bg-gray-50 z-10">
                      <div className="flex items-center gap-2 mb-1">
                        {assignee && (
                          <MemberAvatar
                            className="size-6"
                            fallbackClassName="text-xs"
                            name={assignee.name || assignee.email || ""}
                            avatarColor={assignee.avatarColor}
                          />
                        )}
                      </div>
                      <div className="flex flex-col">
                        <span className="font-medium text-sm text-gray-900">{assigneeName}</span>
                        <span className="text-xs text-muted-foreground">
                          {assigneeTasks.length} tasks
                        </span>
                      </div>
                    </div>
                    {weekDays.map((day, dayIndex) => {
                      const dayTasks = getTasksForDay(assigneeId, day);
                      return (
                        <div
                          key={day.toISOString()}
                          className={cn(
                            "p-2 border-l min-h-[100px]",
                            isSameDay(day, new Date()) && "bg-blue-50/50"
                          )}
                        >
                          <div className="flex flex-col gap-1.5">
                            {dayTasks.map((task) => (
                              <WeeklyScheduleCard key={task.$id} task={task} showTime={true} />
                            ))}
                          </div>
                          {dailyTotals[dayIndex] > 0 && (
                            <div className="mt-2 text-xs font-medium text-muted-foreground text-right">
                              {dailyTotals[dayIndex]}h
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <div className="w-full lg:w-80 border rounded-lg p-4 bg-gray-50 shrink-0">
        <WaitingList tasks={unscheduledTasks} />
      </div>
    </div>
  );
};

