import Joi from "joi";
import { commonMessages } from "./common";

export const settingsSchema = Joi.object({
  medicationsNote: Joi.string().trim().allow("").optional(),
  homeCareNote: Joi.string().trim().allow("").optional(),
  examsNote: Joi.string().trim().allow("").optional(),
  proceduresNote: Joi.string().trim().allow("").optional(),
}).messages(commonMessages);
