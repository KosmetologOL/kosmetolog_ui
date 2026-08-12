import { searchMedicationsByName, type IMedication } from "#api/medicationsApi";
import FormattedText from "#components/FormattedText";
import SearchPicker from "#components/SearchPicker";
import React from "react";

interface Props {
  selectedMedications: IMedication[];
  setSelectedMedications: React.Dispatch<React.SetStateAction<IMedication[]>>;
}

const SearchMedication: React.FC<Props> = ({
  selectedMedications,
  setSelectedMedications,
}) => {
  const addMedication = (medication: IMedication) => {
    setSelectedMedications((prev) =>
      prev.some((m) => m._id === medication._id) ? prev : [...prev, medication],
    );
  };

  return (
    <div className="mb-3">
      <SearchPicker<IMedication>
        search={searchMedicationsByName}
        placeholder="Пошук засобу"
        onAdd={addMedication}
        selectedIds={selectedMedications.map((m) => m._id)}
        renderSub={(medication) =>
          medication.recommendation ? (
            <FormattedText inline markdown={medication.recommendation} />
          ) : null
        }
      />
    </div>
  );
};

export default SearchMedication;
