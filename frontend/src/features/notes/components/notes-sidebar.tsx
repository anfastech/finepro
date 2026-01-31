"use client";

import { useState, useMemo } from "react";
import { Plus, Search, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Note } from "../types";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";

interface NotesSidebarProps {
  notes: Note[];
  selectedNoteId: string | null;
  onSelectNote: (noteId: string) => void;
  onCreateNote: () => void;
  onDeleteNote: (noteId: string) => void;
  isLoading?: boolean;
}

export const NotesSidebar = ({
  notes,
  selectedNoteId,
  onSelectNote,
  onCreateNote,
  onDeleteNote,
  isLoading = false,
}: NotesSidebarProps) => {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredNotes = useMemo(() => {
    if (!searchQuery.trim()) return notes;
    const query = searchQuery.toLowerCase();
    return notes.filter(
      (note) =>
        note.title.toLowerCase().includes(query) ||
        note.content.toLowerCase().includes(query)
    );
  }, [notes, searchQuery]);

  const handleDelete = (e: React.MouseEvent, noteId: string) => {
    e.stopPropagation();
    if (confirm("Are you sure you want to delete this note?")) {
      onDeleteNote(noteId);
    }
  };

  return (
    <div className="w-80 border-r bg-gray-50 flex flex-col h-full">
      <div className="p-4 border-b">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Documents</h2>
          <Button size="sm" onClick={onCreateNote} className="h-8 w-8 p-0">
            <Plus className="size-4" />
          </Button>
        </div>
        <div className="relative">
          <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="Search notes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="p-4 text-center text-sm text-muted-foreground">
            Loading notes...
          </div>
        ) : filteredNotes.length === 0 ? (
          <div className="p-4 text-center">
            <p className="text-sm text-muted-foreground mb-4">
              {searchQuery ? "No notes match your search" : "No documents yet"}
            </p>
            {!searchQuery && (
              <Button size="sm" onClick={onCreateNote} variant="outline">
                <Plus className="size-4 mr-2" />
                Create your first note
              </Button>
            )}
          </div>
        ) : (
          <div className="divide-y">
            {filteredNotes.map((note) => (
              <div
                key={note.$id}
                className={cn(
                  "p-4 cursor-pointer hover:bg-gray-100 transition-colors group",
                  selectedNoteId === note.$id && "bg-blue-50 border-l-4 border-l-blue-600"
                )}
                onClick={() => onSelectNote(note.$id)}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-sm truncate mb-1">{note.title || "Untitled"}</h3>
                    <p className="text-xs text-muted-foreground">
                      {note.lastEditedAt
                        ? formatDistanceToNow(new Date(note.lastEditedAt), { addSuffix: true })
                        : "Just now"}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={(e) => handleDelete(e, note.$id)}
                  >
                    <Trash2 className="size-3 text-destructive" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

