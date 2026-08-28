"use client";

import { useEffect, useState } from "react";
import CameraCapture from "../components/CameraCapture";

type Landmark = {
  id: string;
  attractionId: number;
  name: string;
  icon: string;
  mission: string;
  recognitionKey: string;
  requiresGps: boolean;
  description: string;
  landmarkGuide: string;
  poseGuide: string;
  latitude: number;
  longitude: number;
  radius: number;
  referenceImages: string[];
  goodMatchesThreshold: number;
  matchRatioThreshold: number;
  mapPosition: {
    x: number;
    y: number;
  };
};

type PublicAttraction = {
  id: number | string;
  name: string;
  category?: string;
  description?: string;
  latitude?: number | string;
  longitude?: number | string;
  radius?: number | string;
  guideMessage?: string;
  guide_message?: string;
  recognitionKey?: string;
  recognition_key?: string;
  icon?: string;
  mission?: string;
  landmarkThreshold?: number | string;
  landmark_threshold?: number | string;
  referenceImages?: Array<{
    dataUrl?: string;
    url?: string;
  }>;
};

type PublicTour = {
  id: string;
  name: string;
  short_name?: string;
  province?: string;
  region?: string;
  description?: string;
  badge_name?: string;
  questCount?: number;
};

type Screen =
  | "main-home"
  | "home"
  | "quests"
  | "badges"
  | "guide"
  | "test-home"
  | "test-quests"
  | "verification";

const COMPLETED_LANDMARKS_KEY =
  "loqestCompletedLandmarks";

const GANGDONG_BADGE_DATE_KEY =
  "loqestAmsaBadgeEarnedAt";

const COMPLETED_TEST_LANDMARKS_KEY =
  "loqestCompletedTestLandmarks";

const fallbackLandmarks: Landmark[] = [
  {
    id: "amsa-inform",
    attractionId: 1,
    name: "선사유적지 안내판",
    icon: "🗺️",
    mission: "유적지 지도를 찾아보세요",
    recognitionKey: "inform",
    requiresGps: true,
    description:
      "선사유적지 안내판을 가이드에 맞춰 촬영합니다.",
    poseGuide:
      "1. 화면에 제시된 손동작을 따라 하면 촬영 버튼이 활성화됩니다.",
    landmarkGuide:
      "2. 손을 내리고, 1분 안에 랜드마크를 가이드라인에 맞춰 촬영해 주세요.",
    latitude: 37.559771,
    longitude: 127.130753,
    radius: 250,
    referenceImages: [],
    goodMatchesThreshold: 45,
    matchRatioThreshold: 40,
    mapPosition: { x: 88, y: 108 },
  },
  {
    id: "amsa-character",
    attractionId: 2,
    name: "선사유적지 캐릭터",
    icon: "🎨",
    mission: "움스프렌즈를 찾아보세요",
    recognitionKey: "character",
    requiresGps: true,
    description:
      "움스프렌즈 캐릭터와 함께 인증 사진을 촬영합니다.",
    poseGuide:
      "1. 화면에 제시된 손동작을 따라 하면 촬영 버튼이 활성화됩니다.",
    landmarkGuide:
      "2. 손을 내리고, 1분 안에 랜드마크를 가이드라인에 맞춰 촬영해 주세요.",
    latitude: 37.559771,
    longitude: 127.130753,
    radius: 250,
    referenceImages: [],
    goodMatchesThreshold: 45,
    matchRatioThreshold: 45,
    mapPosition: { x: 264, y: 250 },
  },
  {
    id: "amsa-wish",
    attractionId: 3,
    name: "소망움집",
    icon: "🛖",
    mission: "소망움집을 정면에서 담아보세요",
    recognitionKey: "wish",
    requiresGps: true,
    description:
      "소망움집을 정면 가이드에 맞춰 촬영합니다.",
    poseGuide:
      "1. 화면에 제시된 손동작을 따라 하면 촬영 버튼이 활성화됩니다.",
    landmarkGuide:
      "2. 손을 내리고, 1분 안에 랜드마크를 가이드라인에 맞춰 촬영해 주세요.",
    latitude: 37.559771,
    longitude: 127.130753,
    radius: 250,
    referenceImages: [],
    goodMatchesThreshold: 45,
    matchRatioThreshold: 45,
    mapPosition: { x: 96, y: 396 },
  },
];

function iconForCategory(category?: string) {
  if (category === "자연·생태") return "🌿";
  if (category === "축제·행사") return "🎉";
  if (category === "체험·레저") return "🎯";
  if (category === "지역상권") return "🛍️";
  if (category === "포토 미션") return "📸";
  return "🏛️";
}

