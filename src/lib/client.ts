import type { GenerateResult } from "./generate";
import type { GenerateRequest } from "./request";

export class ApiError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
  }
}

async function call(path: string, passcode: string, body: unknown): Promise<Response> {
  try {
    return await fetch(path, { method: "POST", headers: { "content-type": "application/json", "x-passcode": encodeURIComponent(passcode) }, body: JSON.stringify(body) });
  } catch {
    throw new ApiError("通信できませんでした。ネットワークを確認して、もう一度試してください。", 0);
  }
}

async function failure(res: Response): Promise<ApiError> {
  const b: unknown = await res.json().catch(() => null);
  const msg = typeof b === "object" && b !== null && typeof (b as { message?: unknown }).message === "string" ? (b as { message: string }).message : "うまくいきませんでした。";
  return new ApiError(msg, res.status);
}

export async function verifyPasscode(passcode: string): Promise<void> {
  const res = await call("/api/login", passcode, {});
  if (!res.ok) throw await failure(res);
}

export async function requestGenerate(passcode: string, req: GenerateRequest): Promise<GenerateResult> {
  const res = await call("/api/generate", passcode, req);
  if (!res.ok) throw await failure(res);
  return (await res.json()) as GenerateResult;
}
