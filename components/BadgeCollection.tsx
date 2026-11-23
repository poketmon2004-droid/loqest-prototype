"use client";

import { useEffect, useState } from "react";
import type { CSSProperties } from "react";
import type { PublicTour } from "./MainHome";

type TourStamp = { id: string; name: string; collected: boolean };
type TourRecord = {
  tour: PublicTour;
  stamps: TourStamp[];
  completedCount: number;
  total: number;
  earnedAt: string | null;
  completed: boolean;
};
type BadgeCollectionProps = {
  tours: PublicTour[];
  onExploreTour: (tour: PublicTour) => void;
  goToMainHome: () => void;
  styles: Record<string, CSSProperties>;
};
const STAMP_KEY = "loqestCompletedLandmarks";
const BADGE_KEY = "loqestAmsaBadgeEarnedAt";
const STARTED_KEY = "loqestStartedTour";

function savedIds(tourId: string): string[] {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(`${STAMP_KEY}:${tourId}`) || "[]");
    return Array.isArray(value) ? value.filter((id): id is string => typeof id === "string") : [];
  } catch {
    return [];
  }
}

function formatDate(value: string | null) {
  if (!value) return "";
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? "" : new Intl.DateTimeFormat("ko-KR", {
    year: "numeric", month: "long", day: "numeric",
  }).format(parsed);
}