function recognitionKeyForAttraction(attraction: PublicAttraction) {
  const key = attraction.recognitionKey ?? attraction.recognition_key;
  return key || `landmark-${attraction.id}`;
}

function mapPublicAttractions(items: PublicAttraction[], tourId = "amsa"): Landmark[] {
  const rowCount = Math.max(1, Math.ceil(items.length / 2));
  const verticalGap = rowCount === 1 ? 0 : 330 / (rowCount - 1);

  return items.map((item, index) => {
    const recognitionKey = recognitionKeyForAttraction(item);
    const originalLandmark = fallbackLandmarks.find(
      (landmark) => landmark.recognitionKey === recognitionKey
    );
    const guideMessage =
      item.guideMessage ??
      item.guide_message ??
      "랜드마크를 가이드라인에 맞춰 촬영해 주세요.";
    const referenceImages = (item.referenceImages ?? [])
      .map((image) => image.dataUrl ?? image.url ?? "")
      .filter((source): source is string => Boolean(source));
    const matchRatioThreshold = Number(
      item.landmarkThreshold ?? item.landmark_threshold ?? 30
    );

    return {
      id: `${tourId}-${item.id}`,
      attractionId: Number(item.id),
      name: item.name,
      icon:
        originalLandmark?.icon ||
        item.icon ||
        iconForCategory(item.category),
      mission:
        item.mission || originalLandmark?.mission || guideMessage,
      recognitionKey,
      requiresGps: true,
      description:
        item.description || `${item.name} 인증 사진을 촬영합니다.`,
      poseGuide:
        "1. 화면에 제시된 손동작을 따라 하면 촬영 버튼이 활성화됩니다.",
      landmarkGuide: `2. 손을 내리고, 1분 안에 ${guideMessage}`,
      latitude: Number(item.latitude),
      longitude: Number(item.longitude),
      radius: Number(item.radius ?? 50),
      referenceImages,
      goodMatchesThreshold: 45,
      matchRatioThreshold,
      mapPosition:
        originalLandmark?.mapPosition ??
        {
          x: index % 2 === 0 ? 88 : 264,
          y: 90 + Math.floor(index / 2) * verticalGap,
        },
    };
  });
}

