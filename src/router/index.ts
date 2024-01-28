import { Router } from "express";
import {
  handleUserSignup,
  handleUserLogin,
  handleUserForgetPassword,
  handleUserGenerateOTP,
  handleUserVerifyOTP,
  handleUserResetPassword,
  handleUserGet,
  handleEventGet,
  authenticate,
} from "../controllers/user";
import jwt from "jsonwebtoken";

const apirouter = Router();

apirouter.get("test", (req, res) => {
  res.send("test");
});
apirouter.post("/login", handleUserLogin);

apirouter.post("/signup", handleUserSignup);

apirouter.post("/forgetPassword", handleUserForgetPassword);

apirouter.post("/generateotp", handleUserGenerateOTP);

apirouter.post("/verifyotp", handleUserVerifyOTP);

apirouter.post("/resetpassword", handleUserResetPassword);

apirouter.get("/user",authenticate, handleUserGet);

apirouter.get("/event", handleEventGet);

apirouter.get("/isauthenticated", (req, res) => {
  const cookie = req.headers.cookie;
  let _jwttoken;
  cookie?.split(";").forEach((cookie) => {
    if (cookie.startsWith("jwt")) {
      _jwttoken = cookie.split("=")[1];
      return;
    }
  });

  if (!_jwttoken) {
    return res.status(401).send("Token Missing.");
  }

  console.log(_jwttoken);
  console.log(process.env.SECRET_KEY);
  try {
    const decoded = jwt.verify(_jwttoken, process.env.SECRET_KEY!);
    console.log(decoded);
  } catch (err) {
    return res.status(401).send("Unauthorized");
  }
  res.status(200).send("Authorized");
});

export default apirouter;
