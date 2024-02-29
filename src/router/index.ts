import { Router } from "express";
import {
  handleUserSignup,
  handleUserLogin,
  handleForgetPassword,
  handleUserResetPassword,
  handleUserGet,
  handleEventGet,
  authenticate,
  handleEventRegister,
  handleConfirmEmail,
  handleCheckUser,
} from "../controllers/user";

const apirouter = Router();

apirouter.get("/test", (req, res) => {
  res.send("test");
});
apirouter.post("/login", handleUserLogin);

apirouter.post("/signup", handleUserSignup);

apirouter.post("/forgetpassword", handleForgetPassword);

apirouter.post("/resetpassword", handleUserResetPassword);

apirouter.get("/checkuser", handleCheckUser);

apirouter.post("/confirmemail", handleConfirmEmail);

apirouter.get("/user", authenticate, handleUserGet);

apirouter.get("/event", handleEventGet);

apirouter.post("/registerevent", authenticate, handleEventRegister);

apirouter.get("/isauthenticated", authenticate, (req, res) => {
  const user = res.locals.context;

  res.status(200).json({ status: "success", user });
});

export default apirouter;
