import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  //     const e1 = await prisma.event.create({
  //         data:{
  //             name: "Event 1",
  //         }
  //     })

  //     const e2 = await prisma.event.create({
  //         data:{
  //             name: "Event 2",
  //         }
  //     })

  //   const newUser = await prisma.user.create({
  //     data: {
  //         email: "surajsoren456@gmail.com",
  //         name: "Suraj Soren",
  //         mobile: "1234567890",
  //         password: "123456",
  //         university: "NIT Jamshedpur",
  //     },
  //   });
  // --------------------------------------------------
  //     const user = await prisma.user.findUnique({
  //       where: {
  //         email: "surajsoren456@gmail.com",
  //       },
  //     });

  //   const event = await prisma.event.findUnique({
  //     where: {
  //       name: "Event 1",
  //     },
  //   });

  //   console.log(event)
  //   console.log(user);
  //   console.log("--------------------------------------------------")
  //   const updateduser = await prisma.user.update({
  //     where: {
  //       email: "surajsoren456@gmail.com",
  //     },
  //     data: {
  //       participation: {
  //         connect: { id: event?.id },
  //       },
  //     },
  //   });
  //   console.log(event)
  //   console.log(updateduser);

  // --------------------------------------------------

  //   const user = await prisma.user.findUnique({
  //     where: {
  //       email: "surajsoren456@gmail.com",
  //     },
  //     include: {
  //       participation: true,
  //     },
  //   });

  // const event = await prisma.event.findUnique({
  //   where: {
  //     name: "Event 2",
  //   },
  // });

  // console.log(event);
  // console.log("--------------------------------------------------");
  // const updateduser = await prisma.user.update({
  //   where: {
  //     email: "surajsoren456@gmail.com",
  //   },
  //   data: {
  //     participation: {
  //       connect: { id: event?.id },
  //     },
  //   },
  // });

  // const user = await prisma.user.findUnique({
  //   where: {
  //     email: "surajsoren456@gmail.com",
  //   },
  //   include: {
  //     participation: true,
  //   },
  // });

  // console.log(user);

  const eventlist = [
    "CodeBlitz",
    "Cryptic Coder",
    "Immerse Craft",
    "Decode Craft",
    "Game Fiesta",
    "Squid Quiz",
    "Dev Day",
    "Heads Up",
    "Cupocalyse Combat",
    "Map Quest",
  ];

  await Promise.all(
    eventlist.map(async (event) => {
      await prisma.event.create({
        data: {
          name: event,
        },
      });
    })
  );
}

main()
  .catch((err) => {
    throw err;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
