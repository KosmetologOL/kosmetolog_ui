import type { IHomeCare } from "#api/homeCaresApi";

export interface HomeCareGroup {
  category: string;
  items: IHomeCare[];
}

/**
 * Єдине місце, де «Домашній догляд» ділиться на групи для експорту.
 *
 * Групи беруться з назв категорій у самих вибраних засобах звіту, а НЕ з
 * поточного довідника: інакше засіб, чию категорію після збереження звіту
 * перейменували або видалили, мовчки зникав би з документа. Порядок груп —
 * порядок додавання засобів у звіт.
 *
 * Хелпер спільний для всіх трьох форматів (HTML, DOCX, PDF) з тієї самої
 * причини, що й прапорці розділів у `reportSectionFlags.ts`: раніше логіка
 * жила у трьох копіях і встигла розʼїхатись — C4 полагодив HTML і DOCX, а PDF
 * лишився зі старою поведінкою (див. issue #120).
 *
 * Порівняння тримоване з обох боків: назва категорії з хвостовим пробілом
 * інакше не збіглася б із заголовком групи, і засіб випадав би з документа.
 */
export const groupHomeCaresByCategory = (
  homeCares: IHomeCare[],
): HomeCareGroup[] => {
  const categories = Array.from(
    new Set(
      homeCares
        .map((care) => care.name?.trim())
        .filter((name): name is string => Boolean(name)),
    ),
  );

  return categories
    .map((category) => ({
      category,
      items: homeCares.filter((care) => care.name?.trim() === category),
    }))
    .filter((group) => group.items.length > 0);
};
