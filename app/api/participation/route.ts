import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { ensureGuestSession, findGuestSession, setGuestCookie } from "@/lib/guestParticipation";

export const dynamic = "force-dynamic";

function validTourId(value: string | null): value is string {
  return Boolean(value && /^[a-zA-Z0-9_-]{1,100}$/.test(value));
}

// Restore informational progress for the anonymous browser session.
export async function GET(request: NextRequest) {
  const tourId = request.nextUrl.searchParams.get("tourId");
  if (!validTourId(tourId)) return NextResponse.json({ message: "투어 ID가 올바르지 않습니다." }, { status: 400 });
  try {
    const id = await findGuestSession(request);
    if (!id) return NextResponse.json({ completedAttractionIds: [] });
    const { data, error } = await supabaseAdmin.from("visitor_stamps")
      .select("attraction_id").eq("session_id", id).eq("tour_id", tourId);
    if (error) throw error;
    return NextResponse.json({ completedAttractionIds: (data ?? []).map(row => Number(row.attraction_id)) });
  } catch (error) {
    console.error("Guest progress load failed", error);
    return NextResponse.json({ message: "진행률을 불러오지 못했습니다." }, { status: 500 });
  }
}

// A common URL creates a distinct anonymous session in each browser.
export async function POST(request: NextRequest) {
  try {
    const { id, newToken } = await ensureGuestSession(request);
    return setGuestCookie(NextResponse.json({ participationId: id }), newToken);
  } catch (error) {
    console.error("Guest session initialization failed", error);
    return NextResponse.json({ message: "참여 세션을 만들지 못했습니다." }, { status: 500 });
  }
}

// Only resets informational tour stamps for this browser, never capture audit records.
export async function DELETE(request: NextRequest) {
  const tourId = request.nextUrl.searchParams.get("tourId");
  if (!validTourId(tourId)) return NextResponse.json({ message: "투어 ID가 올바르지 않습니다." }, { status: 400 });
  try {
    const id = await findGuestSession(request);
    if (id) {
      const { error } = await supabaseAdmin.from("visitor_stamps").delete()
        .eq("session_id", id).eq("tour_id", tourId);
      if (error) throw error;
    }
    return NextResponse.json({ completedAttractionIds: [] });
  } catch (error) {
    console.error("Guest progress reset failed", error);
    return NextResponse.json({ message: "진행률 초기화에 실패했습니다." }, { status: 500 });
  }
}
