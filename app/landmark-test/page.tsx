"use client";

import { ChangeEvent, useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import Link from "next/link";
import loadingStyles from "./LandmarkTest.module.css";
import cvReadyPromise from "@techstark/opencv-js";
import {
  clearAdminApiKey,
  getAdminApiKey,
} from "@/lib/adminApiKey";

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

type ApiReferenceImage = {
  dataUrl?: string;
  url?: string;
};

type ApiAttraction = {
  id: number;
  name: string;
  landmark_threshold?: number;
  referenceImages?: ApiReferenceImage[];
};

type ComparisonResult = {
  referenceName: string;
  goodMatches: number;
  totalMatches: number;
  matchRatio: number;
};

type RecognitionTestRecord = { approved: boolean };

function loadImage(source: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();

    if (source.startsWith("http")) {
      image.crossOrigin = "anonymous";
    }

    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`이미지를 불러오지 못했습니다: ${source}`));
    image.src = source;
  });
}

type OpenCV = Awaited<typeof cvReadyPromise>;
type DescriptorMat = ReturnType<OpenCV["Mat"]["prototype"]["clone"]>;

function extractFeatures(cv: OpenCV, image: HTMLImageElement) {
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
  cv: OpenCV,
  testDescriptors: DescriptorMat,
  referenceDescriptors: DescriptorMat
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
  const [landmarkName, setLandmarkName] = useState("관광지");
  const [referenceImages, setReferenceImages] = useState<string[]>([]);
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
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraVideoRef = useRef<HTMLVideoElement>(null);
  const cameraStreamRef = useRef<MediaStream | null>(null);
  const cameraRequestIdRef = useRef(0);
  const selectedImageUrlRef = useRef<string | null>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraOpening, setCameraOpening] = useState(false);
  const [cameraError, setCameraError] = useState("");
  const [status, setStatus] = useState("OpenCV를 불러오는 중입니다.");
  const [analyzing, setAnalyzing] = useState(false);
  const [results, setResults] = useState<ComparisonResult[]>([]);
  const [savedTestMessage, setSavedTestMessage] = useState("");
  const [saveFailed, setSaveFailed] = useState(false);

  useEffect(() => {
    let active = true;

    const loadAttraction = async () => {
      const attractionId = new URLSearchParams(window.location.search).get(
        "attractionId"
      );

      if (!attractionId) {
        setLandmarkName(FALLBACK_LANDMARK_NAME);
        setReferenceImages(FALLBACK_REFERENCE_IMAGES);
        setAttractionError("");
        return;
      }

      setActiveAttractionId(attractionId);
      setReferenceImages([]);
      setAttractionError("");

      try {
        const adminKey = getAdminApiKey();

        if (!adminKey) {
          throw new Error(
            "관리자 API 키가 없습니다. 관리자 화면을 새로고침한 후 다시 시도해주세요."
          );
        }

        const response = await fetch(`/api/attractions/${attractionId}`, {
          headers: { "x-admin-api-key": adminKey },
          cache: "no-store",
        });

        if (response.status === 401) {
          clearAdminApiKey();
          throw new Error(
            "관리자 API 키가 올바르지 않습니다. 새로고침 후 다시 입력해주세요."
          );
        }

        const result = (await response.json()) as {
          attraction?: ApiAttraction;
          message?: string;
        };

        if (!response.ok || !result.attraction) {
          throw new Error(
            result.message ?? "등록된 관광지 정보를 찾지 못했습니다."
          );
        }

        const attraction = result.attraction;
        const imageUrls = (attraction.referenceImages ?? [])
          .map((image) => image.dataUrl ?? image.url ?? "")
          .filter((source): source is string => Boolean(source));

        if (!active) {
          return;
        }

        setLandmarkName(attraction.name);
        setGoodMatchesThreshold(THRESHOLD.goodMatches);
        setMatchRatioThreshold(
          Number(attraction.landmark_threshold) || THRESHOLD.matchRatio
        );

        if (imageUrls.length === 0) {
          setReferenceImages([]);
          setAttractionError(
            "이 관광지에는 실제 기준 이미지가 저장되어 있지 않습니다."
          );
          return;
        }

        setReferenceImages(imageUrls);
        setAttractionError("");
      } catch (error) {
        console.error(error);

        if (active) {
          setReferenceImages([]);
          setAttractionError(
            error instanceof Error
              ? error.message
              : "관광지 기준 이미지를 불러오지 못했습니다."
          );
        }
      }
    };

    void loadAttraction();

    return () => {
      active = false;
    };
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

  // Always release the webcam and its resources when leaving the test screen.
  useEffect(() => {
    return () => {
      cameraRequestIdRef.current += 1;
      cameraStreamRef.current?.getTracks().forEach((track) => track.stop());
      cameraStreamRef.current = null;
      if (selectedImageUrlRef.current) URL.revokeObjectURL(selectedImageUrlRef.current);
    };
  }, []);

  useEffect(() => {
    if (!cameraActive || !cameraVideoRef.current || !cameraStreamRef.current) return;
    const video = cameraVideoRef.current;
    video.srcObject = cameraStreamRef.current;
    void video.play().catch(() => setCameraError("카메라 영상을 재생할 수 없습니다. 다시 시도해주세요."));
    return () => { video.srcObject = null; };
  }, [cameraActive]);

  function stopLiveCamera() {
    cameraRequestIdRef.current += 1;
    cameraStreamRef.current?.getTracks().forEach((track) => track.stop());
    cameraStreamRef.current = null;
    setCameraActive(false);
    setCameraOpening(false);
  }

  async function openLiveCamera() {
    if (analyzing || cameraOpening) return;
    stopLiveCamera();
    setCameraError("");
    setResults([]);
    setSavedTestMessage("");
    setSaveFailed(false);
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraError("이 브라우저에서는 실시간 카메라를 지원하지 않습니다. 사진 보관함을 이용해주세요.");
      return;
    }
    const requestId = ++cameraRequestIdRef.current;
    setCameraOpening(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      if (requestId !== cameraRequestIdRef.current) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }
      cameraStreamRef.current = stream;
      setCameraActive(true);
      setStatus("카메라에서 랜드마크를 촬영해주세요.");
    } catch (error) {
      console.error(error);
      setCameraError("카메라를 사용할 수 없습니다. 브라우저에서 카메라 권한을 허용하거나 사진 보관함을 이용해주세요.");
    } finally {
      if (requestId === cameraRequestIdRef.current) setCameraOpening(false);
    }
  }

  function setTestPhoto(file: File) {
    if (selectedImageUrlRef.current) URL.revokeObjectURL(selectedImageUrlRef.current);
    const previewUrl = URL.createObjectURL(file);
    selectedImageUrlRef.current = previewUrl;
    setSelectedFile(file);
    setSelectedImage(previewUrl);
    setResults([]);
    setSavedTestMessage("");
    setSaveFailed(false);
    setStatus("사진을 준비했습니다. 분석 버튼을 눌러 주세요.");
  }

  async function captureLivePhoto() {
    const video = cameraVideoRef.current;
    if (!video || !cameraStreamRef.current || video.videoWidth === 0 || video.videoHeight === 0) {
      setCameraError("카메라가 아직 준비되지 않았습니다. 잠시 후 다시 촬영해주세요.");
      return;
    }
    const canvas = document.createElement("canvas");
    const maxDimension = 1600;
    const scale = Math.min(1, maxDimension / Math.max(video.videoWidth, video.videoHeight));
    canvas.width = Math.round(video.videoWidth * scale);
    canvas.height = Math.round(video.videoHeight * scale);
    const context = canvas.getContext("2d");
    if (!context) {
      setCameraError("사진을 처리하지 못했습니다. 다시 시도해주세요.");
      return;
    }
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.9));
    if (!blob) {
      setCameraError("촬영한 사진을 저장하지 못했습니다. 다시 시도해주세요.");
      return;
    }
    stopLiveCamera();
    setCameraError("");
    setTestPhoto(new File([blob], `landmark-test-${Date.now()}.jpg`, { type: "image/jpeg" }));
  }

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    if (!file.type.startsWith("image/")) {
      setStatus("이미지 파일만 선택할 수 있습니다.");
      return;
    }

    stopLiveCamera();
    setCameraError("");
    setTestPhoto(file);
  }

  function retryWithAnotherPhoto() {
    // Keep the selected-photo step rather than returning to the empty first screen.
    setResults([]);
    setSavedTestMessage("");
    setSaveFailed(false);
    setStatus("다른 테스트 사진을 선택해 주세요.");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
      fileInputRef.current.click();
    }
  }

  function returnToTestStart() {
    stopLiveCamera();
    if (selectedImageUrlRef.current) URL.revokeObjectURL(selectedImageUrlRef.current);
    selectedImageUrlRef.current = null;
    setSelectedImage(null);
    setSelectedFile(null);
    setResults([]);
    setSavedTestMessage("");
    setSaveFailed(false);
    setStatus(opencvReady
      ? "준비 완료! 테스트 사진을 선택해 주세요."
      : "OpenCV를 불러오는 중입니다.");
  }

  async function saveRecognitionTestResult(goodMatches: number, matchRatio: number) {
    if (!activeAttractionId) return;

    const response = await fetch("/api/recognition-test-records", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-admin-api-key": getAdminApiKey() || "",
      },
      body: JSON.stringify({
        attractionId: Number(activeAttractionId),
        goodMatches,
        matchRatio,
      }),
    });
    const result = (await response.json()) as {
      passed?: boolean;
      record?: RecognitionTestRecord;
      message?: string;
    };
    if (!response.ok) {
      throw new Error(result.message || "테스트 승인 상태를 확인하지 못했습니다.");
    }
    // Only a passing test writes approval to the server; failures are not logged.
    if (result.passed && !result.record?.approved) {
      throw new Error("테스트 통과 승인 저장을 확인하지 못했습니다.");
    }
    setSavedTestMessage("");
  }

  async function analyzeImage() {
    if (!opencvReady || !selectedFile || !selectedImage) {
      return;
    }

    setAnalyzing(true);
    setResults([]);
    setSaveFailed(false);
    setSavedTestMessage("");
    setStatus(
      `${landmarkName} 기준 사진 ${referenceImages.length}장과 특징점을 비교하고 있습니다.`
    );

    let testDescriptors: DescriptorMat | null = null;

    try {
      // Let the browser paint the loading overlay before CPU-intensive OpenCV work.
      // This does not impose a minimum loading duration.
      await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
      const cv = await cvReadyPromise;
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

      try {
        await saveRecognitionTestResult(currentBestResult?.goodMatches ?? 0, currentBestResult?.matchRatio ?? 0);
        setStatus("분석이 완료되었습니다.");
      } catch (saveError) {
        setSavedTestMessage("");
        setSaveFailed(true);
        setStatus(saveError instanceof Error
          ? `분석은 완료되었지만 ${saveError.message}`
          : "분석은 완료되었지만 서버 저장에 실패했습니다.");
      }
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

        {attractionError && (
          <div style={styles.errorBox}>{attractionError}</div>
        )}

        <div style={styles.statusBox}>
          <strong>{opencvReady ? "✓ 시스템 준비" : "⏳ 준비 중"}</strong>
          <p style={styles.statusText}>{status}</p>
        </div>

        <div style={styles.photoSourceActions}>
          <label style={selectedImage ? { ...styles.fileLabel, ...styles.changePhotoLabel, ...styles.sourceButton } : { ...styles.fileLabel, ...styles.sourceButton }}>
            {selectedImage ? "사진 보관함에서 변경" : "사진 보관함에서 선택"}
            <input
              type="file"
              ref={fileInputRef}
              accept="image/*"
              onChange={handleFileChange}
              disabled={analyzing || cameraOpening}
              style={styles.hiddenInput}
            />
          </label>
          <button
            type="button"
            onClick={cameraActive || cameraOpening ? stopLiveCamera : openLiveCamera}
            disabled={analyzing}
            style={{ ...styles.cameraStartButton, ...styles.sourceButton }}
          >
            {cameraActive ? "카메라 닫기" : cameraOpening ? "카메라 취소" : "📷 실시간 촬영"}
          </button>
        </div>

        {cameraError && <p role="alert" style={styles.cameraError}>{cameraError}</p>}

        {cameraActive && (
          <div style={styles.liveCameraBox}>
            <video ref={cameraVideoRef} autoPlay muted playsInline style={styles.liveCameraVideo} />
            <div style={styles.liveCameraHint}>랜드마크가 화면 중앙에 오도록 맞춰주세요.</div>
            <button type="button" onClick={captureLivePhoto} style={styles.liveShutterButton}>
              <span style={styles.liveShutterInner} />
              <span style={styles.shutterLabel}>사진 촬영</span>
            </button>
          </div>
        )}

        {selectedImage && !cameraActive && (
          <div style={styles.previewBox}>
            {/* Browser-local photo preview: keep the original image without server optimization. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={selectedImage}
              alt="선택한 테스트 사진"
              style={styles.previewImage}
            />
          </div>
        )}

        {selectedImage && !cameraActive && !cameraOpening && results.length === 0 && (
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
        )}

        {bestResult && !cameraActive && (
          <>
            <section style={{...styles.resultCard,background:landmarkPassed?"#ecf8f0":"#fff1f5",borderColor:landmarkPassed?"#bee7cc":"#f3b8cb"}} aria-live="polite">
              <div style={{...styles.resultIcon,background:landmarkPassed?"#d9f2e4":"#ffe0e9",color:landmarkPassed?"#197349":"#a74365"}} aria-hidden="true">{landmarkPassed?"✓":"✕"}</div>
              <h2 style={{...styles.resultHeading,color:landmarkPassed?"#197349":"#a74365"}}>{landmarkPassed?"테스트 통과!":"테스트 실패"}</h2>
              <p style={styles.resultDescription}>{landmarkPassed?"랜드마크 이미지가 정상적으로 인식되었습니다.":"랜드마크 이미지가 인증 기준에 미치지 못했습니다."}</p>
              {saveFailed && <p style={{...styles.savedMessage,background:"#fff0f0",color:"#a74365"}}>{status} 결과가 저장되지 않았으므로 다시 테스트해주세요.</p>}
              {!saveFailed && savedTestMessage && <p style={styles.savedMessage}>{savedTestMessage}</p>}
            </section>
            <div style={styles.resultActions}>
              {landmarkPassed && !saveFailed && activeAttractionId ? (
                <Link href={"/admin/attractions/" + activeAttractionId} style={styles.resultPrimaryButton}>테스트 완료하기</Link>
              ) : (
                <button type="button" onClick={retryWithAnotherPhoto} style={styles.resultPrimaryButton}>다시 테스트하기</button>
              )}
              {landmarkPassed && !saveFailed && (
                <button type="button" onClick={returnToTestStart} style={styles.backButton}>다른 사진 테스트</button>
              )}
            </div>
            <details style={styles.details}>
              <summary style={styles.detailsSummary}>상세 분석 결과 보기</summary>
              <div style={styles.detailsBody}>
                <p>좋은 특징점: <strong>{bestResult.goodMatches}개</strong></p>
                <p>일치 비율: <strong>{bestResult.matchRatio.toFixed(1)}%</strong></p>
                <p>인증 기준: 특징점 {goodMatchesThreshold}개 이상 · 일치 비율 {matchRatioThreshold}% 이상</p>
                <p style={{overflowWrap:"anywhere"}}>가장 유사한 기준 사진: {bestResult.referenceName}</p>
                <h3 style={styles.listTitle}>기준 사진별 비교 결과</h3>
                <div style={styles.resultList}>
                  {results.map((result,index)=><div key={result.referenceName+index} style={styles.resultItem}>
                    <div><strong>{index+1}위</strong><p style={styles.itemFileName}>{result.referenceName}</p></div>
                    <div style={styles.itemScore}><strong>{result.goodMatches}개</strong><span>{result.matchRatio.toFixed(1)}%</span></div>
                  </div>)}
                </div>
              </div>
            </details>
          </>
        )}
        {!bestResult && !cameraActive && !cameraOpening && (
          selectedImage ? (
            <button
              type="button"
              onClick={returnToTestStart}
              disabled={analyzing}
              style={styles.backButton}
            >
              ← 뒤로가기
            </button>
          ) : activeAttractionId ? (
            <Link href={`/admin/attractions/${activeAttractionId}`} style={styles.backButton}>
              ← 관광지 상세로 돌아가기
            </Link>
          ) : (
            <button type="button" onClick={() => window.history.back()} style={styles.backButton}>
              ← 뒤로가기
            </button>
          )
        )}
      </section>
      {analyzing && <div className={loadingStyles.backdrop} role="dialog" aria-modal="true" aria-label="이미지 인식 테스트 진행 중" aria-live="polite"><div className={loadingStyles.modal}><div className={loadingStyles.spinner} aria-hidden="true" /><h2>랜드마크 이미지를 분석하고 있어요</h2><p>기준 이미지와 비교하고 있습니다. 잠시만 기다려 주세요.</p></div></div>}
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

  photoSourceActions: { display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: "10px" },
  sourceButton: { boxSizing: "border-box", width: "100%", minWidth: 0, padding: "10px 8px", textAlign: "center", fontSize: "13px" },
  cameraStartButton: { minHeight: "52px", border: "1px solid #0284c7", borderRadius: "11px", background: "#fff", color: "#0369a1", fontWeight: 800, cursor: "pointer" },
  cameraError: { margin: "12px 0 0", padding: "12px", borderRadius: "10px", background: "#fff1f1", color: "#a33a3a", fontSize: "13px" },
  liveCameraBox: { position: "relative", marginTop: "14px", height: "min(65vh, 470px)", minHeight: "280px", overflow: "hidden", borderRadius: "16px", background: "#111" },
  liveCameraVideo: { width: "100%", height: "100%", display: "block", objectFit: "cover" },
  liveCameraHint: { position: "absolute", top: "14px", left: "12px", right: "12px", padding: "9px", borderRadius: "10px", background: "rgba(0,0,0,.6)", color: "#fff", textAlign: "center", fontSize: "13px", pointerEvents: "none" },
  liveShutterButton: { position: "absolute", bottom: "18px", left: "50%", transform: "translateX(-50%)", width: "76px", height: "76px", borderRadius: "50%", border: "6px solid rgba(255,255,255,.8)", background: "rgba(30,30,30,.4)", display: "grid", placeItems: "center", cursor: "pointer" },
  liveShutterInner: { width: "50px", height: "50px", borderRadius: "50%", background: "#fff" },
  shutterLabel: { position: "absolute", width: "1px", height: "1px", padding: 0, margin: "-1px", overflow: "hidden", clip: "rect(0,0,0,0)", whiteSpace: "nowrap" },
  fileLabel: {
    display: "flex",
    minHeight: "52px",
    alignItems: "center",
    justifyContent: "center",
    border: "1px solid #0284c7",
    borderRadius: "11px",
    background: "#0284c7",
    color: "#ffffff",
    fontSize: "15px",
    fontWeight: 800,
    cursor: "pointer",
    boxShadow: "0 5px 12px rgba(2,132,199,.15)",
  },

  changePhotoLabel: {
    background: "#ffffff",
    border: "1px solid #cddde9",
    color: "#64748b",
    boxShadow: "none",
    fontSize: "14px",
    fontWeight: 700,
    minHeight: "44px",
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
    background: "#0284c7",
    color: "#ffffff",
    fontSize: "15px",
    fontWeight: 900,
    cursor: "pointer",
  },

  backButton: {
    display: "flex",
    width: "100%",
    minHeight: "48px",
    marginTop: "16px",
    alignItems: "center",
    justifyContent: "center",
    border: "1px solid #8da8b5",
    borderRadius: "14px",
    background: "#ffffff",
    color: "#315d70",
    fontSize: "14px",
    fontWeight: 800,
    textDecoration: "none",
    cursor: "pointer",
  },

  resultActions:{display:"grid",gap:"12px",marginTop:"16px"},
  resultPrimaryButton:{display:"flex",alignItems:"center",justifyContent:"center",width:"100%",boxSizing:"border-box",minHeight:"52px",padding:"13px 18px",background:"#0284c7",color:"#fff",border:0,borderRadius:"11px",fontWeight:800,fontSize:"15px",textDecoration:"none",cursor:"pointer"},
  resultIcon:{width:"66px",height:"66px",display:"inline-flex",alignItems:"center",justifyContent:"center",borderRadius:"50%",fontSize:"34px",fontWeight:800},
  resultHeading:{margin:"14px 0 8px",fontSize:"25px",fontWeight:800},
  resultDescription:{margin:0,fontSize:"14px",lineHeight:1.6,color:"#64717a"},
  details:{marginTop:"19px",border:"1px solid #dce6ee",borderRadius:"12px",background:"#fff",overflow:"hidden"},
  detailsSummary:{padding:"16px 18px",cursor:"pointer",fontSize:"14px",fontWeight:800,color:"#315d70"},
  detailsBody:{padding:"0 18px 18px",color:"#596b75",fontSize:"13px"},
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