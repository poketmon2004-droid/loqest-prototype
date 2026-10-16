export type Landmark = {
  id: string;
  attractionId: number;
  name: string;
  icon: string;
  mission: string;
  recognitionKey: string;
  requiresGps: boolean;
  description: string;
  landmarkGuide: string;
  poseGuide: string;
  latitude: number;
  longitude: number;
  radius: number;
  referenceImages: string[];
  goodMatchesThreshold: number;
  matchRatioThreshold: number;
  mapPosition: {
    x: number;
    y: number;
  };
};

export type PublicAttraction = {
  id: number | string;
  name: string;
  category?: string;
  description?: string;
  latitude?: number | string;
  longitude?: number | string;
  radius?: number | string;
  guideMessage?: string;
  guide_message?: string;
  recognitionKey?: string;
  recognition_key?: string;
  icon?: string;
  mission?: string;
  landmarkThreshold?: number | string;
  landmark_threshold?: number | string;
  referenceImages?: Array<{
    dataUrl?: string;
    url?: string;
  }>;
};

export type PublicTour = {
  id: string;
  name: string;
  short_name?: string;
  province?: string;
  region?: string;
  description?: string;
  badge_name?: string;
  questCount?: number;
};