const testLandmarks: Landmark[] = [
  {
    id: "home-keyboard",
    attractionId: 4,
    name: "사진 촬영 테스트",
    icon: "🏡",
    mission: "어떤 것이든 촬영 해보세요",
    recognitionKey: "home",
    requiresGps: false,
    description:
      "집에서 손 포즈와 랜드마크 인증 과정을 테스트합니다.",
    poseGuide:
      "1. 화면에 제시된 손동작을 따라 하면 촬영 버튼이 활성화됩니다.",
    landmarkGuide:
      "2. 손을 내리고, 1분 안에 랜드마크를 가이드라인에 맞춰 촬영해 주세요.",
    latitude: 0,
    longitude: 0,
    radius: 0,
    referenceImages: [],
    goodMatchesThreshold: 45,
    matchRatioThreshold: 30,
    mapPosition: { x: 180, y: 260 },
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
  const [tours, setTours] = useState<PublicTour[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedProvince, setSelectedProvince] = useState("전체");
  const [activeTour, setActiveTour] = useState<PublicTour | null>(null);
  const [landmarks, setLandmarks] =
    useState<Landmark[]>([]);

  const [screen, setScreen] = useState<Screen>("main-home");

  const [selectedLandmark, setSelectedLandmark] =
    useState<Landmark | null>(null);

  const [stampIssued, setStampIssued] = useState(false);

  const [verificationProcessing, setVerificationProcessing] =
    useState(false);

  const [completedLandmarks, setCompletedLandmarks] =
    useState<string[]>([]);

  const [completedTestLandmarks, setCompletedTestLandmarks] =
    useState<string[]>([]);

  const [hasUnreadBadge, setHasUnreadBadge] = useState(false);

  const activeTourId = activeTour?.id ?? "amsa";
  const completedLandmarksKey = `${COMPLETED_LANDMARKS_KEY}:${activeTourId}`;
  const badgeDateKey = `${GANGDONG_BADGE_DATE_KEY}:${activeTourId}`;
  const badgeSeenKey = `loqestBadgeSeen:${activeTourId}`;

  useEffect(() => {
    let cancelled = false;

    async function loadTours() {
      try {
        const response = await fetch("/api/tours", {
          cache: "no-store",
        });

        const result = (await response.json()) as {
          tours?: PublicTour[];
        };

        if (!response.ok || !Array.isArray(result.tours)) {
          throw new Error("투어 목록을 불러오지 못했습니다.");
        }

        if (!cancelled) {
          setTours(result.tours);

          setActiveTour((current) => {
            if (current) {
              const updatedCurrentTour = result.tours?.find(
                (tour) => tour.id === current.id
              );

              if (updatedCurrentTour) {
                return updatedCurrentTour;
              }
            }

            return (
              result.tours?.find((tour) => tour.id === "amsa") ??
              result.tours?.[0] ??
              null
            );
          });
        }
      } catch (error) {
        console.error(error);
      }
    }

    void loadTours();

    const refreshWhenVisible = () => {
      if (document.visibilityState === "visible") {
        void loadTours();
      }
    };

    const intervalId = window.setInterval(() => {
      void loadTours();
    }, 5000);

    window.addEventListener("focus", refreshWhenVisible);
    document.addEventListener("visibilitychange", refreshWhenVisible);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
      window.removeEventListener("focus", refreshWhenVisible);
      document.removeEventListener(
        "visibilitychange",
        refreshWhenVisible
      );
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    const loadPublicAttractions = async () => {
      try {
        const response = await fetch(
          `/api/attractions?tourId=${encodeURIComponent(activeTourId)}`,
          { cache: "no-store" }
        );

        const result = (await response.json()) as {
          attractions?: PublicAttraction[];
          message?: string;
        };

        if (!response.ok || !Array.isArray(result.attractions)) {
          throw new Error(
            result.message ?? "관광지 목록을 불러오지 못했습니다."
          );
        }

        if (!cancelled) {
          setLandmarks(mapPublicAttractions(result.attractions, activeTourId));
        }
      } catch (error) {
        console.error(error);

        if (!cancelled) {
          setLandmarks([]);
        }
      }
    };

    void loadPublicAttractions();

    const refreshWhenVisible = () => {
      if (document.visibilityState === "visible") {
        void loadPublicAttractions();
      }
    };

    const intervalId = window.setInterval(() => {
      void loadPublicAttractions();
    }, 5000);

    window.addEventListener("focus", refreshWhenVisible);
    document.addEventListener(
      "visibilitychange",
      refreshWhenVisible
    );

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
      window.removeEventListener("focus", refreshWhenVisible);
      document.removeEventListener(
        "visibilitychange",
        refreshWhenVisible
      );
    };
  }, [activeTourId]);

  useEffect(() => {
    const badgeEarned = localStorage.getItem(
      badgeDateKey
    );

    const badgeSeen = localStorage.getItem(
      badgeSeenKey
    );

    // eslint-disable-next-line react-hooks/set-state-in-effect
    setHasUnreadBadge(
      Boolean(badgeEarned) && badgeSeen !== "true"
    );
  }, [badgeDateKey, badgeSeenKey]);

  const [badgeEarnedAt, setBadgeEarnedAt] =
    useState<string | null>(null);

  useEffect(() => {
    const savedTestStamps = localStorage.getItem(
      COMPLETED_TEST_LANDMARKS_KEY
    );

    if (savedTestStamps) {
      try {
        const parsed: unknown = JSON.parse(savedTestStamps);

        if (Array.isArray(parsed)) {
          const validIds = testLandmarks.map((landmark) => landmark.id);
          setCompletedTestLandmarks(
            parsed.filter(
              (id): id is string =>
                typeof id === "string" && validIds.includes(id)
            )
          );
        }
      } catch {
        localStorage.removeItem(COMPLETED_TEST_LANDMARKS_KEY);
      }
    }

    const savedStamps = localStorage.getItem(
      completedLandmarksKey
    );

    const savedBadgeDate = localStorage.getItem(
      badgeDateKey
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

      const uniqueSavedStamps = [
        ...new Set(validSavedStamps),
      ];

      // eslint-disable-next-line react-hooks/set-state-in-effect
      setCompletedLandmarks(uniqueSavedStamps);

      if (
        landmarks.length > 0 &&
        uniqueSavedStamps.length === landmarks.length
      ) {
        const earnedAt =
          savedBadgeDate ?? new Date().toISOString();

        if (!savedBadgeDate) {
          localStorage.setItem(
            badgeDateKey,
            earnedAt
          );

        }

        setBadgeEarnedAt(earnedAt);
      }
    } catch {
      localStorage.removeItem(completedLandmarksKey);
      localStorage.removeItem(badgeDateKey);
      localStorage.removeItem(badgeSeenKey);
      setHasUnreadBadge(false);
    }
  }, [landmarks, completedLandmarksKey, badgeDateKey, badgeSeenKey]);

  function saveCompletedLandmarks(ids: string[]) {
    setCompletedLandmarks(ids);

    localStorage.setItem(
      completedLandmarksKey,
      JSON.stringify(ids)
    );
  }

  function resetVerification() {
    setSelectedLandmark(null);
    setStampIssued(false);
    setVerificationProcessing(false);
  }

  function goToMainHome() {
    resetVerification();
    setScreen("main-home");
  }

  function goHome() {
    resetVerification();
    setScreen("home");
  }

  function enterTour(tour: PublicTour) {
    resetVerification();
    setActiveTour(tour);
    setCompletedLandmarks([]);
    setBadgeEarnedAt(null);
    setScreen("home");
  }

  function goToQuestList() {
    resetVerification();
    setScreen("quests");
  }

  function goToBadges() {
    setHasUnreadBadge(false);

    localStorage.setItem(
      badgeSeenKey,
      "true"
    );

    setScreen("badges");
  }

  function goToGuide() {
    resetVerification();
    setScreen("guide");
  }

  function goToTestHome() {
    resetVerification();
    setScreen("test-home");
  }

  function goToTestQuestList() {
    resetVerification();
    setScreen("test-quests");
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

    localStorage.removeItem(completedLandmarksKey);
    localStorage.removeItem(badgeDateKey);
    localStorage.removeItem(badgeSeenKey);
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

    if (!selectedLandmark.requiresGps) {
      if (!completedTestLandmarks.includes(selectedLandmark.id)) {
        const next = [
          ...completedTestLandmarks,
          selectedLandmark.id,
        ];

        setCompletedTestLandmarks(next);
        localStorage.setItem(
          COMPLETED_TEST_LANDMARKS_KEY,
          JSON.stringify(next)
        );
      }

      return;
    }

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
      landmarks.length > 0 &&
      nextCompletedLandmarks.length === landmarks.length
    ) {
      const earnedAt = new Date().toISOString();

      setBadgeEarnedAt(earnedAt);

      localStorage.setItem(
        badgeDateKey,
        earnedAt
      );

      localStorage.removeItem(badgeSeenKey);
      setHasUnreadBadge(true);
    }
  }

  const completedCount = landmarks.filter((landmark) =>
    completedLandmarks.includes(landmark.id)
  ).length;

  const progressPercent = Math.round(
    landmarks.length === 0
      ? 0
      : (completedCount / landmarks.length) * 100
  );

  const tourCompleted =
    landmarks.length > 0 &&
    completedCount === landmarks.length;

  const visitedLandmarks = completedLandmarks
    .map((id) =>
      landmarks.find((landmark) => landmark.id === id)
    )
    .filter((landmark): landmark is Landmark =>
      Boolean(landmark)
    );

  const visitedPath = visitedLandmarks
    .map(
      (landmark) =>
        `${landmark.mapPosition.x},${landmark.mapPosition.y}`
    )
    .join(" ");

  const availableProvinces = Array.from(
    new Set(
      tours
        .map((tour) => tour.province)
        .filter((province): province is string => Boolean(province))
    )
  );

  const normalizedSearch = searchQuery.trim().toLowerCase();

  const filteredTours = tours.filter((tour) => {
    const matchesProvince =
      selectedProvince === "전체" ||
      tour.province === selectedProvince;

    const searchableText = [
      tour.name,
      tour.short_name,
      tour.province,
      tour.region,
      tour.description,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    const matchesSearch =
      normalizedSearch === "" ||
      searchableText.includes(normalizedSearch);

    return matchesProvince && matchesSearch;
  });

  const hasTourSearch =
    searchQuery.trim().length > 0 ||
    selectedProvince !== "전체";

  if (screen === "main-home") {
    return (
      <main style={styles.main}>
        <section style={styles.card}>
          <header style={styles.mainHomeHeader}>
            <p style={styles.logo}>LOQEST</p>

            <h1 style={styles.mainHomeTitle}>
              당신만의 여행을 만들어가세요
            </h1>

            <p style={styles.mainHomeDescription}>
              지역을 발견하고 퀘스트를 완료하며,
              <br />
              나만의 여행 기록을 쌓아보세요.
            </p>
          </header>

          <h2 style={styles.destinationHeading}>여행지 목록</h2>

          <input
            type="search"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="여행지명 또는 지역을 검색해보세요"
            aria-label="여행지 검색"
            style={styles.destinationSearch}
          />

          <div style={styles.provinceFilters}>
            {["전체", ...availableProvinces].map((province) => {
              const active = selectedProvince === province;

              return (
                <button
                  key={province}
                  type="button"
                  onClick={() => setSelectedProvince(province)}
                  style={{
                    ...styles.provinceFilterButton,
                    ...(active ? styles.activeProvinceFilterButton : {}),
                  }}
                >
                  {province}
                </button>
              );
            })}
          </div>

          {!hasTourSearch ? (
            <div style={styles.emptyDestination}>
              <strong>어디로 떠나볼까요?</strong>
              <p>
                여행지명이나 지역을 검색하면
                이용 가능한 관광지가 표시됩니다.
              </p>
            </div>
          ) : filteredTours.length === 0 ? (
            <div style={styles.emptyDestination}>
              <strong>조건에 맞는 여행지가 없습니다.</strong>
              <p>
                다른 여행지명이나 지역을 검색해주세요.
              </p>
            </div>
          ) : (
            filteredTours.map((tour, index) => (

              <article
                key={tour.id}
                style={{
                  ...styles.destinationCard,
                  ...(index > 0 ? { marginTop: "14px" } : {}),
                }}
              >
                <p style={styles.destinationLocation}>
                  {tour.region || tour.province || "지역 정보 준비 중"}
                </p>

                <h3 style={styles.destinationTitle}>{tour.name}</h3>

                <p style={styles.destinationDescription}>
                  {tour.description || "특별한 퀘스트를 만나보세요."}
                </p>

                <button
                  type="button"
                  style={styles.primaryButton}
                  onClick={() => enterTour(tour)}
                >
                  탐험하기 →
                </button>
              </article>
            ))
          )}

          <article
            style={{
              ...styles.destinationCard,
              marginTop: "14px",
            }}
          >
            <p style={styles.destinationLocation}>테스트 모드 · GPS 생략</p>

            <h3 style={styles.destinationTitle}>
              집에서 하는 LOQEST 체험
            </h3>

            <p style={styles.destinationDescription}>
              LOQEST의 스탬프 투어를
              <br />
              테스트 모드로 진행 해보세요.
            </p>

            <button
              type="button"
              style={styles.primaryButton}
              onClick={goToTestHome}
            >
              테스트 관광지 입장하기 →
            </button>
          </article>

          <button
            type="button"
            style={styles.badgeButton}
            onClick={goToBadges}
          >
            <span style={styles.badgeMenuIcon}>📖</span>
            <span>나의 여행 도감</span>
            <span style={styles.badgeMenuArrow}>→</span>

            {hasUnreadBadge && (
              <span style={styles.newBadge}>NEW</span>
            )}
          </button>

          <button
            type="button"
            style={styles.guideButton}
            onClick={goToGuide}
          >
            <span style={styles.guideButtonIcon}>?</span>
            <span>
              <strong>촬영 가이드</strong>
              <small style={styles.guideButtonText}>
                인증 순서와 손동작 인식 방법 보기
              </small>
            </span>
          </button>
        </section>
      </main>
    );
  }

  if (screen === "guide") {
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

  if (screen === "test-home") {
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

  if (screen === "home") {
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
              {visitedLandmarks.length >= 2 && (
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
                      selectLandmark(landmark);
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

                <p>{selectedLandmark.poseGuide}</p>

                <p>
                  {selectedLandmark.landmarkGuide}
                </p>
              </div>

              {selectedLandmark.requiresGps ? (
                <div style={styles.gpsNotice}>
                  <strong>위치 권한 안내</strong>

                  <p style={styles.gpsNoticeText}>
                    촬영 시 위치를 확인하며, 인증 장소에서만 스탬프가
                    발급됩니다.
                  </p>
                </div>
              ) : (
                <div style={styles.testNotice}>
                  <strong>GPS 인증 생략</strong>

                  <p style={styles.gpsNoticeText}>
                    테스트 퀘스트에서는 위치를 확인하지 않습니다.
                  </p>
                </div>
              )}

              <CameraCapture
                tourId={activeTourId}
                attractionId={selectedLandmark.attractionId}
                recognitionKey={selectedLandmark.recognitionKey}
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
                referenceImages={selectedLandmark.referenceImages}
                goodMatchesThreshold={
                  selectedLandmark.goodMatchesThreshold
                }
                matchRatioThreshold={
                  selectedLandmark.matchRatioThreshold
                }
                skipLocationVerification={!selectedLandmark.requiresGps}
                onProcessingChange={setVerificationProcessing}
                onVerified={issueStamp}
              />

              {!verificationProcessing && (
                <button
                  type="button"
                  style={styles.secondaryButton}
                  onClick={
                    selectedLandmark.requiresGps
                      ? goToQuestList
                      : goToTestQuestList
                  }
                >
                  뒤로가기
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

              {selectedLandmark.requiresGps && tourCompleted && (
                <div style={styles.completionNotice}>
                  <span style={styles.completionIcon}>
                    🏅
                  </span>

                  <div>
                    <strong>
                      {activeTour?.badge_name || `${activeTour?.short_name || activeTour?.name} 탐험가`} 뱃지 획득!
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
                onClick={
                  selectedLandmark.requiresGps
                    ? goHome
                    : goToTestHome
                }
              >
                {selectedLandmark.requiresGps
                  ? "투어 홈으로 가기"
                  : "테스트 홈으로 가기"}
              </button>

            </div>
          )}
        </section>
      </main>
    );
  }

  if (screen === "test-quests") {
    return (
      <main style={styles.main}>
        <section style={styles.card}>
          <p style={styles.badge}>집에서 하는 LOQEST 체험</p>

          <h1 style={styles.title}>테스트 퀘스트</h1>

          <p style={styles.description}>
            GPS 인증 없이 전체 촬영 흐름을 확인합니다.
          </p>

          <div style={styles.landmarkList}>
            {testLandmarks.map((landmark) => {
              const completed =
                completedTestLandmarks.includes(landmark.id);

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
                >
                  <span style={styles.questIcon}>{landmark.icon}</span>

                  <span style={styles.questContent}>
                    <strong style={styles.landmarkName}>
                      {completed ? "✓ " : ""}
                      {landmark.name}
                    </strong>

                    <span style={styles.smallText}>
                      {completed ? "인증 완료 · 다시 테스트 가능" : landmark.mission}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>

          <button
            type="button"
            style={styles.homeButton}
            onClick={goToTestHome}
          >
            뒤로가기
          </button>
        </section>
      </main>
    );
  }

  return (
    <main style={styles.main}>
      <section style={styles.card}>
        <p style={styles.badge}>
          {activeTour?.name ?? "랜드마크 코스"}
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
                <span style={styles.questIcon}>
                  {landmark.icon}
                </span>

                <span style={styles.questContent}>
                  <strong style={styles.landmarkName}>
                    {completed ? "✓ " : ""}
                    {landmark.name}
                  </strong>

                  <span style={styles.smallText}>
                    {completed ? "인증 완료" : landmark.mission}
                  </span>
                </span>
              </button>
            );
          })}
        </div>

        <button
          type="button"
          style={styles.homeButton}
          onClick={goHome}
        >
          뒤로가기
        </button>
      </section>
    </main>
  );
}

const styles: Record<string, React.CSSProperties> = {
  main: {
    minHeight: "100vh",
    padding: "24px 16px",
    background:
      "radial-gradient(circle at top right, rgba(76, 145, 168, 0.13), transparent 32%), linear-gradient(180deg, #fffaf2 0%, #f8f4eb 100%)",
    display: "flex",
    justifyContent: "center",
    alignItems: "flex-start",
    color: "#263238",
  },

  card: {
    width: "100%",
    maxWidth: "480px",
    padding: "26px 24px",
    backgroundColor: "rgba(255, 255, 255, 0.96)",
    border: "1px solid rgba(216, 174, 98, 0.22)",
    borderRadius: "22px",
    boxShadow:
      "0 18px 50px rgba(35, 68, 93, 0.09)",
  },

  mainHomeHeader: {
    padding: "18px 6px 28px",
    textAlign: "center",
  },

  logo: {
    margin: "0 0 14px",
    color: "#23445d",
    fontSize: "42px",
    fontWeight: 900,
    letterSpacing: "0.08em",
  },

  mainHomeTitle: {
    margin: "0 0 12px",
    color: "#23445d",
    fontSize: "24px",
    lineHeight: 1.35,
    letterSpacing: "-0.04em",
  },

  mainHomeDescription: {
    margin: 0,
    color: "#6d767b",
    fontSize: "14px",
    lineHeight: 1.7,
  },

  destinationHeading: {
    margin: "0 0 12px",
    color: "#374f60",
    fontSize: "17px",
  },

  destinationCard: {
    padding: "22px",
    border: "1px solid #d5e4e7",
    borderRadius: "20px",
    background:
      "linear-gradient(145deg, #ffffff, #eef7f8)",
    boxShadow: "0 10px 26px rgba(35, 68, 93, 0.08)",
  },

  destinationLocation: {
    margin: "0 0 9px",
    color: "#4c91a8",
    fontSize: "12px",
    fontWeight: 800,
    letterSpacing: "0.04em",
  },

  destinationTitle: {
    margin: "0 0 10px",
    color: "#23445d",
    fontSize: "22px",
    letterSpacing: "-0.03em",
  },

  destinationDescription: {
    margin: "0 0 8px",
    color: "#6d767b",
    fontSize: "14px",
    lineHeight: 1.65,
  },

  guideButton: {
    width: "100%",
    marginTop: "16px",
    padding: "16px",
    border: "1px solid #d8dddf",
    borderRadius: "16px",
    backgroundColor: "#ffffff",
    color: "#345366",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "11px",
    fontSize: "15px",
    textAlign: "left",
    cursor: "pointer",
  },

  guideButtonIcon: {
    width: "32px",
    height: "32px",
    borderRadius: "50%",
    backgroundColor: "#eaf4f6",
    color: "#356f82",
    display: "grid",
    placeItems: "center",
    fontWeight: 900,
  },

  guideButtonText: {
    display: "block",
    marginTop: "3px",
    color: "#7a858a",
    fontSize: "11px",
    fontWeight: 500,
  },

  guideStepList: {
    display: "grid",
    gap: "12px",
    marginBottom: "18px",
  },

  guideStep: {
    padding: "15px",
    border: "1px solid #dbe8eb",
    borderRadius: "16px",
    backgroundColor: "#f4fafb",
    display: "flex",
    alignItems: "flex-start",
    gap: "12px",
  },

  guideStepNumber: {
    flexShrink: 0,
    width: "29px",
    height: "29px",
    borderRadius: "50%",
    backgroundColor: "#315f78",
    color: "white",
    display: "grid",
    placeItems: "center",
    fontSize: "13px",
    fontWeight: 900,
  },

  guideStepText: {
    margin: "5px 0 0",
    color: "#6d767b",
    fontSize: "13px",
    lineHeight: 1.55,
  },

  poseTipBox: {
    padding: "17px",
    border: "1px solid #ead8ae",
    borderRadius: "16px",
    backgroundColor: "#fff8e9",
  },

  poseTipTitle: {
    margin: "0 0 10px",
    color: "#664c0c",
    fontSize: "16px",
  },

  poseTipText: {
    margin: "7px 0 0",
    color: "#74613a",
    fontSize: "13px",
    lineHeight: 1.55,
  },

  testNotice: {
    marginBottom: "16px",
    padding: "14px",
    border: "1px solid #cfe5dd",
    borderRadius: "14px",
    backgroundColor: "#f0faf6",
    color: "#27644f",
  },

  badge: {
    display: "inline-block",
    margin: "0 0 12px",
    padding: "7px 12px",
    backgroundColor: "#eef6f7",
    color: "#356f82",
    border: "1px solid #d7e9ed",
    borderRadius: "999px",
    fontSize: "13px",
    fontWeight: 800,
    letterSpacing: "0.04em",
  },

  title: {
    margin: "0 0 14px",
    color: "#23445d",
    fontSize: "30px",
    lineHeight: 1.25,
    letterSpacing: "-0.04em",
  },

  description: {
    marginBottom: "24px",
    color: "#6d767b",
    lineHeight: 1.7,
  },

  progressSectionTitle: {
    margin: "0 0 12px",
    color: "#23445d",
    fontSize: "19px",
    lineHeight: 1.4,
  },

  entryText: {
    margin: "6px 0 0",
    color: "#80745e",
    fontSize: "13px",
    lineHeight: 1.5,
  },

  primaryButton: {
    width: "100%",
    minHeight: "52px",
    marginTop: "12px",
    padding: "14px",
    border: "none",
    borderRadius: "16px",
    background: "linear-gradient(135deg, #23445d, #315f78)",
    color: "white",
    fontSize: "16px",
    fontWeight: 700,
    cursor: "pointer",
    boxShadow: "0 9px 22px rgba(35, 68, 93, 0.2)",
  },

  secondaryButton: {
    width: "100%",
    minHeight: "50px",
    marginTop: "12px",
    padding: "13px",
    border: "1px solid #bdd6dd",
    borderRadius: "16px",
    backgroundColor: "#f4fafb",
    color: "#2d6072",
    fontSize: "15px",
    fontWeight: 700,
    cursor: "pointer",
  },

  badgeButton: {
    position: "relative",
    width: "100%",
    minHeight: "54px",
    marginTop: "18px",
    padding: "14px 18px",
    border: "1px solid #d8cfc3",
    borderRadius: "18px",
    background: "linear-gradient(135deg, #f0ebe4, #e2d9ce)",
    color: "#2f4653",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "10px",
    textAlign: "center",
    fontSize: "16px",
    fontWeight: 800,
    letterSpacing: "-0.01em",
    cursor: "pointer",
    boxShadow: "0 6px 16px rgba(91, 77, 64, 0.09)",
  },

  badgeMenuIcon: {
    justifySelf: "start",
    fontSize: "20px",
  },

  badgeMenuArrow: {
    justifySelf: "end",
    color: "#667881",
    fontSize: "18px",
    fontWeight: 800,
  },

  newBadge: {
    position: "absolute",
    top: "-7px",
    right: "10px",
    padding: "4px 7px",
    borderRadius: "999px",
    backgroundColor: "#e97861",
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
    border: "1px solid #d5e4e7",
    borderLeft: "5px solid #4c91a8",
    borderRadius: "18px",
    background: "linear-gradient(145deg, #ffffff, #f3f9fa)",
    color: "#23445d",
    textAlign: "left",
    display: "flex",
    alignItems: "center",
    gap: "14px",
    cursor: "pointer",
    boxShadow: "0 8px 20px rgba(35, 68, 93, 0.07)",
  },

  completedLandmarkButton: {
    backgroundColor: "#f3f1ea",
    opacity: 0.7,
    cursor: "default",
  },

  landmarkName: {
    fontSize: "16px",
  },

  questIcon: {
    flexShrink: 0,
    width: "44px",
    height: "44px",
    borderRadius: "14px",
    backgroundColor: "#eaf4f6",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "23px",
  },

  questContent: {
    minWidth: 0,
    display: "grid",
    gap: "6px",
  },

  homeButton: {
    width: "100%",
    minHeight: "46px",
    marginTop: "10px",
    padding: "11px",
    border: "1px solid #d8dddf",
    borderRadius: "14px",
    backgroundColor: "transparent",
    color: "#7a858a",
    fontSize: "14px",
    fontWeight: 600,
    cursor: "pointer",
  },

  guideBox: {
    marginBottom: "12px",
    padding: "16px",
    backgroundColor: "#f2f7f8",
    border: "1px solid #dbe8eb",
    borderRadius: "14px",
    lineHeight: 1.6,
  },

  gpsNotice: {
    marginBottom: "16px",
    padding: "14px",
    backgroundColor: "#fff8e9",
    border: "1px solid #ead8ae",
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
    border: "8px double #e97861",
    borderRadius: "50%",
    color: "#d9614c",
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
    color: "#23445d",
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
    background: "linear-gradient(90deg, #4c91a8, #67a9b9)",
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
    border: "1px solid #e7cc91",
    borderRadius: "15px",
    backgroundColor: "#fff7e3",
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
    backgroundColor: "#eaf4f6",
    color: "#356f82",
    fontSize: "11px",
    fontWeight: 700,
  },

  lockedBadgeCard: {
    padding: "28px 18px",
    border: "1px dashed #c9cecb",
    borderRadius: "22px",
    backgroundColor: "#fbfaf6",
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
    backgroundColor: "#4c91a8",
    transition: "width 0.3s ease",
  },

  destinationSearch: {
    boxSizing: "border-box",
    width: "100%",
    minHeight: "48px",
    marginBottom: "12px",
    padding: "12px 15px",
    border: "1px solid #ccdfe4",
    borderRadius: "14px",
    backgroundColor: "#ffffff",
    color: "#23445d",
    fontSize: "14px",
    outline: "none",
  },

  provinceFilters: {
    display: "flex",
    gap: "8px",
    marginBottom: "16px",
    paddingBottom: "2px",
    overflowX: "auto",
  },

  provinceFilterButton: {
    flexShrink: 0,
    padding: "8px 13px",
    border: "1px solid #cadde2",
    borderRadius: "999px",
    backgroundColor: "#ffffff",
    color: "#527080",
    fontSize: "13px",
    fontWeight: 700,
    cursor: "pointer",
  },

  activeProvinceFilterButton: {
    borderColor: "#315f78",
    backgroundColor: "#315f78",
    color: "#ffffff",
  },

  emptyDestination: {
    padding: "26px 18px",
    border: "1px dashed #ccdfe4",
    borderRadius: "18px",
    backgroundColor: "#f7fbfc",
    color: "#526873",
    textAlign: "center",
    fontSize: "14px",
  },
};

