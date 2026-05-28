const assert = require("node:assert/strict");
const test = require("node:test");

const {
  descriptionMaxLength,
  parseCategoryImageUpload,
  uploadMaxBytes,
  validateCategoryPayload,
  validateStatusPayload,
} = require("./bookCategory.validation");

const validCategory = {
  CategoryName: "Science",
  DeweyCode: "500",
  Description: "Books about science subjects.",
  IsActive: true,
  CategoryColor: "#2f6b52",
  CategoryImage: "",
};

test("accepts a valid category payload and trims stored text fields", () => {
  const result = validateCategoryPayload({
    ...validCategory,
    CategoryName: "  Science  ",
    DeweyCode: " 500.1 ",
    Description: "  Science books and reference material.  ",
  });

  assert.equal(result.error, undefined);
  assert.deepEqual(result.data, {
    CategoryName: "Science",
    DeweyCode: "500.1",
    Description: "Science books and reference material.",
    IsActive: true,
    CategoryColor: "#2f6b52",
    CategoryImage: null,
    ArchiveReason: null,
  });
});

test("rejects missing or whitespace-only required category fields", () => {
  assert.equal(validateCategoryPayload({ ...validCategory, CategoryName: "   " }).error, "Category name is required");
  assert.equal(validateCategoryPayload({ ...validCategory, DeweyCode: "   " }).error, "Dewey Code is required");
  assert.equal(validateCategoryPayload({ ...validCategory, Description: "   " }).error, "Description is required");
});

test("enforces category field length boundaries", () => {
  assert.equal(validateCategoryPayload({ ...validCategory, CategoryName: "A".repeat(100) }).error, undefined);
  assert.equal(
    validateCategoryPayload({ ...validCategory, CategoryName: "A".repeat(101) }).error,
    "Category name cannot exceed 100 characters"
  );

  assert.equal(
    validateCategoryPayload({ ...validCategory, Description: "D".repeat(descriptionMaxLength) }).error,
    undefined
  );
  assert.equal(
    validateCategoryPayload({ ...validCategory, Description: "D".repeat(descriptionMaxLength + 1) }).error,
    `Description cannot exceed ${descriptionMaxLength} characters`
  );
});

test("validates Dewey Code boundary formats", () => {
  for (const DeweyCode of ["000", "500", "005.1", "005.133"]) {
    assert.equal(validateCategoryPayload({ ...validCategory, DeweyCode }).error, undefined);
  }

  for (const DeweyCode of ["50", "5000", "ABC", "500.1234", "500."]) {
    assert.equal(
      validateCategoryPayload({ ...validCategory, DeweyCode }).error,
      "Dewey Code must look like 500 or 500.1"
    );
  }
});

test("validates category color and image path rules", () => {
  assert.equal(validateCategoryPayload({ ...validCategory, CategoryColor: "#000000" }).error, undefined);
  assert.equal(validateCategoryPayload({ ...validCategory, CategoryColor: "#FFFFFF" }).error, undefined);
  assert.equal(
    validateCategoryPayload({ ...validCategory, CategoryColor: "green" }).error,
    "Category color must be a valid hex color like #2f6b52"
  );
  assert.equal(
    validateCategoryPayload({ ...validCategory, CategoryImage: "data:image/png;base64,AAAA" }).error,
    "Please store category images as a URL or file path, not base64 text"
  );
});

test("requires an archive reason when creating or updating an inactive category", () => {
  assert.equal(
    validateCategoryPayload({ ...validCategory, IsActive: false, ArchiveReason: "" }).error,
    "Archive reason must be merged, outdated, or temporary hidden"
  );
  assert.equal(
    validateCategoryPayload({ ...validCategory, IsActive: false, ArchiveReason: "merged" }).data.ArchiveReason,
    "merged"
  );
});

test("validates standalone status updates", () => {
  assert.equal(validateStatusPayload({}).error, "IsActive value is required");
  assert.equal(
    validateStatusPayload({ IsActive: false }).error,
    "Archive reason must be merged, outdated, or temporary hidden"
  );
  assert.deepEqual(validateStatusPayload({ IsActive: false, ArchiveReason: "outdated" }).data, {
    IsActive: false,
    ArchiveReason: "outdated",
  });
  assert.deepEqual(validateStatusPayload({ IsActive: true, ArchiveReason: "outdated" }).data, {
    IsActive: true,
    ArchiveReason: null,
  });
});

test("validates category image uploads without touching the file system", () => {
  const smallPng = Buffer.from("image").toString("base64");
  const validUpload = parseCategoryImageUpload({
    imageData: `data:image/png;base64,${smallPng}`,
    fileName: "Science.png",
  });

  assert.equal(validUpload.error, undefined);
  assert.equal(validUpload.data.extension, "png");
  assert.equal(validUpload.data.fileName, "Science.png");
  assert.equal(validUpload.data.imageBuffer.toString(), "image");

  assert.equal(
    parseCategoryImageUpload({ imageData: "not-an-image" }).error,
    "Please upload a JPG, PNG, WEBP, or GIF image"
  );
  assert.equal(
    parseCategoryImageUpload({
      imageData: `data:image/png;base64,${Buffer.alloc(uploadMaxBytes + 1).toString("base64")}`,
    }).error,
    "Category image cannot be larger than 3MB"
  );
});
