import express from "express";
import prisma from "../../../db/prisma";
import { loginUserSchema, signupUserSchema } from "../../models";
import {
  UserAlreadyExistsError,
  UserNotExistError,
  UserPasswordIncorrectError,
  UserTokenInvalidError,
  handleUserSignupError,
  handleUserLoginError,
  UserSpecificError,
} from "./error";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { randomInt } from "crypto";
import client from "../../../db/redis";
import { z } from "zod";
import { transport } from "../../nodemailer";

export async function handleUserSignup(
  req: express.Request,
  res: express.Response
) {
  try {
    const { email, password, name, mobile, university, rollno } =
      signupUserSchema.parse(req.body);

    let user = await prisma.user.findFirst({
      where: { email },
    });

    if (user) {
      throw new UserAlreadyExistsError(user.email);
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        mobile,
        university,
        rollno,
      },
    });

    const JWTtoken = jwt.sign({ email }, process.env.SECRET_KEY as string, {
      expiresIn: process.env.JWT_EXPIRES_IN,
    });

    res.cookie("jwt", JWTtoken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: Number(process.env.JWT_EXPIRES_IN),
    });

    const { password: _, createdAt, mobile: __, ...restUser } = user;

    return res.status(200).json({
        status: "success",
        message: "Successfully Signed Up",
        user: restUser,
      });
  } catch (error) {
    handleUserSignupError(res, error);
  }
}

export async function handleUserLogin(
  req: express.Request,
  res: express.Response
) {
  try {
    const { email, password } = loginUserSchema.parse(req.body);

    const user = await prisma.user.findUnique({
      where: { email },
      include: { event: true },
    });

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

    const { password: _, createdAt, mobile, ...restUser } = user;

    return res.status(200).json({
      status: "success",
      message: "User logged in",
      user: restUser,
    });
  } catch (err) {
    handleUserLoginError(res, err);
  }
}

export async function handleUserGenerateOTP(
  req: express.Request,
  res: express.Response
) {
  try {
    const { email } = z
      .object({
        email: z.string().email("Invalid email format."),
      })
      .parse(req.body);

    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      throw new UserNotExistError(email);
    }

    const _otp = randomInt(100000, 999999).toString();

    await client.set(email, _otp);

    const _mailOpt = {
      from: '"Version24" <noreply@innovac23.tech>',
      to: email,
      subject: "Version 24 Account Recovery",
      html: `OTP for forget password : ${_otp}`,
    };

    await transport.sendMail(_mailOpt);

    return res.status(200).send({
      status: "success",
      message: "OTP sent.",
    });
  } catch (err) {
    if (err instanceof UserNotExistError) {
      return res.status(404).send({
        status: "error",
        message: err.message,
      });
    }

    if (err instanceof z.ZodError) {
      return res.status(400).send({
        status: "error",
        message: err.errors[0].message,
      });
    }

    return res.status(500).send({
      status: "error",
      message: "Internal server error",
    });
  }
}

export async function handleUserVerifyOTP(
  req: express.Request,
  res: express.Response
) {
  try {
    const { otp, email } = z
      .object({
        otp: z.string().length(6, "OTP must be 6 digit"),
        email: z.string().email("Invalid email format."),
      })
      .parse(req.body);

    const _otp = await client.get(email);

    if (otp === _otp) {
      return res.status(200).send({
        status: "success",
        message: "OTP verified successfully",
      });
    } else {
      return res.status(400).send({
        status: "error",
        message: "Wrong OTP",
      });
    }
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).send({
        status: "error",
        message: err.errors[0].message,
      });
    }

    return res.status(500).send({
      status: "error",
      message: "Internal server error",
    });
  }
}

