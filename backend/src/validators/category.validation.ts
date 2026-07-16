import Joi from "joi";
import { commonMessages } from "./common";

export const categorySchema = Joi.object({
  name: Joi.string().trim().min(1).max(200).required().messages(commonMessages),
});

export const categoryItemSchema = Joi.object({
  name: Joi.string().trim().min(1).max(200).required().messages(commonMessages),
  recommendation: Joi.string()
    .trim()
    .max(2000)
    .allow("")
    .optional()
    .messages(commonMessages),
});
