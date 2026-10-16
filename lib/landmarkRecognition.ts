import cvReadyPromise from "@techstark/opencv-js";
import type { Mat } from "@techstark/opencv-js";

type OpenCv = typeof import("@techstark/opencv-js");
type LandmarkImage = HTMLImageElement | HTMLCanvasElement;

export type LandmarkComparisonResult = {
  referenceName: string;
  goodMatches: number;
  totalMatches: number;
  matchRatio: number;
};

const MAX_IMAGE_WIDTH = 900;
const MAX_DESCRIPTOR_DISTANCE = 55;

export const landmarkRecognitionReady = cvReadyPromise;

function loadImage(source: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();

    if (source.startsWith("http")) {
      image.crossOrigin = "anonymous";
    }

    image.onload = () => resolve(image);
    image.onerror = () =>
      reject(new Error(`이미지를 불러오지 못했습니다: ${source}`));
    image.src = source;
  });
}

function extractFeatures(cv: OpenCv, image: LandmarkImage): Mat {
  const source = cv.imread(image);
  const resized = new cv.Mat();
  const gray = new cv.Mat();
  const mask = new cv.Mat();
  const keypoints = new cv.KeyPointVector();
  const descriptors = new cv.Mat();
  const orb = new cv.ORB();

  try {
    const scale = Math.min(1, MAX_IMAGE_WIDTH / source.cols);
    const width = Math.round(source.cols * scale);
    const height = Math.round(source.rows * scale);

    cv.resize(
      source,
      resized,
      new cv.Size(width, height),
      0,
      0,
      cv.INTER_AREA,
    );
    cv.cvtColor(resized, gray, cv.COLOR_RGBA2GRAY);
    orb.detectAndCompute(gray, mask, keypoints, descriptors);

    return descriptors.clone();
  } finally {
    source.delete();
    resized.delete();
    gray.delete();
    mask.delete();
    keypoints.delete();
    descriptors.delete();
    orb.delete();
  }
}

function compareDescriptors(
  cv: OpenCv,
  testDescriptors: Mat,
  referenceDescriptors: Mat,
) {
  if (testDescriptors.empty() || referenceDescriptors.empty()) {
    return { goodMatches: 0, totalMatches: 0, matchRatio: 0 };
  }

  const matcher = new cv.BFMatcher(cv.NORM_HAMMING, true);
  const matches = new cv.DMatchVector();

  try {
    matcher.match(testDescriptors, referenceDescriptors, matches);

    let goodMatches = 0;

    for (let index = 0; index < matches.size(); index += 1) {
      if (matches.get(index).distance <= MAX_DESCRIPTOR_DISTANCE) {
        goodMatches += 1;
      }
    }

    const totalMatches = matches.size();

    return {
      goodMatches,
      totalMatches,
      matchRatio:
        totalMatches === 0 ? 0 : (goodMatches / totalMatches) * 100,
    };
  } finally {
    matcher.delete();
    matches.delete();
  }
}

export async function compareLandmarkToReferences(
  testImage: LandmarkImage | string,
  referenceImages: string[],
): Promise<LandmarkComparisonResult[]> {
  const cv: OpenCv = await landmarkRecognitionReady;
  const resolvedTestImage =
    typeof testImage === "string" ? await loadImage(testImage) : testImage;
  const testDescriptors = extractFeatures(cv, resolvedTestImage);

  try {
    const results: LandmarkComparisonResult[] = [];

    for (const referencePath of referenceImages) {
      const referenceImage = await loadImage(referencePath);
      const referenceDescriptors = extractFeatures(cv, referenceImage);

      try {
        results.push({
          referenceName: referencePath.split("/").pop() ?? referencePath,
          ...compareDescriptors(cv, testDescriptors, referenceDescriptors),
        });
      } finally {
        referenceDescriptors.delete();
      }
    }

    return results.sort(
      (first, second) => second.goodMatches - first.goodMatches,
    );
  } finally {
    testDescriptors.delete();
  }
}
