import { Schema, Types, model } from "mongoose";

export const SESSION_STATUSES = ["AVAILABLE", "BOOKED", "COMPLETED"] as const;
export type SessionStatus = (typeof SESSION_STATUSES)[number];

export interface ISession {
    teacherId: Types.ObjectId;
    userId: Types.ObjectId | null;
    startTime: Date;
    endTime: Date;
    status: SessionStatus;
    completedAt: Date | null;
    createdAt?: Date;
    updatedAt?: Date;
}

const sessionSchema = new Schema<ISession>(
    {
        teacherId: {
            type: Schema.Types.ObjectId,
            ref: "Teacher",
            required: [true, "Teacher is required"],
        },
        userId: {
            type: Schema.Types.ObjectId,
            ref: "User",
            default: null,
        },
        startTime: {
            type: Date,
            required: [true, "Start time is required"],
            validate: {
                validator: (value: Date) => value instanceof Date && !Number.isNaN(value.getTime()),
                message: "Start time must be a valid date",
            },
        },
        endTime: {
            type: Date,
            required: [true, "End time is required"],
            validate: [
                {
                    validator: function (this: ISession, value: Date) {
                        return value instanceof Date && !Number.isNaN(value.getTime());
                    },
                    message: "End time must be a valid date",
                },
                {
                    validator: function (this: ISession, value: Date) {
                        return !(this.startTime instanceof Date) || value > this.startTime;
                    },
                    message: "End time must be greater than start time",
                },
            ],
        },
        status: {
            type: String,
            enum: {
                values: SESSION_STATUSES,
                message: "Status must be AVAILABLE, BOOKED, or COMPLETED",
            },
            default: "AVAILABLE",
            required: true,
        },
        completedAt: {
            type: Date,
            default: null,
        },
    },
    { timestamps: true }
);

sessionSchema.index({ status: 1, startTime: 1 });
sessionSchema.index({ userId: 1, status: 1, startTime: 1 });
sessionSchema.index({ teacherId: 1, startTime: 1 });

export const Session = model<ISession>("Session", sessionSchema);
