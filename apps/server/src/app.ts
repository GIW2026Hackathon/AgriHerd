import express from "express";
import helmet from "helmet";
import { loadSession, assertSameOrigin } from "./auth.js";
import { config } from "./config.js";
import { errorHandler, HttpError } from "./http.js";
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
app.use("/api/v1", apiRouter);
app.get("/health", (_request, response) => {
  response.json({ data: { status: "ok" } });
});
app.use((_request, _response, next) => {
  next(new HttpError(404, "NOT_FOUND", "The requested resource was not found."));
});
app.use(errorHandler);
