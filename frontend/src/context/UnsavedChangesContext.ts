import { createContext } from "react";

export interface UnsavedChangesContextProps {
  setIsDirty: (dirty: boolean) => void;
  /** true — можна йти (форма чиста або користувач підтвердив). */
  confirmLeave: () => boolean;
}

export const UnsavedChangesContext = createContext<
  UnsavedChangesContextProps | undefined
>(undefined);
