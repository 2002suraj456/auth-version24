import express from "express";
import { handleUserSignup ,handleUserLogin, handleUserForgetPassword} from "../controllers/user";
const userRouter = express.Router();

userRouter.post("/login", handleUserLogin);
userRouter.post("/signup", handleUserSignup);
userRouter.post("/forgetPassword", handleUserForgetPassword);

export default userRouter;
