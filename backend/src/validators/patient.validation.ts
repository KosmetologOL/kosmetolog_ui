import Joi from "joi";
import { commonMessages, paginationQuerySchema } from "./common";

export const patientListQuerySchema = paginationQuerySchema;

export const patientBodySchema = Joi.object({
  fullName: Joi.string().trim().min(2).max(200).required().messages(commonMessages),
});
