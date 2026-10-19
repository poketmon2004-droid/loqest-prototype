import { compareLandmarkToReferences } from "@/lib/landmarkRecognition";

function cropLandmarkArea(sourceCanvas: HTMLCanvasElement) {
  const croppedCanvas = document.createElement("canvas");
  const cropX = Math.round(sourceCanvas.width * 0.06);
  const cropY = Math.round(sourceCanvas.height * 0.16);
  const cropWidth = Math.round(sourceCanvas.width * 0.88);
  const cropHeight = Math.round(sourceCanvas.height * 0.58);

  croppedCanvas.width = cropWidth;
  croppedCanvas.height = cropHeight;

  const context = croppedCanvas.getContext("2d");

  if (!context) {
    throw new Error("랜드마크 영역을 처리하지 못했습니다.");
  }

  context.drawImage(
    sourceCanvas,
    cropX,
    cropY,
    cropWidth,
    cropHeight,
    0,
    0,
    cropWidth,
    cropHeight
  );

  return croppedCanvas;
}

export async function recognizeLandmark(
  sourceCanvas: HTMLCanvasElement,
  referenceImages: string[],
  goodMatchesThreshold: number,
  matchRatioThreshold: number
) {
  const landmarkCanvas = cropLandmarkArea(sourceCanvas);
  const results = await compareLandmarkToReferences(
    landmarkCanvas,
    referenceImages,
  );
  const bestResult = results[0];
  const bestGoodMatches = bestResult?.goodMatches ?? 0;
  const bestMatchRatio = bestResult?.matchRatio ?? 0;

  return {
    passed:
      bestGoodMatches >= goodMatchesThreshold &&
      bestMatchRatio >= matchRatioThreshold,
    goodMatches: bestGoodMatches,
    matchRatio: bestMatchRatio,
  };
}

