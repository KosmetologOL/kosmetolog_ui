/** Вікно пагінації: 1 … (current±1) … total, коли сторінок більше за 7. */
export const getPageItems = (
  current: number,
  totalPages: number,
): (number | "…")[] => {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }
  const items: (number | "…")[] = [1];
  const start = Math.max(2, current - 1);
  const end = Math.min(totalPages - 1, current + 1);
  if (start > 2) items.push("…");
  for (let n = start; n <= end; n++) items.push(n);
  if (end < totalPages - 1) items.push("…");
  items.push(totalPages);
  return items;
};
