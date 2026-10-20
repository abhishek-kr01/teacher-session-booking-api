import type { Request, Response } from "express";
import mongoose from "mongoose";
import { Session } from "../models/Session.js";
import { Teacher } from "../models/Teacher.js";
import { User } from "../models/User.js";
import { ApiError } from "../utils/api-error.js";
import { ApiResponse } from "../utils/api-response.js";
import { asyncHandler } from "../utils/async-handler.js";

interface CreateSessionBody {
    teacherId?: unknown;
    startTime?: unknown;
    endTime?: unknown;
}

interface BookSessionBody {
    userId?: unknown;
}

const parseDateString = (value: unknown): Date | null => {
    if (typeof value !== "string" || !value.trim()) {
        return null;
    }

    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
};

const validateObjectId = (value: string | undefined, fieldName: string): string => {
    if (!value || !mongoose.isObjectIdOrHexString(value)) {
        throw new ApiError(400, `Invalid ${fieldName}`);
    }
    return value;
};

export const createSession = asyncHandler(async (req: Request, res: Response) => {
    const { teacherId, startTime, endTime } = (req.body ?? {}) as CreateSessionBody;

    if (typeof teacherId !== "string") {
        throw new ApiError(400, "teacherId is required");
    }

    const validTeacherId = validateObjectId(teacherId, "teacherId");
    const parsedStartTime = parseDateString(startTime);
    const parsedEndTime = parseDateString(endTime);

    if (!parsedStartTime || !parsedEndTime) {
        throw new ApiError(400, "startTime and endTime must be valid date strings");
    }

    if (parsedEndTime <= parsedStartTime) {
        throw new ApiError(400, "endTime must be greater than startTime");
    }

    const teacherExists = await Teacher.exists({
        _id: new mongoose.Types.ObjectId(validTeacherId),
    });

    if (!teacherExists) {
        throw new ApiError(404, "Teacher not found");
    }

    // Only server-controlled fields are set; clients cannot assign a user or initial status.
    const session = await Session.create({
        teacherId: new mongoose.Types.ObjectId(validTeacherId),
        userId: null,
        startTime: parsedStartTime,
        endTime: parsedEndTime,
        status: "AVAILABLE",
        completedAt: null,
    });

    return res
        .status(201)
        .json(new ApiResponse(201, session, "Session created successfully"));
});

export const getAvailableSessions = asyncHandler(async (req: Request, res: Response) => {
    const { dateTimestamp } = req.query;

    if (
        typeof dateTimestamp !== "string" ||
        !/^\d+$/.test(dateTimestamp)
    ) {
        throw new ApiError(400, "dateTimestamp is required and must be a Unix timestamp in milliseconds");
    }

    const timestamp = Number(dateTimestamp);
    if (!Number.isSafeInteger(timestamp)) {
        throw new ApiError(400, "dateTimestamp must be a valid Unix timestamp in milliseconds");
    }

    const selectedDate = new Date(timestamp);
    if (Number.isNaN(selectedDate.getTime())) {
        throw new ApiError(400, "dateTimestamp is outside the supported date range");
    }

    const startOfDay = new Date(selectedDate);
    startOfDay.setUTCHours(0, 0, 0, 0);
    const startOfNextDay = new Date(startOfDay);
    startOfNextDay.setUTCDate(startOfNextDay.getUTCDate() + 1);

    const sessions = await Session.aggregate([
        {
            $match: {
                status: "AVAILABLE",
                startTime: {
                    $gte: startOfDay,
                    $lt: startOfNextDay,
                },
            },
        },
        {
            $sort: {
                startTime: 1,
            },
        },
    ]);

    return res
        .status(200)
        .json(new ApiResponse(200, sessions, "Available sessions fetched successfully"));
});

export const bookSession = asyncHandler(async (req: Request, res: Response) => {
    const sessionId = validateObjectId(req.params.id, "session ID");
    const { userId } = (req.body ?? {}) as BookSessionBody;

    if (typeof userId !== "string") {
        throw new ApiError(400, "userId is required");
    }

    const validUserId = validateObjectId(userId, "userId");
    const userObjectId = new mongoose.Types.ObjectId(validUserId);
    const userExists = await User.exists({ _id: userObjectId });

    if (!userExists) {
        throw new ApiError(404, "User not found");
    }

    // This conditional update is atomic, so concurrent requests cannot book the same session.
    const session = await Session.findOneAndUpdate(
        {
            _id: new mongoose.Types.ObjectId(sessionId),
            status: "AVAILABLE",
        },
        {
            $set: {
                userId: userObjectId,
                status: "BOOKED",
            },
        },
        {
            new: true,
            runValidators: true,
        }
    );

    if (!session) {
        const existingSession = await Session.findById(sessionId).select("_id status");
        if (!existingSession) {
            throw new ApiError(404, "Session not found");
        }
        throw new ApiError(409, `Session is not available for booking (current status: ${existingSession.status})`);
    }

    return res
        .status(200)
        .json(new ApiResponse(200, session, "Session booked successfully"));
});

export const completeSession = asyncHandler(async (req: Request, res: Response) => {
    const sessionId = validateObjectId(req.params.id, "session ID");

    // The status filter prevents transitions from AVAILABLE or COMPLETED.
    const session = await Session.findOneAndUpdate(
        {
            _id: new mongoose.Types.ObjectId(sessionId),
            status: "BOOKED",
        },
        {
            $set: {
                status: "COMPLETED",
                completedAt: new Date(),
            },
        },
        {
            new: true,
            runValidators: true,
        }
    );

    if (!session) {
        const existingSession = await Session.findById(sessionId).select("_id status");
        if (!existingSession) {
            throw new ApiError(404, "Session not found");
        }
        throw new ApiError(409, `Only booked sessions can be completed (current status: ${existingSession.status})`);
    }

    return res
        .status(200)
        .json(new ApiResponse(200, session, "Session marked as completed successfully"));
});
