import { useMemo } from "react";
import { markdownToHtml } from "#lib/markdown";

interface Props {
  markdown?: string;
  className?: string;
  fallback?: string;
  /** Рендерить span в один рядок з текстом навколо (валідний usage всередині button/li). */
  inline?: boolean;
}

const FormattedText: React.FC<Props> = ({
  markdown,
  className,
  fallback = "-",
  inline = false,
}) => {
  const html = useMemo(() => markdownToHtml(markdown || ""), [markdown]);

  const classes = `rich-content ${inline ? "rich-content-inline" : ""} ${className ?? ""}`;

  if (inline) {
    return (
      <span
        className={classes}
        dangerouslySetInnerHTML={{ __html: html || fallback }}
      />
    );
  }

  return (
    <div
      className={classes}
      dangerouslySetInnerHTML={{ __html: html || fallback }}
    />
  );
};

export default FormattedText;
