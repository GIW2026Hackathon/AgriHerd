export type User = {
  id: string;
  fullName: string;
  email: string;
  role: "FARMER" | "FARM_WORKER" | "PROFESSIONAL" | "ADMIN";
  mustChangePassword: boolean;
};

export type Farm = {
  id: string;
  name: string;
  locationLabel: string | null;
  preferredUnits: "METRIC" | "IMPERIAL";
  membershipRole?: "OWNER" | "MANAGER" | "WORKER";
  _count?: { animals: number };
};

export type Animal = {
  id: string;
  farmId: string;
  internalCode: string;
  earTag: string | null;
  name: string;
  breed: string;
  sex: "FEMALE" | "MALE" | "UNKNOWN";
  purpose: "BEEF" | "DAIRY";
  birthDate: string | null;
  estimatedAgeMonths: number | null;
  status: "ACTIVE" | "INACTIVE" | "DECEASED" | "SOLD";
  createdAt: string;
};

type ApiError = {
  error?: {
    message?: string;
    details?: Array<{ field: string; message: string }>;
  };
};

export class RequestError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly details?: Array<{ field: string; message: string }>,
  ) {
    super(message);
  }
}

export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  if (init.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  const response = await fetch(`/api/v1${path}`, {
    ...init,
    headers,
    credentials: "include",
  });

  let payload: ApiError | null;
  try {
    const text = await response.text();
    payload = text ? (JSON.parse(text) as ApiError) : null;
  } catch {
    throw new RequestError("AgriHerd returned an invalid response. Please try again.", response.status);
  }
  if (!response.ok) {
    const details = payload?.error?.details;
    const detailMessage = details?.map((detail) => `${detail.field}: ${detail.message}`).join(" ");
    throw new RequestError(
      [payload?.error?.message ?? "The request could not be completed.", detailMessage]
        .filter(Boolean)
        .join(" "),
      response.status,
      details,
    );
  }
  return payload as T;
}