export async function handleUserResetPassword(
  req: express.Request,
  res: express.Response
) {
  try {
    const { email, password, otp } = z
      .object({
        email: z.string().email("Invalid email format."),
        password: z.string().min(8, "Too small password").max(100),
        otp: z.string().length(6, "OTP must be 6 digit"),
      })
      .parse(req.body);

    const _otp = await client.get(email);

    if (otp !== _otp) {
      return res.status(400).send("Wrong OTP");
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    await prisma.user.update({
      where: { email },
      data: { password: hashedPassword },
    });

    return res.status(200).send({
      status: "success",
      message: "Password updated successfully",
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).send({
        status: "error",
        message: error.errors[0].message,
      });
    }

    return res.status(500).send({
      status: "error",
      message: "Internal server error",
    });
  }
}

export async function handleUserGet(
  req: express.Request,
  res: express.Response
) {
  const email = res.locals.context.email;
  try {
    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        event: true,
      },
    });

    if (!user) {
      throw new UserNotExistError(email);
    }

    const { password: _, createdAt, mobile, ...restUser } = user;

    return res.status(200).json({ status: "success", user: restUser });
  } catch (error) {
    if (error instanceof UserNotExistError) {
      return res.status(404).send({
        status: "error",
        message: error.message,
      });
    }

    return res.status(500).json({ status: "error", message: "Internal server error" });
  }
}

export async function handleEventGet(
  req: express.Request,
  res: express.Response
) {
  try {
    const { email } = z
      .object({
        email: z.string().email("Invalid email format."),
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

    return res.status(200).json({ status: "success", user });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res
        .status(400)
        .json({ status: "error", message: error.errors[0].message });
    }

    if (error instanceof UserNotExistError) {
      return res.status(404).send({
        status: "error",
        message: error.message,
      });
    }

    return res
      .status(500)
      .json({ status: "error", message: "Internal server error" });
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

    return res.status(200).json({ status: "success", participants });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res
        .status(400)
        .json({ status: "error", message: error.errors[0].message });
    }

    return res
      .status(500)
      .json({ status: "error", message: "Internal server error" });
  }
}

export async function authenticate(
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
) {
  try {
    const cookie = req.headers.cookie;
    let _jwttoken;
    cookie?.split(";").forEach((cookie) => {
      if (cookie.startsWith("jwt")) {
        _jwttoken = cookie.split("=")[1];
        return;
      }
    });

    if (!_jwttoken) {
      throw new UserTokenInvalidError();
    }

    jwt.verify(_jwttoken, process.env.SECRET_KEY!, (err, decoded) => {
      if (err) {
        throw new UserTokenInvalidError();
      }
      res.locals.context = decoded;
    });
    next();
  } catch (err) {
    if (err instanceof UserTokenInvalidError) {
      return res.status(401).send({
        status: "error",
        message: err.message,
      });
    }

    return res.status(500).send({
      status: "error",
      message: "Internal server error",
    });
  }
}

export async function handleEventRegister(
  req: express.Request,
  res: express.Response
) {
  const currentUser = res.locals.context.email;
  try {
    const { eventName, teamName, emails } = z
      .object({
        eventName: z.string(),
        teamName: z.string().optional(),
        emails: z.array(z.string().email("Invalid email format.")),
      })
      .parse(req.body);

    if (!teamName && emails.length > 1) {
      throw new UserSpecificError("Team name is required");
    }

    if (!emails.includes(currentUser)) {
      throw new UserSpecificError("You must be in the team");
    }

    const eventTransaction = await prisma.$transaction(
      emails.map((email) =>
        prisma.event.create({
      data: {
            eventName,
            teamName,
            participants: {
              connect: {
                email,
              },
        },
      },
        })
      )
    );

    const user = await prisma.user.findUnique({
      where: {
        email: currentUser,
      },
      include: {
        event: true,
      },
    });

    if (!user) {
      throw new Error();
    }
    const { password: _, createdAt, mobile, ...restUser } = user;

    return res.status(200).json({ status: "success", user: restUser });
  } catch (error: any) {
    console.error(error);
    if (error.code === "P2002") {
      return res
        .status(400)
        .json({ status: "error", message: "Teammates already registered" });
    }

    if (error instanceof z.ZodError) {
      return res
        .status(400)
        .json({ status: "error", message: error.errors[0].message });
    }

    if (error instanceof UserSpecificError) {
      return res.status(400).json({ status: "error", message: error.message });
    }
    return res
      .status(500)
      .json({ status: "error", message: "Internal server error" });
  }
}
