import express from "express";
import prisma from "../../../db";
import { loginUserSchema, signupUserSchema ,forgetPasswordSchema} from "../../models";
import {
  UserAlreadyExistsError,
  UserNotExistError,
  UserPasswordIncorrectError,
  UserTokenInvalidError,
  handleUserSignupError,
  handleUserLoginError,
  handleUserForgetPasswordError
} from "./error";
import bcrypt from "bcrypt";
import jwt ,{ JwtPayload }from "jsonwebtoken";

export async function handleUserSignup(
  req: express.Request,
  res: express.Response
) {
  try {
    const { email, password, name } = signupUserSchema.parse(req.body);

    const user = await prisma.user.findFirst({
      where: { email },
    });

    if (user) {
      throw new UserAlreadyExistsError(user.email);
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await prisma.user.create({
      data: { name, email, password: hashedPassword },
    });

    // TODO: change the json object
    res.status(201).json({ status: "success", user, message: "User created" });
  } catch (error) {
    handleUserSignupError(res, error);
  }
}

// TODO
export async function handleUserLogin(
  req: express.Request,
  res: express.Response
) {
  try {
    const { email, password } = loginUserSchema.parse(req.body);

    const user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      throw new UserNotExistError(email);
    }
    const isPasswordCorrect = bcrypt.compareSync(password, user.password);

    if (!isPasswordCorrect) {
      throw new UserPasswordIncorrectError(email);
    }

    const JWTtoken = jwt.sign({ email }, process.env.SECRET_KEY as string, {
      expiresIn: process.env.JWT_EXPIRES_IN,
    });

    res.cookie("jwt", JWTtoken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 1000 * 60 * 60 * 24 * 7,
    });

    res.status(200).json({
      status: "success",
      message: "User logged in",
    });

  } catch (err) {
    handleUserLoginError(res, err);
  }
}

// TODO
export async function handleUserForgetPassword(
  req: express.Request,
  res: express.Response
  ) {
    try {
      const { token, newPassword } = forgetPasswordSchema.parse(req.body);
  
      // Verify the reset token
      const decodedToken = jwt.verify(token, process.env.SECRET_KEY as string)as JwtPayload;
  
      if (!decodedToken || !decodedToken.email) {
        throw new UserTokenInvalidError();
      }
  
      const user = await prisma.user.findUnique({
        where: { email: decodedToken.email },
      });
  
      
  
      // Hash the new password
      const hashedPassword = await bcrypt.hash(newPassword, 10);
  
      // Update the user's password and clear the reset token fields
      await prisma.user.update({
        where: { email: decodedToken.email },
        data: {
          password: hashedPassword,
        },
      });
  
      res.status(200).json({
        status: "success",
        message: "Password successfully reset",
      });
  
    } catch (err) {
      handleUserForgetPasswordError(res, err);
    }
  

  }