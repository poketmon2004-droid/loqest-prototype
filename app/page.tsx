"use client";

import { useEffect, useState } from "react";
import CameraCapture from "../components/CameraCapture";

type Landmark = {
  id: string;
  name: string;
  description: string;
  landmarkGuide: string;
  poseGuide: string;
  latitude: number;
  longitude: number;
  radius: number;
};

type Screen =
  | "home"
  | "quests"
  | "progress"
  | "badges"
  | "verification";

const COMPLETED_LANDMARKS_KEY =
  "loqestCompletedLandmarks";

const GANGDONG_BADGE_DATE_KEY =
  "loqestGangdongBadgeEarnedAt";

const landmarks: Landmark[] = [
  {
    id: "amsa-history",
    name: "서울 암사동 유적",
    description:
      "선사시대 유적지에서 인증 사진을 촬영합니다.",
    landmarkGuide:
      "1. 가이드라인에 맞춰 랜드마크를 화면에 담아주세요.",
    poseGuide:
      "2. 화면에 제시된 포즈를 취한 상태로 촬영하세요.",
    latitude: 37.55292,
    longitude: 127.12555,
    radius: 250,
  },
  {
    id: "gwangnaru-park",
    name: "광나루한강공원",
    description:
      "한강 풍경과 함께 인증 사진을 촬영합니다.",
    landmarkGuide:
      "1. 가이드라인에 맞춰 랜드마크를 화면에 담아주세요.",
    poseGuide:
      "2. 화면에 제시된 포즈를 취한 상태로 촬영하세요.",
    latitude: 37.55292,
    longitude: 127.12555,
    radius: 300,
  },
  {
    id: "starbucks-amsa",
    name: "스타벅스 암사역점",
    description:
      "스타벅스 암사역점에서 테스트 인증을 진행합니다.",
    landmarkGuide:
      "1. 가이드라인에 맞춰 랜드마크를 화면에 담아주세요.",
    poseGuide:
      "2. 화면에 제시된 포즈를 취한 상태로 촬영하세요.",
    latitude: 37.55292,
    longitude: 127.12555,
    radius: 200,
  },
];

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

