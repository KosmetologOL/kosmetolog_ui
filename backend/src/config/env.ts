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
