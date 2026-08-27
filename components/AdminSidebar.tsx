"use client";

import Link from "next/link";
import styles from "./AdminSidebar.module.css";

export default function AdminSidebar() {
  return (
    <aside className={styles.sidebar}>
      <Link href="/admin" className={styles.logo}>
        <span className={styles.logoMark}>L</span>
        <span>LOQEST Admin</span>
      </Link>

      <p className={styles.menuTitle}>운영 메뉴</p>

      <nav className={styles.menu} aria-label="관리자 운영 메뉴">
        <Link href="/admin" className={styles.activeMenu}>
          투어 목록
        </Link>
      </nav>
    </aside>
  );
}