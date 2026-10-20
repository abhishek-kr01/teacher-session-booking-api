import type { RequestHandler } from "express";
import { ApiError } from "../utils/api-error.js";

export const notFound: RequestHandler = (req, _res, next) => {
    next(new ApiError(404, `${req.method} ${req.originalUrl} not found`));
};
