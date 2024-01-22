import zod from "zod";
// TODO: change the schema and db to have more fields
export const signupUserSchema = zod.object({
  name: zod.string().min(1).max(100),
  email: zod.string().email(),
  password: zod.string().min(8).max(100),
});


export const loginUserSchema = zod.object({
  email: zod.string().email(),
  password: zod.string().min(8).max(100),
});

export const forgetPasswordSchema= zod.object({
  token: zod.string().min(1), 
  newPassword: zod.string().min(8).max(100),
});
