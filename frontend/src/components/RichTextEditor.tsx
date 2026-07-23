import { type Editor, EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { useEffect } from "react";
import { Markdown } from "tiptap-markdown";

interface Props {
  value: string;
  onChange: (markdown: string) => void;
}

interface ToolbarButton {
  label: string;
  title: string;
  group: number;
  isActive: (editor: Editor) => boolean;
  run: (editor: Editor) => void;
  className?: string;
}

const toolbarButtons: ToolbarButton[] = [
  {
    label: "Ж",
    title: "Жирний",
    group: 1,
    isActive: (editor) => editor.isActive("bold"),
    run: (editor) => editor.chain().focus().toggleBold().run(),
    className: "font-bold",
  },
  {
    label: "К",
    title: "Курсив",
    group: 1,
    isActive: (editor) => editor.isActive("italic"),
    run: (editor) => editor.chain().focus().toggleItalic().run(),
    className: "italic",
  },
  {
    label: "С",
    title: "Закреслений",
    group: 1,
    isActive: (editor) => editor.isActive("strike"),
    run: (editor) => editor.chain().focus().toggleStrike().run(),
    className: "line-through",
  },
  {
    label: "H1",
    title: "Заголовок 1",
    group: 2,
    isActive: (editor) => editor.isActive("heading", { level: 1 }),
    run: (editor) => editor.chain().focus().toggleHeading({ level: 1 }).run(),
  },
  {
    label: "H2",
    title: "Заголовок 2",
    group: 2,
    isActive: (editor) => editor.isActive("heading", { level: 2 }),
    run: (editor) => editor.chain().focus().toggleHeading({ level: 2 }).run(),
  },
  {
    label: "H3",
    title: "Заголовок 3",
    group: 2,
    isActive: (editor) => editor.isActive("heading", { level: 3 }),
    run: (editor) => editor.chain().focus().toggleHeading({ level: 3 }).run(),
  },
  {
    label: "☰ UL",
    title: "Маркований список",
    group: 3,
    isActive: (editor) => editor.isActive("bulletList"),
    run: (editor) => editor.chain().focus().toggleBulletList().run(),
  },
  {
    label: "☰ OL",
    title: "Нумерований список",
    group: 3,
    isActive: (editor) => editor.isActive("orderedList"),
    run: (editor) => editor.chain().focus().toggleOrderedList().run(),
  },
  {
    label: "❝❞",
    title: "Цитата",
    group: 4,
    isActive: (editor) => editor.isActive("blockquote"),
    run: (editor) => editor.chain().focus().toggleBlockquote().run(),
  },
  {
    label: "</>",
    title: "Код",
    group: 4,
    isActive: (editor) => editor.isActive("code"),
    run: (editor) => editor.chain().focus().toggleCode().run(),
  },
  {
    label: "{ }",
    title: "Блок коду",
    group: 4,
    isActive: (editor) => editor.isActive("codeBlock"),
    run: (editor) => editor.chain().focus().toggleCodeBlock().run(),
  },
  {
    label: "—",
    title: "Горизонтальна лінія",
    group: 4,
    isActive: () => false,
    run: (editor) => editor.chain().focus().setHorizontalRule().run(),
  },
  {
    label: "🔗",
    title: "Посилання",
    group: 5,
    isActive: (editor) => editor.isActive("link"),
    run: (editor) => {
      const previousUrl = editor.getAttributes("link").href as
        | string
        | undefined;
      const url = window.prompt("URL посилання", previousUrl ?? "");

      if (url === null) {
        return;
      }

      if (url === "") {
        editor.chain().focus().extendMarkRange("link").unsetLink().run();
        return;
      }

      editor
        .chain()
        .focus()
        .extendMarkRange("link")
        .setLink({ href: url })
        .run();
    },
  },
  {
    label: "↺",
    title: "Скасувати",
    group: 6,
    isActive: () => false,
    run: (editor) => editor.chain().focus().undo().run(),
  },
  {
    label: "↻",
    title: "Повторити",
    group: 6,
    isActive: () => false,
    run: (editor) => editor.chain().focus().redo().run(),
  },
];

const RichTextEditor: React.FC<Props> = ({ value, onChange }) => {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({ underline: false }),
      Markdown.configure({ html: false, breaks: true }),
    ],
    content: value,
    onUpdate: ({ editor }) => {
      onChange(editor.storage.markdown.getMarkdown());
    },
    editorProps: {
      attributes: {
        class:
          "rich-content min-h-[100px] px-3 py-2 leading-relaxed focus:outline-none",
      },
    },
  });

  useEffect(() => {
    if (!editor) {
      return;
    }

    const current = editor.storage.markdown.getMarkdown();
    if (current !== value) {
      editor.commands.setContent(value, { emitUpdate: false });
    }
  }, [value, editor]);

  if (!editor) {
    return null;
  }

  return (
    <div className="w-full flex-1 overflow-hidden rounded-xl border border-line-strong bg-surface focus-within:ring-1 focus-within:ring-brand">
      <div className="flex flex-wrap items-center gap-1 border-b border-line bg-surface-2 p-1.5">
        {toolbarButtons.map((button, index) => (
          <span key={button.title} className="flex items-center gap-1">
            {index > 0 && toolbarButtons[index - 1].group !== button.group && (
              <span className="mx-0.5 h-5 w-px bg-line-strong" />
            )}
            <button
              type="button"
              title={button.title}
              onClick={() => button.run(editor)}
              className={`rounded border px-2 py-1 text-xs whitespace-nowrap transition-all ${
                button.className ?? ""
              } ${
                button.isActive(editor)
                  ? "border-brand bg-brand text-paper"
                  : "border-line-strong bg-surface text-ink-soft hover:bg-brand-soft"
              }`}
            >
              {button.label}
            </button>
          </span>
        ))}
      </div>
      <EditorContent editor={editor} className="bg-surface text-ink" />
    </div>
  );
};

export default RichTextEditor;
