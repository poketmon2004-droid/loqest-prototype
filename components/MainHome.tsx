"use client";

import type { CSSProperties } from "react";
import type { PublicTour } from "../types/tour";

type MainHomeProps = {
  searchQuery: string;
  setSearchQuery: (value: string) => void;
  selectedProvince: string;
  setSelectedProvince: (value: string) => void;
  availableProvinces: string[];
  filteredTours: PublicTour[];
  hasTourSearch: boolean;
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
  hasTourSearch,
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

          <h2 style={styles.destinationHeading}>여행지 목록</h2>

          <input
            type="search"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="여행지명 또는 지역을 검색해보세요"
            aria-label="여행지 검색"
            style={styles.destinationSearch}
          />

          <div style={styles.provinceFilters}>
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
                  }}
                >
                  {province}
                </button>
              );
            })}
          </div>

          {!hasTourSearch ? (
            <div style={styles.emptyDestination}>
              <strong>어디로 떠나볼까요?</strong>
              <p>
                여행지명이나 지역을 검색하면
                이용 가능한 관광지가 표시됩니다.
              </p>
            </div>
          ) : filteredTours.length === 0 ? (
            <div style={styles.emptyDestination}>
              <strong>조건에 맞는 여행지가 없습니다.</strong>
              <p>
                다른 여행지명이나 지역을 검색해주세요.
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