export default function Home() {
  const [screen, setScreen] = useState<Screen>("home");

  const [selectedLandmark, setSelectedLandmark] =
    useState<Landmark | null>(null);

  const [stampIssued, setStampIssued] = useState(false);

  const [verificationProcessing, setVerificationProcessing] =
    useState(false);

  const [completedLandmarks, setCompletedLandmarks] =
    useState<string[]>([]);

  const [hasUnreadBadge, setHasUnreadBadge] = useState(false);

  useEffect(() => {
    const badgeEarned = localStorage.getItem(
      "loqestGangdongBadgeEarnedAt"
    );

    const badgeSeen = localStorage.getItem(
      "loqestGangdongBadgeSeen"
    );

    // eslint-disable-next-line react-hooks/set-state-in-effect
    setHasUnreadBadge(
      Boolean(badgeEarned) && badgeSeen !== "true"
    );
  }, []);

  const [badgeEarnedAt, setBadgeEarnedAt] =
    useState<string | null>(null);

  useEffect(() => {
    const savedStamps = localStorage.getItem(
      COMPLETED_LANDMARKS_KEY
    );

    const savedBadgeDate = localStorage.getItem(
      GANGDONG_BADGE_DATE_KEY
    );

    if (!savedStamps) {
      return;
    }

    try {
      const parsedStamps: unknown = JSON.parse(savedStamps);

      if (!Array.isArray(parsedStamps)) {
        return;
      }

      const validIds = landmarks.map(
        (landmark) => landmark.id
      );

      const validSavedStamps = parsedStamps.filter(
        (id): id is string =>
          typeof id === "string" && validIds.includes(id)
      );

      // eslint-disable-next-line react-hooks/set-state-in-effect
      setCompletedLandmarks(validSavedStamps);

      if (
        validSavedStamps.length === landmarks.length
      ) {
        const earnedAt =
          savedBadgeDate ?? new Date().toISOString();

        if (!savedBadgeDate) {
          localStorage.setItem(
            GANGDONG_BADGE_DATE_KEY,
            earnedAt
          );

        }

        // eslint-disable-next-line react-hooks/set-state-in-effect
        setBadgeEarnedAt(earnedAt);
      }
    } catch {
      localStorage.removeItem(COMPLETED_LANDMARKS_KEY);
      localStorage.removeItem(GANGDONG_BADGE_DATE_KEY);
      localStorage.removeItem("loqestGangdongBadgeSeen");
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setHasUnreadBadge(false);
    }
  }, []);

  function saveCompletedLandmarks(ids: string[]) {
    setCompletedLandmarks(ids);

    localStorage.setItem(
      COMPLETED_LANDMARKS_KEY,
      JSON.stringify(ids)
    );
  }

  function resetVerification() {
    setSelectedLandmark(null);
    setStampIssued(false);
    setVerificationProcessing(false);
  }

  function goHome() {
    resetVerification();
    setScreen("home");
  }

  function goToQuestList() {
    resetVerification();
    setScreen("quests");
  }

  function goToProgress() {
    resetVerification();
    setScreen("progress");
  }

  function goToBadges() {
    setHasUnreadBadge(false);

    localStorage.setItem(
      "loqestGangdongBadgeSeen",
      "true"
    );

    setScreen("badges");
  }

  function resetProgress() {
    const confirmed = window.confirm(
      "발급된 스탬프와 여행 뱃지를 모두 초기화할까요?"
    );

    if (!confirmed) {
      return;
    }

    setCompletedLandmarks([]);
    setBadgeEarnedAt(null);
    setHasUnreadBadge(false);

    localStorage.removeItem(COMPLETED_LANDMARKS_KEY);
    localStorage.removeItem(GANGDONG_BADGE_DATE_KEY);
    localStorage.removeItem("loqestGangdongBadgeSeen");
  }

  function selectLandmark(landmark: Landmark) {
    setSelectedLandmark(landmark);
    setStampIssued(false);
    setScreen("verification");
  }

  function issueStamp() {
    if (!selectedLandmark) {
      return;
    }

    setStampIssued(true);

    if (completedLandmarks.includes(selectedLandmark.id)) {
      return;
    }

    const nextCompletedLandmarks = [
      ...completedLandmarks,
      selectedLandmark.id,
    ];

    saveCompletedLandmarks(nextCompletedLandmarks);

    /*
      마지막 랜드마크까지 인증하면
      별도의 발급 버튼 없이 뱃지를 자동으로 발급합니다.
    */
    if (
      nextCompletedLandmarks.length === landmarks.length
    ) {
      const earnedAt = new Date().toISOString();

      setBadgeEarnedAt(earnedAt);

      localStorage.setItem(
        GANGDONG_BADGE_DATE_KEY,
        earnedAt
      );

      localStorage.removeItem("loqestGangdongBadgeSeen");
      setHasUnreadBadge(true);
    }
  }

  const completedCount = landmarks.filter((landmark) =>
    completedLandmarks.includes(landmark.id)
  ).length;

  const progressPercent = Math.round(
    (completedCount / landmarks.length) * 100
  );

  const tourCompleted =
    completedCount === landmarks.length;

  if (screen === "home") {
    return (
      <main style={styles.main}>
        <section style={styles.card}>
          <p style={styles.badge}>모바일 테스트 투어</p>

          <h1 style={styles.title}>
            강동구 랜드마크 투어
          </h1>

          <p style={styles.description}>
            강동구의 랜드마크를 방문하고
            <br />
            디지털 스탬프와 여행 뱃지를 모아보세요.
          </p>

          <div style={styles.entryInfo}>
            <strong>입장 인증 완료</strong>

            <p style={styles.entryText}>
              입장료 결제 후 전달된 전용 URL로
              접속했습니다.
            </p>
          </div>

          <button
            type="button"
            style={styles.primaryButton}
            onClick={goToQuestList}
          >
            탐험 시작하기
          </button>

          <button
            type="button"
            style={styles.secondaryButton}
            onClick={goToProgress}
          >
            현재 탐험 진행률
          </button>

          <button
            type="button"
            style={styles.badgeButton}
            onClick={goToBadges}
          >
            <span>📖</span>
            <span>나의 여행 도감</span>

            {hasUnreadBadge && (
              <span style={styles.newBadge}>NEW</span>
            )}
          </button>
        </section>
      </main>
    );
  }

  if (screen === "progress") {
    return (
      <main style={styles.main}>
        <section style={styles.card}>
          <p style={styles.badge}>현재 탐험</p>

          <h1 style={styles.title}>
            강동구 탐험 진행률
          </h1>

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
                <strong>강동구 탐험 완료!</strong>

                <p style={styles.completionText}>
                  ‘강동구 탐험가’ 뱃지가 자동으로
                  발급되었습니다.
                </p>
              </div>
            </div>
          )}

          <div style={styles.landmarkList}>
            {landmarks.map((landmark) => {
              const completed =
                completedLandmarks.includes(landmark.id);

              return (
                <div
                  key={landmark.id}
                  style={styles.progressItem}
                >
                  <span style={styles.progressIcon}>
                    {completed ? "✅" : "⬜"}
                  </span>

                  <div>
                    <strong>{landmark.name}</strong>

                    <p style={styles.smallText}>
                      {completed
                        ? "인증 완료"
                        : "아직 인증하지 않았습니다."}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          {tourCompleted ? (
            <button
              type="button"
              style={styles.primaryButton}
              onClick={goToBadges}
            >
              발급된 여행 뱃지 보기
            </button>
          ) : (
            <button
              type="button"
              style={styles.primaryButton}
              onClick={goToQuestList}
            >
              탐험 계속하기
            </button>
          )}

          <button
            type="button"
            style={styles.resetButton}
            onClick={resetProgress}
          >
            테스트 기록 초기화
          </button>

          <button
            type="button"
            style={styles.secondaryButton}
            onClick={goHome}
          >
            홈으로 가기
          </button>
        </section>
      </main>
    );
  }

  if (screen === "badges") {
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
                강동구 탐험가
              </h2>

              <p style={styles.badgeDescription}>
                강동구 랜드마크 3곳의 인증을
                모두 완료했습니다.
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
                강동구 탐험가
              </h2>

              <p style={styles.badgeDescription}>
                강동구 랜드마크를 모두 인증하면
                여행 뱃지가 자동으로 발급됩니다.
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
            onClick={goToProgress}
          >
            현재 탐험 진행률
          </button>

          <button
            type="button"
            style={styles.secondaryButton}
            onClick={goHome}
          >
            홈으로 가기
          </button>
        </section>
      </main>
    );
  }

  if (
    screen === "verification" &&
    selectedLandmark
  ) {
    return (
      <main style={styles.main}>
        <section style={styles.card}>
          {!stampIssued && (
            <>
              <p style={styles.badge}>
                랜드마크 인증
              </p>

              <h1 style={styles.title}>
                {selectedLandmark.name}
              </h1>

              <p style={styles.description}>
                {selectedLandmark.description}
              </p>

              <div style={styles.guideBox}>
                <strong>촬영 안내</strong>

                <p>
                  {selectedLandmark.landmarkGuide}
                </p>

                <p>{selectedLandmark.poseGuide}</p>
              </div>

              <div style={styles.gpsNotice}>
                <strong>위치 권한 안내</strong>

                <p style={styles.gpsNoticeText}>
                  촬영 버튼을 누르면 현재 위치를
                  자동으로 확인합니다. 인증 반경 밖에서는
                  스탬프가 발급되지 않습니다.
                </p>
              </div>

              <CameraCapture
                landmarkName={selectedLandmark.name}
                landmarkGuide={
                  selectedLandmark.landmarkGuide
                }
                poseGuide={selectedLandmark.poseGuide}
                landmarkLatitude={
                  selectedLandmark.latitude
                }
                landmarkLongitude={
                  selectedLandmark.longitude
                }
                allowedRadius={selectedLandmark.radius}
                onProcessingChange={setVerificationProcessing}
                onVerified={issueStamp}
              />

              {!verificationProcessing && (
                <button
                  type="button"
                  style={styles.secondaryButton}
                  onClick={goToQuestList}
                >
                  목록으로 돌아가기
                </button>
              )}
            </>
          )}

          {stampIssued && (
            <div style={styles.stampBox}>
              <p style={styles.badge}>
                디지털 스탬프
              </p>

              <div style={styles.stampCircle}>
                <span>STAMP</span>
              </div>

              <h1 style={styles.title}>인증 완료!</h1>

              <p style={styles.description}>
                {selectedLandmark.name}
                <br />
                디지털 스탬프가 자동으로
                발급되었습니다.
              </p>

              {tourCompleted && (
                <div style={styles.completionNotice}>
                  <span style={styles.completionIcon}>
                    🏅
                  </span>

                  <div>
                    <strong>
                      강동구 탐험가 뱃지 획득!
                    </strong>

                    <p style={styles.completionText}>
                      여행 도감에서 확인할 수 있습니다.
                    </p>
                  </div>
                </div>
              )}

              <button
                type="button"
                style={styles.primaryButton}
                onClick={goHome}
              >
                홈으로 가기
              </button>

              <button
                type="button"
                style={styles.secondaryButton}
                onClick={goToProgress}
              >
                현재 탐험 진행률
              </button>

              {tourCompleted && (
                <button
                  type="button"
                  style={styles.badgeButton}
                  onClick={goToBadges}
                >
                  나의 여행 도감 보기
                </button>
              )}
            </div>
          )}
        </section>
      </main>
    );
  }

  return (
    <main style={styles.main}>
      <section style={styles.card}>
        <p style={styles.badge}>
          강동구 테스트 코스
        </p>

        <h1 style={styles.title}>
          랜드마크 퀘스트
        </h1>

        <p style={styles.description}>
          촬영할 랜드마크를 선택해주세요.
        </p>

        <div style={styles.landmarkList}>
          {landmarks.map((landmark) => {
            const completed =
              completedLandmarks.includes(landmark.id);

            return (
              <button
                type="button"
                key={landmark.id}
                style={{
                  ...styles.landmarkButton,
                  ...(completed
                    ? styles.completedLandmarkButton
                    : {}),
                }}
                onClick={() =>
                  selectLandmark(landmark)
                }
                disabled={completed}
              >
                <strong style={styles.landmarkName}>
                  {landmark.name}
                </strong>

                <span style={styles.smallText}>
                  {completed
                    ? "✅ 인증 완료"
                    : `엄지척 + GPS 인증 · 반경 ${landmark.radius}m`}
                </span>
              </button>
            );
          })}
        </div>

        <button
          type="button"
          style={styles.secondaryButton}
          onClick={goToProgress}
        >
          현재 탐험 진행률
        </button>

        <button
          type="button"
          style={styles.secondaryButton}
          onClick={goHome}
        >
          홈으로 가기
        </button>
      </section>
    </main>
  );
}

const styles: Record<string, React.CSSProperties> = {
  main: {
    minHeight: "100vh",
    padding: "24px 16px",
    backgroundColor: "#f4f6f5",
    display: "flex",
    justifyContent: "center",
    alignItems: "flex-start",
    color: "#202020",
  },

  card: {
    width: "100%",
    maxWidth: "480px",
    padding: "24px",
    backgroundColor: "white",
    borderRadius: "24px",
    boxShadow:
      "0 10px 30px rgba(0, 0, 0, 0.08)",
  },

  badge: {
    display: "inline-block",
    margin: "0 0 12px",
    padding: "7px 12px",
    backgroundColor: "#e3f3e9",
    color: "#167245",
    borderRadius: "999px",
    fontSize: "13px",
    fontWeight: 700,
  },

  title: {
    margin: "0 0 14px",
    fontSize: "30px",
    lineHeight: 1.25,
  },

  description: {
    marginBottom: "24px",
    color: "#666",
    lineHeight: 1.7,
  },

  entryInfo: {
    marginBottom: "12px",
    padding: "15px",
    backgroundColor: "#eef7f1",
    border: "1px solid #d7eadf",
    borderRadius: "14px",
    color: "#176c44",
  },

  entryText: {
    margin: "6px 0 0",
    color: "#547065",
    fontSize: "13px",
    lineHeight: 1.5,
  },

  primaryButton: {
    width: "100%",
    minHeight: "52px",
    marginTop: "12px",
    padding: "14px",
    border: "none",
    borderRadius: "14px",
    backgroundColor: "#137c4b",
    color: "white",
    fontSize: "16px",
    fontWeight: 700,
    cursor: "pointer",
  },

  secondaryButton: {
    width: "100%",
    minHeight: "50px",
    marginTop: "12px",
    padding: "13px",
    border: "1px solid #cbd2ce",
    borderRadius: "14px",
    backgroundColor: "white",
    color: "#333",
    fontSize: "15px",
    fontWeight: 700,
    cursor: "pointer",
  },

  badgeButton: {
    position: "relative",
    width: "100%",
    minHeight: "50px",
    marginTop: "12px",
    padding: "13px",
    border: "1px solid #dccb93",
    borderRadius: "14px",
    backgroundColor: "#fff9e8",
    color: "#73590c",
    fontSize: "15px",
    fontWeight: 700,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "7px",
  },

  newBadge: {
    position: "absolute",
    top: "-7px",
    right: "10px",
    padding: "4px 7px",
    borderRadius: "999px",
    backgroundColor: "#e44a3c",
    color: "white",
    fontSize: "10px",
    fontWeight: 900,
  },

  landmarkList: {
    display: "grid",
    gap: "12px",
  },

  landmarkButton: {
    width: "100%",
    padding: "18px",
    border: "1px solid #b9d8c5",
    borderRadius: "16px",
    backgroundColor: "#f0f8f3",
    color: "#174d32",
    textAlign: "left",
    display: "grid",
    gap: "8px",
    cursor: "pointer",
    boxShadow: "0 4px 12px rgba(19, 124, 75, 0.06)",
  },

  completedLandmarkButton: {
    backgroundColor: "#edf5f0",
    opacity: 0.7,
    cursor: "default",
  },

  landmarkName: {
    fontSize: "16px",
  },

  guideBox: {
    marginBottom: "12px",
    padding: "16px",
    backgroundColor: "#f1f6f3",
    borderRadius: "14px",
    lineHeight: 1.6,
  },

  gpsNotice: {
    marginBottom: "16px",
    padding: "14px",
    backgroundColor: "#fff5dd",
    borderRadius: "14px",
    color: "#664c0c",
  },

  gpsNoticeText: {
    margin: "6px 0 0",
    fontSize: "13px",
    lineHeight: 1.6,
  },

  stampBox: {
    padding: "16px 0 4px",
    textAlign: "center",
  },

  stampCircle: {
    width: "130px",
    height: "130px",
    margin: "10px auto 24px",
    border: "8px double #137c4b",
    borderRadius: "50%",
    color: "#137c4b",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    fontSize: "19px",
    fontWeight: 900,
    transform: "rotate(-8deg)",
  },

  progressSummary: {
    display: "grid",
    gap: "6px",
    marginBottom: "16px",
  },

  progressNumber: {
    fontSize: "36px",
    color: "#137c4b",
  },

  progressBarBackground: {
    width: "100%",
    height: "14px",
    overflow: "hidden",
    backgroundColor: "#e6e9e7",
    borderRadius: "999px",
  },

  progressBar: {
    height: "100%",
    backgroundColor: "#137c4b",
    borderRadius: "999px",
    transition: "width 0.3s ease",
  },

  progressText: {
    marginBottom: "20px",
    color: "#666",
    fontSize: "14px",
  },

  progressItem: {
    padding: "14px",
    border: "1px solid #e1e5e2",
    borderRadius: "14px",
    display: "flex",
    alignItems: "center",
    gap: "12px",
  },

  progressIcon: {
    fontSize: "21px",
  },

  smallText: {
    margin: 0,
    color: "#707070",
    fontSize: "13px",
  },

  completionNotice: {
    marginBottom: "18px",
    padding: "15px",
    border: "1px solid #eedc9f",
    borderRadius: "15px",
    backgroundColor: "#fff8dc",
    color: "#6a530d",
    display: "flex",
    alignItems: "center",
    gap: "12px",
    textAlign: "left",
  },

  completionIcon: {
    fontSize: "28px",
  },

  completionText: {
    margin: "5px 0 0",
    fontSize: "13px",
    lineHeight: 1.5,
  },

  resetButton: {
    width: "100%",
    minHeight: "46px",
    marginTop: "20px",
    padding: "12px",
    border: "1px solid #e2b6b6",
    borderRadius: "14px",
    backgroundColor: "#fff5f5",
    color: "#a12c2c",
    fontSize: "14px",
    fontWeight: 700,
    cursor: "pointer",
  },

  earnedBadgeCard: {
    padding: "24px 18px",
    border: "1px solid #eadcae",
    borderRadius: "22px",
    background:
      "linear-gradient(145deg, #fffdf5, #fff4c9)",
    textAlign: "center",
    boxShadow:
      "0 12px 30px rgba(126, 96, 13, 0.12)",
  },

  badgeGlow: {
    width: "126px",
    height: "126px",
    margin: "0 auto 16px",
    borderRadius: "50%",
    background:
      "radial-gradient(circle, #fff9c9, #ebcb65)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    boxShadow:
      "0 0 30px rgba(218, 177, 52, 0.4)",
  },

  badgeMedal: {
    fontSize: "66px",
  },

  badgeStatus: {
    margin: "0 0 5px",
    color: "#9a7720",
    fontSize: "12px",
    fontWeight: 800,
  },

  badgeTitle: {
    margin: "0 0 10px",
    fontSize: "25px",
  },

  badgeDescription: {
    margin: "0 0 18px",
    color: "#6e6755",
    fontSize: "14px",
    lineHeight: 1.6,
  },

  badgeInformation: {
    padding: "14px",
    borderRadius: "14px",
    backgroundColor: "rgba(255,255,255,0.7)",
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "12px",
  },

  infoLabel: {
    display: "block",
    marginBottom: "5px",
    color: "#8b846f",
    fontSize: "11px",
  },

  completedList: {
    marginTop: "16px",
    display: "flex",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: "7px",
  },

  completedChip: {
    padding: "6px 9px",
    borderRadius: "999px",
    backgroundColor: "#e7f3eb",
    color: "#176c44",
    fontSize: "11px",
    fontWeight: 700,
  },

  lockedBadgeCard: {
    padding: "28px 18px",
    border: "1px dashed #c9cecb",
    borderRadius: "22px",
    backgroundColor: "#f8faf9",
    textAlign: "center",
  },

  lockedBadge: {
    marginBottom: "13px",
    fontSize: "54px",
    filter: "grayscale(1)",
    opacity: 0.65,
  },

  miniProgressBackground: {
    width: "100%",
    height: "10px",
    marginBottom: "9px",
    overflow: "hidden",
    borderRadius: "999px",
    backgroundColor: "#e4e8e6",
  },

  miniProgress: {
    height: "100%",
    borderRadius: "999px",
    backgroundColor: "#137c4b",
    transition: "width 0.3s ease",
  },
};