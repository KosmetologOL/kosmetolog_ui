import React from "react";

/**
 * Повноекранний брендований стан завантаження — для бутстрапа авторизації
 * (PrivateRoute) і Suspense-фолбеків роутера.
 */
const FullScreenLoader: React.FC<{ label?: string }> = ({
  label = "Завантаження…",
}) => (
  <div className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-paper font-brand text-ink-soft">
    <span className="logo-mask h-9 w-10 animate-pulse text-brand" aria-hidden="true" />
    <p className="text-sm tracking-[0.08em]">{label}</p>
  </div>
);

export default FullScreenLoader;
