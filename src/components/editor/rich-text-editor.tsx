"use client"

import { EditorContent, useEditor } from "@tiptap/react"
import {
  Bold,
  CheckSquare,
  Code,
  Heading1,
  Heading2,
  Heading3,
  Highlighter as HighlightIcon,
  Image as ImageIcon,
  Italic,
  Link2,
  List,
  ListOrdered,
  Quote,
  Redo,
  Strikethrough,
  Subscript as SubscriptIcon,
  Superscript as SuperscriptIcon,
  Table as TableIcon,
  Underline as UnderlineIcon,
  Undo,
} from "lucide-react"
import { useCallback, useEffect } from "react"
import { Button } from "@/src/components/ui/button"
import { promptDialog } from "@/src/components/ui/prompt-dialog"
import { Separator } from "@/src/components/ui/separator"
import { createTipTapExtensions } from "@/src/lib/constants/tiptap-config"

interface RichTextEditorProps {
  content: string
  onChange: (content: string) => void
  placeholder?: string
  editable?: boolean
  className?: string
}

const MenuBar = ({ editor }: { editor: any }) => {
  const addLink = useCallback(async () => {
    if (!editor) return

    const previousUrl = editor.getAttributes("link").href
    const url = await promptDialog({
      title: "Adicionar Link",
      description: "Digite a URL do link:",
      placeholder: "https://exemplo.com",
      defaultValue: previousUrl || "",
      confirmText: "Adicionar",
      cancelText: "Cancelar",
      onConfirm: () => {},
    })

    // cancelled
    if (url === null) {
      return
    }

    // empty
    if (url === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run()
      return
    }

    // update link
    editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run()
  }, [editor])

  const addImage = useCallback(async () => {
    if (!editor) return

    const url = await promptDialog({
      title: "Adicionar Imagem",
      description: "Digite a URL da imagem:",
      placeholder: "https://exemplo.com/imagem.jpg",
      confirmText: "Adicionar",
      cancelText: "Cancelar",
      onConfirm: () => {},
    })

    if (url) {
      editor.chain().focus().setImage({ src: url }).run()
    }
  }, [editor])

  const insertTable = useCallback(() => {
    if (!editor) return

    editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()
  }, [editor])

  if (!editor) {
    return null
  }

  return (
    <div className="border-b p-2 flex flex-wrap gap-1 bg-muted/20">
      {/* Text Formatting */}
      <Button
        variant={editor.isActive("bold") ? "default" : "ghost"}
        size="sm"
        onClick={() => editor.chain().focus().toggleBold().run()}
        title="Negrito (Ctrl+B)"
      >
        <Bold className="size-4" />
      </Button>

      <Button
        variant={editor.isActive("italic") ? "default" : "ghost"}
        size="sm"
        onClick={() => editor.chain().focus().toggleItalic().run()}
        title="Itálico (Ctrl+I)"
      >
        <Italic className="size-4" />
      </Button>

      <Button
        variant={editor.isActive("underline") ? "default" : "ghost"}
        size="sm"
        onClick={() => editor.chain().focus().toggleUnderline().run()}
        title="Sublinhado (Ctrl+U)"
      >
        <UnderlineIcon className="size-4" />
      </Button>

      <Button
        variant={editor.isActive("strike") ? "default" : "ghost"}
        size="sm"
        onClick={() => editor.chain().focus().toggleStrike().run()}
        title="Riscado"
      >
        <Strikethrough className="size-4" />
      </Button>

      <Button
        variant={editor.isActive("highlight") ? "default" : "ghost"}
        size="sm"
        onClick={() => editor.chain().focus().toggleHighlight().run()}
        title="Destacar"
      >
        <HighlightIcon className="size-4" />
      </Button>

      <Button
        variant={editor.isActive("code") ? "default" : "ghost"}
        size="sm"
        onClick={() => editor.chain().focus().toggleCode().run()}
        title="Código inline"
      >
        <Code className="size-4" />
      </Button>

      <Button
        variant={editor.isActive("subscript") ? "default" : "ghost"}
        size="sm"
        onClick={() => editor.chain().focus().toggleSubscript().run()}
        title="Subscrito"
      >
        <SubscriptIcon className="size-4" />
      </Button>

      <Button
        variant={editor.isActive("superscript") ? "default" : "ghost"}
        size="sm"
        onClick={() => editor.chain().focus().toggleSuperscript().run()}
        title="Sobrescrito"
      >
        <SuperscriptIcon className="size-4" />
      </Button>

      <Separator orientation="vertical" className="h-8 mx-1" />

      {/* Headings */}
      <Button
        variant={editor.isActive("heading", { level: 1 }) ? "default" : "ghost"}
        size="sm"
        onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
        title="Título 1"
      >
        <Heading1 className="size-4" />
      </Button>

      <Button
        variant={editor.isActive("heading", { level: 2 }) ? "default" : "ghost"}
        size="sm"
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        title="Título 2"
      >
        <Heading2 className="size-4" />
      </Button>

      <Button
        variant={editor.isActive("heading", { level: 3 }) ? "default" : "ghost"}
        size="sm"
        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        title="Título 3"
      >
        <Heading3 className="size-4" />
      </Button>

      <Separator orientation="vertical" className="h-8 mx-1" />

      {/* Lists */}
      <Button
        variant={editor.isActive("bulletList") ? "default" : "ghost"}
        size="sm"
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        title="Lista com marcadores"
      >
        <List className="size-4" />
      </Button>

      <Button
        variant={editor.isActive("orderedList") ? "default" : "ghost"}
        size="sm"
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        title="Lista numerada"
      >
        <ListOrdered className="size-4" />
      </Button>

      <Button
        variant={editor.isActive("taskList") ? "default" : "ghost"}
        size="sm"
        onClick={() => editor.chain().focus().toggleTaskList().run()}
        title="Lista de tarefas"
      >
        <CheckSquare className="size-4" />
      </Button>

      <Separator orientation="vertical" className="h-8 mx-1" />

      {/* Block Elements */}
      <Button
        variant={editor.isActive("blockquote") ? "default" : "ghost"}
        size="sm"
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
        title="Citação"
      >
        <Quote className="size-4" />
      </Button>

      <Button variant="ghost" size="sm" onClick={addLink} title="Inserir link">
        <Link2 className="size-4" />
      </Button>

      <Button variant="ghost" size="sm" onClick={addImage} title="Inserir imagem">
        <ImageIcon className="size-4" />
      </Button>

      <Button variant="ghost" size="sm" onClick={insertTable} title="Inserir tabela">
        <TableIcon className="size-4" />
      </Button>

      <Separator orientation="vertical" className="h-8 mx-1" />

      {/* Undo/Redo */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => editor.chain().focus().undo().run()}
        disabled={!editor.can().chain().focus().undo().run()}
        title="Desfazer (Ctrl+Z)"
      >
        <Undo className="size-4" />
      </Button>

      <Button
        variant="ghost"
        size="sm"
        onClick={() => editor.chain().focus().redo().run()}
        disabled={!editor.can().chain().focus().redo().run()}
        title="Refazer (Ctrl+Y)"
      >
        <Redo className="size-4" />
      </Button>
    </div>
  )
}

