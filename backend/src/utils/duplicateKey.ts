import ApiError from "./ApiError";

/**
 * Порушення unique-індексу Mongo повертає помилку з кодом 11000. Канонічні
 * контролери роблять `next(err instanceof ApiError ? err : internal(...))`,
 * тож не змапована E11000 доїжджає до адміна як 500 «Помилка сервера» — хоча
 * це звичайна користувацька помилка «така назва вже зайнята».
 *
 * Мапінг живе тут, а не в кожному сервісі окремо, щоб текст і код відповіді
 * не розʼїхались між ресурсами (саме так і сталося: Specialist віддавав 400,
 * а HomeCare і позиції категорій — 500).
 */
const isDuplicateKeyError = (err: unknown): boolean =>
  typeof err === "object" &&
  err !== null &&
  (err as { code?: number }).code === 11000;

/**
 * Кидає ApiError.badRequest із переданим текстом, якщо це порушення
 * unique-індексу; будь-яку іншу помилку перекидає без змін.
 */
export const rethrowDuplicateAs = (err: unknown, message: string): never => {
  if (isDuplicateKeyError(err)) {
    throw ApiError.badRequest(message);
  }
  throw err;
};