export default function BadgeCollection({ tours, onExploreTour, goToMainHome, styles }: BadgeCollectionProps) {
  const [tab, setTab] = useState<"active" | "complete">("active");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [records, setRecords] = useState<TourRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function loadCollections() {
      setLoading(true);
      const result = await Promise.all(tours.map(async (tour): Promise<TourRecord | null> => {
        const ids = savedIds(tour.id);
        const earnedAt = localStorage.getItem(`${BADGE_KEY}:${tour.id}`);
        const started = localStorage.getItem(`${STARTED_KEY}:${tour.id}`) === "true";
        // Include an older tour with saved stamps or a completed badge as well.
        if (!started && ids.length === 0 && !earnedAt) return null;

        try {
          const response = await fetch(`/api/attractions?tourId=${encodeURIComponent(tour.id)}`, { cache: "no-store" });
          if (!response.ok) throw new Error("Failed to load tour attractions");
          const data = (await response.json()) as { attractions?: { id: number | string; name: string }[] };
          if (!Array.isArray(data.attractions)) throw new Error("Invalid attractions");
          const completedIds = new Set(ids);
          const stamps = data.attractions.map((attraction) => ({
            id: `${tour.id}-${attraction.id}`,
            name: attraction.name,
            collected: completedIds.has(`${tour.id}-${attraction.id}`),
          }));
          const completedCount = stamps.filter((stamp) => stamp.collected).length;
          return {
            tour, stamps, completedCount, total: stamps.length, earnedAt,
            completed: stamps.length > 0 && completedCount === stamps.length,
          };
        } catch {
          // Don't misclassify a tour if its live quest data couldn't be loaded.
          return {
            tour, stamps: [], completedCount: ids.length, total: 0, earnedAt,
            completed: Boolean(earnedAt),
          };
        }
      }));
      if (!cancelled) {
        setRecords(result.filter((record): record is TourRecord => record !== null));
        setLoading(false);
      }
    }
    void loadCollections();
    return () => { cancelled = true; };
  }, [tours]);

  const selected = records.find((record) => record.tour.id === selectedId);
  const displayed = records.filter((record) => tab === "complete" ? record.completed : !record.completed);
  const completedTotal = records.filter((record) => record.completed).length;
  const stampTotal = records.reduce((total, record) => total + record.completedCount, 0);

  return (
    <main style={styles.main}>
      <section style={{ ...styles.card, padding: "20px 18px 25px" }}>
        <header style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "22px" }}>
          <button type="button" onClick={selected ? () => setSelectedId(null) : goToMainHome}
            aria-label={selected ? "여행 목록으로 돌아가기" : "홈으로 돌아가기"}
            style={{ border: "none", background: "#F1F6F8", color: "#23445d", width: 36, height: 36, borderRadius: 12, cursor: "pointer", fontSize: 20 }}>←</button>
          <strong style={{ color: "#23445d", fontSize: 19 }}>나의 여행 도감</strong>
          <span style={{ marginLeft: "auto", color: "#4c91a8", fontSize: 12, fontWeight: 800 }}>LOQEST</span>
        </header>

        {!selected ? (
          <>
            <section style={{ borderRadius: 20, background: "#EEE7DB", padding: 20, marginBottom: 22 }}>
              <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: ".08em", color: "#87735F" }}>MY TRAVEL COLLECTION</span>
              <h1 style={{ margin: "9px 0", fontSize: 25, color: "#23445d", letterSpacing: "-.04em" }}>나의 여행 기록</h1>
              <p style={{ margin: "0 0 18px", lineHeight: 1.6, fontSize: 13, color: "#766E65" }}>탐험 중인 여행과 완주한 여행을 확인해 보세요.</p>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 10 }}>
                {[["모은 스탬프",stampTotal],["완주한 투어",completedTotal]].map(([label,value]) => (
                  <div key={String(label)} style={{ padding: 12, background: "#fff", borderRadius: 12 }}>
                    <strong style={{ display: "block", fontSize: 23, color: "#23445d" }}>{value}</strong>
                    <span style={{ fontSize: 11, color: "#8A8178" }}>{label}</span>
                  </div>
                ))}
              </div>
            </section>

            <div role="tablist" aria-label="여행 진행 상태" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", padding: 4, gap: 4, background: "#EFF3F5", borderRadius: 13, marginBottom: 18 }}>
              {([["active","탐험 중"],["complete","완주"]] as const).map(([value,label]) => (
                <button key={value} role="tab" type="button" aria-selected={tab===value} onClick={()=>setTab(value)}
                  style={{ padding: "11px 5px", borderRadius: 10, border: "none", fontSize: 14, fontWeight: 700, cursor: "pointer",
                    background: tab===value ? (value==="complete"?"#E5F0E8":"#FFFFFF") : "transparent",
                    color: tab===value ? (value==="complete"?"#397451":"#23445d") : "#88949B",
                    boxShadow: tab===value ? "0 2px 8px rgba(35,68,93,.09)" : "none" }}>{label}</button>
              ))}
            </div>

            {loading ? <p role="status" style={{ textAlign: "center", color: "#72838B", padding: 20 }}>여행 기록을 불러오는 중...</p> :
              displayed.length === 0 ? (
                <div style={{ padding: "36px 15px", textAlign: "center", background: "#F7F9F9", borderRadius: 18 }}>
                  <div style={{ fontSize: 28, marginBottom: 12 }}>{tab==="complete"?"🏅":"🧭"}</div>
                  <strong style={{ color: "#29475F" }}>{tab==="complete"?"아직 완주한 여행이 없어요":"탐험 중인 여행이 없어요"}</strong>
                  <p style={{ color: "#8A969B", fontSize: 13 }}>새로운 여행에서 스탬프를 모아보세요.</p>
                </div>
              ) : displayed.map((record) => {
                const finished = record.completed;
                const pct = record.total > 0 ? Math.round(record.completedCount / record.total * 100) : 0;
                return (
                  <button key={record.tour.id} type="button" onClick={()=>setSelectedId(record.tour.id)}
                    style={{ display: "block", width: "100%", textAlign: "left", padding: 17, marginBottom: 12, background: "#FFF", borderRadius: 18,
                      border: `1px solid ${finished?"#81B394":"#D9E6E9"}`, cursor: "pointer", boxShadow: "0 4px 16px rgba(35,68,93,.04)" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
                      <span style={{ color: "#4c91a8", fontSize: 12 }}>⌖ {record.tour.region || record.tour.province || "여행지"}</span>
                      <span style={{ padding: "5px 9px", borderRadius: 20, fontSize: 11, fontWeight: 700,
                        background: finished?"#E5F0E8":"#EDF4F7", color: finished?"#397451":"#567C90" }}>{finished?"✓ 완주 완료":"탐험 중"}</span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, margin: "13px 0" }}>
                      <div style={{ flex: 1 }}>
                        <strong style={{ color: "#23445d", fontSize: 17 }}>{record.tour.name}</strong>
                        <div style={{ color: "#87929B", fontSize: 12, marginTop: 5 }}>스탬프 {record.completedCount} / {record.total || "?"}개</div>
                      </div>
                      <span aria-hidden="true" style={{ color: "#8498A4", fontSize: 22 }}>›</span>
                    </div>
                    <div style={{ background: "#E9EFF0", height: 7, borderRadius: 10, overflow: "hidden" }}>
                      <div style={{ width: `${pct}%`, height: "100%", background: finished?"#689C78":"#4C91A8", borderRadius: 10 }} />
                    </div>
                  </button>
                );
              })
            }
          </>
        ) : (
          <>
            <section style={{ background: "#EEE7DB", borderRadius: 20, padding: 20, marginBottom: 18 }}>
              <span style={{ fontSize: 11, color: "#87735F", fontWeight: 800, letterSpacing: ".07em" }}>MY TRAVEL STAMPS</span>
              <h1 style={{ fontSize: 23, color: "#23445d", margin: "9px 0" }}>{selected.tour.name}</h1>
              <p style={{ fontSize: 12, color: "#806F60" }}>{selected.tour.region || selected.tour.province || ""}</p>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: "#29475F", margin: "20px 0 9px" }}>
                <span>탐험 진행률</span><strong>{selected.total > 0 ? Math.round(selected.completedCount/selected.total*100) : 0}%</strong>
              </div>
              <div style={{ background: "#FFFFFF", height: 9, borderRadius: 10, overflow: "hidden" }}>
                <div style={{ width: `${selected.total>0?selected.completedCount/selected.total*100:0}%`, height: "100%", background: selected.completed?"#689C78":"#4C91A8" }} />
              </div>
              <p style={{ fontSize: 12, color: "#806F60", marginBottom: 0 }}>{selected.completedCount} / {selected.total || "?"}개 스탬프 획득</p>
            </section>
            <section style={{ background: "#FFFFFF", border: "1px solid #E5E4DB", padding: 17, borderRadius: 18, marginBottom: 15 }}>
              <h2 style={{ fontSize: 17, color: "#23445d", margin: "0 0 20px" }}>스탬프 컬렉션</h2>
              {selected.stamps.length === 0 ? <p style={{ fontSize: 13, color: "#86949A" }}>퀘스트 목록을 불러오지 못했거나 등록된 퀘스트가 없어요.</p> : (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", columnGap: 8, rowGap: 19 }}>
                  {selected.stamps.map((stamp) => (
                    <div key={stamp.id} style={{ textAlign: "center", minWidth: 0 }}>
                      <div aria-label={stamp.collected?"획득":"미획득"} style={{ width: 67, height: 67, maxWidth: "100%", display: "grid", placeItems: "center", margin: "0 auto 9px", borderRadius: "50%",
                        border: stamp.collected?"2px solid #D8B780":"2px dashed #DEE0DE", background: stamp.collected?"#FFF1D9":"#F0F1F0",
                        fontSize: 25, color: stamp.collected?"#AD7B40":"#ADB6B9" }}>{stamp.collected?"✦":"🔒"}</div>
                      <div style={{ fontSize: 11, overflowWrap: "anywhere", lineHeight: 1.4, color: stamp.collected?"#554F47":"#9FA7AA" }}>{stamp.name}</div>
                    </div>
                  ))}
                </div>
              )}
            </section>
            <section style={{ background: selected.completed?"#E5F0E8":"#F4F5F6", border: `1px solid ${selected.completed?"#81B394":"#E3E2DF"}`, borderRadius: 16,
              display: "flex", gap: 13, alignItems: "center", padding: 16, marginBottom: 18 }}>
              <span style={{ fontSize: 28 }}>{selected.completed?"🏅":"🔒"}</span>
              <div>
                <strong style={{ color: selected.completed?"#397451":"#29475F" }}>{selected.tour.badge_name || "완주 뱃지"}</strong>
                <p style={{ fontSize: 12, margin: "5px 0 0", color: selected.completed?"#527B60":"#78828B" }}>
                  {selected.completed?`모든 퀘스트를 완료했어요! ${formatDate(selected.earnedAt)}`:"모든 스탬프를 모으면 획득해요."}
                </p>
              </div>
            </section>
            <button type="button" style={styles.primaryButton} onClick={()=>onExploreTour(selected.tour)}>
              {selected.completed?"완료한 탐험 보기":"탐험 계속하기"}
            </button>
            <button type="button" style={styles.secondaryButton} onClick={()=>setSelectedId(null)}>여행 목록으로 돌아가기</button>
          </>
        )}
        <button type="button" style={{ ...styles.secondaryButton, marginTop: 18 }} onClick={goToMainHome}>홈으로 가기</button>
      </section>
    </main>
  );
}
