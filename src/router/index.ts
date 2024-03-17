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
import prisma from "../../db/prisma";

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

apirouter.get("/isauthenticated", authenticate, async (req, res) => {
  const email = res.locals.context.email;
  const user = await prisma.user.findUnique({
    where: {
      email,
    },
    select: {
      email: true,
      name: true,
      password: false,
      university: true,
      mobile: true,
      rollno: true,
      role: false,
      isEmailConfirmed: true,
      emailToken: false,
      passwordResetToken: false,
      passwordResetTokenExpiry: false,
      passwordChangedAt: false,
      createdAt: false,
      id: true,
      event: {
        select: {
          eventName: true,
          teamName: true,
        },
      },
    },
  });

  if (!user) {
    return res.status(401).json({ status: "error", message: "User not found" });
  }

  res.status(200).json({ status: "success", data: user });
});

apirouter.use(authenticate);
apirouter.use(restrictToAdmin);

apirouter.post("/admin/eventRegistrations", getEventsRegistration);
apirouter.get("/admin/users", getAllUsers);
apirouter.delete("/admin/user", deleteUser);
apirouter.post("/admin/eventRegistration", registerUserForEvent);
apirouter.delete("/admin/eventRegistration", deleteEventRegistration);

export default apirouter;
