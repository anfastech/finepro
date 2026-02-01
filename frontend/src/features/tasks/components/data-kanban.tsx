import React, { useCallback, useEffect, useState, useMemo } from "react";

import {
  DragDropContext,
  Droppable,
  Draggable,
  type DropResult,
} from "@hello-pangea/dnd";

import { Task, TaskStatus } from "../types";
import { KanbanColumnHeader } from "./kanban-column-header";
import { KanbanCard } from "./kanban-card";

// Map design columns to task statuses
const columnStatusMap: Record<string, TaskStatus[]> = {
  "new-task": [TaskStatus.TODO],
  "scheduled": [TaskStatus.IN_REVIEW],
  "in-progress": [TaskStatus.IN_PROGRESS],
  "completed": [TaskStatus.DONE],
};

// Reverse map: status to column
const statusToColumn = (status: TaskStatus): string => {
  for (const [column, statuses] of Object.entries(columnStatusMap)) {
    if (statuses.includes(status)) {
      return column;
    }
  }
  return "new-task"; // fallback
};

// Map column to target status when dropping
const columnToStatus = (column: string): TaskStatus => {
  const statuses = columnStatusMap[column];
  return statuses[0] || TaskStatus.TODO;
};

const boards: string[] = ["new-task", "scheduled", "in-progress", "completed"];

type ColumnTasks = {
  [column: string]: Task[];
};

interface DataKanbanProps {
  data: Task[];
  onChange: (tasks: { $id: string; status: TaskStatus; position: number; }[]) => void;
}

export const DataKanban = ({ data, onChange }: DataKanbanProps) => {
  const [tasks, setTasks] = useState<ColumnTasks>(() => {
    const initialTasks: ColumnTasks = {
      "new-task": [],
      "scheduled": [],
      "in-progress": [],
      "completed": [],
    };

    data.forEach((task) => {
      const column = statusToColumn(task.status);
      if (initialTasks[column]) {
        initialTasks[column].push(task);
      }
    });

    Object.keys(initialTasks).forEach((column) => {
      initialTasks[column].sort((a, b) => a.position - b.position);
    });

    return initialTasks;
  });

  useEffect(() => {
    const newTasks: ColumnTasks = {
      "new-task": [],
      "scheduled": [],
      "in-progress": [],
      "completed": [],
    };

    data.forEach((task) => {
      const column = statusToColumn(task.status);
      if (newTasks[column]) {
        newTasks[column].push(task);
      }
    });

    Object.keys(newTasks).forEach((column) => {
      newTasks[column].sort((a, b) => a.position - b.position);
    });

    setTasks(newTasks);
  }, [data]);

  const onDragEnd = useCallback((result: DropResult) => {
    if (!result.destination) return;

    const { source, destination } = result;
    const sourceColumn = source.droppableId;
    const destColumn = destination.droppableId;

    const updatesPayload: { $id: string; status: TaskStatus; position: number; }[] = [];

    setTasks((prevTasks) => {
      const newTasks = { ...prevTasks };

      const sourceTasks = [...newTasks[sourceColumn]];
      const [movedTask] = sourceTasks.splice(source.index, 1);

      if (!movedTask) {
        console.error("No task found at source index");
        return prevTasks;
      }

      // Determine new status based on destination column
      const newStatus = columnToStatus(destColumn);
      const updatedMovedTask = { ...movedTask, status: newStatus };

      // Update the source column
      newTasks[sourceColumn] = sourceTasks;

      // Add the task to the destination column
      const destTasks = [...newTasks[destColumn]];
      destTasks.splice(destination.index, 0, updatedMovedTask);
      newTasks[destColumn] = destTasks;

      // Always update the moved task
      updatesPayload.push({
        $id: updatedMovedTask.$id,
        status: newStatus,
        position: Math.min((destination.index + 1) * 1000, 1_000_000)
      });

      // Update positions for affected tasks in the destination column
      newTasks[destColumn].forEach((task, index) => {
        if (task && task.$id !== updatedMovedTask.$id) {
          const newPosition = Math.min((index + 1) * 1000, 1_000_000);
          if (task.position !== newPosition) {
            updatesPayload.push({
              $id: task.$id,
              status: task.status,
              position: newPosition
            });
          }
        }
      });

      // If the task moved between columns, update positions in the source column
      if (sourceColumn !== destColumn) {
        newTasks[sourceColumn].forEach((task, index) => {
          if (task) {
            const newPosition = Math.min((index + 1) * 1000, 1_000_000);
            if (task.position !== newPosition) {
              updatesPayload.push({
                $id: task.$id,
                status: task.status,
                position: newPosition,
              });
            }
          }
        });
      }

      return newTasks;
    });

    onChange(updatesPayload);
  }, [onChange]);

  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <div className="flex overflow-x-auto gap-4 pb-4 min-w-0">
        {boards.map((board) => {
          const columnTasks = tasks[board] || [];
          return (
            <div
              key={board}
              className="flex-1 bg-muted p-1.5 rounded-md min-w-[200px]"
            >
              <KanbanColumnHeader
                board={board}
                taskCount={columnTasks.length}
              />
              <Droppable droppableId={board}>
                {(provided) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className="min-h-[200px] py-1.5"
                  >
                    {columnTasks.length === 0 ? (
                      <div className="text-center py-8 text-sm text-muted-foreground">
                        No tasks
                      </div>
                    ) : (
                      columnTasks.map((task, index) => (
                        <Draggable key={task.$id} draggableId={task.$id} index={index}>
                          {(provided) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                            >
                              <KanbanCard task={task} />
                            </div>
                          )}
                        </Draggable>
                      ))
                    )}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </div>
          );
        })}
      </div>
    </DragDropContext>
  );
};
