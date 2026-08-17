"use client";

import { ChangeEvent, useEffect, useState } from "react";
import type { CSSProperties } from "react";
import cvReadyPromise from "@techstark/opencv-js";

const FALLBACK_LANDMARK_NAME = "노트북 키보드";

const FALLBACK_REFERENCE_IMAGES = [
  "/landmarks/home/reference/KakaoTalk_20260815_155103197_01.jpg",
  "/landmarks/home/reference/KakaoTalk_20260815_155103197_02.jpg",
  "/landmarks/home/reference/KakaoTalk_20260815_155103197_03.jpg",
];

const THRESHOLD = {
  goodMatches: 45,
  matchRatio: 30,
};

const DEFAULT_ATTRACTION_TESTS: Record<
  string,
  {
    name: string;
    referenceImages: string[];
    goodMatches: number;
    matchRatio: number;
  }
> = {
  "1": {
    name: "안내판",
    referenceImages: [
      "/landmarks/inform/reference/KakaoTalk_20260813_072237513.jpg",
      "/landmarks/inform/reference/KakaoTalk_20260813_072237513_01.jpg",
      "/landmarks/inform/reference/KakaoTalk_20260813_072237513_03.jpg",
      "/landmarks/inform/reference/KakaoTalk_20260813_072237513_05.jpg",
      "/landmarks/inform/reference/KakaoTalk_20260813_123330386_11.jpg",
      "/landmarks/inform/reference/KakaoTalk_20260813_123330386_13.jpg",
      "/landmarks/inform/reference/KakaoTalk_20260813_123330386_15.jpg",
      "/landmarks/inform/reference/KakaoTalk_20260813_123330386_16.jpg",
      "/landmarks/inform/reference/KakaoTalk_20260813_123330386_18.jpg",
    ],
    goodMatches: 55,
    matchRatio: 40,
  },
  "2": {
    name: "캐릭터",
    referenceImages: [
      "/landmarks/character/reference/KakaoTalk_20260813_072216328.jpg",
      "/landmarks/character/reference/KakaoTalk_20260813_072216328_01.jpg",
      "/landmarks/character/reference/KakaoTalk_20260813_123330386_19.jpg",
      "/landmarks/character/reference/KakaoTalk_20260813_123330386_21.jpg",
      "/landmarks/character/reference/KakaoTalk_20260813_123330386_23.jpg",
      "/landmarks/character/reference/KakaoTalk_20260813_123330386_25.jpg",
      "/landmarks/character/reference/KakaoTalk_20260813_123330386_26.jpg",
      "/landmarks/character/reference/KakaoTalk_20260813_123330386_27.jpg",
      "/landmarks/character/reference/KakaoTalk_20260813_123331048.jpg",
      "/landmarks/character/reference/KakaoTalk_20260813_123331048_01.jpg",
    ],
    goodMatches: 70,
    matchRatio: 45,
  },
  "3": {
    name: "소망움집",
    referenceImages: [
      "/landmarks/wish/reference/KakaoTalk_20260813_072216328_02.jpg",
      "/landmarks/wish/reference/KakaoTalk_20260813_072216328_03.jpg",
      "/landmarks/wish/reference/KakaoTalk_20260813_072216328_05.jpg",
      "/landmarks/wish/reference/KakaoTalk_20260813_123330386.jpg",
      "/landmarks/wish/reference/KakaoTalk_20260813_123330386_01.jpg",
      "/landmarks/wish/reference/KakaoTalk_20260813_123330386_03.jpg",
      "/landmarks/wish/reference/KakaoTalk_20260813_123330386_04.jpg",
      "/landmarks/wish/reference/KakaoTalk_20260813_123330386_06.jpg",
      "/landmarks/wish/reference/KakaoTalk_20260813_123330386_07.jpg",
      "/landmarks/wish/reference/KakaoTalk_20260813_123330386_09.jpg",
      "/landmarks/wish/reference/KakaoTalk_20260813_123330386_10.jpg",
    ],
    goodMatches: 70,
    matchRatio: 45,
  },
};

type StoredReferenceImage = {
  id: string;
  name: string;
  dataUrl: string;
};

type StoredAttraction = {
  id: number;
  name: string;
  landmarkThreshold?: number;
  referenceImageData?: StoredReferenceImage[];
};

type ComparisonResult = {
  referenceName: string;
  goodMatches: number;
  totalMatches: number;
  matchRatio: number;
};

type RecognitionTestRecord = {
  totalTests: number;
  successfulTests: number;
  failedTests: number;
  recentResults: boolean[];
  lastResult: "통과" | "실패";
  lastTestedAt: string;
  quality: "정상" | "확인 필요" | "기준 이미지 개선";
};

