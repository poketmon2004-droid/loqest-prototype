"use client";

import { useEffect, useRef, useState } from "react";

type CameraCaptureProps = {
  landmarkGuide: string;
  poseGuide: string;
  onStampIssued: () => void;
};

export default function CameraCapture({
  landmarkGuide,
  poseGuide,
  onStampIssued,
}: CameraCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [cameraOpen, setCameraOpen] = useState(false);
  const [photo, setPhoto] = useState<string | null>(null);
  const [error, setError] = useState("");

  const [analysisStatus, setAnalysisStatus] = useState<
    "idle" | "analyzing" | "success" | "failure"
  >("idle");

  function stopCamera() {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setCameraOpen(false);
  }

  async function startCamera() {
    setError("");
    setPhoto(null);
    setAnalysisStatus("idle");

    if (!navigator.mediaDevices?.getUserMedia) {
      setError("이 브라우저에서는 카메라를 사용할 수 없습니다.");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: {
            ideal: "environment",
          },
        },
        audio: false,
      });

      streamRef.current = stream;
      setCameraOpen(true);
    } catch (cameraError) {
      console.error(cameraError);
      setError("카메라 권한을 허용해주세요.");
    }
  }

  function takePhoto() {
    const video = videoRef.current;

    if (!video || video.videoWidth === 0) {
      setError("카메라 화면을 불러오는 중입니다.");
      return;
    }

    const canvas = document.createElement("canvas");

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const context = canvas.getContext("2d");

    if (!context) {
      setError("사진을 촬영할 수 없습니다.");
      return;
    }

    context.drawImage(video, 0, 0);

    const capturedPhoto = canvas.toDataURL("image/jpeg", 0.9);

    setPhoto(capturedPhoto);
    stopCamera();
    setAnalysisStatus("analyzing");

    // 현재 프로토타입에서는 2초 후 인식 성공으로 처리
    setTimeout(() => {
      setAnalysisStatus("success");
      onStampIssued();
    }, 2000);
  }

  useEffect(() => {
    if (
      cameraOpen &&
      videoRef.current &&
      streamRef.current
    ) {
      videoRef.current.srcObject = streamRef.current;

      videoRef.current.play().catch((playError) => {
        console.error(playError);
        setError("카메라 영상을 재생할 수 없습니다.");
      });
    }
  }, [cameraOpen]);

  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  return (
    <section>
      {!cameraOpen && !photo && (
        <button onClick={startCamera}>
          카메라 실행하기
        </button>
      )}

      {cameraOpen && (
        <div
          style={{
            position: "relative",
            width: "100%",
            maxWidth: "480px",
            overflow: "hidden",
            backgroundColor: "black",
          }}
        >
          <video
            ref={videoRef}
            autoPlay
            muted
            playsInline
            style={{
              width: "100%",
              minHeight: "400px",
              display: "block",
              objectFit: "cover",
            }}
          />

          {/* 촬영 안내 문구 */}
          <div
            style={{
              position: "absolute",
              top: "10px",
              left: "10px",
              right: "10px",
              padding: "10px",
              color: "white",
              backgroundColor: "rgba(0, 0, 0, 0.65)",
              fontSize: "13px",
              zIndex: 3,
            }}
          >
            <p>📍 {landmarkGuide}</p>
            <p>🙋 {poseGuide}</p>
          </div>

          {/* 랜드마크 촬영 프레임 */}
          <div
            style={{
              position: "absolute",
              top: "28%",
              left: "6%",
              width: "60%",
              height: "42%",
              border: "3px dashed #ffeb3b",
              borderRadius: "12px",
              zIndex: 2,
            }}
          >
            <span
              style={{
                position: "absolute",
                top: "-25px",
                left: "0",
                color: "#ffeb3b",
                fontSize: "12px",
                fontWeight: "bold",
              }}
            >
              랜드마크 위치
            </span>
          </div>

          {/* 사람 포즈 가이드 */}
          <div
            style={{
              position: "absolute",
              top: "34%",
              right: "5%",
              width: "80px",
              height: "180px",
              zIndex: 2,
            }}
          >
            <span
              style={{
                position: "absolute",
                top: "-24px",
                color: "#00ffcc",
                fontSize: "12px",
                fontWeight: "bold",
              }}
            >
              사람 위치
            </span>

            {/* 머리 */}
            <div
              style={{
                position: "absolute",
                top: "0",
                left: "25px",
                width: "30px",
                height: "30px",
                border: "3px solid #00ffcc",
                borderRadius: "50%",
              }}
            />

            {/* 몸 */}
            <div
              style={{
                position: "absolute",
                top: "33px",
                left: "39px",
                width: "3px",
                height: "75px",
                backgroundColor: "#00ffcc",
              }}
            />

            {/* 팔 */}
            <div
              style={{
                position: "absolute",
                top: "48px",
                left: "5px",
                width: "70px",
                height: "3px",
                backgroundColor: "#00ffcc",
                transform: "rotate(-15deg)",
              }}
            />

            {/* 왼쪽 다리 */}
            <div
              style={{
                position: "absolute",
                top: "102px",
                left: "23px",
                width: "3px",
                height: "65px",
                backgroundColor: "#00ffcc",
                transform: "rotate(15deg)",
              }}
            />

            {/* 오른쪽 다리 */}
            <div
              style={{
                position: "absolute",
                top: "102px",
                left: "55px",
                width: "3px",
                height: "65px",
                backgroundColor: "#00ffcc",
                transform: "rotate(-15deg)",
              }}
            />
          </div>

          {/* 촬영 버튼 */}
          <button
            onClick={takePhoto}
            style={{
              position: "absolute",
              bottom: "20px",
              left: "50%",
              transform: "translateX(-50%)",
              width: "65px",
              height: "65px",
              borderRadius: "50%",
              border: "5px solid white",
              backgroundColor: "rgba(255, 255, 255, 0.4)",
              fontWeight: "bold",
              cursor: "pointer",
              zIndex: 4,
            }}
          >
            촬영
          </button>
        </div>
      )}

      {photo && (
        <div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={photo}
            alt="실시간으로 촬영한 인증 사진"
            style={{
              width: "100%",
              maxWidth: "480px",
            }}
          />

          {analysisStatus === "analyzing" && (
            <div>
              <h2>사진 분석 중...</h2>
              <p>랜드마크와 포즈를 확인하고 있습니다.</p>
            </div>
          )}

          {analysisStatus === "success" && (
            <div
              style={{
                marginTop: "20px",
                padding: "20px",
                textAlign: "center",
                border: "3px solid green",
                borderRadius: "50%",
              }}
            >
              <h2>강동구</h2>
              <h1>인증 완료</h1>
              <p>디지털 스탬프가 자동 발급되었습니다.</p>
            </div>
          )}

          {analysisStatus === "failure" && (
            <div>
              <p>
                ❌ 랜드마크 또는 포즈를 인식하지 못했습니다.
              </p>

              <button onClick={startCamera}>
                다시 촬영하기
              </button>
            </div>
          )}
        </div>
      )}

      {error && <p>❌ {error}</p>}
    </section>
  );
}