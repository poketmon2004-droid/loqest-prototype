import { createHash, randomBytes } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

const COOKIE_NAME = "loqest_guest_session";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 90;

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export async function findGuestSession(request: NextRequest): Promise<string | null> {
  const token = request.cookies.get(COOKIE_NAME)?.value;
  if (!token || !/^[a-f0-9]{64}$/.test(token)) return null;
  const { data, error } = await supabaseAdmin
    .from("visitor_sessions")
    .select("id")
    .eq("token_hash", hashToken(token))
    .maybeSingle();
  if (error) throw error;
  return data?.id ?? null;
}

export async function ensureGuestSession(request: NextRequest): Promise<{ id: string; newToken: string | null }> {
  const existing = await findGuestSession(request);
  if (existing) return { id: existing, newToken: null };
  const newToken = randomBytes(32).toString("hex");
  const { data, error } = await supabaseAdmin
    .from("visitor_sessions")
    .insert({ token_hash: hashToken(newToken) })
    .select("id")
    .single();
  if (error || !data) throw error ?? new Error("참여 세션을 생성하지 못했습니다.");
  return { id: data.id, newToken };
}

export function setGuestCookie(response: NextResponse, token: string | null) {
  if (token) response.cookies.set(COOKIE_NAME, token, {
    httpOnly: true, secure: process.env.NODE_ENV === "production",
    sameSite: "lax", path: "/", maxAge: COOKIE_MAX_AGE,
  });
  return response;
}
