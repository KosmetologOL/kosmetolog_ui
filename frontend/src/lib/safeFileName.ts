// Прибирає символи, недопустимі в іменах файлів Windows/macOS, і обрізає довжину.
// Клас навмисно НЕ чіпає пробіл і дефіс: «Іваненко-Петренко» і «Домашній догляд»
// мають лишатися такими, як були. Керуючі символи записані u-екранами, а не
// сирими байтами: NUL у джерелі перетворює файл на бінарний для git. На правило
// no-control-regex це не впливає — воно спрацьовує в обох формах, тож
// disable-коментар нижче обовʼязковий у будь-якому разі.
export const safeFileName = (raw: string, fallback = "файл"): string => {
  const cleaned = raw
    // eslint-disable-next-line no-control-regex
    .replace(/[\\/:*?"<>|\u0000-\u001f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 100)
    .trim();
  return cleaned || fallback;
};
