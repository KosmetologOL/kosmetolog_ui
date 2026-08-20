/*
  Дзеркало backend/src/utils/translitSearch.ts для пошуків, що фільтрують уже
  завантажений список на клієнті (категорії, менеджери довідників). Логіку
  тримати синхронною з бекендом, інакше однаковий запит даватиме різні
  результати в різних місцях.

  Пошук латиницею по кириличних назвах («krem» → «Крем»), а також забутою
  розкладкою («crhbysyu» → «Скринінг»).
*/

const escapeRegex = (value: string) =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Латинські послідовності, що дають одну кириличну літеру. Довші — першими. */
const DIGRAPHS: Array<[string, string]> = [
  ["shch", "щ"],
  ["sch", "щ"],
  ["zh", "ж"],
  ["kh", "х"],
  ["ch", "ч"],
  ["sh", "ш"],
  ["ts", "ц"],
  ["ya", "я"],
  ["ye", "є"],
  ["yi", "ї"],
  ["yu", "ю"],
  ["yo", "йо"],
  ["ia", "я"],
  ["iu", "ю"],
  ["ie", "є"],
  ["ja", "я"],
  ["je", "є"],
  ["ji", "ї"],
  ["ju", "ю"],
];

/** Кириличні літери, які може означати кожна латинська. */
const CYRILLIC_FOR_LATIN: Record<string, string> = {
  a: "а",
  b: "б",
  c: "цкс",
  d: "д",
  e: "еє",
  f: "ф",
  g: "гґ",
  h: "хг",
  i: "іиї",
  j: "й",
  k: "к",
  l: "л",
  m: "м",
  n: "н",
  o: "о",
  p: "п",
  q: "к",
  r: "р",
  s: "с",
  t: "т",
  u: "у",
  v: "в",
  w: "в",
  y: "иійї",
  z: "з",
};

/*
  Забута розкладка: «crhbysyu» — це «скринінг», набраний укр. розкладкою при
  ввімкненій англійській. Мапа посимвольна, US QWERTY → ЙЦУКЕН.
*/
const QWERTY_TO_CYRILLIC: Record<string, string> = {
  q: "й", w: "ц", e: "у", r: "к", t: "е", y: "н", u: "г", i: "ш", o: "щ",
  p: "з", "[": "х", "]": "ї",
  a: "ф", s: "і", d: "в", f: "а", g: "п", h: "р", j: "о", k: "л", l: "д",
  ";": "ж", "'": "є", "\\": "ґ",
  z: "я", x: "ч", c: "с", v: "м", b: "и", n: "т", m: "ь", ",": "б", ".": "ю",
  "/": ".",
};

const CYRILLIC_TO_QWERTY: Record<string, string> = Object.fromEntries(
  Object.entries(QWERTY_TO_CYRILLIC).map(([latin, cyrillic]) => [
    cyrillic,
    latin,
  ]),
);

/** Довші запити не дають користі, але роздувають патерн — обрізаємо. */
const MAX_QUERY_LENGTH = 60;

/*
  Коротким запитам розкладку не підміняємо: «b» перетворилося б на «и» і
  витягло майже весь довідник. З трьох літер випадкові збіги вже малоймовірні.
*/
const MIN_LAYOUT_SWAP_LENGTH = 3;

const charPattern = (char: string): string => {
  const cyrillic = CYRILLIC_FOR_LATIN[char];
  return cyrillic ? `[${char}${cyrillic}]` : escapeRegex(char);
};

const swapLayout = (text: string, map: Record<string, string>): string =>
  [...text].map((char) => map[char] ?? char).join("");

const buildVariantPattern = (source: string): string => {
  let pattern = "";
  let index = 0;

  while (index < source.length) {
    // «x» — єдина латинська літера, що дає дві кириличні.
    if (source[index] === "x") {
      pattern += "(?:x|кс)";
      index += 1;
      continue;
    }

    const digraph = DIGRAPHS.find(([latin]) => source.startsWith(latin, index));
    if (digraph) {
      const [latin, cyrillic] = digraph;
      const perLetter = [...latin].map(charPattern).join("");
      pattern += `(?:${cyrillic}|${perLetter})`;
      index += latin.length;
      continue;
    }

    pattern += charPattern(source[index]);
    index += 1;
  }

  return pattern;
};

/**
 * Патерн для `$regex` (використовувати з `$options: "i"`), який знаходить
 * назву незалежно від того, набрана вона кирилицею, латиницею чи в забутій
 * розкладці.
 */
export const buildNameSearchPattern = (query: string): string => {
  const source = query.trim().slice(0, MAX_QUERY_LENGTH).toLowerCase();
  const variants = [buildVariantPattern(source)];

  if (source.length >= MIN_LAYOUT_SWAP_LENGTH) {
    const asCyrillic = swapLayout(source, QWERTY_TO_CYRILLIC);
    if (asCyrillic !== source) variants.push(buildVariantPattern(asCyrillic));

    const asLatin = swapLayout(source, CYRILLIC_TO_QWERTY);
    if (asLatin !== source) variants.push(buildVariantPattern(asLatin));
  }

  const unique = [...new Set(variants)];
  return unique.length > 1 ? `(?:${unique.join("|")})` : unique[0];
};

/** Чи містить `name` запит `query` — з урахуванням латиниці й розкладки. */
export const matchesNameQuery = (name: string, query: string): boolean => {
  const trimmed = query.trim();
  if (!trimmed) return true;

  try {
    return new RegExp(buildNameSearchPattern(trimmed), "i").test(name);
  } catch {
    // Патерн зламався (екзотичний ввід) — не гальмуємо пошук зовсім.
    return name.toLowerCase().includes(trimmed.toLowerCase());
  }
};
