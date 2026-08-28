const TEMPORARY_ADMIN_KEY = "temporary-admin-access";

export function getAdminApiKey() {
  return TEMPORARY_ADMIN_KEY;
}

export function clearAdminApiKey() {
  // 임시 공개 운영 중에는 키를 제거하지 않습니다.
}