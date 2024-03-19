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

export async function deleteUsers(req: express.Request, res: express.Response) {
  try {
    const emails = req.body.emails as string[];

    if (emails.length === 0) {
      throw new UserSpecificError("Email is required");
    }

    // find the teamNames of the users in the event table
    const teamNames = await prisma.event.findMany({
      where: {
        participants: {
          email: {
            in: emails,
          },
        },
      },
      select: {
        teamName: true,
      },
    });

    let teamNamesArr = teamNames.map((el) => el.teamName);

    teamNamesArr = teamNamesArr.filter((el) => el !== null);

    // Delete events for participants with multiple emails
    await prisma.event.deleteMany({
      where: {
        participants: {
          email: {
            in: emails,
          },
        },
      },
    });

    // Delete eventReg with this teamNames
    await prisma.event.deleteMany({
      where: {
        teamName: {
          in: teamNamesArr,
        },
      },
    });

    // Delete users for multiple emails
    await prisma.user.deleteMany({
      where: {
        email: {
          in: emails,
        },
      },
    });

    res.status(200).json({
      status: "success",
      message: "Users deleted",
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

    if (teamName !== null && teamName !== undefined && teamName !== "") {
      const teamNameExists = await prisma.event.findFirst({
        where: {
          eventName,
          teamName,
        },
      });

      if (teamNameExists) {
        throw new UserSpecificError("Team name already exists");
      }
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
  } catch (error: any) {
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

export async function deleteEventRegistrations(
  req: express.Request,
  res: express.Response
) {
  try {
    const eventName = req.body.eventName as string;
    const emails = req.body.emails as string[];
    const teamNames = req.body.teamNames as string[];

    if (!eventName || !emails) {
      throw new UserSpecificError("Event name and email are required");
    }

    if (teamNames && teamNames.length > 0) {
      await prisma.event.deleteMany({
        where: {
          eventName,
          teamName: {
            in: teamNames,
          },
        },
      });
    } else {
      await prisma.event.deleteMany({
        where: {
          eventName,
          participants: {
            email: {
              in: emails,
            },
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
