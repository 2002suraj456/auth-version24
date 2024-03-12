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

import {
  getAllUsers,
  getEventsRegistration,
  restrictToAdmin,
  deleteUser,
  registerUserForEvent,
  deleteEventRegistration,
} from "../controllers/user/admin";

const apirouter = Router();

apirouter.get("/test", (req, res) => {
  res.send("test");
});
apirouter.post("/login", handleUserLogin);

apirouter.post("/signup", handleUserSignup);

apirouter.post("/forgetpassword", handleForgetPassword);

apirouter.post("/resetpassword", handleUserResetPassword);

apirouter.post("/checkuser", handleCheckUser);

apirouter.post("/confirmemail", handleConfirmEmail);

apirouter.get("/user", authenticate, handleUserGet);

apirouter.get("/event", handleEventGet);

apirouter.post("/registerevent", authenticate, handleEventRegister);

apirouter.get("/isauthenticated", authenticate, (req, res) => {
  res.status(200).json({ status: "success" });
});

apirouter.use(authenticate);
apirouter.use(restrictToAdmin);

apirouter.get("/admin/eventRegistrations", getEventsRegistration);
apirouter.get("/admin/users", getAllUsers);
apirouter.delete("/admin/user", deleteUser);
apirouter.post("/admin/eventRegistration", registerUserForEvent);
apirouter.delete("/admin/eventRegistration", deleteEventRegistration);

export default apirouter;
