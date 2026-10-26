import { app } from "./app.js";
import { config } from "./config.js";
import { prisma } from "./db.js";

const server = app.listen(config.PORT, config.HOST, () => {
  console.info(`AgriHerd API listening on ${config.HOST}:${config.PORT}`);
});

async function shutdown(signal: string) {
  console.info(`${signal} received; shutting down.`);
  server.close(async (error) => {
    if (error) {
      console.error("HTTP server failed to close cleanly", error);
      process.exitCode = 1;
    }
    await prisma.$disconnect();
  });
}

process.on("SIGINT", () => void shutdown("SIGINT"));
process.on("SIGTERM", () => void shutdown("SIGTERM"));
