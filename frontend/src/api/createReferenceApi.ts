import axios from "axios";

interface ReferenceApiOptions {
  searchParamName?: string;
}

export const createReferenceApi = <T, TCreate = Partial<T>>(
  resourcePath: string,
  options: ReferenceApiOptions = {},
) => {
  const { searchParamName = "query" } = options;
  const apiUrl = `${import.meta.env.VITE_API_URL}/${resourcePath}`;

  return {
    apiUrl,
    getAll: async (): Promise<T[]> => (await axios.get<T[]>(apiUrl)).data,
    searchByName: async (value?: string): Promise<T[]> => {
      const params: Record<string, string> = {};
      if (value) params[searchParamName] = value;
      return (await axios.get<T[]>(`${apiUrl}/search`, { params })).data;
    },
    create: async (item: TCreate): Promise<T> =>
      (await axios.post<T>(apiUrl, item)).data,
    update: async (id: string, item: TCreate): Promise<T> =>
      (await axios.put<T>(`${apiUrl}/${id}`, item)).data,
    remove: async (id: string): Promise<void> => {
      await axios.delete(`${apiUrl}/${id}`);
    },
  };
};
