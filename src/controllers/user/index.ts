import express from "express";
import prisma from "../../../db/prisma";
import {
  loginUserSchema,
  signupUserSchema,
  forgetPasswordSchema,
} from "../../models";
import {
  UserAlreadyExistsError,
  UserNotExistError,
  UserPasswordIncorrectError,
  UserTokenInvalidError,
  handleUserSignupError,
  handleUserLoginError,
  handleUserForgetPasswordError,
} from "./error";
import bcrypt from "bcrypt";
import jwt, { JwtPayload } from "jsonwebtoken";
import { randomInt } from "crypto";
import client from "../../../db/redis";
import { z } from "zod";

export async function handleUserSignup(
  req: express.Request,
  res: express.Response
) {
  try {
    const { email, password, name, mobile, university } =
      signupUserSchema.parse(req.body);

    const user = await prisma.user.findFirst({
      where: { email },
    });

    if (user) {
      throw new UserAlreadyExistsError(user.email);
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await prisma.user.create({
      data: { name, email, password: hashedPassword, mobile, university },
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
      maxAge: Number(process.env.JWT_EXPIRES_IN),
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
    const decodedToken = jwt.verify(
      token,
      process.env.SECRET_KEY as string
    ) as JwtPayload;

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

export async function handleUserGenerateOTP(
  req: express.Request,
  res: express.Response
) {
  const { email } = z
    .object({
      email: z.string().email(),
    })
    .parse(req.body);
  const _otp = randomInt(100000, 999999).toString();
  try {
    await client.set(email, _otp);
  } catch (err) {
    res.status(500).send("Internal server error");
    return;
  }

  // TODO: send otp to email

  res.status(200).send("otp generated");
}

export async function handleUserVerifyOTP(
  req: express.Request,
  res: express.Response
) {
  const { otp, email } = z
    .object({
      otp: z.string().length(6),
      email: z.string().email(),
    })
    .parse(req.body);

  const _otp = await client.get(email);

  if (otp === _otp) {
    res.status(200).send("Otp verfied successfully");
    return;
  } else {
    res.status(400).send("Wrong OTP");
  }
}

export async function handleUserResetPassword(
  req: express.Request,
  res: express.Response
) {
  try {
    const { email, password } = z
      .object({
        email: z.string().email(),
        password: z.string().min(8),
      })
      .parse(req.body);

    const hashedPassword = await bcrypt.hash(password, 10);

    await prisma.user.update({
      where: { email },
      data: { password: hashedPassword },
    });

    res.status(200).send("Password reset successfully");
  } catch (error) {
    res.status(500).send("Internal server error");
  }
}

export async function handleUserGet(
  req: express.Request,
  res: express.Response
) {
  console.log(res.locals.context);
  try {
    const { email } = z
      .object({
        email: z.string().email(),
      })
      .parse(req.body);

    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        participation: true,
      },
    });

    if (!user) {
      throw new UserNotExistError(email);
    }

    res.status(200).json({ status: "success", user });
  } catch (error) {
    res.status(500).json({ status: "error", message: "Internal server error" });
  }
}

export async function handleEventGet(
  req: express.Request,
  res: express.Response
) {
  try {
    const { email } = z
      .object({
        email: z.string().email(),
      })
      .parse(req.body);

    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        participation: true,
      },
    });

    if (!user) {
      throw new UserNotExistError(email);
    }

    res.status(200).json({ status: "success", user });
  } catch (error) {
    res.status(500).json({ status: "error", message: "Internal server error" });
  }
}

export async function handleEventParticipantsGet(
  req: express.Request,
  res: express.Response
) {
  try {
    const { event } = z
      .object({
        event: z.string(),
      })
      .parse(req.body);

    const participants = await prisma.event.findUnique({
      where: {
        name: event,
      },
      select: {
        participants: true,
      },
    });

    res.status(200).json({ status: "success", participants });
  } catch (error) {
    res.status(500).json({ status: "error", message: "Internal server error" });
  }
}

export async function authenticate(
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
) {
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
    res.locals.context = decoded;
  } catch (err) {
    return res.status(401).send("Unauthorized");
  }
  next();
}
