// Єдине місце, де читається VITE_API_URL. Модуль потрапляє в граф імпортів
// на старті (main.tsx → sessionRefresh → #api/authApi), тож незадана змінна
// одразу зупиняє застосунок, а не перетворює запити на "undefined/auth".
export const API_URL: string = import.meta.env.VITE_API_URL;

if (!API_URL) {
  throw new Error("VITE_API_URL не задано — перевірте frontend/.env");
}
