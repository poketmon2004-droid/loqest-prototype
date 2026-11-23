"use client";

import styles from "./TourEditor.module.css";

type AdminOperationOverlayProps = {
  title: string;
  description?: string;
};

export default function AdminOperationOverlay({
  title,
  description = "잠시만 기다려 주세요.",
}: AdminOperationOverlayProps) {
  return (
    <div className={styles.modalBackdrop} role="dialog" aria-modal="true" aria-label={title} aria-live="polite">
      <div className={styles.modal}>
        <div className={styles.savingSpinner} aria-hidden="true" />
        <h2>{title}</h2>
        <p>{description}</p>
      </div>
    </div>
  );
}
