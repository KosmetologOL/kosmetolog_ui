import { searchSpecialistsByName, type ISpecialist } from "#api/specialistsApi";
import SearchPicker from "#components/SearchPicker";
import React from "react";

interface Props {
  selectedSpecialists: ISpecialist[];
  setSelectedSpecialists: React.Dispatch<React.SetStateAction<ISpecialist[]>>;
}

const SearchSpecialist: React.FC<Props> = ({
  selectedSpecialists,
  setSelectedSpecialists,
}) => {
  const addSpecialist = (specialist: ISpecialist) => {
    setSelectedSpecialists((prev) =>
      prev.some((s) => s._id === specialist._id) ? prev : [...prev, specialist],
    );
  };

  return (
    <div className="mb-3">
      <SearchPicker<ISpecialist>
        search={searchSpecialistsByName}
        placeholder="Пошук спеціаліста"
        onAdd={addSpecialist}
        selectedIds={selectedSpecialists.map((s) => s._id)}
      />
    </div>
  );
};

export default SearchSpecialist;
