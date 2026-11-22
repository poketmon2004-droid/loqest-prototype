export const resizeImage = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      const image = new Image();

      image.onload = () => {
        const maxSize = 1000;
        const scale = Math.min(
          1,
          maxSize / Math.max(image.width, image.height),
        );

        const canvas = document.createElement("canvas");
        canvas.width = Math.round(image.width * scale);
        canvas.height = Math.round(image.height * scale);

        const context = canvas.getContext("2d");

        if (!context) {
          reject(new Error("이미지 처리에 실패했습니다."));
          return;
        }

        context.drawImage(
          image,
          0,
          0,
          canvas.width,
          canvas.height,
        );

        resolve(canvas.toDataURL("image/jpeg", 0.72));
      };

      image.onerror = () =>
        reject(new Error("이미지를 불러오지 못했습니다."));

      image.src = String(reader.result);
    };

    reader.onerror = () =>
      reject(new Error("파일을 읽지 못했습니다."));

    reader.readAsDataURL(file);
  });
