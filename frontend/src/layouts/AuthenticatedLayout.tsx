import AppShell from "#layouts/AppShell";
import React, { Suspense } from "react";
import { Outlet } from "react-router-dom";

/**
 * Suspense живе всередині AppShell, щоб при переході на ще не завантажену
 * lazy-сторінку шапка з навігацією лишалася на місці, а «перемальовувався»
 * тільки контент.
 */
const ContentLoader: React.FC = () => (
  <div className="flex min-h-[45dvh] flex-col items-center justify-center gap-4 text-ink-soft">
    <span
      className="logo-mask h-9 w-10 animate-pulse text-brand"
      aria-hidden="true"
    />
    <p className="text-sm tracking-[0.08em]">Завантаження…</p>
  </div>
);

const AuthenticatedLayout: React.FC = () => (
  <AppShell>
    <Suspense fallback={<ContentLoader />}>
      <Outlet />
    </Suspense>
  </AppShell>
);

export default AuthenticatedLayout;
