import type { ReactNode } from "react";
import AdminSidebar from "@/components/AdminSidebar";
import styles from "./AdminLayout.module.css";

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <div className={styles.shell}>
      <AdminSidebar />
      <div className={styles.content}>{children}</div>
    </div>
  );
}
