import express from "express";
import apirouter from "./src/router";
const app = express();

import cors from "cors";

const allowedDomain = "version24.in";

const corsOptions = {
  origin: function (origin: any, callback: any) {
    if (!origin) {
      callback(null, true); // Allow requests with no origin (like from server-side)
    } else if (origin.endsWith("." + allowedDomain)) {
      callback(null, true); // Allow requests from subdomains
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
};

app.use(cors(corsOptions));

app.use(express.json());

app.use("/api/v1", apirouter);
app.use("/", (req, res) => {
  res.send("hello world");
});

app.listen(4000, () => console.log("Server running on port 4000"));
