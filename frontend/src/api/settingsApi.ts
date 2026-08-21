import { API_URL as BASE_URL } from "#lib/config";
import axios from "axios";

export interface ISettings {
  medicationsNote?: string;
  homeCareNote?: string;
  examsNote?: string;
  proceduresNote?: string;
}

const API_URL = BASE_URL + "/settings";

export const getSettings = async (): Promise<ISettings> => {
  const response = await axios.get<ISettings>(API_URL);
  return response.data;
};

export const updateSettings = async (
  settings: Partial<ISettings>,
): Promise<ISettings> => {
  const response = await axios.put<ISettings>(API_URL, settings);
  return response.data;
};