function loadImage(source: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();

    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`이미지를 불러오지 못했습니다: ${source}`));
    image.src = source;
  });
}

function extractFeatures(cv: any, image: HTMLImageElement) {
  const source = cv.imread(image);
  const resized = new cv.Mat();
  const gray = new cv.Mat();
  const mask = new cv.Mat();
  const keypoints = new cv.KeyPointVector();
  const descriptors = new cv.Mat();
  const orb = new cv.ORB();

  try {
    const maxWidth = 900;
    const scale = Math.min(1, maxWidth / source.cols);
    const width = Math.round(source.cols * scale);
    const height = Math.round(source.rows * scale);

    cv.resize(
      source,
      resized,
      new cv.Size(width, height),
      0,
      0,
      cv.INTER_AREA
    );

    cv.cvtColor(resized, gray, cv.COLOR_RGBA2GRAY);

    orb.detectAndCompute(
      gray,
      mask,
      keypoints,
      descriptors
    );

    return descriptors.clone();
  } finally {
    source.delete();
    resized.delete();
    gray.delete();
    mask.delete();
    keypoints.delete();
    descriptors.delete();
    orb.delete();
  }
}

function compareDescriptors(
  cv: any,
  testDescriptors: any,
  referenceDescriptors: any
) {
  if (
    testDescriptors.empty() ||
    referenceDescriptors.empty()
  ) {
    return {
      goodMatches: 0,
      totalMatches: 0,
      matchRatio: 0,
    };
  }

  const matcher = new cv.BFMatcher(cv.NORM_HAMMING, true);
  const matches = new cv.DMatchVector();

  try {
    matcher.match(
      testDescriptors,
      referenceDescriptors,
      matches
    );

    let goodMatches = 0;

    for (let index = 0; index < matches.size(); index += 1) {
      const match = matches.get(index);

      // ORB 특징점 사이의 거리가 작을수록 유사한 특징이다.
      if (match.distance <= 55) {
        goodMatches += 1;
      }
    }

    const totalMatches = matches.size();
    const matchRatio =
      totalMatches === 0
        ? 0
        : (goodMatches / totalMatches) * 100;

    return {
      goodMatches,
      totalMatches,
      matchRatio,
    };
  } finally {
    matcher.delete();
    matches.delete();
  }
}

