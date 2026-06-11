/**
 * 이미지 파일을 캔버스로 리사이징/압축해서 새로운 File 객체로 반환합니다.
 *
 * @param {File} file
 * @param {number} maxWidth
 * @param {number} maxHeight
 * @param {number} quality
 * @param {boolean} cropSquare
 * @returns {Promise<File>}
 */
import apiClient from '../api/apiClient';

function resizeImage(file, maxWidth, maxHeight, quality = 0.85, cropSquare = false) {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      reject(new Error('이미지 파일만 업로드할 수 있습니다.'));
      return;
    }

    const image = new Image();
    const objectUrl = URL.createObjectURL(file);

    image.onload = () => {
      let sourceWidth = image.naturalWidth;
      let sourceHeight = image.naturalHeight;
      let sx = 0;
      let sy = 0;
      let sWidth = sourceWidth;
      let sHeight = sourceHeight;
      let targetWidth = sourceWidth;
      let targetHeight = sourceHeight;

      if (cropSquare) {
        const squareSize = Math.min(sourceWidth, sourceHeight);
        sx = Math.floor((sourceWidth - squareSize) / 2);
        sy = Math.floor((sourceHeight - squareSize) / 2);
        sWidth = squareSize;
        sHeight = squareSize;
        targetWidth = maxWidth;
        targetHeight = maxHeight;
      } else {
        const ratio = Math.min(maxWidth / sourceWidth, maxHeight / sourceHeight, 1);
        targetWidth = Math.max(1, Math.round(sourceWidth * ratio));
        targetHeight = Math.max(1, Math.round(sourceHeight * ratio));
      }

      const canvas = document.createElement('canvas');
      canvas.width = targetWidth;
      canvas.height = targetHeight;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(image, sx, sy, sWidth, sHeight, 0, 0, targetWidth, targetHeight);
      URL.revokeObjectURL(objectUrl);

      const mimeType = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error('이미지 변환에 실패했습니다.'));
            return;
          }
          const extension = mimeType === 'image/png' ? '.png' : '.jpg';
          const nameWithoutExt = file.name.replace(/\.[^/.]+$/, '');
          const resizedFile = new File([blob], `${nameWithoutExt}${extension}`, { type: mimeType });
          resolve(resizedFile);
        },
        mimeType,
        mimeType === 'image/png' ? 1.0 : quality
      );
    };

    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('이미지 로드에 실패했습니다.'));
    };

    image.src = objectUrl;
  });
}

/**
 * 이미지 파일을 백엔드 /upload API로 전송하고 영구 URL을 반환합니다.
 * Mac / Windows 모두 동작 (서버가 OS 경로를 처리함).
 *
 * @param {File} file - 업로드할 이미지 파일
 * @param {string} token - JWT Access Token
 * @param {string} backserver - 백엔드 base URL (예: http://localhost:8080)
 * @param {{maxWidth?: number, maxHeight?: number, quality?: number, cropSquare?: boolean, folderType?: 'user-images'|'post-images'}} [options]
 * @returns {Promise<string>} - 서버에 저장된 이미지 접근 URL
 */
const DEFAULT_BACKSERVER = import.meta.env.VITE_BACKSERVER || 'http://localhost:8080';

export async function uploadImage(file, token, backserver = DEFAULT_BACKSERVER, options = {}) {
  let uploadFile = file;
  if (options.maxWidth || options.maxHeight || options.cropSquare) {
    uploadFile = await resizeImage(
      file,
      options.maxWidth ?? 1200,
      options.maxHeight ?? 1200,
      options.quality ?? 0.85,
      Boolean(options.cropSquare)
    );
  }

  const formData = new FormData();
  formData.append('file', uploadFile);
  formData.append('folderType', options.folderType || 'post-images');

  const headers = {};
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  try {
    const response = await apiClient.post(`${backserver}/upload`, formData, {
      headers,
    });

    return response.data.url;
  } catch (error) {
    const status = error?.response?.status;
    const responseData = error?.response?.data || {};
    const uploadError = new Error(
      responseData.error ||
        responseData.message ||
        error.message ||
        `업로드 실패${status ? ` (${status})` : ''}`,
    );

    uploadError.status = status;
    uploadError.isAuthError = status === 401 || status === 403;

    throw uploadError;
  }
}
