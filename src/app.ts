import express from "express";
import userRoutes from "./routes/user.routes.js";
import sessionRoutes from "./routes/session.routes.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { notFound } from "./middleware/notFound.js";

const app = express();

app.disable("x-powered-by");
app.use(express.json({ limit: "100kb" }));


app.use("/users", userRoutes);
app.use("/sessions", sessionRoutes);

app.use(notFound);
app.use(errorHandler);

export default app;
