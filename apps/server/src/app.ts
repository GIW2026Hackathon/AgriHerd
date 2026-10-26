import express from "express";
import helmet from "helmet";
import { loadSession, assertSameOrigin, requirePasswordRotation } from "./auth.js";
import { config } from "./config.js";
import { errorHandler, HttpError } from "./http.js";
import { phase3Router } from "./phase3-routes.js";
import { phase2Router } from "./phase2-routes.js";
import { phase4Router } from "./phase4-routes.js";
import { apiRouter } from "./routes.js";

export const app = express();

app.disable("x-powered-by");
if (config.NODE_ENV === "production") {
  app.set("trust proxy", 1);
}
app.use(helmet());
app.use(express.json({ limit: "32kb" }));
app.use("/api/v1", assertSameOrigin);
app.use("/api/v1", loadSession);
app.use("/api/v1", requirePasswordRotation);
app.use("/api/v1", apiRouter);
app.use("/api/v1", phase2Router);
app.use("/api/v1", phase3Router);
app.use("/api/v1", phase4Router);
app.get("/health", (_request, response) => {
  response.json({ data: { status: "ok" } });
});
app.use((_request, _response, next) => {
  next(new HttpError(404, "NOT_FOUND", "The requested resource was not found."));
});
app.use(errorHandler);
