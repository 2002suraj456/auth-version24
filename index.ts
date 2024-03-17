import express from "express";
import apirouter from "./src/router";
const app = express();

import cors from "cors";

app.use(cors());

app.use(express.json());

app.use("/api/v1", apirouter);
app.use("/", (req, res) => {
  res.send("hello world");
});

app.listen(4000, () => console.log("Server running on port 4000"));
