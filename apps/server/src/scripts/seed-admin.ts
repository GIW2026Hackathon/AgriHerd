import "../load-env.js";
import bcrypt from "bcryptjs";
import { PrismaClient, UserRole } from "@prisma/client";
import { z } from "zod";

const environmentSchema = z.object({
  SEED_ADMIN_EMAIL: z.string().trim().email().transform((value) => value.toLowerCase()),
  SEED_ADMIN_NAME: z.string().trim().min(1).max(120),
  SEED_ADMIN_PASSWORD: z
    .string()
    .min(12)
    .max(128)
    .refine((password) => Buffer.byteLength(password, "utf8") <= 72),
});

const parsed = environmentSchema.safeParse(process.env);
if (!parsed.success) {
  throw new Error(`Admin seed configuration is invalid: ${parsed.error.message}`);
}

const prisma = new PrismaClient();

try {
  const existing = await prisma.user.findUnique({
    where: { email: parsed.data.SEED_ADMIN_EMAIL },
    select: { id: true, email: true, role: true },
  });
  if (existing && existing.role !== UserRole.ADMIN) {
    throw new Error(`The configured administrator email already belongs to a ${existing.role} account.`);
  }

  const user = existing ?? await prisma.user.create({
    data: {
      email: parsed.data.SEED_ADMIN_EMAIL,
      fullName: parsed.data.SEED_ADMIN_NAME,
      passwordHash: await bcrypt.hash(parsed.data.SEED_ADMIN_PASSWORD, 12),
      role: UserRole.ADMIN,
    },
    select: { id: true, email: true, role: true },
  });
  console.info(existing
    ? `Administrator account is already provisioned: ${user.email}.`
    : `Administrator account was provisioned: ${user.email}.`);
} finally {
  await prisma.$disconnect();
}
