import { UnsavedChangesContext } from "#context/UnsavedChangesContext";
import { useContext } from "react";

export const useUnsavedChanges = () => {
  const context = useContext(UnsavedChangesContext);
  if (!context) {
    throw new Error(
      "useUnsavedChanges must be used within an UnsavedChangesProvider",
    );
  }
  return context;
};
