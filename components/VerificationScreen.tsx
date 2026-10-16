"use client";

import type { CSSProperties } from "react";
import CameraCapture from "./CameraCapture";
import type { PublicTour } from "./MainHome";

type VerificationLandmark = {
  attractionId: number;
  name: string;
  description: string;
  poseGuide: string;
  landmarkGuide: string;
  requiresGps: boolean;
  recognitionKey: string;
  latitude: number;
  longitude: number;
  radius: number;
  referenceImages: string[];
  goodMatchesThreshold: number;
  matchRatioThreshold: number;
};

type Props = {
  selectedLandmark: VerificationLandmark;
  activeTour: PublicTour | null;
  activeTourId: string;
  stampIssued: boolean;
  tourCompleted: boolean;
  verificationProcessing: boolean;
  onProcessingChange: (processing: boolean) => void;
  issueStamp: () => void;
  goToQuestList: () => void;
  goToTestQuestList: () => void;
  goHome: () => void;
  goToTestHome: () => void;
  styles: Record<string, CSSProperties>;
};

export default function VerificationScreen({
  selectedLandmark, activeTour, activeTourId, stampIssued, tourCompleted,
  verificationProcessing, onProcessingChange, issueStamp, goToQuestList,
  goToTestQuestList, goHome, goToTestHome, styles,
}: Props) {
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
                onProcessingChange={onProcessingChange}
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
