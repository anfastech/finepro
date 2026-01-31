"use client";

import { useState, useMemo } from "react";
import { format, startOfWeek, endOfWeek, addWeeks, subWeeks, eachDayOfInterval, isSameDay, parseISO } from "date-fns";
import { ChevronLeft, ChevronRight, Calendar, LayoutGrid, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Task } from "../types";
import { WeeklyScheduleCard } from "./weekly-schedule-card";
import { WaitingList } from "./waiting-list";
import { cn } from "@/lib/utils";
import { MemberAvatar } from "@/features/members/components/member-avatar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";

interface DataWeeklyScheduleProps {
  data: Task[];
}

export const DataWeeklySchedule = ({ data }: DataWeeklyScheduleProps) => {
  const [currentWeek, setCurrentWeek] = useState(new Date());
  const [todayPopoverOpen, setTodayPopoverOpen] = useState(false);

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
    setTodayPopoverOpen(false);
  };

  const handleDateSelect = (date: Date | undefined) => {
    if (date) {
      setCurrentWeek(date);
      setTodayPopoverOpen(false);
    }
  };

  const assignees = Object.keys(tasksByAssignee);

  return (
    <div className="flex gap-4 h-full">
      <div className="flex-1 overflow-x-auto">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" onClick={handlePrevWeek} className="h-8">
              <ChevronLeft className="size-4" />
            </Button>
            <div className="flex items-center gap-1">
              <span className="text-base font-medium text-gray-900">
                {format(weekStart, "MMMM")}
              </span>
            </div>
            <Button variant="outline" size="sm" onClick={handleNextWeek} className="h-8">
              <ChevronRight className="size-4" />
            </Button>
            <Popover open={todayPopoverOpen} onOpenChange={setTodayPopoverOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="h-8 ml-2">
                  <Calendar className="size-4 mr-2" />
                  Today
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <CalendarComponent
                  mode="single"
                  selected={new Date()}
                  onSelect={handleDateSelect}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="h-8">
              <LayoutGrid className="size-4 mr-2" />
              Group by responsible
            </Button>
            <Button variant="outline" size="sm" className="h-8">
              <Filter className="size-4" />
            </Button>
          </div>
        </div>

        <div className="border rounded-lg overflow-hidden bg-white overflow-x-auto">
          <div className="grid grid-cols-8 min-w-[900px] border-b bg-gray-50 sticky top-0 z-20">
            <div className="p-3 border-r font-medium text-sm text-gray-700 sticky left-0 bg-gray-50 z-10">Responsible</div>
            {weekDays.map((day) => (
              <div
                key={day.toISOString()}
                className={cn(
                  "p-3 text-center border-l font-medium text-sm",
                  isSameDay(day, new Date()) && "bg-blue-50"
                )}
              >
                <div className={cn(
                  "text-sm font-semibold text-gray-900 inline-block",
                  isSameDay(day, new Date()) && "border-b-2 border-blue-600 pb-0.5"
                )}>
                  {format(day, "d")} {format(day, "EEE")}
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

                // Calculate total hours per day and per week
                const dailyTotals = weekDays.map((day) => {
                  const dayTasks = getTasksForDay(assigneeId, day);
                  return dayTasks.reduce((total, task) => {
                    return total + (task.duration || 0);
                  }, 0);
                });
                
                const weeklyTotalHours = dailyTotals.reduce((sum, hours) => sum + hours, 0);
                const weeklyHours = Math.floor(weeklyTotalHours);
                const weeklyMinutes = Math.round((weeklyTotalHours - weeklyHours) * 60);
                const weeklyTotalDisplay = weeklyMinutes > 0 
                  ? `${weeklyHours}h ${weeklyMinutes}m` 
                  : `${weeklyHours}h`;

                return (
                  <div key={assigneeId} className="grid grid-cols-8 min-w-[900px]">
                    <div className="p-3 border-r bg-gray-50 sticky left-0 bg-gray-50 z-10">
                      <div className="flex items-center gap-2">
                        {assignee && (
                          <MemberAvatar
                            className="size-6 shrink-0"
                            fallbackClassName="text-xs"
                            name={assignee.name || assignee.email || ""}
                            avatarColor={assignee.avatarColor}
                          />
                        )}
                        <div className="flex flex-col min-w-0">
                          <span className="font-medium text-sm text-gray-900 truncate">{assigneeName}</span>
                          <span className="text-xs text-gray-500">
                            {weeklyTotalDisplay} total
                          </span>
                        </div>
                      </div>
                    </div>
                    {weekDays.map((day, dayIndex) => {
                      const dayTasks = getTasksForDay(assigneeId, day);
                      return (
                        <div
                          key={day.toISOString()}
                          className={cn(
                            "p-2 border-l min-h-[100px] bg-white",
                            isSameDay(day, new Date()) && "bg-blue-50/30"
                          )}
                        >
                          <div className="flex flex-col gap-1.5">
                            {dayTasks.map((task) => (
                              <WeeklyScheduleCard key={task.$id} task={task} showTime={true} />
                            ))}
                          </div>
                          {dailyTotals[dayIndex] > 0 && (
                            <div className="mt-2 pt-2 border-t border-gray-200 text-xs font-medium text-gray-600 text-right">
                              {(() => {
                                const hours = Math.floor(dailyTotals[dayIndex]);
                                const minutes = Math.round((dailyTotals[dayIndex] - hours) * 60);
                                return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
                              })()}
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

