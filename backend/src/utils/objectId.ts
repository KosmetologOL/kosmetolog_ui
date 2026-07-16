import { NextFunction, Request, Response } from "express";
import Joi from "joi";
import ApiError from "./ApiError";

export const objectId = Joi.string()
  .pattern(/^[0-9a-fA-F]{24}$/)
  .messages({
    "string.pattern.base": "Некоректний ідентифікатор",
    "string.empty": "Ідентифікатор обов'язковий",
    "any.required": "Ідентифікатор обов'язковий",
  });

export const validateObjectIdParams =
  (...paramNames: string[]) =>
  (req: Request, _res: Response, next: NextFunction) => {
    for (const name of paramNames) {
      const { error } = objectId.required().validate(req.params[name]);
      if (error) {
        return next(ApiError.badRequest(error.details[0].message));
      }
    }
    next();
  };
