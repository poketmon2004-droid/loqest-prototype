"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */

import { useEffect, useRef, useState } from "react";
import cvReadyPromise from "@techstark/opencv-js";
import {
  FilesetResolver,
  GestureRecognizer,
} from "@mediapipe/tasks-vision";

type CameraCaptureProps = {
  recognitionKey: "character" | "inform" | "wish";
  landmarkName: string;
  landmarkGuide: string;
  poseGuide: string;
  landmarkLatitude: number;
  landmarkLongitude: number;
  allowedRadius: number;
  onProcessingChange: (processing: boolean) => void;
  onVerified: () => void;
};

type RecognitionKey = CameraCaptureProps["recognitionKey"];

type LandmarkRecognitionConfig = {
  references: string[];
  goodMatches: number;
  matchRatio: number;
};

const landmarkRecognition: Record<
  RecognitionKey,
  LandmarkRecognitionConfig
> = {
  character: {
    references: [
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
  inform: {
    references: [
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
  wish: {
    references: [
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

const gestureOptions = {
  Thumb_Up: {
    name: "엄지척",
    icon: "👍",
    instruction: "손 전체가 보이게 엄지척해주세요.",
  },
  Victory: {
    name: "브이",
    icon: "✌️",
    instruction: "손 전체가 보이게 브이 포즈를 취해주세요.",
  },
  Pointing_Up: {
    name: "위 가리키기",
    icon: "☝️",
    instruction: "검지손가락으로 위를 가리켜주세요.",
  },
} as const;

type GestureName = keyof typeof gestureOptions;

const gestureNames = Object.keys(
  gestureOptions
) as GestureName[];

type CaptureInformation = {
  latitude: number;
  longitude: number;
  accuracy: number;
  distance: number;
  capturedAt: string;
};

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

function getCurrentLocation() {
  return new Promise<GeolocationPosition>((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("위치 기능을 지원하지 않습니다."));
      return;
    }

    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: true,
      timeout: 15000,
      maximumAge: 0,
    });
  });
}

function loadImage(source: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();

    image.onload = () => resolve(image);
    image.onerror = () =>
      reject(
        new Error(`기준 이미지를 불러오지 못했습니다: ${source}`)
      );
    image.src = source;
  });
}

function cropLandmarkArea(sourceCanvas: HTMLCanvasElement) {
  const croppedCanvas = document.createElement("canvas");
  const cropX = Math.round(sourceCanvas.width * 0.06);
  const cropY = Math.round(sourceCanvas.height * 0.16);
  const cropWidth = Math.round(sourceCanvas.width * 0.88);
  const cropHeight = Math.round(sourceCanvas.height * 0.58);

  croppedCanvas.width = cropWidth;
  croppedCanvas.height = cropHeight;

  const context = croppedCanvas.getContext("2d");

  if (!context) {
    throw new Error("랜드마크 영역을 처리하지 못했습니다.");
  }

  context.drawImage(
    sourceCanvas,
    cropX,
    cropY,
    cropWidth,
    cropHeight,
    0,
    0,
    cropWidth,
    cropHeight
  );

  return croppedCanvas;
}

function extractFeatures(
  cv: any,
  image: HTMLImageElement | HTMLCanvasElement
) {
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
    orb.detectAndCompute(gray, mask, keypoints, descriptors);

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
  if (testDescriptors.empty() || referenceDescriptors.empty()) {
    return { goodMatches: 0, matchRatio: 0 };
  }

  const matcher = new cv.BFMatcher(cv.NORM_HAMMING, true);
  const matches = new cv.DMatchVector();

  try {
    matcher.match(testDescriptors, referenceDescriptors, matches);

    let goodMatches = 0;

    for (let index = 0; index < matches.size(); index += 1) {
      if (matches.get(index).distance <= 55) {
        goodMatches += 1;
      }
    }

    return {
      goodMatches,
      matchRatio:
        matches.size() === 0
          ? 0
          : (goodMatches / matches.size()) * 100,
    };
  } finally {
    matcher.delete();
    matches.delete();
  }
}

async function recognizeLandmark(
  sourceCanvas: HTMLCanvasElement,
  recognitionKey: RecognitionKey
) {
  const cv = await cvReadyPromise;
  const config = landmarkRecognition[recognitionKey];
  const landmarkCanvas = cropLandmarkArea(sourceCanvas);
  const testDescriptors = extractFeatures(cv, landmarkCanvas);

  let bestGoodMatches = 0;
  let bestMatchRatio = 0;

  try {
    for (const referencePath of config.references) {
      const referenceImage = await loadImage(referencePath);
      const referenceDescriptors = extractFeatures(cv, referenceImage);

      try {
        const comparison = compareDescriptors(
          cv,
          testDescriptors,
          referenceDescriptors
        );

        if (comparison.goodMatches > bestGoodMatches) {
          bestGoodMatches = comparison.goodMatches;
          bestMatchRatio = comparison.matchRatio;
        }
      } finally {
        referenceDescriptors.delete();
      }
    }
  } finally {
    testDescriptors.delete();
  }

  return {
    passed:
      bestGoodMatches >= config.goodMatches &&
      bestMatchRatio >= config.matchRatio,
    goodMatches: bestGoodMatches,
    matchRatio: bestMatchRatio,
  };
}

export default function CameraCapture({
  recognitionKey,
  landmarkName,
  landmarkGuide,
  poseGuide,
  landmarkLatitude,
  landmarkLongitude,
  allowedRadius,
  onProcessingChange,
  onVerified,
}: CameraCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const gestureRecognizerRef =
    useRef<GestureRecognizer | null>(null);

  const animationFrameRef = useRef<number | null>(null);
  const lastDetectionTimeRef = useRef(0);
  const thumbDetectedRef = useRef(false);
  const thumbStableSinceRef = useRef<number | null>(null);
  const targetGestureRef =
    useRef<GestureName>("Thumb_Up");

  const [cameraOpen, setCameraOpen] = useState(false);
  const [openingCamera, setOpeningCamera] = useState(false);
  const [modelReady, setModelReady] = useState(false);
  const [photo, setPhoto] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [checkingLocation, setCheckingLocation] = useState(false);
  const [thumbDetected, setThumbDetected] = useState(false);
  const [targetGesture, setTargetGesture] =
    useState<GestureName>("Thumb_Up");

  const targetGestureInformation =
    gestureOptions[targetGesture];

  const [captureInformation, setCaptureInformation] =
    useState<CaptureInformation | null>(null);

  const [error, setError] = useState("");

  async function initializeGestureRecognizer() {
    if (gestureRecognizerRef.current) {
      setModelReady(true);
      return;
    }

    try {
      const vision = await FilesetResolver.forVisionTasks(
        "/mediapipe-wasm"
      );

      let recognizer: GestureRecognizer;

      try {
        recognizer =
          await GestureRecognizer.createFromOptions(vision, {
            baseOptions: {
              modelAssetPath:
                "/models/gesture_recognizer.task",
              delegate: "GPU",
            },
            runningMode: "VIDEO",
            numHands: 1,
            minHandDetectionConfidence: 0.5,
            minHandPresenceConfidence: 0.5,
            minTrackingConfidence: 0.5,
          });
      } catch {
        recognizer =
          await GestureRecognizer.createFromOptions(vision, {
            baseOptions: {
              modelAssetPath:
                "/models/gesture_recognizer.task",
            },
            runningMode: "VIDEO",
            numHands: 1,
            minHandDetectionConfidence: 0.5,
            minHandPresenceConfidence: 0.5,
            minTrackingConfidence: 0.5,
          });
      }

      gestureRecognizerRef.current = recognizer;
      setModelReady(true);
    } catch (modelError) {
      console.error(modelError);

      setError(
        "엄지척 인식 모델을 불러오지 못했습니다. 페이지를 새로고침해주세요."
      );

      throw modelError;
    }
  }

  useEffect(() => {
    if (!cameraOpen || !videoRef.current || !streamRef.current) {
      return;
    }

    const video = videoRef.current;

    video.srcObject = streamRef.current;

    video.play().catch(() => {
      setError(
        "카메라 영상을 재생하지 못했습니다. 페이지를 새로고침해주세요."
      );
    });
  }, [cameraOpen]);

  /*
    GPS 확인 중에는 실시간 엄지척 감지를 중지합니다.
    촬영 버튼을 누른 뒤에는 자세를 풀어도 됩니다.
  */
  useEffect(() => {
    if (!cameraOpen || !modelReady || checkingLocation) {
      return;
    }

    let detectionStopped = false;

    function detectGesture() {
      if (detectionStopped) {
        return;
      }

      const video = videoRef.current;
      const recognizer = gestureRecognizerRef.current;
      const currentTime = performance.now();

      /*
        휴대폰의 부담을 줄이기 위해
        약 150ms마다 손동작을 감지합니다.
      */
      if (
        video &&
        recognizer &&
        video.readyState >= 2 &&
        currentTime - lastDetectionTimeRef.current >= 150
      ) {
        lastDetectionTimeRef.current = currentTime;

        try {
          const result = recognizer.recognizeForVideo(
            video,
            currentTime
          );

          const firstGesture = result.gestures[0]?.[0];

          const isRequiredGesture =
            firstGesture?.categoryName ===
              targetGestureRef.current &&
            firstGesture.score >= 0.6;

          if (isRequiredGesture) {
            if (thumbStableSinceRef.current === null) {
              thumbStableSinceRef.current = currentTime;
            }

            const stableDuration =
              currentTime - thumbStableSinceRef.current;

            /*
              엄지척이 0.5초 이상 유지되면
              포즈 인증 성공으로 처리합니다.
            */
            if (
              stableDuration >= 500 &&
              !thumbDetectedRef.current
            ) {
              thumbDetectedRef.current = true;
              setThumbDetected(true);
            }
          } else {
            thumbStableSinceRef.current = null;

            if (thumbDetectedRef.current) {
              thumbDetectedRef.current = false;
              setThumbDetected(false);
            }
          }
        } catch (gestureError) {
          console.error(gestureError);
        }
      }

      animationFrameRef.current =
        requestAnimationFrame(detectGesture);
    }

    animationFrameRef.current =
      requestAnimationFrame(detectGesture);

    return () => {
      detectionStopped = true;

      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [cameraOpen, modelReady, checkingLocation]);

  function stopCamera() {
    if (animationFrameRef.current !== null) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    streamRef.current?.getTracks().forEach((track) => {
      track.stop();
    });

    streamRef.current = null;
    thumbDetectedRef.current = false;
    thumbStableSinceRef.current = null;

    setThumbDetected(false);
    setCameraOpen(false);
  }

  async function startCamera() {
    const randomGesture =
      gestureNames[
        Math.floor(Math.random() * gestureNames.length)
      ];

    targetGestureRef.current = randomGesture;
    setTargetGesture(randomGesture);

    setError("");
    setPhoto(null);
    setAnalyzing(false);
    setCheckingLocation(false);
    setCaptureInformation(null);
    setOpeningCamera(true);

    if (!navigator.mediaDevices?.getUserMedia) {
      setError(
        "이 브라우저에서는 실시간 카메라 기능을 지원하지 않습니다."
      );

      setOpeningCamera(false);
      return;
    }

    stopCamera();

    try {
      /*
        인식 모델과 카메라를 동시에 준비해
        전체 대기시간을 줄입니다.
      */
      const modelPromise = initializeGestureRecognizer();
      const landmarkModelPromise = cvReadyPromise;

      const cameraPromise =
        navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: {
              ideal: "environment",
            },
            width: {
              ideal: 1280,
            },
            height: {
              ideal: 720,
            },
          },
          audio: false,
        });

      const [, , stream] = await Promise.all([
        modelPromise,
        landmarkModelPromise,
        cameraPromise,
      ]);

      streamRef.current = stream;
      setCameraOpen(true);
    } catch (cameraError) {
      console.error(cameraError);

      streamRef.current?.getTracks().forEach((track) => {
        track.stop();
      });

      streamRef.current = null;

      setError(
        "카메라 또는 엄지척 인식 기능을 실행하지 못했습니다. 권한을 확인한 뒤 다시 시도해주세요."
      );
    } finally {
      setOpeningCamera(false);
    }
  }

  function retryCapture() {
    setError("");
    setPhoto(null);
    setAnalyzing(false);
    setCheckingLocation(false);

    thumbDetectedRef.current = false;
    thumbStableSinceRef.current = null;

    setThumbDetected(false);
  }

  async function takePhoto() {
    if (checkingLocation) {
      return;
    }

    if (!thumbDetectedRef.current) {
      const requiredGesture =
        gestureOptions[targetGestureRef.current];

      setError(
        `${requiredGesture.name} 포즈가 확인되지 않았습니다. ${requiredGesture.instruction}`
      );
      return;
    }

    const video = videoRef.current;

    if (
      !video ||
      video.videoWidth === 0 ||
      video.videoHeight === 0
    ) {
      setError(
        "카메라 영상이 아직 준비되지 않았습니다. 잠시 후 다시 촬영해주세요."
      );
      return;
    }

    setError("");
    onProcessingChange(true);
    setCheckingLocation(true);

    /*
      엄지척이 확인된 순간 사진을 먼저 촬영합니다.
      이후 GPS 확인 중에는 자세를 유지할 필요가 없습니다.
    */
    const canvas = document.createElement("canvas");

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const context = canvas.getContext("2d");

    if (!context) {
      setCheckingLocation(false);
      onProcessingChange(false);
      setError("촬영한 사진을 처리하지 못했습니다.");
      return;
    }

    context.drawImage(
      video,
      0,
      0,
      canvas.width,
      canvas.height
    );

    try {
      /*
        사진을 찍은 뒤 촬영 순간의 GPS를 확인합니다.
      */
      const position = await getCurrentLocation();

      const currentLatitude = position.coords.latitude;
      const currentLongitude = position.coords.longitude;
      const currentAccuracy = position.coords.accuracy;

      const currentDistance = calculateDistance(
        currentLatitude,
        currentLongitude,
        landmarkLatitude,
        landmarkLongitude
      );

      /*
        GPS 인증 반경 밖이면 스탬프 발급을 중단합니다.
        엄지척 감지는 다시 시작됩니다.
      */
      if (currentDistance > allowedRadius) {
        setCheckingLocation(false);

        setError(
          `인증 실패: 현재 위치가 ${landmarkName} 인증 범위를 벗어났습니다. 인증 지점에서 약 ${Math.round(
            currentDistance
          )}m 떨어져 있습니다.`
        );

        return;
      }

      const capturedAt = new Date().toLocaleString("ko-KR");

      setCaptureInformation({
        latitude: currentLatitude,
        longitude: currentLongitude,
        accuracy: currentAccuracy,
        distance: currentDistance,
        capturedAt,
      });

      setPhoto(canvas.toDataURL("image/jpeg", 0.9));
      setAnalyzing(true);
      setCheckingLocation(false);
      stopCamera();

      const landmarkResult = await recognizeLandmark(
        canvas,
        recognitionKey
      );

      if (!landmarkResult.passed) {
        setAnalyzing(false);
        setPhoto(null);
        onProcessingChange(false);
        setError(
          `랜드마크가 충분히 인식되지 않았습니다. 가이드라인 안에 ${landmarkName}이 크게 보이도록 다시 촬영해주세요. (특징점 ${landmarkResult.goodMatches}개 · 일치율 ${landmarkResult.matchRatio.toFixed(1)}%)`
        );
        return;
      }

      const informationHeight = Math.max(
        100,
        Math.round(canvas.height * 0.13)
      );

      context.fillStyle = "rgba(0, 0, 0, 0.72)";

      context.fillRect(
        0,
        canvas.height - informationHeight,
        canvas.width,
        informationHeight
      );

      const titleFontSize = Math.max(
        18,
        Math.round(canvas.width * 0.027)
      );

      const detailFontSize = Math.max(
        14,
        titleFontSize - 5
      );

      context.fillStyle = "white";
      context.font = `bold ${titleFontSize}px sans-serif`;

      context.fillText(
        landmarkName,
        20,
        canvas.height - informationHeight + titleFontSize + 10
      );

      context.font = `${detailFontSize}px sans-serif`;

      context.fillText(
        `${capturedAt} · 손 포즈 확인 · 인증 지점에서 약 ${Math.round(
          currentDistance
        )}m`,
        20,
        canvas.height - 20
      );

      const capturedPhoto = canvas.toDataURL(
        "image/jpeg",
        0.9
      );

      setPhoto(capturedPhoto);
      onVerified();
    } catch (locationError) {
      console.error(locationError);

      setCheckingLocation(false);
      setAnalyzing(false);
      onProcessingChange(false);

      const gpsError =
        locationError as GeolocationPositionError;

      if (gpsError.code === 1) {
        setError(
          "GPS 오류 1: 브라우저에서 위치 사용이 거부되었습니다."
        );
        return;
      }

      if (gpsError.code === 2) {
        setError(
          "GPS 오류 2: 현재 위치 정보를 수신하지 못했습니다."
        );
        return;
      }

      if (gpsError.code === 3) {
        setError(
          "GPS 오류 3: 위치 확인 시간이 초과되었습니다."
        );
        return;
      }

      setError("촬영 순간의 위치를 확인하지 못했습니다.");
    }
  }

  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((track) => {
        track.stop();
      });

      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
      }

      gestureRecognizerRef.current?.close();
    };
  }, []);

  return (
    <section style={styles.section}>
      {!cameraOpen && !photo && (
        <button
          type="button"
          style={{
            ...styles.cameraButton,
            opacity: openingCamera ? 0.65 : 1,
          }}
          onClick={startCamera}
          disabled={openingCamera}
        >
          {openingCamera
            ? "카메라와 인식 모델 준비 중..."
            : "카메라 실행하기"}
        </button>
      )}

      {cameraOpen && (
        <div style={styles.cameraContainer}>
          <video
            ref={videoRef}
            autoPlay
            muted
            playsInline
            style={styles.video}
          />

          <div style={styles.guideText}>
            <strong>촬영 가이드</strong>

            <p style={styles.guideParagraph}>
              {landmarkGuide}
            </p>

            <p style={styles.guideParagraph}>{poseGuide}</p>
          </div>

          <div
            style={styles.landmarkFrame}
          >
            <span style={styles.frameText}>
              {landmarkName}을 이 안에 맞춰주세요
            </span>
          </div>

          <div
            style={{
              ...styles.handGuideFrame,
              borderColor: thumbDetected ? "#35e789" : "white",
            }}
          >
            <span style={styles.handGuideIcon}>
              {targetGestureInformation.icon}
            </span>

            <small>
              {thumbDetected ? "포즈 확인" : "손을 여기에"}
            </small>
          </div>

          <div
            style={{
              ...styles.gestureStatus,
              backgroundColor:
                thumbDetected || checkingLocation
                  ? "rgba(16, 126, 72, 0.9)"
                  : "rgba(0, 0, 0, 0.7)",
            }}
          >
            <span style={styles.thumbIcon}>
              {targetGestureInformation.icon}
            </span>

            <span>
              {checkingLocation
                ? `${targetGestureInformation.name} 확인 완료`
                : !modelReady
                  ? "인식 모델 준비 중"
                  : thumbDetected
                    ? `${targetGestureInformation.name} 인식 성공`
                    : targetGestureInformation.instruction}
            </span>
          </div>

          <button
            type="button"
            style={{
              ...styles.captureButton,
              opacity:
                thumbDetected && !checkingLocation ? 1 : 0.55,
            }}
            onClick={takePhoto}
            disabled={!thumbDetected || checkingLocation}
          >
            {checkingLocation
              ? "GPS"
              : thumbDetected
                ? "촬영"
                : "대기"}
          </button>

          {checkingLocation && (
            <div style={styles.locationChecking}>
              위치 확인 중 · 자세를 풀어도 됩니다.
            </div>
          )}

          {error && (
            <div style={styles.failureOverlay}>
              <div style={styles.failureMessage}>
                <span style={styles.failureIcon}>❌</span>

                <strong>인증에 실패했습니다.</strong>

                <p>{error}</p>

                <button
                  type="button"
                  style={styles.overlayRetryButton}
                  onClick={retryCapture}
                >
                  다시 촬영하기
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {photo && analyzing && (
        <div style={styles.resultContainer}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={photo}
            alt="손 포즈와 GPS 정보가 포함된 인증 사진"
            style={styles.photo}
          />

          {captureInformation && (
            <div style={styles.captureInformation}>
              <strong>인증 정보</strong>

              <p style={styles.informationText}>
                {targetGestureInformation.name} 포즈: 확인 완료
                <br />
                촬영 시각: {captureInformation.capturedAt}
                <br />
                GPS 오차: 약{" "}
                {Math.round(captureInformation.accuracy)}m
                <br />
                인증 지점까지 거리: 약{" "}
                {Math.round(captureInformation.distance)}m
              </p>
            </div>
          )}

          <div style={styles.analyzingBox}>
            <div style={styles.spinner}>⏳</div>

            <strong>랜드마크를 확인하고 있습니다.</strong>

            <p style={styles.resultMessage}>
              손 포즈와 GPS 인증은 완료되었습니다.
            </p>
          </div>
        </div>
      )}

      {error && !cameraOpen && (
        <div style={styles.errorContainer}>
          <p style={styles.error}>❌ {error}</p>

          <button
            type="button"
            style={styles.retryButton}
            onClick={retryCapture}
          >
            다시 촬영하기
          </button>
        </div>
      )}
    </section>
  );
}

const styles: Record<string, React.CSSProperties> = {
  section: {
    width: "100%",
    marginTop: "16px",
  },

  cameraButton: {
    width: "100%",
    minHeight: "52px",
    padding: "14px",
    border: "none",
    borderRadius: "14px",
    background: "linear-gradient(135deg, #23445d, #315f78)",
    color: "white",
    fontSize: "16px",
    fontWeight: 700,
    cursor: "pointer",
  },

  cameraContainer: {
    position: "relative",
    width: "100%",
    height: "520px",
    overflow: "hidden",
    borderRadius: "18px",
    backgroundColor: "#111",
  },

  video: {
    width: "100%",
    height: "100%",
    display: "block",
    objectFit: "cover",
    backgroundColor: "#111",
  },

  guideText: {
    position: "absolute",
    top: "12px",
    left: "12px",
    right: "12px",
    zIndex: 3,
    padding: "12px",
    color: "white",
    backgroundColor: "rgba(0, 0, 0, 0.65)",
    borderRadius: "12px",
    fontSize: "13px",
    lineHeight: 1.4,
  },

  guideParagraph: {
    margin: "6px 0 0",
  },

  landmarkFrame: {
    position: "absolute",
    top: "128px",
    left: "6%",
    width: "88%",
    height: "205px",
    zIndex: 2,
    boxSizing: "border-box",
    border: "3px dashed white",
    borderRadius: "18px",
    display: "flex",
    justifyContent: "center",
    alignItems: "flex-start",
    pointerEvents: "none",
  },

  frameText: {
    marginTop: "10px",
    padding: "6px 10px",
    color: "white",
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    borderRadius: "999px",
    fontSize: "12px",
    fontWeight: 700,
  },

  handGuideFrame: {
    position: "absolute",
    right: "16px",
    bottom: "108px",
    zIndex: 4,
    width: "88px",
    height: "88px",
    border: "3px dashed white",
    borderRadius: "18px",
    backgroundColor: "rgba(0, 0, 0, 0.3)",
    color: "white",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: "2px",
    fontWeight: 800,
    pointerEvents: "none",
  },

  handGuideIcon: {
    fontSize: "30px",
  },

  gestureStatus: {
    position: "absolute",
    left: "14px",
    right: "116px",
    bottom: "112px",
    zIndex: 3,
    padding: "10px 12px",
    borderRadius: "12px",
    color: "white",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px",
    fontSize: "13px",
    fontWeight: 700,
    pointerEvents: "none",
  },

  thumbIcon: {
    fontSize: "22px",
  },

  captureButton: {
    position: "absolute",
    bottom: "22px",
    left: "50%",
    zIndex: 4,
    width: "74px",
    height: "74px",
    border: "7px solid rgba(255, 255, 255, 0.75)",
    borderRadius: "50%",
    backgroundColor: "white",
    color: "#222",
    fontWeight: 800,
    transform: "translateX(-50%)",
    cursor: "pointer",
  },

  locationChecking: {
    position: "absolute",
    top: "50%",
    left: "50%",
    zIndex: 10,
    width: "calc(100% - 48px)",
    padding: "18px 16px",
    color: "white",
    backgroundColor: "rgba(0, 0, 0, 0.78)",
    border: "1px solid rgba(255, 255, 255, 0.25)",
    borderRadius: "16px",
    fontSize: "16px",
    fontWeight: 800,
    lineHeight: 1.5,
    textAlign: "center",
    transform: "translate(-50%, -50%)",
    boxShadow: "0 8px 24px rgba(0, 0, 0, 0.3)",
    pointerEvents: "none",
  },

  resultContainer: {
    width: "100%",
  },

  photo: {
    width: "100%",
    display: "block",
    borderRadius: "16px",
  },

  captureInformation: {
    marginTop: "12px",
    padding: "14px",
    backgroundColor: "#f3f5f4",
    borderRadius: "14px",
    fontSize: "13px",
    lineHeight: 1.6,
  },

  informationText: {
    margin: "7px 0 0",
  },

  analyzingBox: {
    marginTop: "14px",
    padding: "18px",
    backgroundColor: "#eef5f1",
    borderRadius: "14px",
    textAlign: "center",
  },

  spinner: {
    marginBottom: "8px",
    fontSize: "28px",
  },

  resultMessage: {
    margin: "8px 0 0",
    color: "#666",
  },
  failureOverlay: {
    position: "absolute",
    inset: 0,
    zIndex: 20,
    padding: "24px",
    backgroundColor: "rgba(100, 0, 0, 0.68)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },

  failureMessage: {
    width: "100%",
    padding: "22px 18px",
    border: "1px solid rgba(255, 255, 255, 0.4)",
    borderRadius: "18px",
    backgroundColor: "rgba(145, 25, 25, 0.94)",
    color: "white",
    textAlign: "center",
    lineHeight: 1.6,
  },

  failureIcon: {
    display: "block",
    marginBottom: "8px",
    fontSize: "32px",
  },

  overlayRetryButton: {
    width: "100%",
    minHeight: "50px",
    marginTop: "12px",
    padding: "13px",
    border: "none",
    borderRadius: "14px",
    backgroundColor: "white",
    color: "#a71919",
    fontSize: "15px",
    fontWeight: 800,
    cursor: "pointer",
  },

  errorContainer: {
    marginTop: "12px",
  },

  error: {
    margin: 0,
    padding: "12px",
    color: "#a71919",
    backgroundColor: "#ffeaea",
    borderRadius: "12px",
    lineHeight: 1.6,
  },

  retryButton: {
    width: "100%",
    minHeight: "50px",
    marginTop: "10px",
    padding: "13px",
    border: "none",
    borderRadius: "14px",
    backgroundColor: "#333",
    color: "white",
    fontSize: "15px",
    fontWeight: 700,
    cursor: "pointer",
  },
};