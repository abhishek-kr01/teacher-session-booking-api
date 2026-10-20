import { Schema, model } from "mongoose";

export interface IUser {
    fullName: string;
    email: string;
    phone: string;
    createdAt?: Date;
    updatedAt?: Date;
}

const userSchema = new Schema<IUser>(
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
            unique: true,
            trim: true,
            lowercase: true,
            maxlength: [254, "Email cannot exceed 254 characters"],
            match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, "Please provide a valid email address"],
        },
        phone: {
            type: String,
            required: [true, "Phone is required"],
            trim: true,
            minlength: [7, "Phone must contain at least 7 characters"],
            maxlength: [20, "Phone cannot exceed 20 characters"],
        },
    },
    { timestamps: true }
);


export const User = model<IUser>("User", userSchema);
