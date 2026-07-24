import logoMark from "#assets/logo-mark.png";
import React from "react";
import { Link } from "react-router-dom";

const NotFoundPage: React.FC = () => (
  <div className="flex min-h-dvh flex-col items-center justify-center gap-5 bg-paper px-6 text-center font-brand text-ink">
    <span
      aria-hidden="true"
      className="h-10 w-11 bg-ink"
      style={{
        WebkitMaskImage: `url(${logoMark})`,
        maskImage: `url(${logoMark})`,
        WebkitMaskSize: "contain",
        maskSize: "contain",
        WebkitMaskRepeat: "no-repeat",
        maskRepeat: "no-repeat",
        WebkitMaskPosition: "center",
        maskPosition: "center",
      }}
    />
    <div>
      <h1 className="text-[15px] tracking-[0.3em] text-ink-soft">404</h1>
      <p className="mt-2 text-lg">Сторінку не знайдено</p>
    </div>
    <Link to="/" className="btn btn-primary">
      На головну
    </Link>
  </div>
);

export default NotFoundPage;
