import { createHash, randomBytes } from "node:crypto";
import { parse, serialize } from "cookie";
import type { NextFunction, Request, Response } from "express";
import { prisma } from "./db.js";
import { config, sessionCookieName, sessionLifetimeMs } from "./config.js";
import { HttpError } from "./http.js";

export type AuthenticatedUser = {
  id: string;
  fullName: string;
  email: string;
  role: "FARMER" | "FARM_WORKER" | "PROFESSIONAL" | "ADMIN";
};

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
      sessionId?: string;
    }
  }
}

function digestToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function cookieOptions(expiresAt?: Date) {
  return {
    httpOnly: true,
    secure: config.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/api/v1",
    ...(expiresAt ? { expires: expiresAt } : {}),
  };
}

export async function createSession(userId: string, response: Response) {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + sessionLifetimeMs);
  await prisma.session.create({
    data: { tokenHash: digestToken(token), userId, expiresAt },
  });
  response.appendHeader(
    "Set-Cookie",
    serialize(sessionCookieName, token, cookieOptions(expiresAt)),
  );
}

export async function destroySession(request: Request, response: Response) {
  const token = parse(request.headers.cookie ?? "")[sessionCookieName];
  if (token) {
    await prisma.session.deleteMany({ where: { tokenHash: digestToken(token) } });
  }
  response.appendHeader(
    "Set-Cookie",
    serialize(sessionCookieName, "", { ...cookieOptions(), maxAge: 0 }),
  );
}

export async function loadSession(request: Request, _response: Response, next: NextFunction) {
  try {
    const token = parse(request.headers.cookie ?? "")[sessionCookieName];
    if (!token) {
      next();
      return;
    }

    const session = await prisma.session.findUnique({
      where: { tokenHash: digestToken(token) },
      include: { user: true },
    });

    if (!session || session.expiresAt <= new Date() || session.user.status !== "ACTIVE") {
      if (session) {
        await prisma.session.delete({ where: { id: session.id } });
      }
      next();
      return;
    }

    request.sessionId = session.id;
    request.user = {
      id: session.user.id,
      fullName: session.user.fullName,
      email: session.user.email,
      role: session.user.role,
    };
    next();
  } catch (error) {
    next(error);
  }
}

export function requireUser(request: Request): AuthenticatedUser {
  if (!request.user) {
    throw new HttpError(401, "UNAUTHENTICATED", "Sign in to continue.");
  }
  return request.user;
}

export function requireFarmer(request: Request): AuthenticatedUser {
  const user = requireUser(request);
  if (user.role !== "FARMER") {
    throw new HttpError(403, "FORBIDDEN", "This action is available to farm owners.");
  }
  return user;
}

export function assertSameOrigin(request: Request, _response: Response, next: NextFunction) {
  const method = request.method.toUpperCase();
  if (["GET", "HEAD", "OPTIONS"].includes(method)) {
    next();
    return;
  }

  if (request.get("origin") !== config.WEB_ORIGIN) {
    next(new HttpError(403, "INVALID_ORIGIN", "Request origin is not allowed."));
    return;
  }
  next();
}
