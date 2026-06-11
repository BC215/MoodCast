export const getToastDuration = (type) => {
  if (type === "error") {
    return 4200;
  }

  if (type === "info") {
    return 3400;
  }

  return 2800;
};

export const getApiMessage = (error, fallbackMessage) => {
  return error?.response?.data?.message || fallbackMessage;
};
