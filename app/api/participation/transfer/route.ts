import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import {
  findGuestSession, hashToken, newGuestToken, setGuestCookie,
} from "@/lib/guestParticipation";

export const dynamic = "force-dynamic";
const TEN_MINUTES = 10 * 60 * 1000;

function noStore(response: NextResponse) {
  response.headers.set("Cache-Control", "no-store");
  return response;
}

// Issue a one-time capability, available only to a browser already holding
// the guest-session cookie. It does not represent a coupon entitlement.
export async function POST(request: NextRequest) {
  try {
    const sessionId = await findGuestSession(request);
    if (!sessionId) {
      return noStore(NextResponse.json({ message: "참여 기록이 없습니다. 먼저 투어에 참여해주세요." }, { status: 401 }));
    }

    // Prevent unbounded creation of handoff links from the same session.
    const now = new Date();
    const recent = new Date(now.getTime() - TEN_MINUTES).toISOString();
    const { count, error: countError } = await supabaseAdmin
      .from("visitor_transfer_codes")
      .select("token_hash", { count: "exact", head: true })
      .eq("session_id", sessionId)
      .gte("created_at", recent);
    if (countError) throw countError;
    if ((count ?? 0) >= 5) {
      return noStore(NextResponse.json({ message: "기록 이전 링크는 10분 동안 최대 5번 만들 수 있어요. 잠시 후 다시 시도해주세요." }, { status: 429 }));
    }

    const token = newGuestToken();
    const expiresAt = new Date(now.getTime() + TEN_MINUTES).toISOString();
    const { error } = await supabaseAdmin.from("visitor_transfer_codes").insert({
      token_hash: hashToken(token),
      session_id: sessionId,
      expires_at: expiresAt,
    });
    if (error) throw error;
    return noStore(NextResponse.json({ token, expiresAt }));
  } catch (error) {
    console.error("Guest handoff issue error", error);
    return noStore(NextResponse.json({ message: "이어하기 링크를 만들지 못했습니다." }, { status: 500 }));
  }
}

// Redeem only after the visitor explicitly approves replacing the current
// browser identity. Consumed codes cannot be used twice, including concurrent requests.
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null);
    const token: unknown = body?.token;
    if (typeof token !== "string" || !/^[a-f0-9]{64}$/.test(token)) {
      return noStore(NextResponse.json({ message: "올바르지 않은 이어하기 링크입니다." }, { status: 400 }));
    }
    const now = new Date().toISOString();
    const { data: transferred, error } = await supabaseAdmin
      .from("visitor_transfer_codes")
      .update({ consumed_at: now })
      .eq("token_hash", hashToken(token))
      .is("consumed_at", null)
      .gt("expires_at", now)
      .select("session_id")
      .maybeSingle();
    if (error) throw error;
    if (!transferred?.session_id) {
      return noStore(NextResponse.json({ message: "이미 사용했거나 만료된 링크입니다. 기존 브라우저에서 새 링크를 만들어주세요." }, { status: 410 }));
    }

    const newToken = newGuestToken();
    const { error: sessionError } = await supabaseAdmin.from("visitor_session_tokens").insert({
      token_hash: hashToken(newToken),
      session_id: transferred.session_id,
    });
    if (sessionError) throw sessionError;

    const response = NextResponse.json({ ok: true });
    return noStore(setGuestCookie(response, newToken));
  } catch (error) {
    console.error("Guest handoff redemption error", error);
    return noStore(NextResponse.json({ message: "참여 기록을 이어받지 못했습니다." }, { status: 500 }));
  }
}
