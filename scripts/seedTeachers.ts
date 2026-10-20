import "dotenv/config";
import mongoose from "mongoose";
import { connectDB } from "../src/config/db.js";
import { Teacher } from "../src/models/Teacher.js";

const seedTeachers = async (): Promise<void> => {
    try {
        await connectDB();

        const teacher = await Teacher.findOneAndUpdate(
            { email: "priya.sharma@example.com" },
            {
                $set: {
                    fullName: "Priya Sharma",
                    email: "priya.sharma@example.com",
                    specialization: "Mathematics",
                    experience: 5,
                },
            },
            {
                new: true,
                upsert: true,
                runValidators: true,
                setDefaultsOnInsert: true,
            }
        );

        console.log("Teacher seed completed:");
        console.log(JSON.stringify(teacher, null, 2));
        console.log(`Use this teacherId when creating a session: ${teacher._id.toString()}`);
    } catch (error) {
        console.error("Failed to seed teachers", error);
        process.exitCode = 1;
    } finally {
        await mongoose.disconnect();
    }
};

void seedTeachers();
