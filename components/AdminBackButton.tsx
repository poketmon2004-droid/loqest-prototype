"use client";

import { useRouter } from "next/navigation";
import styles from "./AdminBackButton.module.css";

type AdminBackButtonProps = {
  href?: string;
};

export default function AdminBackButton({
  href,
}: AdminBackButtonProps) {
  const router = useRouter();

  const goBack = () => {
    if (href) {
      router.push(href);
      return;
    }

    router.back();
  };

  return (
    <button
      type="button"
      className={styles.backButton}
      onClick={goBack}
    >
      <span aria-hidden="true">←</span>
      뒤로가기
    </button>
  );
}