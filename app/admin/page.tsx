"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import styles from "./AdminHome.module.css";

type Attraction = {
    id: number;
    status: string;
};

type RecognitionTestRecord = {
    lastResult: "통과" | "실패";
};

const defaultAttractions: Attraction[] = [
    { id: 1, status: "공개" },
    { id: 2, status: "공개" },
    { id: 3, status: "공개" },
];

export default function AdminHomePage() {
    const [totalAttractions, setTotalAttractions] = useState(0);
    const [publicAttractions, setPublicAttractions] = useState(0);
    const [passedAttractions, setPassedAttractions] = useState(0);
    const [loaded, setLoaded] = useState(false);

    useEffect(() => {
        try {
            const storedAttractions = JSON.parse(
                localStorage.getItem("loqest_attractions") || "[]"
            ) as Attraction[];
            const attractionEdits = JSON.parse(
                localStorage.getItem("loqest_attraction_edits") || "{}"
            ) as Record<string, Partial<Attraction>>;
            const savedStatuses = JSON.parse(
                localStorage.getItem("loqest_attraction_statuses") || "{}"
            ) as Record<string, string>;
            const deletedIds = JSON.parse(
                localStorage.getItem("loqest_deleted_attraction_ids") || "[]"
            ) as number[];
            const testRecords = JSON.parse(
                localStorage.getItem("loqest_recognition_test_records") || "{}"
            ) as Record<string, RecognitionTestRecord>;

            const attractions = [...defaultAttractions, ...storedAttractions]
                .filter((attraction) => !deletedIds.includes(attraction.id))
                .map((attraction) => {
                    const edited = {
                        ...attraction,
                        ...(attractionEdits[String(attraction.id)] ?? {}),
                    };

                    return {
                        ...edited,
                        status:
                            savedStatuses[String(attraction.id)] ??
                            edited.status,
                    };
                });

            setTotalAttractions(attractions.length);
            setPublicAttractions(
                attractions.filter((attraction) => attraction.status === "공개").length
            );
            setPassedAttractions(
                attractions.filter(
                    (attraction) =>
                        testRecords[String(attraction.id)]?.lastResult === "통과"
                ).length
            );
        } catch (error) {
            console.error("관리자 홈 데이터를 불러오지 못했습니다.", error);
        } finally {
            setLoaded(true);
        }
    }, []);

    return (
        <div className={styles.page}>
            <aside className={styles.sidebar}>
                <div className={styles.logo}>
                    <span className={styles.logoMark}>L</span>
                    <span>LOQEST Admin</span>
                </div>

                <p className={styles.menuTitle}>운영 메뉴</p>
                <nav className={styles.menu}>
                    <Link
                        href="/admin"
                        className={styles.activeMenu}
                    >
                        투어 목록
                    </Link>
                </nav>
            </aside>

            <main className={styles.main}>
                <header className={styles.header}>
                    <div>
                        <p className={styles.eyebrow}>LOQEST 운영 관리</p>
                        <h1>투어 목록</h1>
                        <p>관리할 투어를 선택하면 운영 대시보드로 이동합니다.</p>
                    </div>
                </header>

                <section className={styles.summary}>
                    <article>
                        <span>전체 투어 지역</span>
                        <strong>1곳</strong>
                    </article>
                    <article>
                        <span>전체 퀘스트 수</span>
                        <strong>{loaded ? `${totalAttractions}개` : "-"}</strong>
                    </article>
                    <article>
                        <span>공개된 퀘스트 수</span>
                        <strong>{loaded ? `${publicAttractions}개` : "-"}</strong>
                    </article>
                </section>

                <section className={styles.listSection}>
                    <div className={styles.sectionHeader}>
                        <div>
                            <h2>운영 중인 투어</h2>
                            <p>현재 등록된 실제 투어만 표시됩니다.</p>
                        </div>
                        <span>1개 투어</span>
                    </div>

                    <article className={styles.tourCard}>
                        <div className={styles.cardTop}>
                            <div className={styles.thumbnail}>암사</div>
                            <div>
                                <div className={styles.badges}>
                                    <span className={styles.publicBadge}>운영 중</span>
                                    <span className={styles.regionBadge}>서울 강동구</span>
                                </div>
                                <h3>암사동 선사유적지 투어</h3>
                                <p>
                                    선사유적지의 주요 미션 장소을 탐험하는 랜드마크 투어입니다.
                                </p>
                            </div>
                        </div>

                        <div className={styles.cardStats}>
                            <div>
                                <span>전체 관광지</span>
                                <strong>{loaded ? `${totalAttractions}곳` : "-"}</strong>
                            </div>
                            <div>
                                <span>공개 중</span>
                                <strong>{loaded ? `${publicAttractions}곳` : "-"}</strong>
                            </div>
                            <div>
                                <span>테스트 통과</span>
                                <strong>{loaded ? `${passedAttractions}곳` : "-"}</strong>
                            </div>
                            <div>
                                <span>관광객 데이터</span>
                                <strong>-</strong>
                            </div>
                        </div>

                        <div className={styles.cardActions}>
                            <Link href="/admin/tours/amsa" className={styles.primaryButton}>
                                대시보드 열기
                            </Link>
                            <Link href="/admin/attractions" className={styles.secondaryButton}>
                                관광지 관리
                            </Link>
                        </div>
                    </article>
                </section>
            </main>
        </div>
    );
}