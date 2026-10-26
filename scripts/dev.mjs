import { spawn } from "node:child_process";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const rootDirectory = resolve(fileURLToPath(new URL(".", import.meta.url)), "..");
const processes = [
  {
    name: "api",
    cwd: resolve(rootDirectory, "apps/server"),
    command: resolve(rootDirectory, "node_modules/tsx/dist/cli.mjs"),
    args: ["watch", "src/index.ts"],
  },
  {
    name: "web",
    cwd: resolve(rootDirectory, "apps/web"),
    command: resolve(rootDirectory, "apps/web/node_modules/vite/bin/vite.js"),
    args: [],
  },
];

const children = processes.map(({ name, cwd, command, args }) => {
  const child = spawn(process.execPath, [command, ...args], {
    cwd,
    env: process.env,
    stdio: "inherit",
  });

  child.on("error", (error) => {
    console.error(`[${name}] ${error.message}`);
  });

  child.on("exit", (code, signal) => {
    if (signal) {
      console.log(`[${name}] stopped by ${signal}`);
    } else if (code !== 0) {
      console.error(`[${name}] exited with code ${code}`);
    }
  });

  return child;
});

const stopChildren = () => {
  for (const child of children) {
    if (!child.killed) {
      child.kill();
    }
  }
};

process.on("SIGINT", () => {
  stopChildren();
  process.exit(130);
});

process.on("SIGTERM", () => {
  stopChildren();
  process.exit(143);
});
