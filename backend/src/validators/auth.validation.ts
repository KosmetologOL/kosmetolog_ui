import Joi from "joi";

const messages = {
  "string.empty": "Поле обов'язкове",
  "any.required": "Поле обов'язкове",
  "string.email": "Некоректний email",
  "string.min": "Занадто коротке значення",
  "string.max": "Занадто довге значення",
};

export const registerSchema = Joi.object({
  email: Joi.string().email().required().messages(messages),
  password: Joi.string().min(6).max(200).required().messages(messages),
  name: Joi.string().max(100).allow("").optional().messages(messages),
  role: Joi.string().valid("user", "doctor").default("user").messages({
    ...messages,
    "any.only": "Недопустима роль",
  }),
});

export const loginSchema = Joi.object({
  email: Joi.string().email().required().messages(messages),
  password: Joi.string().required().messages(messages),
  rememberMe: Joi.boolean().optional(),
});
