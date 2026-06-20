import axios from "axios";

export async function uploadChatImages(files) {
  if (!Array.isArray(files) || files.length === 0) {
    return [];
  }

  const formData = new FormData();
  files.forEach((file) => {
    formData.append("files", file);
  });
  formData.append("folderType", "chat-images");

  try {
    const response = await axios.post(`/upload/batch`, formData); // baseURL이 자동 적용되므로 중복 경로 방지
    const uploadedFiles = Array.isArray(response.data) ? response.data : [];
    return uploadedFiles
      .map((item) => item?.url || item?.s3Url || item?.viewUrl || "")
      .filter(Boolean);
  } catch (error) {
    const message =
      error?.response?.data?.message ||
      error?.response?.data?.error ||
      error?.message ||
      "이미지 업로드에 실패했습니다.";
    throw new Error(message);
  }
}
