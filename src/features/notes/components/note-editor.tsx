"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import { Bold, Italic, List, ListOrdered, Quote, Code, Heading1, Heading2, Heading3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useEffect, useCallback } from "react";
import { formatDistanceToNow } from "date-fns";

interface NoteEditorProps {
  noteId: string | null;
  content: string;
  title: string;
  lastEditedAt?: string;
  onSave: (content: string) => void;
  onTitleChange?: (title: string) => void;
  isSaving?: boolean;
}

export const NoteEditor = ({
  noteId,
  content,
  title,
  lastEditedAt,
  onSave,
  onTitleChange,
  isSaving = false,
}: NoteEditorProps) => {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({
        placeholder: "Start writing...",
      }),
    ],
    content,
    onUpdate: ({ editor }) => {
      // Auto-save is handled by parent component with debouncing
    },
    editorProps: {
      attributes: {
        class: "focus:outline-none min-h-[500px] px-4 py-8 text-base",
      },
    },
  });

  // Update editor content when content prop changes
  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      editor.commands.setContent(content);
    }
  }, [content, editor]);

  // Handle save with debouncing in parent
  useEffect(() => {
    if (!editor || !noteId) return;

    let timeoutId: NodeJS.Timeout;
    const handleUpdate = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        const html = editor.getHTML();
        onSave(html);
      }, 2000); // 2 second debounce
    };

    editor.on("update", handleUpdate);

    return () => {
      clearTimeout(timeoutId);
      editor.off("update", handleUpdate);
    };
  }, [editor, noteId, onSave]);

  const toggleBold = useCallback(() => {
    editor?.chain().focus().toggleBold().run();
  }, [editor]);

  const toggleItalic = useCallback(() => {
    editor?.chain().focus().toggleItalic().run();
  }, [editor]);

  const toggleHeading1 = useCallback(() => {
    editor?.chain().focus().toggleHeading({ level: 1 }).run();
  }, [editor]);

  const toggleHeading2 = useCallback(() => {
    editor?.chain().focus().toggleHeading({ level: 2 }).run();
  }, [editor]);

  const toggleHeading3 = useCallback(() => {
    editor?.chain().focus().toggleHeading({ level: 3 }).run();
  }, [editor]);

  const toggleBulletList = useCallback(() => {
    editor?.chain().focus().toggleBulletList().run();
  }, [editor]);

  const toggleOrderedList = useCallback(() => {
    editor?.chain().focus().toggleOrderedList().run();
  }, [editor]);

  const toggleBlockquote = useCallback(() => {
    editor?.chain().focus().toggleBlockquote().run();
  }, [editor]);

  const toggleCode = useCallback(() => {
    editor?.chain().focus().toggleCode().run();
  }, [editor]);

  if (!editor) {
    return null;
  }

  const isBold = editor.isActive("bold");
  const isItalic = editor.isActive("italic");
  const isHeading1 = editor.isActive("heading", { level: 1 });
  const isHeading2 = editor.isActive("heading", { level: 2 });
  const isHeading3 = editor.isActive("heading", { level: 3 });
  const isBulletList = editor.isActive("bulletList");
  const isOrderedList = editor.isActive("orderedList");
  const isBlockquote = editor.isActive("blockquote");
  const isCode = editor.isActive("code");

  return (
    <div className="h-full flex flex-col">
      {/* Title Input */}
      <div className="border-b p-4">
        <input
          type="text"
          value={title}
          onChange={(e) => onTitleChange?.(e.target.value)}
          placeholder="Untitled"
          className="w-full text-2xl font-bold bg-transparent border-none outline-none placeholder:text-muted-foreground"
          disabled={!noteId}
        />
        {lastEditedAt && (
          <p className="text-xs text-muted-foreground mt-1">
            Last edited {formatDistanceToNow(new Date(lastEditedAt), { addSuffix: true })}
          </p>
        )}
      </div>

      {/* Toolbar */}
      <div className="border-b p-2 flex items-center gap-1 flex-wrap bg-gray-50">
        <Button
          variant={isBold ? "secondary" : "ghost"}
          size="sm"
          onClick={toggleBold}
          className="h-8 w-8 p-0"
          disabled={!noteId}
        >
          <Bold className="size-4" />
        </Button>
        <Button
          variant={isItalic ? "secondary" : "ghost"}
          size="sm"
          onClick={toggleItalic}
          className="h-8 w-8 p-0"
          disabled={!noteId}
        >
          <Italic className="size-4" />
        </Button>
        <div className="w-px h-6 bg-border mx-1" />
        <Button
          variant={isHeading1 ? "secondary" : "ghost"}
          size="sm"
          onClick={toggleHeading1}
          className="h-8 w-8 p-0"
          disabled={!noteId}
        >
          <Heading1 className="size-4" />
        </Button>
        <Button
          variant={isHeading2 ? "secondary" : "ghost"}
          size="sm"
          onClick={toggleHeading2}
          className="h-8 w-8 p-0"
          disabled={!noteId}
        >
          <Heading2 className="size-4" />
        </Button>
        <Button
          variant={isHeading3 ? "secondary" : "ghost"}
          size="sm"
          onClick={toggleHeading3}
          className="h-8 w-8 p-0"
          disabled={!noteId}
        >
          <Heading3 className="size-4" />
        </Button>
        <div className="w-px h-6 bg-border mx-1" />
        <Button
          variant={isBulletList ? "secondary" : "ghost"}
          size="sm"
          onClick={toggleBulletList}
          className="h-8 w-8 p-0"
          disabled={!noteId}
        >
          <List className="size-4" />
        </Button>
        <Button
          variant={isOrderedList ? "secondary" : "ghost"}
          size="sm"
          onClick={toggleOrderedList}
          className="h-8 w-8 p-0"
          disabled={!noteId}
        >
          <ListOrdered className="size-4" />
        </Button>
        <Button
          variant={isBlockquote ? "secondary" : "ghost"}
          size="sm"
          onClick={toggleBlockquote}
          className="h-8 w-8 p-0"
          disabled={!noteId}
        >
          <Quote className="size-4" />
        </Button>
        <Button
          variant={isCode ? "secondary" : "ghost"}
          size="sm"
          onClick={toggleCode}
          className="h-8 w-8 p-0"
          disabled={!noteId}
        >
          <Code className="size-4" />
        </Button>
        <div className="ml-auto flex items-center gap-2">
          {isSaving ? (
            <span className="text-xs text-muted-foreground">Saving...</span>
          ) : (
            <span className="text-xs text-muted-foreground">Saved</span>
          )}
        </div>
      </div>

      {/* Editor Content */}
      <div className="flex-1 overflow-y-auto">
        <EditorContent editor={editor} />
      </div>
    </div>
  );
};

