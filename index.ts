import userRouter from "./src/routes/login";
import express from "express";
const app = express();

app.use(express.json());

app.use("/api/v1", userRouter);

app.listen(3000, () => console.log("Server running on port 3000"));