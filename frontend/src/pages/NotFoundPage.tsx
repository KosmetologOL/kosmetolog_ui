import React from "react";
import { Link } from "react-router-dom";

const NotFoundPage: React.FC = () => (
  <div className="flex min-h-dvh flex-col items-center justify-center gap-5 bg-paper px-6 text-center font-brand text-ink">
    <span aria-hidden="true" className="logo-mask h-10 w-11 text-ink" />
    <div>
      <p
        aria-hidden="true"
        className="text-[15px] tracking-[0.3em] text-ink-soft"
      >
        404
      </p>
      <h1 className="mt-2 text-lg">Сторінку не знайдено</h1>
    </div>
    <Link to="/" className="btn btn-primary">
      На головну
    </Link>
  </div>
);

export default NotFoundPage;
