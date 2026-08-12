import { loginUser, registerUser } from "#api/authApi";
import AuthButton from "#components/Auth/AuthButton";
import AuthInput from "#components/Auth/AuthInput";
import Spinner from "#components/Spinner";
import { AuthContext } from "#context/AuthContext";
import axios from "axios";
import React, { useContext, useState } from "react";
import toast from "react-hot-toast";

const LoginForm: React.FC = () => {
  const { login } = useContext(AuthContext)!;
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [isRegister, setIsRegister] = useState(false);
  const [registerAsDoctor, setRegisterAsDoctor] = useState(true);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validateForm = () => {
    if (!email.trim() || !password.trim()) {
      toast.error("Заповніть усі поля");
      return false;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      toast.error("Некоректний email");
      return false;
    }
    if (password.length < 6) {
      toast.error("Пароль має бути не менше 6 символів");
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    if (!validateForm()) return;

    try {
      setIsSubmitting(true);
      if (isRegister) {
        const role = registerAsDoctor ? "doctor" : undefined;
        const name = registerAsDoctor
          ? `${firstName.trim()} ${lastName.trim()}`.trim()
          : undefined;

        if (registerAsDoctor && (!firstName.trim() || !lastName.trim())) {
          toast.error("Вкажіть імʼя та прізвище для реєстрації лікаря");
          return;
        }

        const response = await registerUser(email, password, name, role);
        // Для лікаря бекенд створює запит на підтвердження і повертає message.
        if (response.message) {
          toast.success(
            "Запит надіслано. Дочекайтеся підтвердження адміністратора.",
          );
        } else {
          toast.success("Реєстрація успішна. Тепер увійдіть.");
        }
        setIsRegister(false);
        setFirstName("");
        setLastName("");
      } else {
        const { accessToken, user } = await loginUser(
          email,
          password,
          rememberMe,
        );
        login(accessToken, user);
        toast.success("Вхід виконано успішно!");
      }
    } catch (err) {
      const serverMessage =
        axios.isAxiosError(err) && err.response?.data?.message;
      if (serverMessage) {
        toast.error(serverMessage);
      } else {
        toast.error(
          isRegister
            ? "Не вдалося зареєструватися. Спробуйте ще раз."
            : "Не вдалося увійти. Перевірте email і пароль.",
        );
      }
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-dvh flex flex-col sm:grid sm:grid-cols-[2fr_3fr] bg-paper font-brand text-ink">
      <div className="flex flex-none flex-col items-center justify-center gap-5 bg-brand px-8 py-10 text-paper sm:py-16">
        <span
          aria-hidden="true"
          className="logo-mask h-14 w-16 sm:h-19 sm:w-22"
        />
        <div className="text-center">
          <div className="text-xl tracking-[0.3em] sm:text-2xl">ОЛІЙНИК</div>
          <div className="mt-1.5 text-[11px] tracking-[0.22em] opacity-75 sm:text-xs">
            косметологія
          </div>
        </div>
        <p className="hidden max-w-[26ch] text-center text-[14.5px] leading-relaxed opacity-80 sm:block">
          Кабінет лікаря: картки пацієнтів, рекомендаційні листи та довідники в
          одному місці.
        </p>
      </div>

      <div className="flex flex-1 items-center justify-center px-6 py-10 sm:py-16">
        <div className="anim-rise w-full max-w-sm">
          <h1 className="mb-7 text-center text-[22px] tracking-[0.12em] uppercase">
            {isRegister ? "Реєстрація" : "Вхід"}
          </h1>

          <form onSubmit={handleSubmit} className="space-y-3.5">
            <AuthInput
              type="email"
              placeholder="Email"
              name="email"
              autoComplete="email"
              aria-label="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <AuthInput
              type="password"
              placeholder="Пароль"
              name="password"
              autoComplete={isRegister ? "new-password" : "current-password"}
              aria-label="Пароль"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />

            {isRegister && (
              <div className="anim-rise space-y-3">
                <label className="flex items-center gap-2 text-sm text-ink-soft">
                  <input
                    type="checkbox"
                    checked={registerAsDoctor}
                    onChange={(e) => setRegisterAsDoctor(e.target.checked)}
                  />
                  Реєструвати як лікаря
                </label>

                {registerAsDoctor && (
                  <div className="anim-rise grid grid-cols-2 gap-2.5">
                    <AuthInput
                      type="text"
                      placeholder="Імʼя"
                      name="given-name"
                      autoComplete="given-name"
                      aria-label="Імʼя"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                    />
                    <AuthInput
                      type="text"
                      placeholder="Прізвище"
                      name="family-name"
                      autoComplete="family-name"
                      aria-label="Прізвище"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                    />
                  </div>
                )}
              </div>
            )}

            <label className="flex items-center gap-2 text-sm text-ink-soft">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
              />
              Запамʼятати мене
            </label>

            <AuthButton
              disabled={isSubmitting}
              text={
                isSubmitting ? (
                  <>
                    <Spinner />
                    {isRegister ? "Надсилаємо…" : "Входимо…"}
                  </>
                ) : isRegister ? (
                  "Реєстрація"
                ) : (
                  "Увійти"
                )
              }
            />
          </form>

          <div className="mt-5 text-center text-[14.5px]">
            <button
              type="button"
              onClick={() => setIsRegister(!isRegister)}
              className="btn-link"
            >
              {isRegister ? "Повернутися до входу" : "Зареєструватись"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginForm;
