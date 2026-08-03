import Highlight from "@tiptap/extension-highlight"
import Image from "@tiptap/extension-image"
import Link from "@tiptap/extension-link"
import Placeholder from "@tiptap/extension-placeholder"
import Subscript from "@tiptap/extension-subscript"
import Superscript from "@tiptap/extension-superscript"
import { Table } from "@tiptap/extension-table"
import TableCell from "@tiptap/extension-table-cell"
import TableHeader from "@tiptap/extension-table-header"
import TableRow from "@tiptap/extension-table-row"
import TaskItem from "@tiptap/extension-task-item"
import TaskList from "@tiptap/extension-task-list"
import Underline from "@tiptap/extension-underline"
import StarterKit from "@tiptap/starter-kit"

/**
 * Creates TipTap extensions configuration
 * Note: StarterKit v3 includes Link and Underline by default
 * We disable Link to use our custom configuration
 */
export function createTipTapExtensions(options: { placeholder?: string; editable?: boolean }) {
  const { placeholder = "Digite seu texto...", editable = true } = options

  return [
    StarterKit.configure({
      // Disable bundled mark extensions we override to avoid duplicate warnings
      link: false,
      underline: false,
    }),
    ...(editable
      ? [
          Placeholder.configure({
            placeholder,
          }),
        ]
      : []),
    Link.configure({
      openOnClick: !editable,
      autolink: !editable,
      defaultProtocol: editable ? undefined : "https",
      HTMLAttributes: {
        class: "text-primary underline decoration-primary hover:decoration-primary/80",
      },
    }),
    Underline,
    Image.configure({
      HTMLAttributes: {
        class: "max-w-full h-auto rounded-lg",
      },
    }),
    Table.configure({
      resizable: editable,
    }),
    TableRow,
    TableHeader,
    TableCell,
    TaskList,
    TaskItem.configure({
      nested: true,
    }),
    Highlight.configure({
      HTMLAttributes: {
        class: "bg-yellow-200 dark:bg-yellow-800 px-1 rounded",
      },
    }),
    Subscript,
    Superscript,
  ]
}

export const editorProps = {
  editor: {
    attributes: {
      class: "prose prose-sm sm:prose-base lg:prose-lg xl:prose-2xl mx-auto focus:outline-none",
    },
  },
  viewer: {
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
      ]
        .filter(Boolean)
        .join(" "),
    },
  },
}
