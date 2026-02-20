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
        await registerUser(email, password);
        toast.success("Реєстрація успішна! Тепер увійдіть.");
        setIsRegister(false);
      } else {
        const { accessToken } = await loginUser(email, password, rememberMe);
        login(accessToken);
        toast.success("Вхід виконано успішно!");
      }
    } catch (err) {
      toast.error("Помилка входу або реєстрації");
      console.error(err);
    }
  };

  return (
    <div className="w-screen h-screen flex items-center justify-center bg-green-50">
      <div className="flex flex-col md:flex-row w-full max-w-[1200px] h-full md:h-[90vh] rounded-2xl overflow-hidden shadow-2xl bg-white">
        <div className="flex-[2] flex items-center justify-center bg-green-100 p-8 md:p-12">
          <div className="w-64 h-64 sm:w-80 sm:h-80 md:w-[400px] md:h-[400px] xl:w-[500px] xl:h-[500px]">
            <Lottie animationData={greenLogo} loop={false} autoplay={true} />
          </div>
        </div>

        <div className="flex-[1] flex items-center justify-center p-6 sm:p-10 md:p-12 bg-white">
          <div className="w-full max-w-sm">
            <h2 className="text-3xl md:text-4xl font-semibold text-green-900 mb-8 text-center">
              {"Вхід"}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-5">
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

              <AuthButton text={"Увійти"} />
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginForm;
