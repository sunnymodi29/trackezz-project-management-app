"use client";

import { useEffect, useRef } from "react";
import { useEditor, EditorContent, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import Link from "@tiptap/extension-link";
import {
  Bold,
  Italic,
  List,
  ListOrdered,
  Heading2,
  Link2,
  Undo2,
  Redo2,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface RichTextEditorProps {
  value?: string;
  onChange?: (html: string) => void;
  placeholder?: string;
  className?: string;
  editorClassName?: string;
  minHeight?: string;
  editable?: boolean;
  /** Smaller toolbar and padding for comments. */
  variant?: "default" | "compact";
  /** Hide outer border — use when nested inside another bordered container. */
  borderless?: boolean;
  /** Ctrl/Cmd+Enter shortcut. */
  onCtrlEnter?: () => void;
  editorRef?: React.MutableRefObject<Editor | null>;
}

function ToolbarButton({
  onClick,
  active,
  disabled,
  title,
  children,
}: {
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "rounded p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:opacity-40",
        active && "bg-accent text-foreground",
      )}
    >
      {children}
    </button>
  );
}

export function RichTextEditor({
  value = "",
  onChange,
  placeholder = "Write something…",
  className,
  editorClassName,
  minHeight = "100px",
  editable = true,
  variant = "default",
  borderless = false,
  onCtrlEnter,
  editorRef,
}: RichTextEditorProps) {
  const onCtrlEnterRef = useRef(onCtrlEnter);
  onCtrlEnterRef.current = onCtrlEnter;

  const editor = useEditor({
    immediatelyRender: false,
    editable,
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
      }),
      Placeholder.configure({ placeholder }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: { class: "rich-text-link" },
      }),
    ],
    content: value,
    editorProps: {
      attributes: {
        class: cn("tiptap prose-tf", editorClassName),
        style: `--rte-min-height: ${minHeight}`,
      },
      handleKeyDown: (_view, event) => {
        if (
          (event.metaKey || event.ctrlKey) &&
          event.key === "Enter" &&
          onCtrlEnterRef.current
        ) {
          event.preventDefault();
          onCtrlEnterRef.current();
          return true;
        }
        return false;
      },
    },
    onUpdate: ({ editor: ed }) => {
      onChange?.(ed.getHTML());
    },
  });

  useEffect(() => {
    if (editorRef) editorRef.current = editor;
  }, [editor, editorRef]);

  useEffect(() => {
    if (!editor) return;
    const current = editor.getHTML();
    if (value !== current) {
      editor.commands.setContent(value, { emitUpdate: false });
    }
  }, [editor, value]);

  useEffect(() => {
    if (!editor) return;
    editor.setEditable(editable);
  }, [editor, editable]);

  const setLink = () => {
    if (!editor) return;
    const previous = editor.getAttributes("link").href as string | undefined;
    const url = window.prompt("Link URL", previous ?? "https://");
    if (url === null) return;
    if (url === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
  };

  const compact = variant === "compact";

  return (
    <div
      className={cn(
        "rich-text-editor",
        !borderless &&
          "rounded-md border border-dashed border-border bg-muted/20 h-max",
        compact && "rich-text-editor--compact",
        className,
      )}
    >
      {editable && editor && (
        <div
          className={cn(
            "flex flex-wrap items-center gap-0.5 border-b border-border",
            compact ? "px-1.5 py-1" : "px-2 py-1.5",
          )}
        >
          <ToolbarButton
            title="Bold"
            onClick={() => editor.chain().focus().toggleBold().run()}
            active={editor.isActive("bold")}
          >
            <Bold className={cn(compact ? "h-3 w-3" : "h-3.5 w-3.5")} />
          </ToolbarButton>
          <ToolbarButton
            title="Italic"
            onClick={() => editor.chain().focus().toggleItalic().run()}
            active={editor.isActive("italic")}
          >
            <Italic className={cn(compact ? "h-3 w-3" : "h-3.5 w-3.5")} />
          </ToolbarButton>
          {!compact && (
            <ToolbarButton
              title="Heading"
              onClick={() =>
                editor.chain().focus().toggleHeading({ level: 2 }).run()
              }
              active={editor.isActive("heading", { level: 2 })}
            >
              <Heading2 className="h-3.5 w-3.5" />
            </ToolbarButton>
          )}
          <ToolbarButton
            title="Bullet list"
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            active={editor.isActive("bulletList")}
          >
            <List className={cn(compact ? "h-3 w-3" : "h-3.5 w-3.5")} />
          </ToolbarButton>
          <ToolbarButton
            title="Numbered list"
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            active={editor.isActive("orderedList")}
          >
            <ListOrdered className={cn(compact ? "h-3 w-3" : "h-3.5 w-3.5")} />
          </ToolbarButton>
          <ToolbarButton
            title="Link"
            onClick={setLink}
            active={editor.isActive("link")}
          >
            <Link2 className={cn(compact ? "h-3 w-3" : "h-3.5 w-3.5")} />
          </ToolbarButton>
          {!compact && (
            <>
              <div className="mx-1 h-4 w-px bg-border" />
              <ToolbarButton
                title="Undo"
                onClick={() => editor.chain().focus().undo().run()}
                disabled={!editor.can().undo()}
              >
                <Undo2 className="h-3.5 w-3.5" />
              </ToolbarButton>
              <ToolbarButton
                title="Redo"
                onClick={() => editor.chain().focus().redo().run()}
                disabled={!editor.can().redo()}
              >
                <Redo2 className="h-3.5 w-3.5" />
              </ToolbarButton>
            </>
          )}
        </div>
      )}
      <EditorContent
        editor={editor}
        className={cn(
          "text-sm overflow-y-auto max-h-[62vh]",
          compact ? "px-2 py-1.5" : "px-3 py-2",
        )}
      />
    </div>
  );
}
