import Joi from "joi";

export const commonMessages = {
  "string.empty": "Поле обов'язкове",
  "any.required": "Поле обов'язкове",
  "string.min": "Занадто коротке значення",
  "string.max": "Занадто довге значення",
  "number.base": "Значення має бути числом",
  "number.min": "Значення занадто мале",
  "number.max": "Значення занадто велике",
  "boolean.base": "Значення має бути true/false",
  "array.base": "Значення має бути списком",
};

export const paginationQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1).messages(commonMessages),
  limit: Joi.number()
    .integer()
    .min(1)
    .max(100)
    .default(10)
    .messages(commonMessages),
  query: Joi.string().trim().max(200).allow("").default("").messages(commonMessages),
});

