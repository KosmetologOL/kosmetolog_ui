import logoMark from "#assets/logo-mark.png";
import { useAuth } from "#hooks/useAuth";
import React from "react";
import { NavLink, useLocation } from "react-router-dom";

const ROLE_LABELS: Record<string, string> = {
  admin: "Адміністратор",
  doctor: "Лікар",
  user: "Користувач",
};

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  `px-4 py-2 rounded-full text-[15px] transition-colors ${
    isActive
      ? "bg-brand-soft text-ink"
      : "text-ink-soft hover:bg-surface-2 hover:text-ink"
  }`;

const AppShell: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, canAccessReferencePanel, logout } = useAuth();
  const role = user?.role?.toLowerCase() ?? "user";
  const { pathname } = useLocation();
  const onPatients = pathname === "/" || pathname.startsWith("/patients");

  return (
    <div className="min-h-dvh flex flex-col bg-paper text-ink font-brand">
      <header className="bg-surface border-b border-line sticky top-0 z-20">
        <div className="max-w-[960px] mx-auto px-4 sm:px-6 h-[60px] sm:h-17 flex items-center gap-4 sm:gap-8">
          <div className="flex items-center gap-3 flex-none">
            <img src={logoMark} alt="Олійник косметологія" className="w-8 h-7 sm:w-9 sm:h-8" />
            <div className="hidden sm:flex flex-col gap-0.5 leading-none">
              <span className="text-sm tracking-[0.3em]">ОЛІЙНИК</span>
              <span className="text-[10.5px] tracking-[0.18em] text-ink-soft">
                косметологія
              </span>
            </div>
          </div>

          <nav className="flex gap-1.5 mr-auto" aria-label="Основна навігація">
            <NavLink to="/patients" className={() => navLinkClass({ isActive: onPatients })}>
              Пацієнти
            </NavLink>
            {canAccessReferencePanel && (
              <NavLink to="/references" className={navLinkClass}>
                Довідники
              </NavLink>
            )}
          </nav>

          <div className="flex items-center gap-3.5">
            <div className="hidden sm:flex flex-col items-end leading-tight">
              <span className="text-[14.5px]">{user?.name || user?.email}</span>
              <span className="text-[12.5px] text-ink-soft">
                {ROLE_LABELS[role] ?? user?.role}
              </span>
            </div>
            <button
              onClick={() => void logout()}
              className="btn btn-ghost btn-sm"
            >
              Вийти
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 w-full max-w-[960px] mx-auto px-4 sm:px-6 py-8 sm:py-9">
        {children}
      </main>
    </div>
  );
};

export default AppShell;
