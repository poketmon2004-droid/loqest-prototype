"use client";

import type { CSSProperties } from "react";

type Props = {
  styles: Record<string, CSSProperties>;
  goToTestQuestList: () => void;
  goToMainHome: () => void;
};

export default function TestHome({ styles, goToTestQuestList, goToMainHome }: Props) {
  return (
      <main style={styles.main}>
        <section style={styles.card}>
          <p style={styles.badge}>GPS 없는 테스트 모드</p>

          <h1 style={styles.title}>집에서 하는 LOQEST 체험</h1>

          <p style={styles.description}>
            손 포즈 인증부터 스탬프 발급까지 테스트해보세요.
          </p>

          <div style={styles.testNotice}>
            <strong>위치 인증을 사용하지 않습니다.</strong>
            <p style={styles.entryText}>
              손 포즈와 랜드마크 이미지 인식은 실제 퀘스트와 동일하게 진행됩니다.
            </p>
          </div>

          <button
            type="button"
            style={styles.primaryButton}
            onClick={goToTestQuestList}
          >
            테스트 시작하기
          </button>

          <button
            type="button"
            style={styles.homeButton}
            onClick={goToMainHome}
          >
            뒤로가기
          </button>
        </section>
      </main>
  );
}
