import React from "react";

/*
  Спільні іконки застосунку (замість inline-SVG копій у кожному файлі).
  Розмір задається className (w-4 h-4 тощо), колір іде від currentColor.
  Усі іконки декоративні (aria-hidden) — доступну назву дає кнопка/лейбл.
*/

type IconProps = React.SVGProps<SVGSVGElement>;

const strokeDefaults = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round",
  strokeLinejoin: "round",
} as const;

export const IconEdit: React.FC<IconProps> = ({
  className = "w-3.5 h-3.5",
  ...rest
}) => (
  <svg viewBox="0 0 24 24" className={className} aria-hidden="true" {...strokeDefaults} {...rest}>
    <path d="M12 20h9" />
    <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
  </svg>
);

export const IconClose: React.FC<IconProps> = ({
  className = "h-4.5 w-4.5",
  ...rest
}) => (
  <svg
    viewBox="0 0 24 24"
    className={className}
    aria-hidden="true"
    {...strokeDefaults}
    strokeWidth={2.2}
    {...rest}
  >
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

export const IconSearch: React.FC<IconProps> = ({
  className = "w-4.5 h-4.5",
  ...rest
}) => (
  <svg viewBox="0 0 24 24" className={className} aria-hidden="true" {...strokeDefaults} {...rest}>
    <circle cx="11" cy="11" r="7" />
    <path d="m20 20-3.8-3.8" />
  </svg>
);

export const IconPlus: React.FC<IconProps> = ({
  className = "w-4 h-4",
  ...rest
}) => (
  <svg viewBox="0 0 16 16" className={className} aria-hidden="true" {...strokeDefaults} {...rest}>
    <path d="M8 2v12M2 8h12" />
  </svg>
);
