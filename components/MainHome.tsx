"use client";

import type { CSSProperties } from "react";

export type PublicTour = {
  id: string;
  name: string;
  short_name?: string;
  province?: string;
  region?: string;
  description?: string;
  badge_name?: string;
  questCount?: number;
};

type MainHomeProps = {
  searchQuery: string;
  setSearchQuery: (value: string) => void;
  selectedProvince: string;
  setSelectedProvince: (value: string) => void;
  availableProvinces: string[];
  filteredTours: PublicTour[];
  hasUnreadBadge: boolean;
  enterTour: (tour: PublicTour) => void;
  goToTestHome: () => void;
  goToBadges: () => void;
  goToGuide: () => void;
  styles: Record<string, CSSProperties>;
};

export default function MainHome({
  searchQuery,
  setSearchQuery,
  selectedProvince,
  setSelectedProvince,
  availableProvinces,
  filteredTours,
  hasUnreadBadge,
  enterTour,
  goToTestHome,
  goToBadges,
  goToGuide,
  styles,
}: MainHomeProps) {
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

          {/* 검색과 지역 필터를 하나의 카드로 묶어 화면 구역을 명확히 구분합니다. */}
          <section
            aria-label="여행지 찾기"
            style={{
              padding: "19px 17px 17px",
              marginBottom: "20px",
              background: "linear-gradient(145deg, #f4fafb, #eef7f8)",
              border: "1px solid #d5e4e7",
              borderRadius: "20px",
            }}
          >
            <h2 style={{
              margin: "0 0 17px",
              color: "#23445d",
              fontSize: "21px",
              fontWeight: 800,
              letterSpacing: "-0.025em",
            }}>여행지 찾기</h2>

            <div style={{
              display: "flex",
              alignItems: "center",
              gap: "11px",
              padding: "6px 10px 6px 13px",
              background: "#FFFFFF",
              border: "1px solid #d5e4e7",
              borderRadius: "14px",
              marginBottom: "15px",
            }}>
              <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24"
                fill="none" stroke="#4c91a8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                style={{flexShrink: 0}}>
                <circle cx="10.8" cy="10.8" r="6.8" />
                <path d="m16 16 5 5" />
              </svg>
              <input
                type="search"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="여행지 또는 지역 검색"
                aria-label="여행지 검색"
                style={{
                  ...styles.destinationSearch,
                  flex: 1,
                  minWidth: 0,
                  minHeight: "43px",
                  marginBottom: 0,
                  borderRadius: "999px",
                  border: "1px solid #ccdfe4",
                  padding: "10px 16px",
                  background: "#FFFFFF",
                  color: "#23445d",
                }}
              />
            </div>

            <div style={{
              ...styles.provinceFilters,
              marginBottom: 0,
              paddingBottom: "2px",
              gap: "9px",
            }}>
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
                      minHeight: "39px",
                      padding: "8px 16px",
                      borderRadius: "999px",
                      borderColor: active ? "#315f78" : "#cadde2",
                      background: active ? "#315f78" : "#FFFFFF",
                      color: active ? "#FFFFFF" : "#527080",
                    }}
                  >
                    {province}
                  </button>
                );
              })}
            </div>
          </section>

          {filteredTours.length === 0 ? (
            <div style={styles.emptyDestination}>
              <strong>{searchQuery.trim() || selectedProvince !== "전체" ? "조건에 맞는 여행지가 없습니다." : "현재 공개된 여행지가 없습니다."}</strong>
              <p>
                {searchQuery.trim() || selectedProvince !== "전체" ? "다른 여행지명이나 지역을 검색해주세요." : "새로운 투어가 공개되면 여기에 표시됩니다."}
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

          {selectedProvince === "전체" && (
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
          )}

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
