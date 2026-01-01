"use client";

import { useState, useCallback, useEffect } from "react";
import { useWorkspaceId } from "@/features/workspaces/hooks/use-workspace-id";
import { useGetNotes } from "@/features/notes/api/use-get-notes";
import { useCreateNote } from "@/features/notes/api/use-create-note";
import { useUpdateNote } from "@/features/notes/api/use-update-note";
import { useDeleteNote } from "@/features/notes/api/use-delete-note";
import { NotesSidebar } from "@/features/notes/components/notes-sidebar";
import { NoteEditor } from "@/features/notes/components/note-editor";
import { Note } from "@/features/notes/types";

export const NotesClient = () => {
  const workspaceId = useWorkspaceId();
  const { data: notes = [], isLoading } = useGetNotes({ workspaceId });
  const createNote = useCreateNote();
  const updateNote = useUpdateNote();
  const deleteNote = useDeleteNote();

  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const [currentNote, setCurrentNote] = useState<Note | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveTimeoutId, setSaveTimeoutId] = useState<NodeJS.Timeout | null>(null);

  // Set first note as selected when notes load
  useEffect(() => {
    if (notes.length > 0 && !selectedNoteId) {
      setSelectedNoteId(notes[0].$id);
      setCurrentNote(notes[0]);
    }
  }, [notes, selectedNoteId]);

  // Update current note when selected note changes
  useEffect(() => {
    if (selectedNoteId) {
      const note = notes.find((n) => n.$id === selectedNoteId);
      if (note) {
        setCurrentNote(note);
      }
    } else {
      setCurrentNote(null);
    }
  }, [selectedNoteId, notes]);

  const handleCreateNote = useCallback(() => {
    createNote.mutate(
      {
        json: {
          title: "Untitled",
          content: "",
          workspaceId,
        },
      },
      {
        onSuccess: (response) => {
          const note = "data" in response ? response.data : response;
          setSelectedNoteId(note.$id);
          setCurrentNote(note);
        },
      }
    );
  }, [createNote, workspaceId]);

  const handleSelectNote = useCallback((noteId: string) => {
    setSelectedNoteId(noteId);
  }, []);

  const handleDeleteNote = useCallback(
    (noteId: string) => {
      deleteNote.mutate(
        {
          param: { noteId },
        },
        {
          onSuccess: () => {
            if (selectedNoteId === noteId) {
              // Select another note or clear selection
              const remainingNotes = notes.filter((n) => n.$id !== noteId);
              if (remainingNotes.length > 0) {
                setSelectedNoteId(remainingNotes[0].$id);
                setCurrentNote(remainingNotes[0]);
              } else {
                setSelectedNoteId(null);
                setCurrentNote(null);
              }
            }
          },
        }
      );
    },
    [deleteNote, notes, selectedNoteId]
  );

  const handleSaveContent = useCallback(
    (content: string) => {
      if (!selectedNoteId || !currentNote) return;

      // Clear existing timeout
      if (saveTimeoutId) {
        clearTimeout(saveTimeoutId);
      }

      setIsSaving(true);

      // Set new timeout for debounced save
      const timeoutId = setTimeout(() => {
        updateNote.mutate(
          {
            json: { content },
            param: { noteId: selectedNoteId },
          },
          {
            onSuccess: (response) => {
              if ("data" in response) {
                setCurrentNote(response.data);
              }
              setIsSaving(false);
            },
            onError: () => {
              setIsSaving(false);
            },
          }
        );
      }, 100); // Small delay to batch rapid changes

      setSaveTimeoutId(timeoutId);
    },
    [selectedNoteId, currentNote, updateNote, saveTimeoutId]
  );

  const handleTitleChange = useCallback(
    (title: string) => {
      if (!selectedNoteId || !currentNote) return;

      // Update local state immediately
      setCurrentNote({ ...currentNote, title });

      // Debounce the API call
      if (saveTimeoutId) {
        clearTimeout(saveTimeoutId);
      }

      const timeoutId = setTimeout(() => {
        updateNote.mutate(
          {
            json: { title },
            param: { noteId: selectedNoteId },
          },
          {
            onSuccess: (response) => {
              if ("data" in response) {
                setCurrentNote(response.data);
              }
            },
          }
        );
      }, 500);

      setSaveTimeoutId(timeoutId);
    },
    [selectedNoteId, currentNote, updateNote, saveTimeoutId]
  );

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutId) {
        clearTimeout(saveTimeoutId);
      }
    };
  }, [saveTimeoutId]);

  return (
    <div className="h-full flex">
      <NotesSidebar
        notes={notes}
        selectedNoteId={selectedNoteId}
        onSelectNote={handleSelectNote}
        onCreateNote={handleCreateNote}
        onDeleteNote={handleDeleteNote}
        isLoading={isLoading}
      />
      <div className="flex-1 flex flex-col bg-white">
        {currentNote ? (
          <NoteEditor
            noteId={currentNote.$id}
            content={currentNote.content}
            title={currentNote.title}
            lastEditedAt={currentNote.lastEditedAt}
            onSave={handleSaveContent}
            onTitleChange={handleTitleChange}
            isSaving={isSaving}
          />
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <h2 className="text-2xl font-semibold mb-2">No note selected</h2>
              <p className="text-muted-foreground mb-4">
                Select a note from the sidebar or create a new one to get started
              </p>
              <button
                onClick={handleCreateNote}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                Create new note
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
