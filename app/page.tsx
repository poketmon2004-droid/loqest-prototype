"use client";

import { useEffect, useState } from "react";
import CameraCapture from "@/components/CameraCapture";

const landmarks = [
  {
    id: 1,
    name: "서울 암사동 유적",
    landmarkGuide: "움집이 화면 중앙에 오도록 맞춰주세요.",
    poseGuide: "움집 오른쪽에서 양손으로 지붕 모양을 만들어주세요.",
  },
  {
    id: 2,
    name: "광나루한강공원",
    landmarkGuide: "한강 수평선을 중앙선에 맞춰주세요.",
    poseGuide: "화면 왼쪽에서 양팔을 벌려주세요.",
  },
  {
    id: 3,
    name: "광진교",
    landmarkGuide: "다리가 촬영 프레임 안에 들어오게 맞춰주세요.",
    poseGuide: "한 손으로 광진교를 가리켜주세요.",
  },
];

type Screen = "home" | "quests" | "progress";

export default function Home() {
  const [screen, setScreen] = useState<Screen>("home");

  const [selectedLandmark, setSelectedLandmark] = useState<
    (typeof landmarks)[number] | null
  >(null);

  const [locationStatus, setLocationStatus] = useState<
    "idle" | "checking" | "success" | "error"
  >("idle");

  const [coordinates, setCoordinates] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);

  const [completedLandmarks, setCompletedLandmarks] = useState<number[]>([]);

  const [verificationCompleted, setVerificationCompleted] =
    useState(false);

  useEffect(() => {
    const savedRecords = localStorage.getItem(
      "gangdong-completed-landmarks"
    );

    if (savedRecords) {
      const records = JSON.parse(savedRecords);

      setTimeout(() => {
        setCompletedLandmarks(records);
      }, 0);
    }
  }, []);

  function startTour() {
    setScreen("quests");
    setSelectedLandmark(null);
    setLocationStatus("idle");
    setCoordinates(null);
    setVerificationCompleted(false);
  }

  function goHome() {
    setScreen("home");
    setSelectedLandmark(null);
    setLocationStatus("idle");
    setCoordinates(null);
    setVerificationCompleted(false);
  }

  function openProgress() {
    setScreen("progress");
    setSelectedLandmark(null);
  }

  function selectLandmark(landmark: (typeof landmarks)[number]) {
    if (completedLandmarks.includes(landmark.id)) {
      return;
    }

    setSelectedLandmark(landmark);
    setLocationStatus("idle");
    setCoordinates(null);
    setVerificationCompleted(false);
  }

  function goBackToQuestList() {
    setSelectedLandmark(null);
    setLocationStatus("idle");
    setCoordinates(null);
    setVerificationCompleted(false);
  }

  function checkLocation() {
    setLocationStatus("checking");

    if (!navigator.geolocation) {
      setLocationStatus("error");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setCoordinates({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });

        setLocationStatus("success");
      },
      () => {
        setLocationStatus("error");
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
      }
    );
  }

  function issueStamp(landmarkId: number) {
    setCompletedLandmarks((previousRecords) => {
      if (previousRecords.includes(landmarkId)) {
        return previousRecords;
      }

      const newRecords = [...previousRecords, landmarkId];

      localStorage.setItem(
        "gangdong-completed-landmarks",
        JSON.stringify(newRecords)
      );

      return newRecords;
    });

    setVerificationCompleted(true);
  }

  const completedCount = completedLandmarks.length;

  const progressPercentage = Math.round(
    (completedCount / landmarks.length) * 100
  );

  const isTourCompleted = completedCount === landmarks.length;

  // 첫 화면
  if (screen === "home") {
    return (
      <main>
        <h1>강동구 테스트 투어</h1>

        <p>
          강동구의 랜드마크를 방문하고
          <br />
          디지털 스탬프를 모아보세요.
        </p>

        <button onClick={startTour}>
          탐험 시작하기
        </button>

        <button onClick={openProgress}>
          내 탐험 진행률
        </button>
      </main>
    );
  }

  // 탐험 진행률 화면
  if (screen === "progress") {
    return (
      <main>
        <button onClick={goHome}>
          ← 홈으로 가기
        </button>

        <h1>내 탐험 진행률</h1>

        <h2>
          {completedCount} / {landmarks.length} 완료
        </h2>

        <p>진행률: {progressPercentage}%</p>

        <div
          style={{
            width: "100%",
            maxWidth: "480px",
            height: "20px",
            backgroundColor: "#dddddd",
            borderRadius: "10px",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              width: `${progressPercentage}%`,
              height: "100%",
              backgroundColor: "green",
              transition: "width 0.3s",
            }}
          />
        </div>

        {isTourCompleted && (
          <section>
            <h2>🎉 강동구 테스트 투어 완주!</h2>
            <p>모든 디지털 스탬프를 모았습니다.</p>
          </section>
        )}

        <h2>디지털 스탬프</h2>

        {landmarks.map((landmark) => {
          const isCompleted = completedLandmarks.includes(
            landmark.id
          );

          return (
            <section
              key={landmark.id}
              style={{
                marginTop: "15px",
                padding: "15px",
                border: isCompleted
                  ? "3px solid green"
                  : "1px solid gray",
                borderRadius: "15px",
              }}
            >
              <h3>{landmark.name}</h3>

              {isCompleted ? (
                <p>✅ 디지털 스탬프 획득 완료</p>
              ) : (
                <p>○ 아직 방문하지 않았습니다.</p>
              )}
            </section>
          );
        })}
      </main>
    );
  }

  // 랜드마크 촬영 화면
  if (selectedLandmark) {
    return (
      <main>
        <button onClick={goBackToQuestList}>
          ← 퀘스트 목록
        </button>

        <h1>{selectedLandmark.name}</h1>
        <p>촬영 가이드를 확인해주세요.</p>

        <h2>랜드마크 가이드</h2>
        <p>{selectedLandmark.landmarkGuide}</p>

        <h2>포즈 가이드</h2>
        <p>{selectedLandmark.poseGuide}</p>

        <button
          onClick={checkLocation}
          disabled={locationStatus === "checking"}
        >
          {locationStatus === "checking"
            ? "현재 위치 확인 중..."
            : "GPS 위치 확인하기"}
        </button>

        {locationStatus === "success" && coordinates && (
          <section>
            <p>✅ 현재 위치를 확인했습니다.</p>

            <CameraCapture
              landmarkGuide={selectedLandmark.landmarkGuide}
              poseGuide={selectedLandmark.poseGuide}
              onStampIssued={() =>
                issueStamp(selectedLandmark.id)
              }
            />

            {verificationCompleted && (
              <button
                onClick={goHome}
                style={{
                  marginTop: "20px",
                  padding: "15px",
                  width: "100%",
                  maxWidth: "480px",
                }}
              >
                홈으로 가기
              </button>
            )}
          </section>
        )}

        {locationStatus === "error" && (
          <p>
            ❌ 위치를 확인할 수 없습니다. 브라우저의 위치 권한을
            허용해주세요.
          </p>
        )}
      </main>
    );
  }

  // 랜드마크 퀘스트 목록
  return (
    <main>
      <button onClick={goHome}>
        ← 홈으로 가기
      </button>

      <h1>강동구 랜드마크 퀘스트</h1>

      <p>
        진행률: {completedCount} / {landmarks.length}
      </p>

      {landmarks.map((landmark) => {
        const isCompleted = completedLandmarks.includes(
          landmark.id
        );

        return (
          <button
            key={landmark.id}
            onClick={() => selectLandmark(landmark)}
            disabled={isCompleted}
          >
            {isCompleted
              ? `✅ ${landmark.name} 인증 완료`
              : `${landmark.name} 촬영하기`}
          </button>
        );
      })}
    </main>
  );
}