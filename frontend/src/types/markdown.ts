import { Editor } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import DOMPurify from "dompurify";
import { Markdown } from "tiptap-markdown";

export const markdownToHtml = (markdown: string): string => {
  if (!markdown.trim()) {
    return "";
  }

  const editor = new Editor({
    extensions: [
      StarterKit.configure({ underline: false }),
      Markdown.configure({ html: false, breaks: true }),
    ],
    content: markdown,
  });

  const html = editor.getHTML();
  editor.destroy();

  return DOMPurify.sanitize(html);
};
