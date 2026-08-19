import Joi from "joi";
import { CATEGORY_REPORT_POSITIONS } from "../models/Category";
import { commonMessages } from "./common";

export const categorySchema = Joi.object({
  name: Joi.string().trim().min(1).required().messages(commonMessages),
  showNameInReport: Joi.boolean().optional().messages(commonMessages),
  reportPosition: Joi.string()
    .valid(...CATEGORY_REPORT_POSITIONS)
    .optional()
    .messages(commonMessages),
  importantNote: Joi.string().trim().allow("").optional().messages(commonMessages),
});

export const categoryItemSchema = Joi.object({
  name: Joi.string().trim().min(1).required().messages(commonMessages),
  recommendation: Joi.string()
    .trim()
    .allow("")
    .optional()
    .messages(commonMessages),
});
