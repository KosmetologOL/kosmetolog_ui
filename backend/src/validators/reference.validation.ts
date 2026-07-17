import Joi from "joi";
import { commonMessages } from "./common";

export const nameOnlySchema = Joi.object({
  name: Joi.string().trim().min(1).max(200).required().messages(commonMessages),
});

export const nameWithRecommendationSchema = Joi.object({
  name: Joi.string().trim().min(1).max(200).required().messages(commonMessages),
  recommendation: Joi.string()
    .trim()
    .min(1)
    .max(2000)
    .required()
    .messages(commonMessages),
});
