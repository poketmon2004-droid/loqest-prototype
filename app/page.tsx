"use client";

import { useEffect, useState } from "react";
import MainHome from "../components/MainHome";
import type { Landmark, PublicAttraction, PublicTour } from "../types/tour";
import { mapPublicAttractions } from "../lib/tour/mapPublicAttractions";
import { COMPLETED_TEST_LANDMARKS_KEY, getTourProgressKeys, validStampIds } from "../lib/tour/progressStorage";
import QuestList from "../components/QuestList";
import BadgeCollection from "../components/BadgeCollection";
import TourHome from "../components/TourHome";
import CaptureGuide from "../components/CaptureGuide";
import TestHome from "../components/TestHome";
import VerificationScreen from "../components/VerificationScreen";

type Screen =
  | "main-home"
  | "home"
  | "quests"
  | "badges"
  | "guide"
  | "test-home"
  | "test-quests"
  | "verification";

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
  const { completedLandmarksKey, badgeDateKey, badgeSeenKey } =
    getTourProgressKeys(activeTourId);

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
    const frameId = window.requestAnimationFrame(() => {
      const badgeEarned = localStorage.getItem(
        badgeDateKey
      );

      const badgeSeen = localStorage.getItem(
        badgeSeenKey
      );

      setHasUnreadBadge(
        Boolean(badgeEarned) && badgeSeen !== "true"
      );
    });

    return () => window.cancelAnimationFrame(frameId);
  }, [badgeDateKey, badgeSeenKey]);

  const [badgeEarnedAt, setBadgeEarnedAt] =
    useState<string | null>(null);

  useEffect(() => {
    const frameId = window.requestAnimationFrame(() => {
      const savedTestStamps = localStorage.getItem(
        COMPLETED_TEST_LANDMARKS_KEY
      );

      if (savedTestStamps) {
        try {
          const parsed: unknown = JSON.parse(savedTestStamps);

          if (Array.isArray(parsed)) {
            const validIds = testLandmarks.map((landmark) => landmark.id);
            setCompletedTestLandmarks(
              validStampIds(parsed, validIds)
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

        const validSavedStamps = validStampIds(parsedStamps, validIds);

        const uniqueSavedStamps = [
          ...new Set(validSavedStamps),
        ];

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
    });

    return () => window.cancelAnimationFrame(frameId);
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

  function navigateTo(screenName: Screen) {
    resetVerification();
    setScreen(screenName);
  }

  function goToMainHome() {
    navigateTo("main-home");
  }

  function goHome() {
    navigateTo("home");
  }

  function enterTour(tour: PublicTour) {
    resetVerification();
    setActiveTour(tour);
    setCompletedLandmarks([]);
    setBadgeEarnedAt(null);
    setScreen("home");
  }

  function goToQuestList() {
    navigateTo("quests");
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
    navigateTo("guide");
  }

  function goToTestHome() {
    navigateTo("test-home");
  }

  function goToTestQuestList() {
    navigateTo("test-quests");
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
      <MainHome
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        selectedProvince={selectedProvince}
        setSelectedProvince={setSelectedProvince}
        availableProvinces={availableProvinces}
        filteredTours={filteredTours}
        hasTourSearch={hasTourSearch}
        hasUnreadBadge={hasUnreadBadge}
        enterTour={enterTour}
        goToTestHome={goToTestHome}
        goToBadges={goToBadges}
        goToGuide={goToGuide}
        styles={styles}
      />
    );
  }

  if (screen === "guide") {
    return <CaptureGuide styles={styles} goToMainHome={goToMainHome} />;
  }

  if (screen === "test-home") {
    return <TestHome styles={styles} goToTestQuestList={goToTestQuestList} goToMainHome={goToMainHome} />;
  }

  if (screen === "home") {
    return (
      <TourHome
        activeTour={activeTour}
        landmarks={landmarks}
        completedLandmarks={completedLandmarks}
        completedCount={completedCount}
        progressPercent={progressPercent}
        tourCompleted={tourCompleted}
        onSelectLandmark={selectLandmark}
        goToQuestList={goToQuestList}
        resetProgress={resetProgress}
        goToMainHome={goToMainHome}
        styles={styles}
      />
    );
  }

  if (screen === "badges") {
    return (
      <BadgeCollection
        tourCompleted={tourCompleted}
        activeTour={activeTour}
        badgeEarnedAt={badgeEarnedAt}
        completedCount={completedCount}
        landmarks={landmarks}
        progressPercent={progressPercent}
        goToQuestList={goToQuestList}
        goHome={goHome}
        goToMainHome={goToMainHome}
        styles={styles}
      />
    );
  }

  if (screen === "verification" && selectedLandmark) {
    return (
      <VerificationScreen
        selectedLandmark={selectedLandmark}
        activeTour={activeTour}
        activeTourId={activeTourId}
        stampIssued={stampIssued}
        tourCompleted={tourCompleted}
        verificationProcessing={verificationProcessing}
        onProcessingChange={setVerificationProcessing}
        issueStamp={issueStamp}
        goToQuestList={goToQuestList}
        goToTestQuestList={goToTestQuestList}
        goHome={goHome}
        goToTestHome={goToTestHome}
        styles={styles}
      />
    );
  }

  if (screen === "test-quests") {
    return (
      <QuestList
        mode="test"
        landmarks={testLandmarks}
        completedIds={completedTestLandmarks}
        onSelect={selectLandmark}
        onBack={goToTestHome}
        styles={styles}
      />
    );
  }

  return (
    <QuestList
      mode="tour"
      tourName={activeTour?.name}
      landmarks={landmarks}
      completedIds={completedLandmarks}
      onSelect={selectLandmark}
      onBack={goHome}
      styles={styles}
    />
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

