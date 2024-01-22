import express from "express";
import { Prisma } from "@prisma/client";
import { z } from "zod";

export class UserAlreadyExistsError extends Error {
  constructor(email: string) {
    super(`User with email ${email} already exists`);
    this.name = "UserAlreadyExistsError";
    Object.setPrototypeOf(this, UserAlreadyExistsError.prototype);
  }
}

export class UserNotExistError extends Error {
  constructor(email: string) {
    super(`User with email ${email} does not exists`);
    this.name = "UserNotExist";
    Object.setPrototypeOf(this, UserNotExistError.prototype);
  }
}

export class UserPasswordIncorrectError extends Error {
  constructor(email: string) {
    super(`User with email ${email} password is incorrect`);
    this.name = "UserPasswordIncorrect";
    Object.setPrototypeOf(this, UserPasswordIncorrectError.prototype);
  }
}

export class UserTokenInvalidError extends Error {
  constructor() {
    super('User token is invalid');
    this.name = 'UserTokenInvalidError';
    Object.setPrototypeOf(this, UserTokenInvalidError.prototype);
  }
}

export function handleUserSignupError(res: express.Response, error: any) {
  if (
    error instanceof z.ZodError ||
    error instanceof Prisma.PrismaClientKnownRequestError ||
    error instanceof UserAlreadyExistsError
  ) {
    res.status(400).json({
      status: "error",
      error: error.message,
    });
  } else {
    res.status(500).json({
      status: "error",
      error: "Something went wrong",
    });
  }
}

export function handleUserLoginError(res: express.Response, error: any) {
  if (
    error instanceof z.ZodError ||
    error instanceof Prisma.PrismaClientKnownRequestError ||
    error instanceof UserNotExistError ||
    error instanceof UserPasswordIncorrectError
  ) {
    res.status(400).json({
      status: "error",
      error: error.message,
    });
  } else {
    res.status(500).json({
      status: "error",
      error: "Something went wrong",
    });
  }
}

export function  handleUserForgetPasswordError(res: express.Response, error: any) {
  if (
    error instanceof z.ZodError ||
    error instanceof Prisma.PrismaClientKnownRequestError ||
    error instanceof  UserTokenInvalidError
  ) {
    res.status(400).json({
      status: "error",
      error: error.message,
    });
  } else {
    res.status(500).json({
      status: "error",
      error: error.message,
    });
  }
}