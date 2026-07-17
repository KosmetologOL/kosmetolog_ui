import axios from "axios";

export interface IReportEditHistoryItem {
  action: "create" | "update";
  editedAt: string;
  userId?: string;
  email?: string;
  name?: string;
  role?: string;
}

export interface IReportProcedure {
  _id?: string;
  name: string;
  recommendation: string;
  comment?: string;
  stage?: string;
}

export interface IReportProcedureStage {
  stage: string;
  procedures: IReportProcedure[];
}

export interface IReport {
  _id?: string;
  patient: string;
  medications: { name: string; recommendation: string }[];
  procedures: IReportProcedure[];
  procedureStages?: IReportProcedureStage[];
  specialists: { name: string; query?: string }[];
  exams: { name: string; recommendation: string }[];
  homeCares: {
    _id?: string;
    name: string;
    morning: boolean;
    evening: boolean;
    medicationName?: string;
    recommendations?: string;
  }[];
  additionalInfo?: string;
  finalNote?: string;
  comments?: string;
  createdAt?: string;
  updatedAt?: string;
  editHistory?: IReportEditHistoryItem[];
}

const API_URL = import.meta.env.VITE_API_URL + "/reports";

export const getAllReports = async (): Promise<IReport[]> => {
  const response = await axios.get<IReport[]>(API_URL);
  return response.data;
};

export const getReportById = async (id: string): Promise<IReport> => {
  const response = await axios.get<IReport>(`${API_URL}/${id}`);
  return response.data;
};

export const getReportByPatientId = async (
  patientId: string,
): Promise<IReport> =>
  (await axios.get<IReport>(`${API_URL}/patient/${patientId}`)).data;

export const createReport = async (
  report: Partial<IReport>,
): Promise<IReport> => {
  const response = await axios.post<IReport>(API_URL, report);
  return response.data;
};

export const updateReport = async (
  id: string,
  report: Partial<IReport>,
): Promise<IReport> => {
  const response = await axios.put<IReport>(`${API_URL}/${id}`, report);
  return response.data;
};
