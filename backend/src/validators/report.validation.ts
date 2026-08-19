import Joi from "joi";
import { commonMessages } from "./common";
import { objectId } from "../utils/objectId";

const MAX_ITEMS = 200;

const namedItemSchema = Joi.object({
  name: Joi.string().trim().allow("").optional(),
  recommendation: Joi.string().trim().allow("").optional(),
  comment: Joi.string().trim().allow("").optional(),
  stage: Joi.string().trim().allow("").optional(),
}).messages(commonMessages);

const specialistItemSchema = Joi.object({
  name: Joi.string().trim().allow("").optional(),
  query: Joi.string().trim().allow("").optional(),
}).messages(commonMessages);

const homeCareItemSchema = Joi.object({
  _id: Joi.string().optional(),
  name: Joi.string().trim().allow("").optional(),
  morning: Joi.boolean().default(false),
  evening: Joi.boolean().default(false),
  medicationName: Joi.string().trim().allow("").optional(),
  recommendations: Joi.string().trim().allow("").optional(),
}).messages(commonMessages);

const categoryReportItemSchema = Joi.object({
  _id: Joi.string().optional(),
  categoryId: Joi.string().trim().allow("").optional(),
  categoryName: Joi.string().trim().allow("").optional(),
  itemName: Joi.string().trim().allow("").optional(),
  recommendation: Joi.string().trim().allow("").optional(),
}).messages(commonMessages);

const procedureStageItemSchema = Joi.object({
  _id: Joi.string().optional(),
  name: Joi.string().trim().allow("").optional(),
  comment: Joi.string().trim().allow("").optional(),
  recommendation: Joi.string().trim().allow("").optional(),
  zoneEnabled: Joi.boolean().default(false),
  zone: Joi.string().trim().allow("").optional(),
  intervalEnabled: Joi.boolean().default(false),
  interval: Joi.string().trim().allow("").optional(),
  visitCountEnabled: Joi.boolean().default(false),
  visitCount: Joi.number().integer().min(0).allow(null).optional(),
}).messages(commonMessages);

const procedureStageSchema = Joi.object({
  stage: Joi.string().trim().allow("").optional(),
  workWithEnabled: Joi.boolean().default(false),
  workWith: Joi.string().trim().allow("").optional(),
  procedures: Joi.array()
    .items(procedureStageItemSchema)
    .max(MAX_ITEMS)
    .default([]),
}).messages(commonMessages);

export const reportSchema = Joi.object({
  patient: objectId.required().messages({
    ...commonMessages,
    "string.pattern.base": "Некоректний ідентифікатор пацієнта",
  }),
  medications: Joi.array().items(namedItemSchema).max(MAX_ITEMS).default([]),
  procedures: Joi.array().items(namedItemSchema).max(MAX_ITEMS).default([]),
  procedureStages: Joi.array()
    .items(procedureStageSchema)
    .max(MAX_ITEMS)
    .default([]),
  exams: Joi.array().items(namedItemSchema).max(MAX_ITEMS).default([]),
  specialists: Joi.array()
    .items(specialistItemSchema)
    .max(MAX_ITEMS)
    .default([]),
  homeCares: Joi.array().items(homeCareItemSchema).max(MAX_ITEMS).default([]),
  categories: Joi.array()
    .items(categoryReportItemSchema)
    .max(MAX_ITEMS)
    .default([]),
  additionalInfo: Joi.string().trim().allow("").optional(),
  finalNote: Joi.string().trim().allow("").optional(),
  comments: Joi.string().trim().allow("").optional(),
  medicationsNote: Joi.string().trim().allow("").optional(),
  homeCareNote: Joi.string().trim().allow("").optional(),
  examsNote: Joi.string().trim().allow("").optional(),
  proceduresNote: Joi.string().trim().allow("").optional(),
}).messages(commonMessages);
