import { loginUser, registerUser } from "#api/authApi";
import greenLogo from "#assets/green.json";
import AuthButton from "#components/Auth/AuthButton";
import AuthInput from "#components/Auth/AuthInput";
import { AuthContext } from "#context/AuthContext";
import Lottie from "lottie-react";
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
    if (!validateForm()) return;

    try {
      if (isRegister) {
        const role = registerAsDoctor ? "doctor" : undefined;
        const name = registerAsDoctor
          ? `${firstName.trim()} ${lastName.trim()}`.trim()
          : undefined;

        if (registerAsDoctor && (!firstName.trim() || !lastName.trim())) {
          toast.error("Вкажіть ім'я та прізвище для реєстрації лікаря");
          return;
        }

        await registerUser(email, password, name, role);
        toast.success("Запит на реєстрацію створено або реєстрація пройшла.");
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
      toast.error("Помилка входу або реєстрації");
      console.error(err);
    }
  };

  return (
    <div className="h-[100dvh] min-h-[100dvh] w-full overflow-hidden bg-green-50 md:flex md:items-center md:justify-center">
      <div className="flex h-full w-full flex-col bg-white shadow-2xl md:h-[90dvh] md:max-w-[1200px] md:flex-row md:overflow-hidden md:rounded-2xl">
        <div className="flex h-[25dvh] min-h-36 flex-none items-center justify-center bg-green-100 p-4 md:h-auto md:flex-[2] md:p-12">
          <div className="h-40 w-40 sm:h-48 sm:w-48 md:h-[400px] md:w-[400px] xl:h-[500px] xl:w-[500px]">
            <Lottie animationData={greenLogo} loop={false} autoplay={true} />
          </div>
        </div>

        <div className="flex flex-1 items-start justify-center px-4 pt-16 sm:px-6 sm:pt-20 md:flex-[1] md:items-center md:p-12 bg-white">
          <div className="w-full max-w-sm">
            <h2 className="mb-4 text-center text-2xl font-semibold text-green-900 md:mb-8 md:text-4xl">
              {isRegister ? "Реєстрація" : "Вхід"}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-3 md:space-y-5">
              <AuthInput
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <AuthInput
                type="password"
                placeholder="Пароль"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />

              {isRegister && (
                <div className="space-y-2 md:space-y-3">
                  <label className="flex items-center text-sm text-gray-600 md:text-base">
                    <input
                      type="checkbox"
                      checked={registerAsDoctor}
                      onChange={(e) => setRegisterAsDoctor(e.target.checked)}
                      className="mr-2 accent-green-600"
                    />
                    Реєструвати як лікаря
                  </label>

                  {registerAsDoctor && (
                    <div className="grid grid-cols-2 gap-2 sm:gap-3">
                      <AuthInput
                        type="text"
                        placeholder="Ім'я"
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                      />
                      <AuthInput
                        type="text"
                        placeholder="Прізвище"
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                      />
                    </div>
                  )}
                </div>
              )}

              <div className="flex items-center justify-between text-sm">
                <label className="flex items-center text-gray-600">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="mr-2 accent-green-600"
                  />
                  Запам’ятати мене
                </label>
              </div>

              <AuthButton text={isRegister ? "Реєстрація" : "Увійти"} />
            </form>

            <div className="mt-2 text-center text-sm md:mt-4">
              <button
                onClick={() => setIsRegister(!isRegister)}
                className="text-green-700 hover:underline"
              >
                {isRegister ? "Повернутися до входу" : "Зареєструватись"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginForm;
