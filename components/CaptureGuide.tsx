"use client";

import type { CSSProperties } from "react";

type Props = {
  styles: Record<string, CSSProperties>;
  goToMainHome: () => void;
};

export default function CaptureGuide({ styles, goToMainHome }: Props) {
  return (
      <main style={styles.main}>
        <section style={styles.card}>
          <p style={styles.badge}>이용 안내</p>

          <h1 style={styles.title}>촬영 가이드</h1>

          <p style={styles.description}>
            손 포즈를 먼저 인증한 뒤 랜드마크를 선명하게 촬영해 주세요.
          </p>

          <div style={styles.guideStepList}>
            <div style={styles.guideStep}>
              <span style={styles.guideStepNumber}>1</span>
              <div>
                <strong>손 포즈 인증</strong>
                <p style={styles.guideStepText}>
                  화면에 무작위로 제시되는 손동작을 카메라 앞에서 따라해주세요.
                </p>
              </div>
            </div>

            <div style={styles.guideStep}>
              <span style={styles.guideStepNumber}>2</span>
              <div>
                <strong>촬영 버튼 활성화</strong>
                <p style={styles.guideStepText}>
                  포즈가 인식되면 촬영 버튼이 활성화되고 1분의 제한시간이 시작됩니다.
                </p>
              </div>
            </div>

            <div style={styles.guideStep}>
              <span style={styles.guideStepNumber}>3</span>
              <div>
                <strong>랜드마크 촬영</strong>
                <p style={styles.guideStepText}>
                  손을 내린 뒤 랜드마크에 초점을 맞추고 1분 안에 촬영해 주세요.
                </p>
              </div>
            </div>
          </div>

          <div style={styles.poseTipBox}>
            <h2 style={styles.poseTipTitle}>손동작이 인식되지 않나요?</h2>

            <p style={styles.poseTipText}>
              ✌️ 브이 포즈는 엄지가 보이는 손바닥 방향을 카메라에 보여주세요.
            </p>

            <p style={styles.poseTipText}>
              ☝️ 가리키기 포즈도 엄지가 보이는 방향으로 손을 보여주세요.
            </p>

            <p style={styles.poseTipText}>
              손 전체가 화면 안에 들어오도록 하고 밝은 곳에서 인식해주세요.
            </p>
          </div>

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
