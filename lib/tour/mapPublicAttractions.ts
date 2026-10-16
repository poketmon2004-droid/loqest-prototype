import type { Landmark, PublicAttraction } from "../../types/tour";

const fallbackLandmarks: Landmark[] = [
  {
    id: "amsa-inform",
    attractionId: 1,
    name: "선사유적지 안내판",
    icon: "🗺️",
    mission: "유적지 지도를 찾아보세요",
    recognitionKey: "inform",
    requiresGps: true,
    description:
      "선사유적지 안내판을 가이드에 맞춰 촬영합니다.",
    poseGuide:
      "1. 화면에 제시된 손동작을 따라 하면 촬영 버튼이 활성화됩니다.",
    landmarkGuide:
      "2. 손을 내리고, 1분 안에 랜드마크를 가이드라인에 맞춰 촬영해 주세요.",
    latitude: 37.559771,
    longitude: 127.130753,
    radius: 250,
    referenceImages: [],
    goodMatchesThreshold: 45,
    matchRatioThreshold: 40,
    mapPosition: { x: 88, y: 108 },
  },
  {
    id: "amsa-character",
    attractionId: 2,
    name: "선사유적지 캐릭터",
    icon: "🎨",
    mission: "움스프렌즈를 찾아보세요",
    recognitionKey: "character",
    requiresGps: true,
    description:
      "움스프렌즈 캐릭터와 함께 인증 사진을 촬영합니다.",
    poseGuide:
      "1. 화면에 제시된 손동작을 따라 하면 촬영 버튼이 활성화됩니다.",
    landmarkGuide:
      "2. 손을 내리고, 1분 안에 랜드마크를 가이드라인에 맞춰 촬영해 주세요.",
    latitude: 37.559771,
    longitude: 127.130753,
    radius: 250,
    referenceImages: [],
    goodMatchesThreshold: 45,
    matchRatioThreshold: 45,
    mapPosition: { x: 264, y: 250 },
  },
  {
    id: "amsa-wish",
    attractionId: 3,
    name: "소망움집",
    icon: "🛖",
    mission: "소망움집을 정면에서 담아보세요",
    recognitionKey: "wish",
    requiresGps: true,
    description:
      "소망움집을 정면 가이드에 맞춰 촬영합니다.",
    poseGuide:
      "1. 화면에 제시된 손동작을 따라 하면 촬영 버튼이 활성화됩니다.",
    landmarkGuide:
      "2. 손을 내리고, 1분 안에 랜드마크를 가이드라인에 맞춰 촬영해 주세요.",
    latitude: 37.559771,
    longitude: 127.130753,
    radius: 250,
    referenceImages: [],
    goodMatchesThreshold: 45,
    matchRatioThreshold: 45,
    mapPosition: { x: 96, y: 396 },
  },
];

function iconForCategory(category?: string) {
  if (category === "자연·생태") return "🌿";
  if (category === "축제·행사") return "🎉";
  if (category === "체험·레저") return "🎯";
  if (category === "지역상권") return "🛍️";
  if (category === "포토 미션") return "📸";
  return "🏛️";
}

function recognitionKeyForAttraction(attraction: PublicAttraction) {
  const key = attraction.recognitionKey ?? attraction.recognition_key;
  return key || `landmark-${attraction.id}`;
}

export function mapPublicAttractions(items: PublicAttraction[], tourId = "amsa"): Landmark[] {
  const rowCount = Math.max(1, Math.ceil(items.length / 2));
  const verticalGap = rowCount === 1 ? 0 : 330 / (rowCount - 1);

  return items.map((item, index) => {
    const recognitionKey = recognitionKeyForAttraction(item);
    const originalLandmark = fallbackLandmarks.find(
      (landmark) => landmark.recognitionKey === recognitionKey
    );
    const guideMessage =
      item.guideMessage ??
      item.guide_message ??
      "랜드마크를 가이드라인에 맞춰 촬영해 주세요.";
    const referenceImages = (item.referenceImages ?? [])
      .map((image) => image.dataUrl ?? image.url ?? "")
      .filter((source): source is string => Boolean(source));
    const matchRatioThreshold = Number(
      item.landmarkThreshold ?? item.landmark_threshold ?? 30
    );

    return {
      id: `${tourId}-${item.id}`,
      attractionId: Number(item.id),
      name: item.name,
      icon:
        originalLandmark?.icon ||
        item.icon ||
        iconForCategory(item.category),
      mission:
        item.mission || originalLandmark?.mission || guideMessage,
      recognitionKey,
      requiresGps: true,
      description:
        item.description || `${item.name} 인증 사진을 촬영합니다.`,
      poseGuide:
        "1. 화면에 제시된 손동작을 따라 하면 촬영 버튼이 활성화됩니다.",
      landmarkGuide: `2. 손을 내리고, 1분 안에 ${guideMessage}`,
      latitude: Number(item.latitude),
      longitude: Number(item.longitude),
      radius: Number(item.radius ?? 50),
      referenceImages,
      goodMatchesThreshold: 45,
      matchRatioThreshold,
      mapPosition:
        originalLandmark?.mapPosition ??
        {
          x: index % 2 === 0 ? 88 : 264,
          y: 90 + Math.floor(index / 2) * verticalGap,
        },
    };
  });
}

