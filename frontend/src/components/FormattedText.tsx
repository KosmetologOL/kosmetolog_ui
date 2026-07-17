import { useMemo } from "react";
import { markdownToHtml } from "#types/markdown";

interface Props {
  markdown?: string;
  className?: string;
  fallback?: string;
}

const FormattedText: React.FC<Props> = ({
  markdown,
  className,
  fallback = "-",
}) => {
  const html = useMemo(() => markdownToHtml(markdown || ""), [markdown]);

  return (
    <div
      className={`rich-content ${className ?? ""}`}
      dangerouslySetInnerHTML={{ __html: html || fallback }}
    />
  );
};

export default FormattedText;
