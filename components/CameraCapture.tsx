"use client";

import { useEffect, useRef, useState } from "react";

type CameraCaptureProps = {
  landmarkName: string;
  landmarkGuide: string;
  poseGuide: string;
  landmarkLatitude: number;
  landmarkLongitude: number;
  allowedRadius: number;
  onVerified: () => void;
};

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

export default function CameraCapture({
  landmarkName,
  landmarkGuide,
  poseGuide,
  landmarkLatitude,
  landmarkLongitude,
  allowedRadius,
  onVerified,
}: CameraCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [cameraOpen, setCameraOpen] = useState(false);
  const [photo, setPhoto] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [checkingLocation, setCheckingLocation] = useState(false);

  const [captureInformation, setCaptureInformation] =
    useState<CaptureInformation | null>(null);

  const [error, setError] = useState("");

  /*
    카메라 화면이 만들어진 후
    실제 카메라 영상을 video 태그에 연결합니다.
  */
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

  function stopCamera() {
    streamRef.current?.getTracks().forEach((track) => {
      track.stop();
    });

    streamRef.current = null;
    setCameraOpen(false);
  }

  async function startCamera() {
    setError("");
    setPhoto(null);
    setAnalyzing(false);
    setCheckingLocation(false);
    setCaptureInformation(null);

    if (!navigator.mediaDevices?.getUserMedia) {
      setError(
        "이 브라우저에서는 실시간 카메라 기능을 지원하지 않습니다."
      );
      return;
    }

    stopCamera();

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
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

      streamRef.current = stream;
      setCameraOpen(true);
    } catch (cameraError) {
      console.error(cameraError);

      setError(
        "카메라를 실행하지 못했습니다. 브라우저의 카메라 권한을 확인해주세요."
      );
    }
  }

  async function takePhoto() {
    if (checkingLocation) {
      return;
    }

    setError("");
    setCheckingLocation(true);

    try {
      /*
        촬영 버튼을 누른 순간의 위치를 새로 확인합니다.
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
        현재 위치가 인증 반경 밖이면 여기서 중단합니다.
        onVerified 함수도 실행되지 않으므로 스탬프가 발급되지 않습니다.
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

      const video = videoRef.current;

      if (
        !video ||
        video.videoWidth === 0 ||
        video.videoHeight === 0
      ) {
        setCheckingLocation(false);

        setError(
          "카메라 영상이 아직 준비되지 않았습니다. 잠시 후 다시 촬영해주세요."
        );

        return;
      }

      const canvas = document.createElement("canvas");

      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      const context = canvas.getContext("2d");

      if (!context) {
        setCheckingLocation(false);
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

      const capturedAt = new Date().toLocaleString("ko-KR");

      /*
        촬영 사진 아래쪽에 인증 정보를 표시합니다.
      */
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
        `${capturedAt} · 인증 지점에서 약 ${Math.round(
          currentDistance
        )}m`,
        20,
        canvas.height - 20
      );

      const capturedPhoto = canvas.toDataURL(
        "image/jpeg",
        0.9
      );

      setCaptureInformation({
        latitude: currentLatitude,
        longitude: currentLongitude,
        accuracy: currentAccuracy,
        distance: currentDistance,
        capturedAt,
      });

      setPhoto(capturedPhoto);
      setAnalyzing(true);
      setCheckingLocation(false);

      stopCamera();

      /*
        GPS 인증을 통과한 경우에만
        2초 후 사진 인식 성공으로 처리합니다.

        현재 사진 인식은 실제 AI가 아니라 시뮬레이션입니다.
      */
      timerRef.current = setTimeout(() => {
        onVerified();
      }, 2000);
    } catch (locationError) {
      console.error(locationError);

      setCheckingLocation(false);

      setError(
        "촬영 순간의 위치를 확인하지 못했습니다. 휴대폰의 위치 서비스와 브라우저 위치 권한을 확인해주세요."
      );
    }
  }

  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((track) => {
        track.stop();
      });

      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

  return (
    <section style={styles.section}>
      {!cameraOpen && !photo && (
        <button
          type="button"
          style={styles.cameraButton}
          onClick={startCamera}
        >
          카메라 실행하기
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

            <p style={styles.guideParagraph}>
              {poseGuide}
            </p>
          </div>

          <div style={styles.landmarkFrame}>
            <span style={styles.frameText}>
              랜드마크를 이 안에 맞춰주세요
            </span>
          </div>

          <div style={styles.poseGuide}>
            <div style={styles.head} />
            <div style={styles.body} />
            <div style={styles.leftArm} />
            <div style={styles.rightArm} />
            <div style={styles.leftLeg} />
            <div style={styles.rightLeg} />
          </div>

          <button
            type="button"
            style={{
              ...styles.captureButton,
              opacity: checkingLocation ? 0.65 : 1,
            }}
            onClick={takePhoto}
            disabled={checkingLocation}
          >
            {checkingLocation ? "GPS" : "촬영"}
          </button>

          {checkingLocation && (
            <div style={styles.locationChecking}>
              촬영 위치를 확인하고 있습니다.
            </div>
          )}
        </div>
      )}

      {photo && analyzing && (
        <div style={styles.resultContainer}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={photo}
            alt="GPS 정보가 포함된 실시간 인증 사진"
            style={styles.photo}
          />

          {captureInformation && (
            <div style={styles.captureInformation}>
              <strong>촬영 정보</strong>

              <p style={styles.informationText}>
                촬영 시각: {captureInformation.capturedAt}
                <br />
                위도: {captureInformation.latitude.toFixed(6)}
                <br />
                경도: {captureInformation.longitude.toFixed(6)}
                <br />
                GPS 오차 범위: 약{" "}
                {Math.round(captureInformation.accuracy)}m
                <br />
                인증 지점까지 거리: 약{" "}
                {Math.round(captureInformation.distance)}m
              </p>
            </div>
          )}

          <div style={styles.analyzingBox}>
            <div style={styles.spinner}>⏳</div>

            <strong>
              사진과 위치 정보를 확인하고 있습니다.
            </strong>

            <p style={styles.resultMessage}>
              잠시만 기다려주세요.
            </p>
          </div>
        </div>
      )}

      {error && <p style={styles.error}>❌ {error}</p>}
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
    backgroundColor: "#137c4b",
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
    top: "170px",
    left: "8%",
    width: "84%",
    height: "190px",
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
    padding: "5px 9px",
    color: "white",
    backgroundColor: "rgba(0, 0, 0, 0.55)",
    borderRadius: "999px",
    fontSize: "12px",
  },

  poseGuide: {
    position: "absolute",
    right: "34px",
    bottom: "105px",
    width: "75px",
    height: "150px",
    zIndex: 2,
    opacity: 0.85,
    pointerEvents: "none",
  },

  head: {
    position: "absolute",
    top: 0,
    left: "24px",
    width: "24px",
    height: "24px",
    border: "3px solid white",
    borderRadius: "50%",
  },

  body: {
    position: "absolute",
    top: "28px",
    left: "35px",
    width: "3px",
    height: "65px",
    backgroundColor: "white",
  },

  leftArm: {
    position: "absolute",
    top: "42px",
    left: "7px",
    width: "32px",
    height: "3px",
    backgroundColor: "white",
    transform: "rotate(-20deg)",
  },

  rightArm: {
    position: "absolute",
    top: "37px",
    left: "36px",
    width: "40px",
    height: "3px",
    backgroundColor: "white",
    transform: "rotate(-35deg)",
    transformOrigin: "left",
  },

  leftLeg: {
    position: "absolute",
    top: "88px",
    left: "15px",
    width: "32px",
    height: "3px",
    backgroundColor: "white",
    transform: "rotate(-55deg)",
  },

  rightLeg: {
    position: "absolute",
    top: "88px",
    left: "35px",
    width: "38px",
    height: "3px",
    backgroundColor: "white",
    transform: "rotate(55deg)",
    transformOrigin: "left",
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
    right: "12px",
    bottom: "12px",
    zIndex: 4,
    padding: "8px 10px",
    color: "white",
    backgroundColor: "rgba(0, 0, 0, 0.72)",
    borderRadius: "10px",
    fontSize: "12px",
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

  error: {
    marginTop: "12px",
    padding: "12px",
    color: "#a71919",
    backgroundColor: "#ffeaea",
    borderRadius: "12px",
    lineHeight: 1.6,
  },
};