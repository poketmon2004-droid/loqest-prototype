"use client";

import { useEffect, useRef, useState } from "react";

type CameraCaptureProps = {
  landmarkGuide: string;
  poseGuide: string;
  onVerified: () => void;
};

export default function CameraCapture({
  landmarkGuide,
  poseGuide,
  onVerified,
}: CameraCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [cameraOpen, setCameraOpen] = useState(false);
  const [photo, setPhoto] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState("");

  /*
    카메라 화면이 생성된 다음,
    MediaStream을 video 태그에 연결합니다.
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

    if (!navigator.mediaDevices?.getUserMedia) {
      setError("이 브라우저에서는 카메라 기능을 지원하지 않습니다.");
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

  function takePhoto() {
    const video = videoRef.current;

    if (!video || video.videoWidth === 0 || video.videoHeight === 0) {
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

    const capturedPhoto = canvas.toDataURL("image/jpeg", 0.9);

    setPhoto(capturedPhoto);
    setAnalyzing(true);
    stopCamera();

    /*
      현재는 프로토타입이므로
      실제 AI 인식 대신 2초 후 인증 성공으로 처리합니다.
    */
    timerRef.current = setTimeout(() => {
      onVerified();
    }, 2000);
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
            <p>{landmarkGuide}</p>
            <p>{poseGuide}</p>
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
            style={styles.captureButton}
            onClick={takePhoto}
          >
            촬영
          </button>
        </div>
      )}

      {photo && analyzing && (
        <div style={styles.resultContainer}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={photo}
            alt="실시간으로 촬영한 인증 사진"
            style={styles.photo}
          />

          <div style={styles.analyzingBox}>
            <div style={styles.spinner}>⏳</div>
            <strong>랜드마크를 확인하고 있습니다.</strong>
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

  resultContainer: {
    width: "100%",
  },

  photo: {
    width: "100%",
    display: "block",
    borderRadius: "16px",
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
  },
};