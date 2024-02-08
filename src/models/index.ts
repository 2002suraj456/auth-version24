import zod from "zod";
export const signupUserSchema = zod.object({
  name: zod.string().min(1).max(100),
  email: zod.string().email("Invalid email format."),
  password: zod.string().min(8, "Too small password").max(100),
  university: zod.string().min(1).max(100),
  mobile: zod.string().length(10, "10 digit mobile number required"),
  rollno: zod.string().min(1).max(15),
});

export const loginUserSchema = zod.object({
  email: zod.string().email("Invalid email format."),
  password: zod.string().min(8, "Too small password").max(100),
});