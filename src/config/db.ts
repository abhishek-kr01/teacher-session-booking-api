import mongoose from "mongoose";

export const connectDB = async (): Promise<void> => {
    const mongoUri = process.env.MONGODB_URI;

    if (!mongoUri) {
        throw new Error("MONGODB_URI is not set. Add it to your .env file.");
    }

    await mongoose.connect(mongoUri);
    console.log("MongoDB connected successfully");
};
