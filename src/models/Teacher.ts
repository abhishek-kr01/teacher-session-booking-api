import { Schema, model } from "mongoose";

export interface ITeacher {
    fullName: string;
    email: string;
    specialization: string;
    experience: number;
    createdAt?: Date;
    updatedAt?: Date;
}

const teacherSchema = new Schema<ITeacher>(
    {
        fullName: {
            type: String,
            required: [true, "Full name is required"],
            trim: true,
            minlength: [2, "Full name must contain at least 2 characters"],
            maxlength: [100, "Full name cannot exceed 100 characters"],
        },
        email: {
            type: String,
            required: [true, "Email is required"],
            trim: true,
            lowercase: true,
            maxlength: [254, "Email cannot exceed 254 characters"],
            match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, "Please provide a valid email address"],
        },
        specialization: {
            type: String,
            required: [true, "Specialization is required"],
            trim: true,
            minlength: [2, "Specialization must contain at least 2 characters"],
            maxlength: [100, "Specialization cannot exceed 100 characters"],
        },
        experience: {
            type: Number,
            required: [true, "Experience is required"],
            min: [0, "Experience cannot be negative"],
            validate: {
                validator: Number.isFinite,
                message: "Experience must be a valid number",
            },
        },
    },
    { timestamps: true }
);

export const Teacher = model<ITeacher>("Teacher", teacherSchema);
