"use client";

import { useEffect, useState } from "react";

export default function ContinuePage() {
  const [token, setToken] = useState<string | null>(null);
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Keep the secret out of subsequent navigation, referrers, and screenshots
    // of the address bar. URL fragments are not sent to the web server.
    const fragment = new URLSearchParams(window.location.hash.slice(1));
    const incoming = fragment.get("token");
    window.history.replaceState(null, "", window.location.pathname + window.location.search);
    if (!incoming || !/^[a-f0-9]{64}$/.test(incoming)) {
      setStatus("유효한 이어하기 링크가 없습니다. 원래 브라우저에서 새 링크를 만들어주세요.");
      return;
    }
    setToken(incoming);
  }, []);

  async function receiveProgress() {
    if (!token || loading) return;
    setLoading(true);
    setStatus("");
    try {
      const response = await fetch("/api/participation/transfer", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({ token }),
      });
      const body = await response.json() as { ok?: boolean; message?: string };
      if (!response.ok || !body.ok) throw new Error(body.message || "참여 기록을 가져오지 못했습니다.");

      // Do not merge an unrelated browser's local-only stamps with the
      // transferred participant identity. Server-recorded stamps remain.
      for (const key of Object.keys(localStorage)) {
        if (key.startsWith("loqestCompletedLandmarks:") ||
            key.startsWith("loqestAmsaBadgeEarnedAt:") ||
            key.startsWith("loqestBadgeSeen:")) {
          localStorage.removeItem(key);
        }
      }
      const tourId = new URLSearchParams(window.location.search).get("tourId");
      window.location.replace(tourId ? `/?tourId=${encodeURIComponent(tourId)}` : "/");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "이어받기에 실패했습니다.");
      setLoading(false);
    }
  }

  return (
    <main style={{ minHeight: "100dvh", background: "#f8f4eb", color: "#263238", padding: "28px 16px", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <section style={{ width: "100%", maxWidth: "460px", padding: "34px 24px", background: "#fff", border: "1px solid #e0e8e2", borderRadius: "22px", boxShadow: "0 18px 40px rgba(35,68,93,.08)", textAlign: "center" }}>
        <p style={{ fontSize: "26px", fontWeight: 900, color: "#138B5D", letterSpacing: ".08em", margin: "0 0 18px" }}>LOQEST</p>
        <div style={{ fontSize: "42px", marginBottom: "14px" }} aria-hidden="true">🔗</div>
        <h1 style={{ fontSize: "23px", margin: "0 0 14px", color: "#23445d" }}>스탬프 기록 이어받기</h1>
        <p style={{ fontSize: "14px", lineHeight: 1.8, color: "#596b71", margin: "0 0 20px" }}>
          카카오톡에서 모은 스탬프를 이 브라우저에서도 이어서 사용할 수 있어요. 로그인은 필요하지 않아요.
        </p>
        <p style={{ padding: "12px", fontSize: "13px", lineHeight: 1.7, background: "#f7f5ee", borderRadius: "12px", color: "#6e634f", margin: "0 0 16px" }}>
          이 브라우저에 다른 참여 기록이 있다면 새 기록으로 바뀝니다. 이전 기록과 자동 합쳐지지 않아요.
        </p>
        <button type="button" disabled={!token || loading} onClick={() => void receiveProgress()}
          style={{ width: "100%", minHeight: "52px", border: "none", borderRadius: "13px", background: "#138B5D", color: "#fff", fontSize: "16px", fontWeight: 800, cursor: token ? "pointer" : "not-allowed", opacity: !token || loading ? 0.6 : 1 }}>
          {loading ? "참여 기록 연결 중..." : "이 브라우저에서 이어하기"}
        </button>
        {status && <p role="alert" style={{ margin: "14px 0 0", color: "#a1322b", fontSize: "14px", lineHeight: 1.7 }}>{status}</p>}
        <a href="/" style={{ display: "inline-block", marginTop: "22px", color: "#456174", fontSize: "14px" }}>처음부터 시작하기</a>
      </section>
    </main>
  );
}
