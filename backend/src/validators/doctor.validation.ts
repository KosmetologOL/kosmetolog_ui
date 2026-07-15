import Joi from "joi";
import { commonMessages } from "./common";

export const setDoctorActiveSchema = Joi.object({
  active: Joi.boolean().required().messages(commonMessages),
});
