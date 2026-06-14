const assert = require("node:assert/strict");
const test = require("node:test");

const {
  allowedArchiveReasons,
  categoryImageMaxLength,
  descriptionMaxLength,
  normalizeCategoryStyle,
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

const compareCategories = (a, b, sortConfig) => {
  const direction = sortConfig.direction === "desc" ? -1 : 1;
  const key = sortConfig.key;

  if (key === "BookCount") {
    return (Number(a.BookCount || 0) - Number(b.BookCount || 0)) * direction;
  }

  if (key === "UpdatedAt") {
    return (new Date(a.UpdatedAt || 0) - new Date(b.UpdatedAt || 0)) * direction;
  }

  return String(a[key] || "").localeCompare(String(b[key] || ""), undefined, {
    numeric: true,
    sensitivity: "base",
  }) * direction;
};

const filterAndSortCategories = (
  categories,
  { searchTerm = "", statusFilter = "all", sortConfig = { key: "CategoryName", direction: "asc" } } = {}
) => {
  const trimmedSearchTerm = searchTerm.trim().toLowerCase();

  return categories
    .filter((cat) => {
      const matchesSearch =
        !trimmedSearchTerm ||
        cat.CategoryName?.toLowerCase().includes(trimmedSearchTerm) ||
        cat.DeweyCode?.toLowerCase().includes(trimmedSearchTerm) ||
        cat.Description?.toLowerCase().includes(trimmedSearchTerm);

      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "active" && Number(cat.IsActive) === 1) ||
        (statusFilter === "inactive" && Number(cat.IsActive) !== 1);

      return matchesSearch && matchesStatus;
    })
    .sort((a, b) => compareCategories(a, b, sortConfig));
};

