import express from "express";
import { Prisma } from "@prisma/client";
import { z } from "zod";

export class UserAlreadyExistsError extends Error {
  constructor(email: string){
    super(`User with email ${email} already exists`);
    this.name = 'UserAlreadyExistsError';
    }
}

export class UserNotExistError extends Error {
  constructor(email: string){
    super(`User with email ${email} does not exists`);
    this.name = 'UserNotExist';
    }
}

export class UserPasswordIncorrectError extends Error {
  constructor(email: string){
    super(`User with email ${email} password is incorrect`);
    this.name = 'UserPasswordIncorrect';
    }
}

export function handleUserSignupError(res: express.Response, error: any) {
  if (error instanceof z.ZodError || error instanceof Prisma.PrismaClientKnownRequestError) {
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
  if (error instanceof z.ZodError || error instanceof Prisma.PrismaClientKnownRequestError) {
    res.status(400).json({
      status: "error",
      error: error.message,
    });
  } else if(error instanceof UserNotExistError || error instanceof UserPasswordIncorrectError){
    res.status(400).json({
      status: "error",
      error: error.message,
    });
  }else{
    res.status(500).json({
      status: "error",
      error: "Something went wrong",
    });
  }
}