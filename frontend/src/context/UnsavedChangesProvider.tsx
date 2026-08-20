import { UnsavedChangesContext } from "#context/UnsavedChangesContext";
import React, { useMemo, useRef } from "react";

/**
 * Прапорець «є незбережені зміни» тримаємо в ref, а не в state: його читає
 * лише обробник кліку в шапці, тож ре-рендер усього дерева на кожне
 * натискання клавіші у формі листа був би марним. Завдяки цьому value
 * стабільний і споживачі не перемальовуються.
 */
export const UnsavedChangesProvider: React.FC<{
  children: React.ReactNode;
}> = ({ children }) => {
  const isDirtyRef = useRef(false);

  const value = useMemo(
    () => ({
      setIsDirty: (dirty: boolean) => {
        isDirtyRef.current = dirty;
      },
      confirmLeave: () =>
        !isDirtyRef.current ||
        window.confirm("Є незбережені зміни. Закрити без збереження?"),
    }),
    [],
  );

  return (
    <UnsavedChangesContext.Provider value={value}>
      {children}
    </UnsavedChangesContext.Provider>
  );
};