export function RichTextEditor({
  content,
  onChange,
  placeholder = "Digite seu texto...",
  editable = true,
  className = "",
}: RichTextEditorProps) {
  const editor = useEditor({
    extensions: createTipTapExtensions({ placeholder, editable }),
    content,
    editable,
    immediatelyRender: false,
    onUpdate: ({ editor }) => {
      const html = editor.getHTML()
      onChange(html)
    },
    editorProps: {
      attributes: {
        class: `prose prose-sm sm:prose-base lg:prose-lg xl:prose-2xl mx-auto focus:outline-none ${className}`,
      },
      handlePaste: (_view, _event) => {
        // Allow default paste behavior
        return false
      },
    },
  })

  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      // FIX: Force clear editor when content is empty to prevent duplication
      if (content === "" || content === "<p></p>") {
        editor.commands.clearContent()
      } else {
        editor.commands.setContent(content)
      }
    }
  }, [content, editor])

  if (!editor) {
    return (
      <div className="border rounded-lg">
        <div className="h-10 bg-muted/20 border-b animate-pulse" />
        <div className="p-4 flex flex-col gap-2">
          <div className="h-4 bg-muted animate-pulse rounded" />
          <div className="h-4 bg-muted animate-pulse rounded w-3/4" />
          <div className="h-4 bg-muted animate-pulse rounded w-1/2" />
        </div>
      </div>
    )
  }

  return (
    <div className="border rounded-lg overflow-hidden bg-background flex flex-col">
      {/* Menu fixo - sempre visível */}
      {editable && (
        <div className="sticky top-0 z-10 bg-background">
          <MenuBar editor={editor} />
        </div>
      )}
      {/* Conteúdo do editor com scroll */}
      <div className="flex-1 overflow-y-auto min-h-50 max-h-[35vh] p-4">
        <EditorContent
          editor={editor}
          className="prose prose-sm sm:prose lg:prose-lg xl:prose-xl max-w-none
            prose-headings:text-foreground prose-p:text-foreground prose-strong:text-foreground
            prose-code:text-foreground prose-pre:bg-muted prose-pre:text-foreground
            prose-blockquote:text-muted-foreground prose-blockquote:border-l-border
            prose-li:text-foreground prose-a:text-primary prose-a:no-underline hover:prose-a:underline
            focus:outline-none"
        />
      </div>
    </div>
  )
}
