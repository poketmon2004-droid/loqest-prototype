"use client";

import { useState, type CSSProperties } from "react";
import type { PublicTour } from "./MainHome";

type TourLandmark = {
  id: string;
  name: string;
  mapPosition: { x: number; y: number };
};

type TourHomeProps<T extends TourLandmark> = {
  activeTour: PublicTour | null;
  landmarks: T[];
  completedLandmarks: string[];
  completedCount: number;
  progressPercent: number;
  tourCompleted: boolean;
  onSelectLandmark: (landmark: T) => void;
  goToQuestList: () => void;
  resetProgress: () => void;
  goToMainHome: () => void;
  styles: Record<string, CSSProperties>;
};

export default function TourHome<T extends TourLandmark>({
  activeTour, landmarks, completedLandmarks, completedCount,
  progressPercent, tourCompleted, onSelectLandmark,
  goToQuestList, resetProgress, goToMainHome, styles,
}: TourHomeProps<T>) {
  const [transferLink, setTransferLink] = useState("");
  const [transferStatus, setTransferStatus] = useState("");
  const [creatingTransfer, setCreatingTransfer] = useState(false);

  async function createTransferLink() {
    if (creatingTransfer) return;
    setCreatingTransfer(true);
    setTransferStatus("");
    try {
      const response = await fetch("/api/participation/transfer", {
        method: "POST", cache: "no-store",
      });
      const data = await response.json() as { token?: string; message?: string };
      if (!response.ok || !data.token) throw new Error(data.message || "링크 발급 실패");
      const url = new URL("/continue", window.location.origin);
      if (activeTour?.id) url.searchParams.set("tourId", activeTour.id);
      url.hash = `token=${data.token}`;
      setTransferLink(url.href);
      try {
        await navigator.clipboard.writeText(url.href);
        setTransferStatus("이어하기 링크를 복사했어요. Safari 주소창에 붙여넣어 열어주세요.");
      } catch {
        setTransferStatus("아래 링크를 복사해서 Safari 주소창에서 열어주세요.");
      }
    } catch (error) {
      setTransferStatus(error instanceof Error ? error.message : "링크를 만들지 못했어요.");
    } finally {
      setCreatingTransfer(false);
    }
  }

  // Keep visual quest positions independent of stored landmark coordinates.
  // Each quest gets its own row to prevent marker labels from overlapping.
  const mapHeight = Math.max(260, 210 + Math.max(0, landmarks.length - 1) * 155);
  const mapPoints = landmarks.map((landmark, index) => ({
    id: landmark.id,
    x: landmarks.length === 1 ? 180 : (index % 2 === 0 ? 96 : 264),
    y: landmarks.length === 1 ? 130 : 105 + index * 155,
  }));
  const curveBetween = (start: { x: number; y: number }, end: { x: number; y: number }) => {
    const middleY = (start.y + end.y) / 2;
    return `M ${start.x} ${start.y} C ${start.x} ${middleY}, ${end.x} ${middleY}, ${end.x} ${end.y}`;
  };
  const routeSegments = mapPoints.slice(1).map((point, index) => ({
    path: curveBetween(mapPoints[index], point),
    complete: completedLandmarks.includes(mapPoints[index].id) && completedLandmarks.includes(point.id),
  }));

  return (
      <main style={styles.main}>
        <section style={styles.card}>
          <p style={styles.badge}>{activeTour?.region || "LOQEST 투어"}</p>

          <h1 style={styles.title}>
            {activeTour?.name ?? "투어"}
          </h1>

          <p style={styles.description}>
            {activeTour?.description || "랜드마크를 발견하고 디지털 스탬프와 여행 뱃지를 모아보세요."}
          </p>

          <h2 style={styles.progressSectionTitle}>
            현재 탐험 진행률
          </h2>

          <div style={styles.progressSummary}>
            <strong style={styles.progressNumber}>
              {completedCount} / {landmarks.length}
            </strong>

            <span>개의 스탬프를 모았습니다.</span>
          </div>

          <div style={styles.progressBarBackground}>
            <div
              style={{
                ...styles.progressBar,
                width: `${progressPercent}%`,
              }}
            />
          </div>

          <p style={styles.progressText}>
            전체 코스의 {progressPercent}% 완료
          </p>

          {tourCompleted && (
            <div style={styles.completionNotice}>
              <span style={styles.completionIcon}>🎉</span>

              <div>
                <strong>{activeTour?.short_name || activeTour?.name} 탐험 완료!</strong>

                <p style={styles.completionText}>
                  ‘{activeTour?.badge_name || `${activeTour?.short_name || activeTour?.name} 탐험가`}’ 뱃지가 자동으로
                  발급되었습니다.
                </p>
              </div>
            </div>
          )}

          <div
            className="exploration-map"
            style={{ height: `${mapHeight}px` }}
          >
            <div className="map-decoration map-tree-one">♧</div>
            <div className="map-decoration map-tree-two">♧</div>
            <div className="map-decoration map-wave-one">≋</div>
            <div className="map-decoration map-wave-two">≋</div>

            <svg
              className="map-route"
              viewBox={`0 0 360 ${mapHeight}`}
              preserveAspectRatio="none"
              aria-hidden="true"
            >
              {routeSegments.map((segment, index) => (
                <g key={index}>
                  <path d={segment.path} className="map-route-underlay" />
                  <path d={segment.path} className="map-route-trail" />
                  {segment.complete && (
                    <path d={segment.path} className="map-route-visited" />
                  )}
                </g>
              ))}
            </svg>

            {landmarks.map((landmark) => {
              const visitIndex = completedLandmarks.indexOf(
                landmark.id
              );
              const completed = visitIndex >= 0;

              return (
                <button
                  type="button"
                  key={landmark.id}
                  className={`map-place ${completed ? "map-place-completed" : ""
                    }`}
                  style={{
                    left: `${(mapPoints.find((point) => point.id === landmark.id)?.x ?? 180) / 360 * 100}%`,
                    top: `${(mapPoints.find((point) => point.id === landmark.id)?.y ?? 130) / mapHeight * 100}%`,
                  }}
                  onClick={() => {
                    if (!completed) {
                      onSelectLandmark(landmark);
                    }
                  }}
                  aria-label={
                    completed
                      ? `${landmark.name}, ${visitIndex + 1}번째 인증 완료`
                      : `${landmark.name}, 아직 인증하지 않음`
                  }
                >
                  <span className="map-stamp">
                    {completed ? visitIndex + 1 : "?"}
                  </span>

                  <span className="map-place-label">
                    <strong>{landmark.name}</strong>
                    <small>
                      {completed
                        ? `${visitIndex + 1}번째 탐험 완료`
                        : "눌러서 인증하기"}
                    </small>
                  </span>
                </button>
              );
            })}

            {tourCompleted && (
              <div className="map-finish-flag" aria-label="전체 탐험 완료">
                ⚑ 완주
              </div>
            )}
          </div>

          <button
            type="button"
            style={styles.primaryButton}
            onClick={goToQuestList}
          >
            {tourCompleted
              ? "완료한 퀘스트 보기"
              : completedCount > 0
                ? "탐험 계속하기"
                : "탐험 시작하기"}
          </button>

          <div style={{ padding: "18px", marginTop: "16px", background: "#f2f8f5", border: "1px solid #d4e8db", borderRadius: "16px" }}>
            <strong style={{ display: "block", marginBottom: "8px", color: "#234b39" }}>
              다른 브라우저에서 이어하기
            </strong>
            <p style={{ margin: "0 0 12px", fontSize: "13px", color: "#52685b", lineHeight: 1.65 }}>
              카카오톡에서 시작했나요? 10분 동안 한 번 사용할 수 있는 링크를 만들어 Safari에서 스탬프 기록을 이어받으세요.
            </p>
            <button type="button" onClick={() => void createTransferLink()} disabled={creatingTransfer}
              style={{ width: "100%", minHeight: "48px", borderRadius: "12px", border: "none", background: "#138B5D", color: "#fff", fontWeight: 800, fontSize: "14px", cursor: "pointer" }}>
              {creatingTransfer ? "링크 만드는 중..." : "Safari에서 이어하기 링크 만들기"}
            </button>
            {transferStatus && <p role="status" style={{ margin: "12px 0 0", fontSize: "13px", lineHeight: 1.6, color: "#234b39" }}>{transferStatus}</p>}
            {transferLink && (
              <div style={{ marginTop: "10px" }}>
                <input aria-label="기록 이어하기 링크" readOnly value={transferLink}
                  onFocus={event => event.currentTarget.select()}
                  style={{ boxSizing: "border-box", width: "100%", padding: "10px", border: "1px solid #bfd6c9", borderRadius: "9px", fontSize: "12px" }} />
                <button type="button" onClick={() => {
                  void navigator.clipboard.writeText(transferLink).then(
                    () => setTransferStatus("링크를 복사했어요."),
                    () => setTransferStatus("주소를 길게 눌러 직접 복사해주세요.")
                  );
                }} style={{ marginTop: "8px", background: "white", border: "1px solid #b7d8c5", borderRadius: "9px", padding: "9px 14px", fontWeight: 700 }}>
                  링크 복사하기
                </button>
              </div>
            )}
            <p style={{ margin: "10px 0 0", color: "#66786d", fontSize: "12px", lineHeight: 1.55 }}>
              링크를 다른 사람에게 공유하면 내 진행 기록을 볼 수 있으니 본인만 사용하세요.
            </p>
          </div>

          <button
            type="button"
            style={styles.resetButton}
            onClick={resetProgress}
          >
            테스트 기록 초기화
          </button>

          <button
            type="button"
            style={styles.homeButton}
            onClick={goToMainHome}
          >
            홈으로
          </button>
        </section>
      </main>
  );
}
