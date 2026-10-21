import { defineConfig } from "@trigger.dev/sdk/v3";

export default defineConfig({
  project: "app-padaria-da-vila",
  runtime: "node",
  logLevel: "log",
  maxDuration: 300,
  retries: {
    enabledInDev: true,
    default: {
      maxAttempts: 5,
      minTimeoutInMs: 2000,
      maxTimeoutInMs: 30000,
      factor: 2,
    },
  },
  dirs: ["./src/trigger"],
});
