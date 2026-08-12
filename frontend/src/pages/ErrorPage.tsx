import React from "react";

const ErrorPage: React.FC = () => (
  <div className="flex min-h-dvh flex-col items-center justify-center gap-5 bg-paper px-6 text-center font-brand text-ink">
    <span aria-hidden="true" className="logo-mask h-10 w-11 text-ink" />
    <div>
      <p aria-hidden="true" className="text-[15px] tracking-[0.3em] text-danger">
        500
      </p>
      <h1 className="mt-2 text-lg">Виникла внутрішня помилка сервера</h1>
    </div>
    {/* Звичайне посилання (не <Link>): повний перезапуск застосунку скидає
        стан ErrorBoundary — інакше після падіння екран помилки лишається. */}
    <a href="/" className="btn btn-primary">
      Спробувати знову
    </a>
  </div>
);

export default ErrorPage;
