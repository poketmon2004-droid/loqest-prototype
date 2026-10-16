"use client";

import type { CSSProperties } from "react";
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
  const visitedPath = completedLandmarks
    .map((id) => landmarks.find((landmark) => landmark.id === id))
    .filter((landmark): landmark is T => Boolean(landmark))
    .map((landmark) => `${landmark.mapPosition.x},${landmark.mapPosition.y}`)
    .join(" ");
  const visitedCount = completedLandmarks.filter((id) =>
    landmarks.some((landmark) => landmark.id === id)
  ).length;

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
            style={{ height: "430px" }}
          >
            <div className="map-decoration map-tree-one">♧</div>
            <div className="map-decoration map-tree-two">♧</div>
            <div className="map-decoration map-wave-one">≋</div>
            <div className="map-decoration map-wave-two">≋</div>

            <svg
              className="map-route"
              viewBox="0 0 360 520"
              aria-hidden="true"
            >
              {visitedCount >= 2 && (
                <polyline
                  className="map-route-visited"
                  points={visitedPath}
                />
              )}
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
                    left: `${(landmark.mapPosition.x / 360) * 100}%`,
                    top: `${(landmark.mapPosition.y / 520) * 100}%`,
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
