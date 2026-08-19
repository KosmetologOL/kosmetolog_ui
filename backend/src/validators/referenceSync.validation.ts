import Joi from "joi";
import { CATEGORY_REPORT_POSITIONS } from "../models/Category";
import { commonMessages } from "./common";

/** Стеля на аркуш — щоб зіпсований файл не поклав сервер розбором. */
const MAX_ROWS = 5000;

const itemSchema = Joi.object({
  id: Joi.string().trim().allow("").optional(),
  name: Joi.string().trim().min(1).required().messages(commonMessages),
  recommendation: Joi.string().trim().allow("").optional(),
});

const itemsSchema = Joi.array().items(itemSchema).max(MAX_ROWS).default([]);

const homeCareSchema = itemSchema.keys({
  morning: Joi.boolean().optional(),
  evening: Joi.boolean().optional(),
});

const categorySchema = Joi.object({
  id: Joi.string().trim().allow("").optional(),
  name: Joi.string().trim().min(1).required().messages(commonMessages),
  showNameInReport: Joi.boolean().optional(),
  reportPosition: Joi.string()
    .valid(...CATEGORY_REPORT_POSITIONS)
    .optional(),
  importantNote: Joi.string().trim().allow("").optional(),
  items: itemsSchema,
});

export const referenceImportSchema = Joi.object({
  removeMissing: Joi.boolean().default(false),
  data: Joi.object({
    exams: itemsSchema,
    medications: itemsSchema,
    procedures: itemsSchema,
    specialists: itemsSchema,
    homeCares: Joi.array().items(homeCareSchema).max(MAX_ROWS).default([]),
    categories: Joi.array().items(categorySchema).max(MAX_ROWS).default([]),
  })
    .required()
    .messages(commonMessages),
});
