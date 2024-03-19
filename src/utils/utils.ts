import xss from "xss";
import express from "express";
import { ParsedQs } from "qs";

const sanitizeInput = (
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
  // ...
) => {
  // Sanitize query parameters
  req.query = xss(JSON.stringify(req.query)) as unknown as ParsedQs;

  // Sanitize request body
  if (req.body) {
    req.body = xss(req.body);
  }

  // Sanitize request params
  if (req.params) {
    req.params = xss(JSON.stringify(req.params)) as any;
  }

  next();
};

export { sanitizeInput };
