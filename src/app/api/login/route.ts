import { clientKey, createRateLimiter, fail, passcodeMatches, readPasscode } from "../../../lib/guard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const tooManyFails = createRateLimiter(10, 10 * 60 * 1000);

/** 合言葉が合っているかだけを確かめる(AIは使わない) */
export async function POST(req: Request) {
  const passcode = process.env.CLINIC_PASSCODE;
  if (!passcode) return fail(503, "not_configured", "合言葉の設定がまだ終わっていません(CLINIC_PASSCODE)。");
  if (!passcodeMatches(readPasscode(req), passcode)) {
    if (tooManyFails(clientKey(req))) return fail(429, "rate_limited", "間違いが続いたので、少し待ってから、もう一度試してください。");
    return fail(401, "unauthorized", "合言葉が違います。");
  }
  return new Response(null, { status: 204 });
}
