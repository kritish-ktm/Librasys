const deweyPattern = /^\d{3}(?:\.\d{1,3})?$/;
const colorPattern = /^#[0-9a-fA-F]{6}$/;
const allowedArchiveReasons = new Set(["merged", "outdated", "temporary hidden"]);
const descriptionMaxLength = 1000;
const categoryImageMaxLength = 500;
const uploadMaxBytes = 3 * 1024 * 1024;
const allowedImageTypes = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};

const normalizeCategoryStyle = (body = {}) => {
  const color = body.CategoryColor ? String(body.CategoryColor).trim() : "#2f6b52";
  const image = body.CategoryImage ? String(body.CategoryImage).trim() : null;
  const archiveReason = body.ArchiveReason ? String(body.ArchiveReason).trim() : null;

  if (!colorPattern.test(color)) {
    return { error: "Category color must be a valid hex color like #2f6b52" };
  }
  if (image && image.length > categoryImageMaxLength) {
    return { error: `Category image path cannot exceed ${categoryImageMaxLength} characters` };
  }
  if (image && image.startsWith("data:image/")) {
    return { error: "Please store category images as a URL or file path, not base64 text" };
  }
  if (archiveReason && archiveReason.length > 80) {
    return { error: "Archive reason cannot exceed 80 characters" };
  }

  return { CategoryColor: color, CategoryImage: image, ArchiveReason: archiveReason };
};

const validateCategoryPayload = (body = {}, options = {}) => {
  const { allowStatusAlias = false } = options;
  const { CategoryName, DeweyCode, Description, IsActive, status } = body;
  const isActiveValue = IsActive !== undefined ? IsActive : (allowStatusAlias && status !== undefined ? status : true);
  const trimmedDescription = Description ? String(Description).trim() : "";
  const style = normalizeCategoryStyle(body);

  if (style.error) {
    return { error: style.error };
  }
  if (!CategoryName || String(CategoryName).trim() === "") {
    return { error: "Category name is required" };
  }
  if (String(CategoryName).trim().length > 100) {
    return { error: "Category name cannot exceed 100 characters" };
  }
  if (!DeweyCode || String(DeweyCode).trim() === "") {
    return { error: "Dewey Code is required" };
  }
  if (String(DeweyCode).trim().length > 10) {
    return { error: "Dewey Code cannot exceed 10 characters" };
  }
  if (!deweyPattern.test(String(DeweyCode).trim())) {
    return { error: "Dewey Code must look like 500 or 500.1" };
  }
  if (!trimmedDescription) {
    return { error: "Description is required" };
  }
  if (trimmedDescription.length > descriptionMaxLength) {
    return { error: `Description cannot exceed ${descriptionMaxLength} characters` };
  }
  if (!isActiveValue && !allowedArchiveReasons.has(style.ArchiveReason)) {
    return { error: "Archive reason must be merged, outdated, or temporary hidden" };
  }

  return {
    data: {
      CategoryName: String(CategoryName).trim(),
      DeweyCode: String(DeweyCode).trim(),
      Description: trimmedDescription,
      IsActive: isActiveValue,
      CategoryColor: style.CategoryColor,
      CategoryImage: style.CategoryImage,
      ArchiveReason: isActiveValue ? null : style.ArchiveReason,
    },
  };
};

const validateStatusPayload = (body = {}) => {
  const { IsActive, ArchiveReason } = body;

  if (IsActive === undefined) {
    return { error: "IsActive value is required" };
  }

  const archiveReason = ArchiveReason ? String(ArchiveReason).trim() : "";
  if (!IsActive && !allowedArchiveReasons.has(archiveReason)) {
    return { error: "Archive reason must be merged, outdated, or temporary hidden" };
  }

  return { data: { IsActive, ArchiveReason: IsActive ? null : archiveReason } };
};

const parseCategoryImageUpload = (body = {}) => {
  const { imageData, fileName = "" } = body;
  const dataUrlPattern = /^data:(image\/(?:jpeg|png|webp|gif));base64,([A-Za-z0-9+/=]+)$/;
  const match = typeof imageData === "string" ? imageData.match(dataUrlPattern) : null;

  if (!match) {
    return { error: "Please upload a JPG, PNG, WEBP, or GIF image" };
  }

  const mimeType = match[1];
  const imageBuffer = Buffer.from(match[2], "base64");

  if (!imageBuffer.length) {
    return { error: "Uploaded image is empty" };
  }
  if (imageBuffer.length > uploadMaxBytes) {
    return { error: "Category image cannot be larger than 3MB" };
  }

  return {
    data: {
      extension: allowedImageTypes[mimeType],
      fileName,
      imageBuffer,
    },
  };
};

module.exports = {
  allowedArchiveReasons,
  allowedImageTypes,
  categoryImageMaxLength,
  descriptionMaxLength,
  normalizeCategoryStyle,
  parseCategoryImageUpload,
  uploadMaxBytes,
  validateCategoryPayload,
  validateStatusPayload,
};
