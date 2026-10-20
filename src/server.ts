import "dotenv/config";
import app from "./app.js";
import { connectDB } from "./config/db.js";

const port = Number(process.env.PORT ?? 5000);

if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error("PORT must be a valid TCP port between 1 and 65535");
}

const startServer = async (): Promise<void> => {
    try {
        await connectDB();
        app.listen(port, () => {
            console.log(`Teacher Session Booking API listening on port ${port}`);
        });
    } catch (error) {
        console.error("Failed to start the application", error);
        process.exit(1);
    }
};

void startServer();
