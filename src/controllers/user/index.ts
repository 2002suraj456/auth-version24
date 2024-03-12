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
import { z } from "zod";

import Email from "../../utils/email";
import crypto from "crypto";

async function createToken(str: string, userId: number): Promise<string> {
  const token = crypto.randomBytes(32).toString("hex");
  const hashedToken = await crypto
    .createHash("sha256")
    .update(token)
    .digest("hex");

  let updateData = {};

  if (str === "passwordReset") {
    updateData = {
      passwordResetToken: hashedToken,
      passwordResetTokenExpiry: new Date(Date.now() + 10 * 60 * 1000),
    };
  } else if (str === "emailConfirmation") {
    updateData = {
      emailToken: hashedToken,
    };
  }

  await prisma.user.update({
    where: { id: userId },
    data: updateData,
  });

  return token;
}

export async function handleCheckUser(
  req: express.Request,
  res: express.Response
) {
  try {
    const { email } = z
      .object({
        email: z.string(),
      })
      .parse(req.body);

    let user = await prisma.user.findFirst({
      where: { email },
    });

    if (!user) {
      return res.status(404).send({
        status: "error",
        message: "This User is not registered on Version.",
      });
    } else {
      return res.status(200).send({
        status: "success",
        message: "User exists",
      });
    }
  } catch (error: any) {
    return res.status(400).send({
      status: "error",
      message: error.errors[0].message,
    });
  }
}

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

    const emailConfirmationToken = await createToken(
      "emailConfirmation",
      user.id
    );

    const url = `${req.protocol}://${req.hostname}/confirmEmail/${emailConfirmationToken}`;

    await new Email(
      user,
      url,
      email,
      "Account Confirmation"
    ).sendAccountConfirmation();

    return res.status(200).json({
      status: "success",
      message: "Successfully Signed Up",
    });
  } catch (error) {
    console.log(error);
    handleUserSignupError(res, error);
  }
}

export async function handleConfirmEmail(
  req: express.Request,
  res: express.Response
) {
  try {
    const { emailConfirmToken } = z
      .object({
        emailConfirmToken: z.string(),
      })
      .parse(req.body);

    const hashedToken = await crypto
      .createHash("sha256")
      .update(emailConfirmToken)
      .digest("hex");

    const user = await prisma.user.findFirst({
      where: {
        emailToken: hashedToken,
      },
    });

    const email = user?.email;

    await prisma.user.update({
      where: { email },
      data: { isEmailConfirmed: true },
    });

    return res.status(200).send({
      status: "success",
      message: "Email Confirmed successfully",
    });
  } catch (error) {
    console.log(error);
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

    if (!user.isEmailConfirmed) {
      return res.status(403).json({
        status: "error",
        tag: "emailNotConfirmed",
        message: "Email not confirmed",
      });
    }

    const expiresTimeInMs =
      Number(process.env.JWT_EXPIRES_IN) * 60 * 60 * 24 * 1000;

    const JWTtoken = jwt.sign({ email }, process.env.SECRET_KEY as string, {
      expiresIn: expiresTimeInMs,
    });

    res.cookie("jwt", JWTtoken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: expiresTimeInMs,

      // maxAge: Number(process.env.JWT_EXPIRES_IN) * 30 * 1000,
    });

    const { password: _, createdAt, mobile, ...restUser } = user;

    return res.status(200).json({
      status: "success",
      message: "User logged in",
      user: restUser,
    });
  } catch (err) {
    console.log(err);
    handleUserLoginError(res, err);
  }
}

export async function handleForgetPassword(
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

    const resetToken = await createToken("passwordReset", user.id);

    const url = `${req.protocol}://${req.hostname}/resetPassword/${resetToken}`;

    await new Email(user, url, email, "Password Reset").sendResetToken();

    return res.status(200).send({
      status: "success",
      message: "Mail Sent Successfully",
    });
  } catch (err) {
    console.error(err);
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

export async function handleUserResetPassword(
  req: express.Request,
  res: express.Response
) {
  try {
    const { password, resetToken } = z
      .object({
        password: z.string().min(8, "Too small password").max(100),
        resetToken: z.string(),
      })
      .parse(req.body);

    const hashedToken = await crypto
      .createHash("sha256")
      .update(resetToken)
      .digest("hex");

    const user = await prisma.user.findFirst({
      where: {
        passwordResetToken: hashedToken,
        passwordResetTokenExpiry: {
          gte: new Date(),
        },
      },
    });

    if (!user) {
      return res.status(403).json({
        status: "error",
        message: "Reset Token has expired or its invalid",
      });
    }

    await prisma.user.update({
      where: { email: user?.email },
      data: { passwordResetToken: "", passwordChangedAt: new Date() },
    });

    if (!user) {
      res.status(403).json({
        status: "error",
        message: "Reset Token has expired or its invalid",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const email = user?.email;

    await prisma.user.update({
      where: { email },
      data: { password: hashedPassword },
    });

    return res.status(200).send({
      status: "success",
      message: "Password updated successfully",
    });
  } catch (error) {
    console.log(error);
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

    return res
      .status(500)
      .json({ status: "error", message: "Internal server error" });
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
      cookie = cookie.trim();
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

    // Check if user has changed password after the token was issued
    const email = res.locals.context.email;
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      throw new UserNotExistError(email);
    }

    if (user.passwordChangedAt) {
      const changedTimestamp = user.passwordChangedAt.getTime() / 1000;
      if (changedTimestamp > res.locals.context.iat) {
        throw new UserTokenInvalidError();
      }
    }

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

    const teamNameExists = await prisma.event.findFirst({
      where: {
        eventName,
        teamName,
      },
    });

    if (teamNameExists) {
      throw new UserSpecificError("Team name already exists");
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

    console.log(error);

    return res
      .status(500)
      .json({ status: "error", message: "Internal server error" });
  }
}
