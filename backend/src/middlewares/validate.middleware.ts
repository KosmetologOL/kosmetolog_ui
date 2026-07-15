import { NextFunction, Request, Response } from "express";
import Joi from "joi";
import ApiError from "../utils/ApiError";

type Source = "body" | "query" | "params";

export const validate =
  (schema: Joi.ObjectSchema, source: Source = "body") =>
  (req: Request, _res: Response, next: NextFunction) => {
    const { error, value } = schema.validate(req[source], {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      return next(
        ApiError.badRequest(error.details.map((d) => d.message).join("; ")),
      );
    }

    if (source === "query") {
      // Express 5 defines req.query as a getter-only accessor, so plain
      // assignment throws in strict mode — redefine the property instead.
      Object.defineProperty(req, "query", {
        value,
        writable: true,
        configurable: true,
        enumerable: true,
      });
    } else {
      req[source] = value;
    }

    next();
  };
