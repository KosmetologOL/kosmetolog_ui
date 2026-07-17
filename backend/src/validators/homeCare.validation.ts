import Joi from "joi";
import { commonMessages } from "./common";
import { objectId } from "../utils/objectId";

export const homeCareSchema = Joi.object({
  name: Joi.string().trim().min(1).max(200).required().messages(commonMessages),
  morning: Joi.boolean().default(false).messages(commonMessages),
  evening: Joi.boolean().default(false).messages(commonMessages),
  medicationName: Joi.string().trim().max(200).allow("").optional().messages(commonMessages),
  recommendations: Joi.string().trim().max(2000).allow("").optional().messages(commonMessages),
});

export const homeCareSearchQuerySchema = Joi.object({
  search: Joi.string().trim().max(200).allow("").optional().messages(commonMessages),
});

export const reorderHomeCareSchema = Joi.object({
  ids: Joi.array().items(objectId.required()).min(1).required().messages({
    ...commonMessages,
    "array.min": "Список ідентифікаторів не може бути порожнім",
  }),
});
