// Keep these keys unchanged so existing saved stamps and badges remain readable.
export const COMPLETED_TEST_LANDMARKS_KEY = "loqestCompletedTestLandmarks";

export function getTourProgressKeys(tourId: string) {
  return {
    completedLandmarksKey: `loqestCompletedLandmarks:${tourId}`,
    badgeDateKey: `loqestAmsaBadgeEarnedAt:${tourId}`,
    badgeSeenKey: `loqestBadgeSeen:${tourId}`,
  };
}

export function validStampIds(value: unknown, validIds: string[]): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter(
    (id): id is string => typeof id === "string" && validIds.includes(id)
  );
}
