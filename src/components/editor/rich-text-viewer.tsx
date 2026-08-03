"use client"

import Highlight from "@tiptap/extension-highlight"
import Image from "@tiptap/extension-image"
import Link from "@tiptap/extension-link"
import Subscript from "@tiptap/extension-subscript"
import Superscript from "@tiptap/extension-superscript"
import { Table } from "@tiptap/extension-table"
import TableCell from "@tiptap/extension-table-cell"
import TableHeader from "@tiptap/extension-table-header"
import TableRow from "@tiptap/extension-table-row"
import TaskItem from "@tiptap/extension-task-item"
import TaskList from "@tiptap/extension-task-list"
import Underline from "@tiptap/extension-underline"
import { EditorContent, useEditor } from "@tiptap/react"
import StarterKit from "@tiptap/starter-kit"
import { useEffect } from "react"

interface RichTextViewerProps {
  content: string
  className?: string
}

export function RichTextViewer({ content, className = "" }: RichTextViewerProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        link: false,
        underline: false,
      }),
      Underline,
      Subscript,
      Superscript,
      Highlight,
      TaskList,
      TaskItem.configure({
        nested: true,
      }),
      Table.configure({
        resizable: true,
      }),
      TableRow,
      TableHeader,
      TableCell,
      Image,
      Link.configure({
        openOnClick: true,
        autolink: true,
        defaultProtocol: "https",
      }),
    ],
    content,
    editable: false,
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class: [
          "prose prose-sm sm:prose-base lg:prose-lg xl:prose-xl prose-gray dark:prose-invert",
          "focus:outline-none max-w-none",
          "prose-headings:scroll-mt-[80px] prose-headings:font-semibold",
          "prose-blockquote:border-l-primary prose-blockquote:border-l-4",
          "prose-code:bg-muted prose-code:px-1 prose-code:py-0.5 prose-code:rounded",
          "prose-pre:bg-muted prose-pre:border prose-pre:border-border",
          "prose-table:border-collapse prose-th:border prose-th:border-border prose-th:bg-muted prose-th:p-2",
          "prose-td:border prose-td:border-border prose-td:p-2",
          "prose-ul:list-disc prose-ol:list-decimal",
          "prose-li[data-type='taskItem']:list-none prose-li[data-type='taskItem']:flex prose-li[data-type='taskItem']:items-start prose-li[data-type='taskItem']:gap-2",
          className,
        ]
          .filter(Boolean)
          .join(" "),
      },
    },
  })

  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      editor.commands.setContent(content)
    }
  }, [editor, content])

  if (!editor) {
    return (
      <div
        role="status"
        aria-live="polite"
        className="min-h-[200px] flex items-center justify-center text-muted-foreground"
      >
        Carregando…
      </div>
    )
  }

  return (
    <div className={`rich-text-viewer ${className}`}>
      <EditorContent editor={editor} />
    </div>
  )
}
