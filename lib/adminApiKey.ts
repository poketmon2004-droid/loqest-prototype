const STORAGE_KEY = "loqest_admin_api_key";

export function getAdminApiKey() {
  if (typeof window === "undefined") return "";

  const saved = sessionStorage.getItem(STORAGE_KEY);
  if (saved) return saved;

  const entered = window.prompt("관리자 API 키를 입력해주세요.")?.trim() ?? "";
  if (entered) sessionStorage.setItem(STORAGE_KEY, entered);
  return entered;
}

export function clearAdminApiKey() {
  if (typeof window !== "undefined") sessionStorage.removeItem(STORAGE_KEY);
}
