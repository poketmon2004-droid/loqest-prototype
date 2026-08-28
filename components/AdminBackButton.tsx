"use client";

import { useRouter } from "next/navigation";
import styles from "./AdminBackButton.module.css";

export default function AdminBackButton() {
  const router = useRouter();

  return (
    <button
      type="button"
      className={styles.backButton}
      onClick={() => router.back()}
    >
      <span aria-hidden="true">←</span>
      뒤로가기
    </button>
  );
}