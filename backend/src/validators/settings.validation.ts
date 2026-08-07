import Joi from "joi";
import { commonMessages } from "./common";

const FREE_TEXT_MAX = 200000;

export const settingsSchema = Joi.object({
  medicationsNote: Joi.string().trim().max(FREE_TEXT_MAX).allow("").optional(),
  homeCareNote: Joi.string().trim().max(FREE_TEXT_MAX).allow("").optional(),
  examsNote: Joi.string().trim().max(FREE_TEXT_MAX).allow("").optional(),
  proceduresNote: Joi.string().trim().max(FREE_TEXT_MAX).allow("").optional(),
}).messages(commonMessages);
