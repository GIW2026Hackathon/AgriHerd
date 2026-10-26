import { FarmMembershipRole } from "@prisma/client";
import type { Request } from "express";
import { prisma } from "./db.js";
import { requireUser } from "./auth.js";
import { HttpError } from "./http.js";

export async function requireFarmMembership(
  request: Request,
  farmId: string,
  minimumRole: FarmMembershipRole = FarmMembershipRole.WORKER,
) {
  const user = requireUser(request);
  const membership = await prisma.farmMembership.findUnique({
    where: { farmId_userId: { farmId, userId: user.id } },
  });

  if (!membership || membership.status !== "ACTIVE") {
    throw new HttpError(404, "FARM_NOT_FOUND", "Farm not found.");
  }

  const roleOrder: Record<FarmMembershipRole, number> = {
    WORKER: 1,
    MANAGER: 2,
    OWNER: 3,
  };
  if (roleOrder[membership.role] < roleOrder[minimumRole]) {
    throw new HttpError(403, "FORBIDDEN", "You do not have permission to make this change.");
  }

  return membership;
}
