import CreateReportForm from "#components/ReportForm/CreateReportForm";
import React from "react";
import { useParams } from "react-router-dom";

const CreateReportPage: React.FC = () => {
  const { patientId } = useParams();

  // key: React перевмонтовує форму при зміні пацієнта — стан і запити
  // попереднього пацієнта не перетікають у форму наступного.
  return <CreateReportForm key={patientId} />;
};

export default CreateReportPage;
