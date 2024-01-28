import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export default prisma;

// async function main() {
//   const newUser = await prisma.user.create({
//     data: {
//       email: "surajsoren456@gmail.com",
//       username: "2002suraj456",
//     },
//   });

//   console.log("New user :");
//   console.log(newUser);

//   const firstTweet = await prisma.tweet.create({
//     data: {
//       text: "This is my 1st tweet",
//       userid: newUser.user_id,
//     },
//   });

//   console.log("First Tweet :");
//   console.log(firstTweet);

//   const newUserWithTweets = await prisma.user.findUnique({
//     where: {
//       email: "surajsoren456@gmail.com",
//     },
//     include: { tweets: true },
//   });

//   console.log("user object with tweets :");
//   console.log(newUserWithTweets);
// }

// main()
//   .catch((err) => {
//     throw err;
//   })
//   .finally(async () => {
//     await prisma.$disconnect();
//   });
