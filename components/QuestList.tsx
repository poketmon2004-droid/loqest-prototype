"use client";

import type { CSSProperties } from "react";

type QuestItem = {
  id: string;
  name: string;
  icon: string;
  mission: string;
};

type QuestListProps<T extends QuestItem> = {
  mode: "test" | "tour";
  tourName?: string;
  landmarks: T[];
  completedIds: string[];
  onSelect: (landmark: T) => void;
  onBack: () => void;
  styles: Record<string, CSSProperties>;
};

export default function QuestList<T extends QuestItem>({
  mode,
  tourName,
  landmarks,
  completedIds,
  onSelect,
  onBack,
  styles,
}: QuestListProps<T>) {
  const isTest = mode === "test";

  return (
    <main style={styles.main}>
      <section style={styles.card}>
        <p style={styles.badge}>
          {isTest ? "집에서 하는 LOQEST 체험" : (tourName ?? "랜드마크 코스")}
        </p>
        <h1 style={styles.title}>{isTest ? "테스트 퀘스트" : "랜드마크 퀘스트"}</h1>
        <p style={styles.description}>
          {isTest
            ? "GPS 인증 없이 전체 촬영 흐름을 확인합니다."
            : "촬영할 랜드마크를 선택해주세요."}
        </p>

        <div style={styles.landmarkList}>
          {landmarks.map((landmark) => {
            const completed = completedIds.includes(landmark.id);
            return (
              <button
                type="button"
                key={landmark.id}
                style={{
                  ...styles.landmarkButton,
                  ...(completed ? styles.completedLandmarkButton : {}),
                }}
                onClick={() => onSelect(landmark)}
                disabled={!isTest && completed}
              >
                <span style={styles.questIcon}>{landmark.icon}</span>
                <span style={styles.questContent}>
                  <strong style={styles.landmarkName}>
                    {completed ? "✓ " : ""}{landmark.name}
                  </strong>
                  <span style={styles.smallText}>
                    {completed
                      ? (isTest ? "인증 완료 · 다시 테스트 가능" : "인증 완료")
                      : landmark.mission}
                  </span>
                </span>
              </button>
            );
          })}
        </div>

        <button type="button" style={styles.homeButton} onClick={onBack}>
          뒤로가기
        </button>
      </section>
    </main>
  );
}
