"use client";

import { ChangeEvent, useEffect, useState } from "react";
import cvReadyPromise from "@techstark/opencv-js";

const LANDMARK_NAME = "노트북 키보드";

const REFERENCE_IMAGES = [
  "/landmarks/home/reference/KakaoTalk_20260815_155103197_01.jpg",
  "/landmarks/home/reference/KakaoTalk_20260815_155103197_02.jpg",
  "/landmarks/home/reference/KakaoTalk_20260815_155103197_03.jpg",
];

const THRESHOLD = {
  goodMatches: 45,
  matchRatio: 30,
};

type ComparisonResult = {
  referenceName: string;
  goodMatches: number;
  totalMatches: number;
  matchRatio: number;
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
  const [opencvReady, setOpencvReady] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [status, setStatus] = useState("OpenCV를 불러오는 중입니다.");
  const [analyzing, setAnalyzing] = useState(false);
  const [results, setResults] = useState<ComparisonResult[]>([]);

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
    setStatus("사진을 선택했습니다. 분석 버튼을 눌러 주세요.");
  }

  async function analyzeImage() {
    if (!opencvReady || !selectedFile || !selectedImage) {
      return;
    }

    setAnalyzing(true);
    setResults([]);
    setStatus(
      `키보드 기준 사진 ${REFERENCE_IMAGES.length}장과 특징점을 비교하고 있습니다.`
    );

    const cv = await cvReadyPromise;
    let testDescriptors: any = null;

    try {
      const testImage = await loadImage(selectedImage);
      testDescriptors = extractFeatures(cv, testImage);

      const comparisonResults: ComparisonResult[] = [];

      for (const referencePath of REFERENCE_IMAGES) {
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
    bestResult.goodMatches >= THRESHOLD.goodMatches &&
    bestResult.matchRatio >= THRESHOLD.matchRatio;

  return (
    <main style={styles.page}>
      <section style={styles.card}>
        <p style={styles.eyebrow}>LANDMARK TEST</p>

        <h1 style={styles.title}>{LANDMARK_NAME} 랜드마크 인식 실험</h1>

        <p style={styles.description}>
          테스트 사진과 키보드 기준 사진 {REFERENCE_IMAGES.length}장의 ORB
          특징점을 비교합니다.
        </p>

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
          disabled={!opencvReady || !selectedFile || analyzing}
          style={{
            ...styles.analyzeButton,
            opacity:
              !opencvReady || !selectedFile || analyzing ? 0.5 : 1,
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
                ? `✓ ${LANDMARK_NAME} 인증 성공`
                : `✕ ${LANDMARK_NAME} 인증 실패`}
            </p>

            <strong style={styles.resultNumber}>
              좋은 특징점 {bestResult.goodMatches}개
            </strong>

            <p style={styles.resultText}>
              전체 특징점 중 일치 비율:{" "}
              {bestResult.matchRatio.toFixed(1)}%
            </p>

            <p style={styles.thresholdText}>
              인증 기준: 특징점 {THRESHOLD.goodMatches}개 이상 · 일치 비율{" "}
              {THRESHOLD.matchRatio}% 이상
            </p>

            <p style={styles.fileName}>
              가장 유사한 기준 사진: {bestResult.referenceName}
            </p>
          </section>
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

const styles: Record<string, React.CSSProperties> = {
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