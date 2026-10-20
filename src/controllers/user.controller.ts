import type { Request, Response } from "express";
import mongoose from "mongoose";
import { User } from "../models/User.js";
import { Session } from "../models/Session.js";
import { ApiError } from "../utils/api-error.js";
import { ApiResponse } from "../utils/api-response.js";
import { asyncHandler } from "../utils/async-handler.js";

interface CreateUserBody {
    fullName?: unknown;
    email?: unknown;
    phone?: unknown;
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const createUser = asyncHandler(async (req: Request, res: Response) => {
    const { fullName, email, phone } = (req.body ?? {}) as CreateUserBody;

    if (
        typeof fullName !== "string" ||
        typeof email !== "string" ||
        typeof phone !== "string" ||
        !fullName.trim() ||
        !email.trim() ||
        !phone.trim()
    ) {
        throw new ApiError(400, "fullName, email, and phone are required");
    }

    const normalizedEmail = email.trim().toLowerCase();
    if (!EMAIL_PATTERN.test(normalizedEmail)) {
        throw new ApiError(400, "Please provide a valid email address");
    }

    const user = await User.create({
        fullName: fullName.trim(),
        email: normalizedEmail,
        phone: phone.trim(),
    });

    return res
        .status(201)
        .json(new ApiResponse(201, user, "User created successfully"));
});

export const getUserSessions = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;

    if (!id || !mongoose.isObjectIdOrHexString(id)) {
        throw new ApiError(400, "Invalid user ID");
    }

    const userObjectId = new mongoose.Types.ObjectId(id);
    const userExists = await User.exists({ _id: userObjectId });

    if (!userExists) {
        throw new ApiError(404, "User not found");
    }

    const now = new Date();
    const [sessionGroups] = await Session.aggregate<{
        upcomingSessions: unknown[];
        completedSessions: unknown[];
    }>([
        {
            $match: {
                userId: userObjectId,
            },
        },
        {
            $facet: {
                upcomingSessions: [
                    {
                        $match: {
                            status: "BOOKED",
                            startTime: { $gte: now },
                        },
                    },
                    { $sort: { startTime: 1 } },
                ],
                completedSessions: [
                    {
                        $match: {
                            status: "COMPLETED",
                        },
                    },
                    { $sort: { completedAt: -1 } },
                ],
            },
        },
    ]);

    return res.status(200).json({
        success: true,
        data: {
            upcomingSessions: sessionGroups?.upcomingSessions ?? [],
            completedSessions: sessionGroups?.completedSessions ?? [],
        },
    });
});
