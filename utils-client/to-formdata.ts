export const toFormData = (data: any) => {
  const formData = new FormData();
  const asJson: { [key: string]: any } = {};
  for (const key in data) {
    if (data[key] instanceof FileList) {
      const files = data[key] as FileList;
      if (files.length > 1) {
        for (const fileKey in files) {
          formData.append(`${key}[]`, files[fileKey]);
        }
      } else {
        formData.append(key, files[0]);
      }
    } else {
      asJson[key] = data[key];
    }
  }
  formData.append("bodyJson", JSON.stringify(asJson));
  return formData;
};