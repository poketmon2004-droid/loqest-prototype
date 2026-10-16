"use client";

import type { CSSProperties } from "react";
import type { PublicTour } from "./MainHome";

type BadgeCollectionProps = {
  tourCompleted: boolean;
  activeTour: PublicTour | null;
  badgeEarnedAt: string | null;
  completedCount: number;
  landmarks: { id: string; name: string }[];
  progressPercent: number;
  goToQuestList: () => void;
  goHome: () => void;
  goToMainHome: () => void;
  styles: Record<string, CSSProperties>;
};

function formatBadgeDate(dateValue: string | null) {
  if (!dateValue) {
    return "";
  }

  const date = new Date(dateValue);

  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(date);
}

export default function BadgeCollection({
  tourCompleted, activeTour, badgeEarnedAt, completedCount,
  landmarks, progressPercent, goToQuestList, goHome, goToMainHome, styles,
}: BadgeCollectionProps) {
  return (
      <main style={styles.main}>
        <section style={styles.card}>
          <p style={styles.badge}>여행 컬렉션</p>

          <h1 style={styles.title}>나의 여행 도감</h1>

          <p style={styles.description}>
            관광지를 탐험하고 획득한 인증 뱃지를
            확인해보세요.
          </p>

          {tourCompleted ? (
            <div style={styles.earnedBadgeCard}>
              <div style={styles.badgeGlow}>
                <div style={styles.badgeMedal}>🏅</div>
              </div>

              <p style={styles.badgeStatus}>
                탐험 완료 뱃지
              </p>

              <h2 style={styles.badgeTitle}>
                {activeTour?.badge_name || `${activeTour?.short_name || activeTour?.name} 탐험가`}
              </h2>

              <p style={styles.badgeDescription}>
                {activeTour?.name}의 퀘스트 인증을 모두 완료했습니다.
              </p>

              <div style={styles.badgeInformation}>
                <div>
                  <span style={styles.infoLabel}>
                    획득일
                  </span>

                  <strong>
                    {formatBadgeDate(badgeEarnedAt)}
                  </strong>
                </div>

                <div>
                  <span style={styles.infoLabel}>
                    획득 스탬프
                  </span>

                  <strong>
                    {completedCount} / {landmarks.length}
                  </strong>
                </div>
              </div>

              <div style={styles.completedList}>
                {landmarks.map((landmark) => (
                  <span
                    key={landmark.id}
                    style={styles.completedChip}
                  >
                    ✓ {landmark.name}
                  </span>
                ))}
              </div>
            </div>
          ) : (
            <div style={styles.lockedBadgeCard}>
              <div style={styles.lockedBadge}>🔒</div>

              <h2 style={styles.badgeTitle}>
                {activeTour?.badge_name || `${activeTour?.short_name || activeTour?.name} 탐험가`}
              </h2>

              <p style={styles.badgeDescription}>
                이 투어의 퀘스트를 모두 인증하면 여행 뱃지가 자동으로 발급됩니다.
              </p>

              <div style={styles.miniProgressBackground}>
                <div
                  style={{
                    ...styles.miniProgress,
                    width: `${progressPercent}%`,
                  }}
                />
              </div>

              <strong>
                {completedCount} / {landmarks.length} 완료
              </strong>

              <button
                type="button"
                style={styles.primaryButton}
                onClick={goToQuestList}
              >
                탐험 계속하기
              </button>
            </div>
          )}

          <button
            type="button"
            style={styles.secondaryButton}
            onClick={goHome}
          >
            {activeTour?.name ?? "투어"} 보기
          </button>

          <button
            type="button"
            style={styles.secondaryButton}
            onClick={goToMainHome}
          >
            홈으로 가기
          </button>
        </section>
      </main>
  );
}
