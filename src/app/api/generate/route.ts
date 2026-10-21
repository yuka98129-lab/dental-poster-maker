import Anthropic from "@anthropic-ai/sdk";
import { clientKey, createRateLimiter, fail, passcodeMatches, readPasscode } from "../../../lib/guard";
import { DEFAULT_MODEL, GenerateError, generateContent } from "../../../lib/generate";
import { parseGenerateRequest } from "../../../lib/request";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** 1か所(IP)から、10分で30回まで。合言葉の間違いは、10分で10回まで */
const overLimit = createRateLimiter(30, 10 * 60 * 1000);
const tooManyFails = createRateLimiter(10, 10 * 60 * 1000);

export async function POST(req: Request) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  const passcode = process.env.CLINIC_PASSCODE;
  if (!apiKey || !passcode) return fail(503, "not_configured", "設定がまだ終わっていません(ANTHROPIC_API_KEY・CLINIC_PASSCODE)。");

  const key = clientKey(req);
  if (!passcodeMatches(readPasscode(req), passcode)) {
    if (tooManyFails(key)) return fail(429, "rate_limited", "間違いが続いたので、少し待ってから、もう一度試してください。");
    return fail(401, "unauthorized", "合言葉が違います。");
  }
  if (overLimit(key)) return fail(429, "rate_limited", "つくる回数が多すぎます。少し待ってから、もう一度試してください。");

  if (Number(req.headers.get("content-length") ?? "0") > 20_000) return fail(413, "too_large", "文章が長すぎます。");
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return fail(400, "bad_request", "リクエストの形式が正しくありません。");
  }
  const parsed = parseGenerateRequest(body);
  if (!parsed.ok) return fail(400, "bad_request", parsed.message);

  try {
    const result = await generateContent(new Anthropic({ apiKey }), parsed.value, process.env.ANTHROPIC_MODEL || DEFAULT_MODEL);
    return Response.json(result);
  } catch (err) {
    if (err instanceof GenerateError) return fail(422, "generate_failed", err.message);
    console.error("generate failed:", err instanceof Error ? err.message : "unknown error");
    return fail(502, "ai_error", "AIでエラーが出ました。時間をおいて、もう一度試してください。");
  }
}
