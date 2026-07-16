import Joi from "joi";
import { commonMessages } from "./common";
import { objectId } from "../utils/objectId";

const MAX_ITEMS = 200;
const NAME_MAX = 200;
const TEXT_MAX = 2000;
const FREE_TEXT_MAX = 5000;

const namedItemSchema = Joi.object({
  name: Joi.string().trim().max(NAME_MAX).allow("").optional(),
  recommendation: Joi.string().trim().max(TEXT_MAX).allow("").optional(),
  comment: Joi.string().trim().max(TEXT_MAX).allow("").optional(),
  stage: Joi.string().trim().max(NAME_MAX).allow("").optional(),
}).messages(commonMessages);

const specialistItemSchema = Joi.object({
  name: Joi.string().trim().max(NAME_MAX).allow("").optional(),
  query: Joi.string().trim().max(NAME_MAX).allow("").optional(),
}).messages(commonMessages);

const homeCareItemSchema = Joi.object({
  _id: Joi.string().optional(),
  name: Joi.string().trim().max(NAME_MAX).allow("").optional(),
  morning: Joi.boolean().default(false),
  evening: Joi.boolean().default(false),
  medicationName: Joi.string().trim().max(NAME_MAX).allow("").optional(),
  recommendations: Joi.string().trim().max(TEXT_MAX).allow("").optional(),
}).messages(commonMessages);

const procedureStageItemSchema = Joi.object({
  _id: Joi.string().optional(),
  name: Joi.string().trim().max(NAME_MAX).allow("").optional(),
  comment: Joi.string().trim().max(TEXT_MAX).allow("").optional(),
  recommendation: Joi.string().trim().max(TEXT_MAX).allow("").optional(),
}).messages(commonMessages);

const procedureStageSchema = Joi.object({
  stage: Joi.string().trim().max(NAME_MAX).allow("").optional(),
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
  additionalInfo: Joi.string().trim().max(FREE_TEXT_MAX).allow("").optional(),
  finalNote: Joi.string().trim().max(FREE_TEXT_MAX).allow("").optional(),
  comments: Joi.string().trim().max(FREE_TEXT_MAX).allow("").optional(),
}).messages(commonMessages);
