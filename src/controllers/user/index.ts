import express from "express";
import prisma from "../../../db";
import { loginUserSchema, signupUserSchema } from "../../models";
import {
  UserAlreadyExistsError,
  UserNotExistError,
  UserPasswordIncorrectError,
  handleUserSignupError,
  handleUserLoginError
} from "./error";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

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
export async function handleUserForgetPassword() {}
