import { API_URL as BASE_URL } from "#lib/config";
import axios from "axios";

export interface SyncItem {
  id?: string;
  name: string;
  recommendation?: string;
}

export interface SyncHomeCare extends SyncItem {
  morning?: boolean;
  evening?: boolean;
}

export interface SyncCategory {
  id?: string;
  name: string;
  showNameInReport?: boolean;
  reportPosition?: string;
  importantNote?: string;
  /** `undefined` — вкладки категорії не було, її записи не чіпаємо. */
  items?: SyncItem[];
}

/*
  Розділи опціональні: `undefined` означає «аркуша в книзі не було» і сервер
  такий розділ не чіпає взагалі. Порожній масив — це «аркуш є, але порожній»,
  тобто свідоме очищення розділу.
*/
export interface ReferenceDump {
  exams?: SyncItem[];
  medications?: SyncItem[];
  procedures?: SyncItem[];
  specialists?: SyncItem[];
  homeCares?: SyncHomeCare[];
  categories?: SyncCategory[];
}

/** Група змін по одному аркушу — саме це показує таблиця прев'ю. */
export interface SheetPlan {
  key: string;
  label: string;
  create: string[];
  update: string[];
  remove: string[];
  warnings: string[];
}

export interface ImportPlan {
  sheets: SheetPlan[];
  totals: { create: number; update: number; remove: number };
  /** Розділи, аркушів яких у книзі не було — лишаються без змін. */
  missingSections: string[];
}

export interface ImportResult extends ImportPlan {
  /** false — сервер не зміг виконати в транзакції (база без replica set). */
  transactional: boolean;
}

export const exportReferences = async (): Promise<ReferenceDump> => {
  const { data } = await axios.get<ReferenceDump>(
    `${BASE_URL}/reference-sync/export`,
  );
  return data;
};

export const previewReferenceImport = async (
  data: ReferenceDump,
): Promise<ImportPlan> => {
  const { data: plan } = await axios.post<ImportPlan>(
    `${BASE_URL}/reference-sync/import/preview`,
    { data },
  );
  return plan;
};

export const applyReferenceImport = async (
  data: ReferenceDump,
  removeMissing: boolean,
): Promise<ImportResult> => {
  const { data: result } = await axios.post<ImportResult>(
    `${BASE_URL}/reference-sync/import`,
    { data, removeMissing },
  );
  return result;
};
