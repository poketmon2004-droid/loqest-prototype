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

type Screen = "home" | "quests" | "progress" | "verification";

type LocationStatus =
  | "idle"
  | "checking"
  | "inside"
  | "outside"
  | "error";

const landmarks: Landmark[] = [
  {
    id: "amsa-history",
    name: "서울 암사동 유적",
    description: "선사시대 유적지에서 인증 사진을 촬영합니다.",
    landmarkGuide:
      "암사동 유적의 입구 또는 대표적인 유적 시설이 화면에 보이게 해주세요.",
    poseGuide:
      "랜드마크 옆에서 한 손으로 유적지를 가리키는 포즈를 해주세요.",
    latitude: 37.56056,
    longitude: 127.13028,
    radius: 250,
  },
  {
    id: "gwangnaru-park",
    name: "광나루한강공원",
    description: "한강 풍경과 함께 인증 사진을 촬영합니다.",
    landmarkGuide:
      "한강과 공원의 풍경이 화면 뒤쪽에 충분히 보이게 해주세요.",
    poseGuide:
      "한강을 배경으로 양팔을 벌리는 포즈를 해주세요.",
    latitude: 37.553988,
    longitude: 127.12982,
    radius: 300,
  },
  {
    id: "starbucks-amsa",
    name: "스타벅스 암사역점",
    description: "스타벅스 암사역점에서 테스트 인증을 진행합니다.",
    landmarkGuide:
      "스타벅스 매장 간판이나 로고가 화면 중앙에 보이게 해주세요.",
    poseGuide:
      "스타벅스 로고 옆에서 한 손으로 로고를 가리켜주세요.",
    latitude: 37.55119212174066,
    longitude: 127.12807877121352,
    radius: 200,
  },
];

function calculateDistance(
  latitude1: number,
  longitude1: number,
  latitude2: number,
  longitude2: number
) {
  const earthRadius = 6371000;

  const toRadians = (degree: number) => {
    return (degree * Math.PI) / 180;
  };

  const latitudeDifference = toRadians(latitude2 - latitude1);
  const longitudeDifference = toRadians(longitude2 - longitude1);

  const firstLatitude = toRadians(latitude1);
  const secondLatitude = toRadians(latitude2);

  const value =
    Math.sin(latitudeDifference / 2) *
      Math.sin(latitudeDifference / 2) +
    Math.cos(firstLatitude) *
      Math.cos(secondLatitude) *
      Math.sin(longitudeDifference / 2) *
      Math.sin(longitudeDifference / 2);

  const angle =
    2 * Math.atan2(Math.sqrt(value), Math.sqrt(1 - value));

  return earthRadius * angle;
}

