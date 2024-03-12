import express from "express";
import prisma from "../../../db/prisma";
import { loginUserSchema, signupUserSchema } from "../../models";
import { UserSpecificError } from "./error";
import { z } from "zod";

export async function restrictToAdmin(
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
) {
  try {
    const email = res.locals.context.email;
    const user = await prisma.user.findUnique({
      where: {
        email,
      },
    });

    if (user?.role !== "admin") {
      throw new UserSpecificError(
        "You are not authorized to perform this action"
      );
    }

    next();
  } catch (err) {
    console.log(err);

    const msg = err?.message || "Something went wrong";
    res.status(500).json({
      status: "error",
      message: msg,
    });
  }
}

export async function getAllUsers(req: express.Request, res: express.Response) {
  try {
    const users = await prisma.user.findMany({
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

      where: {
        NOT: {
          role: {
            equals: "admin",
          },
        },
      },
    });

    res.status(200).json({
      status: "success",
      data: users,
    });
  } catch (err) {
    console.log(err);

    const msg = err?.message || "Something went wrong";
    res.status(500).json({
      status: "error",
      message: msg,
    });
  }
}

export async function deleteUser(req: express.Request, res: express.Response) {
  try {
    const email = req.body.email as string;

    if (!email) {
      throw new UserSpecificError("Email is required");
    }

    await prisma.user.delete({
      where: {
        email,
      },
    });

    await prisma.event.deleteMany({
      where: {
        participants: {
          email,
        },
      },
    });

    res.status(200).json({
      status: "success",
      message: "User deleted",
    });
  } catch (err) {
    console.log(err);

    const msg = err?.message || "Something went wrong";
    res.status(500).json({
      status: "error",
      message: msg,
    });
  }
}

export async function getEventsRegistration(
  req: express.Request,
  res: express.Response
) {
  try {
    const eventName = req.body.eventName as string;

    if (!eventName) {
      throw new UserSpecificError("Event name is required");
    }

    const events = await prisma.event.findMany({
      where: {
        eventName,
      },
      select: {
        participants: {
          select: {
            email: true,
            name: true,
            mobile: true,
            id: true,
          },
        },
        teamName: true,
      },
    });

    let mappedData = {
      participants: events.map((el) => ({
        id: el.participants.id,
        mobile: el.participants.mobile,
        email: el.participants.email,
        name: el.participants.name,
        teamName: el.teamName,
      })),
    };

    res.status(200).json({
      status: "success",
      data: mappedData,
    });
  } catch (err) {
    console.log(err);

    const msg = err?.message || "Something went wrong";
    res.status(500).json({
      status: "error",
      message: msg,
    });
  }
}

export async function registerUserForEvent(
  req: express.Request,
  res: express.Response
) {
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

    res.status(200).json({
      status: "success",
      message: "User registered for event",
      data: eventTransaction,
    });
  } catch (err) {
    console.log(err);

    const msg = err?.message || "Something went wrong";
    res.status(500).json({
      status: "error",
      message: msg,
    });
  }
}

export async function deleteEventRegistration(
  req: express.Request,
  res: express.Response
) {
  try {
    const eventName = req.body.eventName as string;
    const email = req.body.email as string;

    if (!eventName || !email) {
      throw new UserSpecificError("Event name and email are required");
    }

    const teamName = await prisma.event.findFirst({
      where: {
        eventName,
        participants: {
          email,
        },
      },
      select: {
        teamName: true,
      },
    });

    if (teamName) {
      await prisma.event.deleteMany({
        where: {
          eventName,
          teamName: teamName.teamName,
        },
      });
    } else {
      await prisma.event.deleteMany({
        where: {
          eventName,
          participants: {
            email,
          },
        },
      });
    }

    res.status(200).json({
      status: "success",
      message: "Event registration deleted",
    });
  } catch (err) {
    console.log(err);

    const msg = err?.message || "Something went wrong";
    res.status(500).json({
      status: "error",
      message: msg,
    });
  }
}
