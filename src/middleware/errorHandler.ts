import type { ErrorRequestHandler } from "express";
import mongoose from "mongoose";
import { ApiError } from "../utils/api-error.js";

const isRecord = (value: unknown): value is Record<string, unknown> => {
    return typeof value === "object" && value !== null;
};

export const errorHandler: ErrorRequestHandler = (error: unknown, _req, res, _next) => {
    let statusCode = 500;
    let message = "Internal server error";

    if (error instanceof ApiError) {
        statusCode = error.statusCode;
        message = error.message;
    } else if (error instanceof mongoose.Error.ValidationError) {
        statusCode = 400;
        message = Object.values(error.errors)
            .map((validationError) => validationError.message)
            .join(", ");
    } else if (error instanceof mongoose.Error.CastError) {
        statusCode = 400;
        message = `Invalid value for ${error.path}`;
    } else if (isRecord(error) && error.code === 11000) {
        statusCode = 409;
        const keyPattern = isRecord(error.keyPattern) ? error.keyPattern : {};
        message = "A user with this email already exists";
        if (!Object.prototype.hasOwnProperty.call(keyPattern, "email")) {
            message = "A resource with the same unique field already exists";
        }
    } else if (
        error instanceof SyntaxError &&
        isRecord(error) &&
        error.status === 400
    ) {
        statusCode = 400;
        message = "Invalid JSON request body";
    }

    if (statusCode >= 500) {
        // Log details on the server only; do not expose internal errors to API clients.
        console.error(error);
    }

    res.status(statusCode).json({
        success: false,
        message,
    });
};
