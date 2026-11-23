"use client";

export type GuideShape = "rectangle" | "triangle" | "circle";

export const guideShapeLabels: Record<GuideShape, string> = {
  rectangle: "네모",
  triangle: "세모",
  circle: "원",
};

export function GuideShapeOutline({ shape, stroke = "currentColor" }: { shape: GuideShape; stroke?: string }) {
  return (
    <svg viewBox="0 0 120 90" width="100%" height="100%" aria-hidden="true" style={{ overflow: "visible" }}>
      {shape === "rectangle" && <rect x="12" y="12" width="96" height="66" rx="5" fill="none" stroke={stroke} strokeWidth="4" strokeDasharray="10 6" />}
      {shape === "circle" && <ellipse cx="60" cy="45" rx="38" ry="37" fill="none" stroke={stroke} strokeWidth="4" strokeDasharray="10 6" />}
      {shape === "triangle" && <polygon points="60,9 111,78 9,78" fill="none" stroke={stroke} strokeWidth="4" strokeDasharray="10 6" strokeLinejoin="round" />}
    </svg>
  );
}

export default function GuideShapeSelector({
  value, onChange, disabled = false,
}: {
  value: GuideShape;
  onChange: (value: GuideShape) => void;
  disabled?: boolean;
}) {
  return (
    <fieldset style={{ border: 0, padding: 0, margin: "22px 0 0", minWidth: 0 }} disabled={disabled}>
      <legend style={{ fontSize: 17, fontWeight: 800, color: "#1c344a", marginBottom: 7 }}>촬영 가이드라인 모양</legend>
      <p style={{ color: "#768a9d", fontSize: 13, margin: "0 0 14px" }}>관광객의 카메라 화면에 표시할 가이드라인을 선택해주세요.</p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 10 }}>
        {(["rectangle", "triangle", "circle"] as GuideShape[]).map(shape => {
          const selected = value === shape;
          return (
            <button type="button" key={shape} onClick={() => onChange(shape)} aria-pressed={selected} disabled={disabled}
              style={{
                minWidth: 0, minHeight: 128, borderRadius: 12, cursor: "pointer",
                border: selected ? "2px solid #0284c7" : "1px solid #d5e2ed",
                background: selected ? "#edf8ff" : "#fff",
                color: selected ? "#0369a1" : "#587084",
                display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                gap: 7, padding: "12px 7px", fontWeight: 800,
                boxShadow: selected ? "0 0 0 2px rgba(2,132,199,.09)" : "none",
              }}>
              <span style={{ width: "min(100%, 90px)", height: 68, display: "block" }}>
                <GuideShapeOutline shape={shape} />
              </span>
              <span style={{ fontSize: 14 }}>{selected ? "✓ " : ""}{guideShapeLabels[shape]}</span>
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}
