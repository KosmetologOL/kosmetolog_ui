const requireEnv = (name: string): string => {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Відсутня обов'язкова змінна середовища: ${name}`);
  }
  return value;
};

export const JWT_SECRET = requireEnv("JWT_SECRET");
export const JWT_REFRESH_SECRET = requireEnv("JWT_REFRESH_SECRET");
export const MONGODB_URI = requireEnv("MONGODB_URI");

if (!process.env.CLIENT_URL) {
  console.warn("CLIENT_URL не задано — використовується http://localhost:5173");
}

// Пакет cors звіряє заголовок Origin точним рядковим збігом, а браузер ніколи
// не надсилає Origin із трейлінг-слешем — тож слеш у кінці зробив би origin
// таким, що не збігається ніколи. Прибираємо його і з фолбека, і з env.
export const CLIENT_URL = (
  process.env.CLIENT_URL || "http://localhost:5173"
).replace(/\/+$/, "");
