import express from "express";
import apirouter from "./src/router";
const app = express();

app.use(express.json());

app.use("/api/v1", apirouter);
app.use("/", (req, res) => {
  res.send("hello world");
});


app.listen(3000, () => console.log("Server running on port 3000"));
