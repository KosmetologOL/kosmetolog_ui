import { searchProceduresByName, type IProcedure } from "#api/proceduresApi";
import FormattedText from "#components/FormattedText";
import SearchPicker from "#components/SearchPicker";
import React from "react";

interface Props {
  selectedProcedures: IProcedure[];
  setSelectedProcedures: React.Dispatch<React.SetStateAction<IProcedure[]>>;
}

const SearchProcedure: React.FC<Props> = ({
  selectedProcedures,
  setSelectedProcedures,
}) => {
  const addProcedure = (procedure: IProcedure) => {
    setSelectedProcedures((prev) =>
      prev.some((p) => p._id === procedure._id) ? prev : [...prev, procedure],
    );
  };

  return (
    <div className="mb-3">
      <SearchPicker<IProcedure>
        search={searchProceduresByName}
        placeholder="Пошук процедури"
        onAdd={addProcedure}
        selectedIds={selectedProcedures.map((p) => p._id)}
        renderSub={(procedure) =>
          procedure.recommendation ? (
            <FormattedText inline markdown={procedure.recommendation} />
          ) : null
        }
      />
    </div>
  );
};

export default SearchProcedure;