const paginateCategories = (categories, page = 1, pageSize = 10) => {
  const totalPages = Math.max(1, Math.ceil(categories.length / pageSize));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const startIndex = (safePage - 1) * pageSize;

  return {
    totalPages,
    safePage,
    firstRecord: categories.length ? startIndex + 1 : 0,
    lastRecord: Math.min(startIndex + pageSize, categories.length),
    rows: categories.slice(startIndex, startIndex + pageSize),
  };
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

test("matches category name validation table boundaries", () => {
  assert.equal(validateCategoryPayload({ ...validCategory, CategoryName: "" }).error, "Category name is required");
  assert.equal(validateCategoryPayload({ ...validCategory, CategoryName: "   " }).error, "Category name is required");
  assert.equal(validateCategoryPayload({ ...validCategory, CategoryName: "A" }).error, undefined);
  assert.equal(validateCategoryPayload({ ...validCategory, CategoryName: "IT" }).error, undefined);
  assert.equal(validateCategoryPayload({ ...validCategory, CategoryName: "A".repeat(100) }).error, undefined);
  assert.equal(
    validateCategoryPayload({ ...validCategory, CategoryName: "A".repeat(101) }).error,
    "Category name cannot exceed 100 characters"
  );
  assert.equal(validateCategoryPayload({ ...validCategory, CategoryName: "12345" }).error, undefined);
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

test("matches description validation table boundaries", () => {
  assert.equal(validateCategoryPayload({ ...validCategory, Description: "" }).error, "Description is required");
  assert.equal(validateCategoryPayload({ ...validCategory, Description: "   " }).error, "Description is required");
  assert.equal(validateCategoryPayload({ ...validCategory, Description: "A" }).error, undefined);
  assert.equal(validateCategoryPayload({ ...validCategory, Description: "AB" }).error, undefined);
  assert.equal(
    validateCategoryPayload({ ...validCategory, Description: "D".repeat(descriptionMaxLength - 1) }).error,
    undefined
  );
  assert.equal(
    validateCategoryPayload({ ...validCategory, Description: "D".repeat(descriptionMaxLength) }).error,
    undefined
  );
  assert.equal(
    validateCategoryPayload({ ...validCategory, Description: "D".repeat(descriptionMaxLength + 1) }).error,
    `Description cannot exceed ${descriptionMaxLength} characters`
  );
  assert.equal(validateCategoryPayload({ ...validCategory, Description: "@@@ ### !!!" }).error, undefined);
  assert.equal(validateCategoryPayload({ ...validCategory, Description: "Line one\nLine two" }).error, undefined);
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

test("matches Dewey Code validation table boundaries", () => {
  assert.equal(validateCategoryPayload({ ...validCategory, DeweyCode: "" }).error, "Dewey Code is required");
  assert.equal(validateCategoryPayload({ ...validCategory, DeweyCode: "   " }).error, "Dewey Code is required");
  assert.equal(validateCategoryPayload({ ...validCategory, DeweyCode: "000" }).error, undefined);
  assert.equal(validateCategoryPayload({ ...validCategory, DeweyCode: "001" }).error, undefined);
  assert.equal(validateCategoryPayload({ ...validCategory, DeweyCode: "005.13" }).error, undefined);
  assert.equal(validateCategoryPayload({ ...validCategory, DeweyCode: "005.133" }).error, undefined);
  assert.equal(
    validateCategoryPayload({ ...validCategory, DeweyCode: "005.1334" }).error,
    "Dewey Code must look like 500 or 500.1"
  );
  assert.equal(
    validateCategoryPayload({ ...validCategory, DeweyCode: "12345678901" }).error,
    "Dewey Code cannot exceed 10 characters"
  );
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

test("matches category color table boundaries and defaults", () => {
  assert.deepEqual(normalizeCategoryStyle({}), {
    CategoryColor: "#2f6b52",
    CategoryImage: null,
    ArchiveReason: null,
  });
  assert.equal(validateCategoryPayload({ ...validCategory, CategoryColor: "#000001" }).error, undefined);
  assert.equal(validateCategoryPayload({ ...validCategory, CategoryColor: "#fffffe" }).error, undefined);
  assert.equal(
    validateCategoryPayload({ ...validCategory, CategoryColor: "#FFF" }).error,
    "Category color must be a valid hex color like #2f6b52"
  );
  assert.equal(
    validateCategoryPayload({ ...validCategory, CategoryColor: "#FFFFFFF" }).error,
    "Category color must be a valid hex color like #2f6b52"
  );
});

test("matches category image path validation table boundaries", () => {
  assert.equal(validateCategoryPayload({ ...validCategory, CategoryImage: "" }).data.CategoryImage, null);
  assert.equal(validateCategoryPayload({ ...validCategory, CategoryImage: "/images/categories/science.jpg" }).error, undefined);
  assert.equal(
    validateCategoryPayload({ ...validCategory, CategoryImage: "a".repeat(categoryImageMaxLength) }).error,
    undefined
  );
  assert.equal(
    validateCategoryPayload({ ...validCategory, CategoryImage: "a".repeat(categoryImageMaxLength + 1) }).error,
    `Category image path cannot exceed ${categoryImageMaxLength} characters`
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

test("matches active status and archive reason table cases", () => {
  for (const reason of allowedArchiveReasons) {
    const result = validateCategoryPayload({ ...validCategory, IsActive: false, ArchiveReason: reason });
    assert.equal(result.error, undefined);
    assert.equal(result.data.IsActive, false);
    assert.equal(result.data.ArchiveReason, reason);
  }

  assert.equal(
    validateCategoryPayload({ ...validCategory, IsActive: false, ArchiveReason: "deleted" }).error,
    "Archive reason must be merged, outdated, or temporary hidden"
  );
  assert.equal(
    validateCategoryPayload({ ...validCategory, IsActive: true, ArchiveReason: "outdated" }).data.ArchiveReason,
    null
  );
  assert.equal(
    validateCategoryPayload({ ...validCategory, ArchiveReason: "A".repeat(81) }).error,
    "Archive reason cannot exceed 80 characters"
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

test("documents current prototype status boolean limitation", () => {
  const result = validateStatusPayload({ IsActive: "false", ArchiveReason: "" });

  assert.equal(result.error, undefined);
  assert.deepEqual(result.data, {
    IsActive: "false",
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

test("matches category image upload table file type cases", () => {
  for (const [mimeType, extension] of [
    ["image/jpeg", "jpg"],
    ["image/png", "png"],
    ["image/webp", "webp"],
    ["image/gif", "gif"],
  ]) {
    const upload = parseCategoryImageUpload({
      imageData: `data:${mimeType};base64,${Buffer.from("image").toString("base64")}`,
      fileName: `category.${extension}`,
    });

    assert.equal(upload.error, undefined);
    assert.equal(upload.data.extension, extension);
  }

  assert.equal(
    parseCategoryImageUpload({ imageData: `data:text/plain;base64,${Buffer.from("text").toString("base64")}` }).error,
    "Please upload a JPG, PNG, WEBP, or GIF image"
  );
  assert.equal(
    parseCategoryImageUpload({ imageData: "data:image/png;base64," }).error,
    "Please upload a JPG, PNG, WEBP, or GIF image"
  );
});

test("matches search, filter, sort, and pagination table behaviour", () => {
  const categories = [
    {
      CategoryID: 1,
      CategoryName: "Science",
      DeweyCode: "500",
      Description: "Natural sciences",
      IsActive: 1,
      BookCount: 4,
      UpdatedAt: "2026-05-01",
    },
    {
      CategoryID: 2,
      CategoryName: "Computer Science",
      DeweyCode: "005",
      Description: "Programming and software engineering",
      IsActive: 1,
      BookCount: 10,
      UpdatedAt: "2026-05-03",
    },
    {
      CategoryID: 3,
      CategoryName: "Archived History",
      DeweyCode: "900",
      Description: "World history",
      IsActive: 0,
      BookCount: 2,
      UpdatedAt: "2026-04-01",
    },
  ];

  assert.equal(filterAndSortCategories(categories, { searchTerm: "   " }).length, 3);
  assert.deepEqual(
    filterAndSortCategories(categories, { searchTerm: "science" }).map((cat) => cat.CategoryName),
    ["Computer Science", "Science"]
  );
  assert.deepEqual(
    filterAndSortCategories(categories, { searchTerm: "005" }).map((cat) => cat.CategoryName),
    ["Computer Science"]
  );
  assert.deepEqual(
    filterAndSortCategories(categories, { statusFilter: "inactive" }).map((cat) => cat.CategoryName),
    ["Archived History"]
  );
  assert.deepEqual(
    filterAndSortCategories(categories, { sortConfig: { key: "BookCount", direction: "desc" } }).map(
      (cat) => cat.CategoryName
    ),
    ["Computer Science", "Science", "Archived History"]
  );

  const pagination = paginateCategories(categories, 2, 2);
  assert.equal(pagination.totalPages, 2);
  assert.equal(pagination.safePage, 2);
  assert.equal(pagination.firstRecord, 3);
  assert.equal(pagination.lastRecord, 3);
  assert.deepEqual(pagination.rows.map((cat) => cat.CategoryID), [3]);
});

test("documents duplicate checks as backend/database constraint coverage", () => {
  const first = validateCategoryPayload(validCategory);
  const duplicateNamePayload = validateCategoryPayload({ ...validCategory, DeweyCode: "501" });
  const duplicateDeweyPayload = validateCategoryPayload({ ...validCategory, CategoryName: "Science Copy" });

  assert.equal(first.error, undefined);
  assert.equal(duplicateNamePayload.error, undefined);
  assert.equal(duplicateDeweyPayload.error, undefined);
});
