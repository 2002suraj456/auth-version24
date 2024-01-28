import { createClient } from "redis";

const client = createClient();

(async () => {
  try {
    await client.connect();
    console.log("Connected to Redis");
  } catch (error) {
    console.log(error);
    process.exit(4);
  }
})();

export default client;
