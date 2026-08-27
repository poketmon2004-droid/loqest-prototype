"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { clearAdminApiKey, getAdminApiKey } from "@/lib/adminApiKey";
import styles from "./TourSelector.module.css";

type Tour = {
  id: string;
  name: string;
  region: string;
};

type Mode = "tours" | "dashboard" | "quests" | "participants";

export default function TourSelector(_props: { mode?: Mode }) {
  const [tours, setTours] = useState<Tour[]>([]);
  const [search, setSearch] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    async function loadTours() {
      try {
        const adminKey = getAdminApiKey();

        if (!adminKey) {
          throw new Error("관리자 API 키를 확인해주세요.");
        }

        const response = await fetch("/api/tours?includeHidden=true", {
          headers: {
            "x-admin-api-key": adminKey,
          },
          cache: "no-store",
        });

        if (response.status === 401) {
          clearAdminApiKey();
          throw new Error(
            "관리자 API 키가 올바르지 않습니다. 새로고침 후 다시 입력해주세요.",
          );
        }

        const result = (await response.json()) as {
          tours?: Tour[];
          message?: string;
        };

        if (!response.ok || !Array.isArray(result.tours)) {
          throw new Error(
            result.message || "투어 목록을 불러오지 못했습니다.",
          );
        }

        setTours(result.tours);
      } catch (error) {
        setErrorMessage(
          error instanceof Error
            ? error.message
            : "투어 목록을 불러오지 못했습니다.",
        );
      } finally {
        setLoaded(true);
      }
    }

    void loadTours();
  }, []);

  const filteredTours = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    if (!keyword) {
      return tours;
    }

    return tours.filter((tour) =>
      `${tour.name} ${tour.region}`.toLowerCase().includes(keyword),
    );
  }, [tours, search]);

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <div>
          <p>LOQEST Admin</p>
          <h1>투어 목록</h1>
          <span>관리할 투어를 선택해주세요.</span>
        </div>

        <Link href="/admin/tours/new" className={styles.addButton}>
          + 새 투어 등록
        </Link>
      </header>

      <section className={styles.card}>
        <div className={styles.controls}>
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="투어명 또는 지역 검색"
            aria-label="투어 검색"
          />
        </div>

        {errorMessage ? (
          <div className={styles.empty}>
            <strong>불러오지 못했습니다.</strong>
            <p>{errorMessage}</p>
          </div>
        ) : !loaded ? (
          <div className={styles.empty}>
            <p>투어 목록을 불러오는 중입니다.</p>
          </div>
        ) : filteredTours.length === 0 ? (
          <div className={styles.empty}>
            <strong>조건에 맞는 투어가 없습니다.</strong>
            <p>다른 투어명이나 지역을 검색해주세요.</p>
          </div>
        ) : (
          <div className={styles.tableWrapper}>
            <table>
              <thead>
                <tr>
                  <th>투어명</th>
                  <th>지역</th>
                  <th>관리</th>
                </tr>
              </thead>

              <tbody>
                {filteredTours.map((tour) => (
                  <tr key={tour.id}>
                    <td>
                      <strong>{tour.name}</strong>
                    </td>

                    <td>{tour.region || "미입력"}</td>

                    <td>
                      <Link
                        href={`/admin/tours/${tour.id}`}
                        className={styles.selectButton}
                        onClick={() =>
                          localStorage.setItem(
                            "loqest_active_tour_id",
                            tour.id,
                          )
                        }
                      >
                        관리하기
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}