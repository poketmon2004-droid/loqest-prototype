"use client";

import { GuideShapeOutline, guideShapeLabels, type GuideShape } from "./GuideShapeSelector";

type Props = {
  src?: string | null;
  name?: string;
  shape: GuideShape;
  compact?: boolean;
};

export default function GuidePhotoPreview({ src, name, shape, compact = false }: Props) {
  if (!src) {
    return (
      <div style={{
        marginTop: 18, minHeight: 150, padding: 20,
        border: "1px dashed #b9ccd9", borderRadius: 14,
        background: "#f4f8fb", display: "grid", placeItems: "center",
        textAlign: "center", color: "#667e8e", fontSize: 13, lineHeight: 1.6,
      }}>
        대표사진을 선택하면 이곳에서 촬영 예시를 미리 볼 수 있어요.
      </div>
    );
  }

  return (
    <figure style={{
      margin: compact ? "12px 0" : "18px 0 12px",
      padding: compact ? 9 : 14,
      background: "#ffffff", border: "1px solid #d5e2ed", borderRadius: 14,
      minWidth: 0, width: "100%", boxSizing: "border-box",
    }}>
      <div style={{
        position: "relative", margin: "0 auto", overflow: "hidden",
        width: "100%", maxWidth: compact ? 420 : 640,
        borderRadius: 10, background: "#e5edf3",
      }}>
        {/* Keep the full photograph visible; the guideline is display-only. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt={name ? `${name} 촬영 예시` : "랜드마크 촬영 예시"} style={{
          width: "100%", height: "auto", maxHeight: compact ? 280 : 420,
          display: "block", objectFit: "contain",
        }} />
        <div style={{
          position: "absolute", inset: "6% 6% 10%",
          display: "flex", alignItems: "center", justifyContent: "center",
          pointerEvents: "none",
          filter: "drop-shadow(0 1px 3px rgba(0,0,0,.8))",
        }}>
          <GuideShapeOutline shape={shape} stroke="#ffffff" />
        </div>
        {!compact && <span style={{
          position: "absolute", top: 9, left: 9,
          padding: "5px 9px", borderRadius: 6,
          color: "#fff", background: "#16a34a",
          fontSize: 12, fontWeight: 800,
        }}>✓ 대표사진</span>}
      </div>
      <figcaption style={{
        marginTop: 10, fontSize: compact ? 12 : 13,
        textAlign: "center", lineHeight: 1.5,
        color: "#48687b", fontWeight: 700, overflowWrap: "anywhere",
      }}>
        {compact ? "예시처럼 랜드마크를 가이드라인 안에 맞춰주세요." :
          `촬영 예시 · ${guideShapeLabels[shape]} 가이드라인에 맞춰 촬영해주세요.`}
      </figcaption>
    </figure>
  );
}