export default function LandmarkTestPage() {
  const [activeAttractionId, setActiveAttractionId] = useState<string | null>(
    null
  );
  const [landmarkName, setLandmarkName] = useState(FALLBACK_LANDMARK_NAME);
  const [referenceImages, setReferenceImages] = useState<string[]>(
    FALLBACK_REFERENCE_IMAGES
  );
  const [matchRatioThreshold, setMatchRatioThreshold] = useState(
    THRESHOLD.matchRatio
  );
  const [goodMatchesThreshold, setGoodMatchesThreshold] = useState(
    THRESHOLD.goodMatches
  );
  const [attractionError, setAttractionError] = useState("");
  const [opencvReady, setOpencvReady] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [status, setStatus] = useState("OpenCV를 불러오는 중입니다.");
  const [analyzing, setAnalyzing] = useState(false);
  const [results, setResults] = useState<ComparisonResult[]>([]);
  const [savedTestMessage, setSavedTestMessage] = useState("");

  useEffect(() => {
    try {
      const attractionId = new URLSearchParams(window.location.search).get(
        "attractionId"
      );

      // ID 없이 직접 접속하면 기존 키보드 테스트를 유지한다.
      if (!attractionId) {
        return;
      }

      setActiveAttractionId(attractionId);

      const storedAttractions = JSON.parse(
        localStorage.getItem("loqest_attractions") || "[]"
      ) as StoredAttraction[];

      const attractionEdits = JSON.parse(
        localStorage.getItem("loqest_attraction_edits") || "{}"
      ) as Record<string, Partial<StoredAttraction>>;

      const storedAttraction = storedAttractions.find(
        (attraction) => String(attraction.id) === attractionId
      );

      const defaultTest = DEFAULT_ATTRACTION_TESTS[attractionId];

      if (!storedAttraction && !defaultTest) {
        setReferenceImages([]);
        setAttractionError("등록된 관광지 정보를 찾지 못했습니다.");
        return;
      }

      const editedAttraction = attractionEdits[attractionId] ?? {};

      if (storedAttraction) {
        const selectedAttraction = {
          ...storedAttraction,
          ...editedAttraction,
        };

        const savedReferenceImages =
          selectedAttraction.referenceImageData?.filter(
            (image) => image.dataUrl
          ) ?? [];

        setLandmarkName(selectedAttraction.name);
        setGoodMatchesThreshold(THRESHOLD.goodMatches);
        setMatchRatioThreshold(
          Number(selectedAttraction.landmarkThreshold) || THRESHOLD.matchRatio
        );

        if (savedReferenceImages.length === 0) {
          setReferenceImages([]);
          setAttractionError(
            "이 관광지에는 실제 기준 이미지가 저장되어 있지 않습니다."
          );
          return;
        }

        setReferenceImages(savedReferenceImages.map((image) => image.dataUrl));
        setAttractionError("");
        return;
      }

      if (defaultTest) {
        const editedReferenceImages =
          editedAttraction.referenceImageData?.filter(
          (image) => image.dataUrl
        ) ?? [];

        setLandmarkName(editedAttraction.name ?? defaultTest.name);
        setGoodMatchesThreshold(defaultTest.goodMatches);
        setMatchRatioThreshold(
          Number(editedAttraction.landmarkThreshold) || defaultTest.matchRatio
        );
        setReferenceImages(
          editedReferenceImages.length > 0
            ? editedReferenceImages.map((image) => image.dataUrl)
            : defaultTest.referenceImages
        );
        setAttractionError("");
      }
    } catch (error) {
      console.error(error);
      setReferenceImages([]);
      setAttractionError("관광지 기준 이미지를 불러오지 못했습니다.");
    }
  }, []);

  useEffect(() => {
    let active = true;

    async function initializeOpenCV() {
      try {
        await cvReadyPromise;

        if (active) {
          setOpencvReady(true);
          setStatus("준비 완료! 테스트 사진을 선택해 주세요.");
        }
      } catch (error) {
        console.error(error);

        if (active) {
          setStatus("OpenCV를 불러오지 못했습니다.");
        }
      }
    }

    initializeOpenCV();

    return () => {
      active = false;
    };
  }, []);

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    if (!file.type.startsWith("image/")) {
      setStatus("이미지 파일만 선택할 수 있습니다.");
      return;
    }

    if (selectedImage) {
      URL.revokeObjectURL(selectedImage);
    }

    const previewUrl = URL.createObjectURL(file);

    setSelectedFile(file);
    setSelectedImage(previewUrl);
    setResults([]);
    setSavedTestMessage("");
    setStatus("사진을 선택했습니다. 분석 버튼을 눌러 주세요.");
  }

  function saveRecognitionTestResult(passed: boolean) {
    if (!activeAttractionId) {
      return;
    }

    const savedRecords = JSON.parse(
      localStorage.getItem("loqest_recognition_test_records") || "{}"
    ) as Record<string, RecognitionTestRecord>;

    const previousRecord = savedRecords[activeAttractionId];
    const recentResults = [
      ...(previousRecord?.recentResults ?? []),
      passed,
    ].slice(-3);

    const recentFailureCount = recentResults.filter(
      (result) => !result
    ).length;

    let quality: RecognitionTestRecord["quality"] = "정상";

    if (recentFailureCount >= 2) {
      quality = "기준 이미지 개선";
    } else if (!passed) {
      quality = "확인 필요";
    }

    const nextRecord: RecognitionTestRecord = {
      totalTests: (previousRecord?.totalTests ?? 0) + 1,
      successfulTests:
        (previousRecord?.successfulTests ?? 0) + (passed ? 1 : 0),
      failedTests: (previousRecord?.failedTests ?? 0) + (passed ? 0 : 1),
      recentResults,
      lastResult: passed ? "통과" : "실패",
      lastTestedAt: new Date().toISOString(),
      quality,
    };

    savedRecords[activeAttractionId] = nextRecord;

    localStorage.setItem(
      "loqest_recognition_test_records",
      JSON.stringify(savedRecords)
    );

    setSavedTestMessage(
      `테스트 결과가 저장되었습니다. 총 ${nextRecord.totalTests}회 테스트`
    );
  }

  async function analyzeImage() {
    if (!opencvReady || !selectedFile || !selectedImage) {
      return;
    }

    setAnalyzing(true);
    setResults([]);
    setStatus(
      `${landmarkName} 기준 사진 ${referenceImages.length}장과 특징점을 비교하고 있습니다.`
    );

    const cv = await cvReadyPromise;
    let testDescriptors: any = null;

    try {
      const testImage = await loadImage(selectedImage);
      testDescriptors = extractFeatures(cv, testImage);

      const comparisonResults: ComparisonResult[] = [];

      for (const referencePath of referenceImages) {
        const referenceImage = await loadImage(referencePath);
        const referenceDescriptors = extractFeatures(cv, referenceImage);

        try {
          const comparison = compareDescriptors(
            cv,
            testDescriptors,
            referenceDescriptors
          );

          comparisonResults.push({
            referenceName: referencePath.split("/").pop() ?? referencePath,
            ...comparison,
          });
        } finally {
          referenceDescriptors.delete();
        }
      }

      comparisonResults.sort(
        (first, second) => second.goodMatches - first.goodMatches
      );

      setResults(comparisonResults);
      const currentBestResult = comparisonResults[0];
      const currentPassed =
        currentBestResult !== undefined &&
        currentBestResult.goodMatches >= goodMatchesThreshold &&
        currentBestResult.matchRatio >= matchRatioThreshold;

      saveRecognitionTestResult(currentPassed);
      setStatus("분석이 완료되었습니다.");
    } catch (error) {
      console.error(error);
      setStatus(
        "분석 중 오류가 발생했습니다. 기준 사진 경로를 확인해 주세요."
      );
    } finally {
      if (testDescriptors) {
        testDescriptors.delete();
      }

      setAnalyzing(false);
    }
  }

  const bestResult = results[0];

  const landmarkPassed =
    bestResult !== undefined &&
    bestResult.goodMatches >= goodMatchesThreshold &&
    bestResult.matchRatio >= matchRatioThreshold;

  return (
    <main style={styles.page}>
      <section style={styles.card}>
        <p style={styles.eyebrow}>LANDMARK TEST</p>

        <h1 style={styles.title}>{landmarkName} 랜드마크 인식 실험</h1>

        <p style={styles.description}>
          테스트 사진과 {landmarkName} 기준 사진 {referenceImages.length}장의
          ORB 특징점을 비교합니다.
        </p>

        {attractionError && (
          <div style={styles.errorBox}>{attractionError}</div>
        )}

        <div style={styles.statusBox}>
          <strong>{opencvReady ? "✓ 시스템 준비" : "⏳ 준비 중"}</strong>
          <p style={styles.statusText}>{status}</p>
        </div>

        <label style={styles.fileLabel}>
          테스트 사진 선택
          <input
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            style={styles.hiddenInput}
          />
        </label>

        {selectedImage && (
          <div style={styles.previewBox}>
            <img
              src={selectedImage}
              alt="선택한 테스트 사진"
              style={styles.previewImage}
            />
          </div>
        )}

        <button
          type="button"
          onClick={analyzeImage}
          disabled={
            !opencvReady ||
            !selectedFile ||
            analyzing ||
            referenceImages.length === 0
          }
          style={{
            ...styles.analyzeButton,
            opacity:
              !opencvReady ||
              !selectedFile ||
              analyzing ||
              referenceImages.length === 0
                ? 0.5
                : 1,
          }}
        >
          {analyzing ? "분석 중..." : "랜드마크 분석하기"}
        </button>

        {bestResult && (
          <section
            style={{
              ...styles.resultCard,
              borderColor: landmarkPassed ? "#8bbca5" : "#e7b7ad",
              background: landmarkPassed ? "#edf8f2" : "#fff3f0",
            }}
          >
            <p
              style={{
                ...styles.resultLabel,
                color: landmarkPassed ? "#34745a" : "#a85648",
              }}
            >
              {landmarkPassed
                ? `✓ ${landmarkName} 인증 성공`
                : `✕ ${landmarkName} 인증 실패`}
            </p>

            <strong style={styles.resultNumber}>
              좋은 특징점 {bestResult.goodMatches}개
            </strong>

            <p style={styles.resultText}>
              전체 특징점 중 일치 비율:{" "}
              {bestResult.matchRatio.toFixed(1)}%
            </p>

            <p style={styles.thresholdText}>
              인증 기준: 특징점 {goodMatchesThreshold}개 이상 · 일치 비율{" "}
              {matchRatioThreshold}% 이상
            </p>

            <p style={styles.fileName}>
              가장 유사한 기준 사진: {bestResult.referenceName}
            </p>
          </section>
        )}

        {savedTestMessage && (
          <p style={styles.savedMessage}>{savedTestMessage}</p>
        )}

        {results.length > 0 && (
          <section style={styles.listSection}>
            <h2 style={styles.listTitle}>기준 사진별 비교 결과</h2>

            <div style={styles.resultList}>
              {results.map((result, index) => (
                <div
                  key={result.referenceName}
                  style={styles.resultItem}
                >
                  <div>
                    <strong>{index + 1}위</strong>
                    <p style={styles.itemFileName}>
                      {result.referenceName}
                    </p>
                  </div>

                  <div style={styles.itemScore}>
                    <strong>{result.goodMatches}개</strong>
                    <span>
                      {result.matchRatio.toFixed(1)}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </section>
    </main>
  );
}

const styles: Record<string, CSSProperties> = {
  page: {
    minHeight: "100vh",
    padding: "24px 16px 60px",
    background: "#f6f1e8",
    color: "#20384a",
  },

  card: {
    width: "100%",
    maxWidth: "560px",
    margin: "0 auto",
    padding: "24px",
    border: "1px solid #ded7ca",
    borderRadius: "24px",
    background: "#fffdf8",
    boxShadow: "0 14px 35px rgba(32, 56, 74, 0.1)",
  },

  eyebrow: {
    margin: "0 0 8px",
    color: "#d56f5b",
    fontSize: "12px",
    fontWeight: 900,
    letterSpacing: "0.12em",
  },

  title: {
    margin: "0 0 12px",
    fontSize: "26px",
  },

  description: {
    margin: "0 0 20px",
    color: "#64717a",
    fontSize: "14px",
    lineHeight: 1.7,
  },

  statusBox: {
    marginBottom: "18px",
    padding: "14px",
    borderRadius: "14px",
    background: "#edf4f6",
    color: "#315d70",
  },

  errorBox: {
    marginBottom: "18px",
    padding: "13px 14px",
    border: "1px solid #efcaca",
    borderRadius: "12px",
    background: "#fff0f0",
    color: "#a84a4a",
    fontSize: "13px",
    fontWeight: 700,
  },

  savedMessage: {
    margin: "12px 0 0",
    padding: "11px 13px",
    borderRadius: "10px",
    background: "#e8edf8",
    color: "#203a8f",
    fontSize: "12px",
    fontWeight: 700,
    textAlign: "center",
  },

  statusText: {
    margin: "5px 0 0",
    fontSize: "13px",
  },

  fileLabel: {
    display: "flex",
    minHeight: "48px",
    alignItems: "center",
    justifyContent: "center",
    border: "1px solid #8da8b5",
    borderRadius: "14px",
    background: "#ffffff",
    color: "#315d70",
    fontWeight: 800,
    cursor: "pointer",
  },

  hiddenInput: {
    display: "none",
  },

  previewBox: {
    marginTop: "16px",
    overflow: "hidden",
    borderRadius: "16px",
    background: "#e8e8e8",
  },

  previewImage: {
    display: "block",
    width: "100%",
    maxHeight: "420px",
    objectFit: "contain",
  },

  analyzeButton: {
    width: "100%",
    minHeight: "50px",
    marginTop: "16px",
    border: 0,
    borderRadius: "14px",
    background: "#203f58",
    color: "#ffffff",
    fontSize: "15px",
    fontWeight: 900,
    cursor: "pointer",
  },

  resultCard: {
    marginTop: "22px",
    padding: "20px",
    border: "1px solid #e7b7ad",
    borderRadius: "18px",
    background: "#fff3f0",
    textAlign: "center",
  },

  resultLabel: {
    margin: "0 0 8px",
    color: "#a85648",
    fontSize: "12px",
    fontWeight: 800,
  },

  resultNumber: {
    display: "block",
    color: "#203f58",
    fontSize: "24px",
  },

  resultText: {
    margin: "8px 0",
    color: "#596b75",
    fontSize: "14px",
  },

  fileName: {
    margin: 0,
    overflowWrap: "anywhere",
    color: "#7b858a",
    fontSize: "11px",
  },

  thresholdText: {
    margin: "8px 0 12px",
    color: "#6f777b",
    fontSize: "12px",
    fontWeight: 700,
  },

  listSection: {
    marginTop: "24px",
  },

  listTitle: {
    margin: "0 0 12px",
    fontSize: "17px",
  },

  resultList: {
    display: "grid",
    gap: "9px",
  },

  resultItem: {
    display: "flex",
    justifyContent: "space-between",
    gap: "16px",
    padding: "12px",
    border: "1px solid #e3e5e3",
    borderRadius: "12px",
    background: "#ffffff",
  },

  itemFileName: {
    maxWidth: "330px",
    margin: "4px 0 0",
    overflowWrap: "anywhere",
    color: "#7a8387",
    fontSize: "10px",
  },

  itemScore: {
    display: "grid",
    flexShrink: 0,
    gap: "3px",
    textAlign: "right",
    color: "#315d70",
    fontSize: "13px",
  },
};