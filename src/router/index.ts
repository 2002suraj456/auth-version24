import { Router } from "express";
import {
  handleUserSignup,
  handleUserLogin,
  handleUserGenerateOTP,
  handleUserVerifyOTP,
  handleUserResetPassword,
  handleUserGet,
  handleEventGet,
  authenticate,
  handleEventRegister,
} from "../controllers/user";

const apirouter = Router();

apirouter.get("/test", (req, res) => {
  res.send("test");
});
apirouter.post("/login", handleUserLogin);

apirouter.post("/signup", handleUserSignup);

apirouter.post("/generateotp", handleUserGenerateOTP);

apirouter.post("/verifyotp", handleUserVerifyOTP);

apirouter.post("/resetpassword", handleUserResetPassword);

apirouter.get("/user", authenticate, handleUserGet);

apirouter.get("/event", handleEventGet);

apirouter.post("/register", authenticate, handleEventRegister);

apirouter.get("/isauthenticated", authenticate, (req, res) => {
  const user = res.locals.context;

  res.status(200).json({ status: "success", user });
});

export default apirouter;