export default function Home() {
  const [screen, setScreen] = useState<Screen>("home");

  const [selectedLandmark, setSelectedLandmark] =
    useState<Landmark | null>(null);

  const [locationStatus, setLocationStatus] =
    useState<LocationStatus>("idle");

  const [locationMessage, setLocationMessage] = useState("");
  const [distance, setDistance] = useState<number | null>(null);
  const [stampIssued, setStampIssued] = useState(false);

  const [completedLandmarks, setCompletedLandmarks] = useState<string[]>(
    []
  );

  useEffect(() => {
    const savedStamps = localStorage.getItem("loqestCompletedLandmarks");

    if (!savedStamps) {
      return;
    }

    try {
      const parsedStamps: unknown = JSON.parse(savedStamps);

      if (!Array.isArray(parsedStamps)) {
        return;
      }

      const validIds = landmarks.map((landmark) => landmark.id);

      const validSavedStamps = parsedStamps.filter(
        (id): id is string =>
          typeof id === "string" && validIds.includes(id)
      );

      // eslint-disable-next-line react-hooks/set-state-in-effect
      setCompletedLandmarks(validSavedStamps);
    } catch {
      localStorage.removeItem("loqestCompletedLandmarks");
    }
  }, []);

  function saveCompletedLandmarks(ids: string[]) {
    setCompletedLandmarks(ids);

    localStorage.setItem(
      "loqestCompletedLandmarks",
      JSON.stringify(ids)
    );
  }

  function resetVerification() {
    setSelectedLandmark(null);
    setLocationStatus("idle");
    setLocationMessage("");
    setDistance(null);
    setStampIssued(false);
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

  function selectLandmark(landmark: Landmark) {
    setSelectedLandmark(landmark);
    setLocationStatus("idle");
    setLocationMessage("");
    setDistance(null);
    setStampIssued(false);
    setScreen("verification");
  }

  function checkLocation() {
    if (!selectedLandmark) {
      return;
    }

    if (!navigator.geolocation) {
      setLocationStatus("error");
      setLocationMessage(
        "이 기기에서는 위치 확인 기능을 지원하지 않습니다."
      );
      return;
    }

    setLocationStatus("checking");
    setLocationMessage("현재 위치를 확인하고 있습니다.");
    setDistance(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const currentLatitude = position.coords.latitude;
        const currentLongitude = position.coords.longitude;

        const currentDistance = calculateDistance(
          currentLatitude,
          currentLongitude,
          selectedLandmark.latitude,
          selectedLandmark.longitude
        );

        setDistance(currentDistance);

        if (currentDistance <= selectedLandmark.radius) {
          setLocationStatus("inside");
          setLocationMessage(
            "인증 장소에 도착했습니다. 촬영을 진행해주세요."
          );
        } else {
          setLocationStatus("outside");
          setLocationMessage(
            `현재 인증 지점에서 약 ${Math.round(
              currentDistance
            )}m 떨어져 있습니다.`
          );
        }
      },
      () => {
        setLocationStatus("error");
        setLocationMessage(
          "위치를 확인하지 못했습니다. 브라우저의 위치 권한을 허용해주세요."
        );
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  }

  function issueStamp() {
    if (!selectedLandmark) {
      return;
    }

    setStampIssued(true);

    if (!completedLandmarks.includes(selectedLandmark.id)) {
      const nextCompletedLandmarks = [
        ...completedLandmarks,
        selectedLandmark.id,
      ];

      saveCompletedLandmarks(nextCompletedLandmarks);
    }
  }

  const completedCount = landmarks.filter((landmark) =>
    completedLandmarks.includes(landmark.id)
  ).length;

  const progressPercent = Math.round(
    (completedCount / landmarks.length) * 100
  );

  if (screen === "home") {
    return (
      <main style={styles.main}>
        <section style={styles.card}>
          <p style={styles.badge}>모바일 테스트 투어</p>

          <h1 style={styles.title}>강동구 랜드마크 투어</h1>

          <p style={styles.description}>
            강동구의 랜드마크를 방문하고
            <br />
            디지털 스탬프를 모아보세요.
          </p>

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
            내 탐험 진행률
          </button>
        </section>
      </main>
    );
  }

  if (screen === "progress") {
    return (
      <main style={styles.main}>
        <section style={styles.card}>
          <p style={styles.badge}>나의 스탬프</p>

          <h1 style={styles.title}>내 탐험 진행률</h1>

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

          <div style={styles.landmarkList}>
            {landmarks.map((landmark) => {
              const completed = completedLandmarks.includes(
                landmark.id
              );

              return (
                <div key={landmark.id} style={styles.progressItem}>
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

          <button
            type="button"
            style={styles.primaryButton}
            onClick={goToQuestList}
          >
            탐험 계속하기
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

  if (screen === "verification" && selectedLandmark) {
    return (
      <main style={styles.main}>
        <section style={styles.card}>
          {!stampIssued && (
            <>
              <p style={styles.badge}>랜드마크 인증</p>

              <h1 style={styles.title}>{selectedLandmark.name}</h1>

              <p style={styles.description}>
                {selectedLandmark.description}
              </p>

              <div style={styles.guideBox}>
                <strong>촬영 안내</strong>
                <p>{selectedLandmark.landmarkGuide}</p>
                <p>{selectedLandmark.poseGuide}</p>
              </div>

              {locationStatus !== "inside" && (
                <button
                  type="button"
                  style={{
                    ...styles.primaryButton,
                    opacity:
                      locationStatus === "checking" ? 0.6 : 1,
                  }}
                  onClick={checkLocation}
                  disabled={locationStatus === "checking"}
                >
                  {locationStatus === "checking"
                    ? "위치 확인 중..."
                    : "현재 위치 확인하기"}
                </button>
              )}

              {locationMessage && (
                <div
                  style={{
                    ...styles.locationBox,

                    backgroundColor:
                      locationStatus === "inside"
                        ? "#e8f7ee"
                        : locationStatus === "outside"
                        ? "#fff4dc"
                        : locationStatus === "error"
                        ? "#ffe9e9"
                        : "#f3f3f3",

                    color:
                      locationStatus === "error"
                        ? "#9d2525"
                        : "#333",
                  }}
                >
                  <strong>{locationMessage}</strong>

                  {distance !== null && (
                    <p style={styles.locationDetail}>
                      인증 지점까지 거리: 약{" "}
                      {Math.round(distance)}m
                      <br />
                      인증 허용 반경: {selectedLandmark.radius}m
                    </p>
                  )}
                </div>
              )}

              {locationStatus === "outside" && (
                <button
                  type="button"
                  style={styles.secondaryButton}
                  onClick={checkLocation}
                >
                  위치 다시 확인하기
                </button>
              )}

              {locationStatus === "inside" && (
                <CameraCapture
                  landmarkGuide={
                    selectedLandmark.landmarkGuide
                  }
                  poseGuide={selectedLandmark.poseGuide}
                  onVerified={issueStamp}
                />
              )}

              <button
                type="button"
                style={styles.secondaryButton}
                onClick={goToQuestList}
              >
                목록으로 돌아가기
              </button>
            </>
          )}

          {stampIssued && (
            <div style={styles.stampBox}>
              <p style={styles.badge}>디지털 스탬프</p>

              <div style={styles.stampCircle}>
                <span>STAMP</span>
              </div>

              <h1 style={styles.title}>인증 완료!</h1>

              <p style={styles.description}>
                {selectedLandmark.name}
                <br />
                디지털 스탬프가 자동으로 발급되었습니다.
              </p>

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
                내 탐험 진행률 보기
              </button>
            </div>
          )}
        </section>
      </main>
    );
  }

  return (
    <main style={styles.main}>
      <section style={styles.card}>
        <p style={styles.badge}>강동구 테스트 코스</p>

        <h1 style={styles.title}>랜드마크 퀘스트</h1>

        <p style={styles.description}>
          촬영할 랜드마크를 선택해주세요.
        </p>

        <div style={styles.landmarkList}>
          {landmarks.map((landmark) => {
            const completed = completedLandmarks.includes(
              landmark.id
            );

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
                onClick={() => selectLandmark(landmark)}
                disabled={completed}
              >
                <strong style={styles.landmarkName}>
                  {landmark.name}
                </strong>

                <span style={styles.smallText}>
                  {completed
                    ? "✅ 인증 완료"
                    : `인증 반경 ${landmark.radius}m`}
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
          내 탐험 진행률
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
    boxShadow: "0 10px 30px rgba(0, 0, 0, 0.08)",
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

  landmarkList: {
    display: "grid",
    gap: "12px",
  },

  landmarkButton: {
    width: "100%",
    padding: "18px",
    border: "1px solid #dce4df",
    borderRadius: "16px",
    backgroundColor: "#fafcfb",
    color: "#222",
    textAlign: "left",
    display: "grid",
    gap: "8px",
    cursor: "pointer",
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
    marginBottom: "16px",
    padding: "16px",
    backgroundColor: "#f1f6f3",
    borderRadius: "14px",
    lineHeight: 1.6,
  },

  locationBox: {
    marginTop: "14px",
    padding: "14px",
    borderRadius: "14px",
    lineHeight: 1.5,
  },

  locationDetail: {
    margin: "8px 0 0",
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
};