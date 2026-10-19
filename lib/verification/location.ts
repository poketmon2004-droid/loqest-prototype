export function calculateDistance(
  latitude1: number,
  longitude1: number,
  latitude2: number,
  longitude2: number
) {
  const earthRadius = 6371000;

  const toRadians = (degree: number) => {
    return (degree * Math.PI) / 180;
  };

  const latitudeDifference = toRadians(latitude2 - latitude1);
  const longitudeDifference = toRadians(longitude2 - longitude1);

  const firstLatitude = toRadians(latitude1);
  const secondLatitude = toRadians(latitude2);

  const value =
    Math.sin(latitudeDifference / 2) *
    Math.sin(latitudeDifference / 2) +
    Math.cos(firstLatitude) *
    Math.cos(secondLatitude) *
    Math.sin(longitudeDifference / 2) *
    Math.sin(longitudeDifference / 2);

  const angle =
    2 * Math.atan2(Math.sqrt(value), Math.sqrt(1 - value));

  return earthRadius * angle;
}

export function getCurrentLocation() {
  return new Promise<GeolocationPosition>((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("위치 기능을 지원하지 않습니다."));
      return;
    }

    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: true,
      timeout: 15000,
      maximumAge: 0,
    });
  });
}

