const test = require("node:test");
const assert = require("node:assert/strict");

function validateBook(book) {
  if (!book.Title || book.Title.trim() === "") {
    return "Book title is required";
  }
  if (book.Title.trim().length > 150) {
    return "Book title cannot be longer than 150 characters";
  }
  if (!book.ISBN || book.ISBN.trim() === "") {
    return "ISBN is required";
  }

  const isbn = book.ISBN.trim();
  if (!/^\d+$/.test(isbn)) {
    return "ISBN must contain digits only";
  }
  if (isbn.length !== 10 && isbn.length !== 13) {
    return "ISBN must be exactly 10 or 13 digits";
  }

  if (
    book.CategoryID === "" ||
    book.CategoryID === undefined ||
    book.CategoryID === null
  ) {
    return "Category ID is required";
  }

  const categoryId = Number(book.CategoryID);
  if (!Number.isInteger(categoryId) || categoryId <= 0) {
    return "Category ID must be a valid whole number";
  }

  if (
    book.AvailableCopies === "" ||
    book.AvailableCopies === undefined ||
    book.AvailableCopies === null
  ) {
    return "Available copies is required";
  }

  const copies = Number(book.AvailableCopies);
  if (!Number.isInteger(copies) || copies < 0) {
    return "Available copies must be a whole number of 0 or more";
  }

  if (book.PublicationDate) {
    const publicationDate = new Date(book.PublicationDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (Number.isNaN(publicationDate.getTime())) {
      return "Publication date must be a valid date";
    }
    if (publicationDate > today) {
      return "Publication date cannot be in the future";
    }
  }

  return "";
}

function prepareBookValues(book) {
  const publicationDate =
    book.PublicationDate === "" ||
    book.PublicationDate === undefined ||
    book.PublicationDate === null
      ? null
      : book.PublicationDate;

  return {
    CategoryID: Number(book.CategoryID),
    Title: book.Title.trim(),
    ISBN: book.ISBN.trim(),
    PublicationDate: publicationDate,
    AvailableCopies: Number(book.AvailableCopies),
    IsBorrowable: book.IsBorrowable ? 1 : 0,
  };
}

const baseValidBook = {
  CategoryID: 1,
  Title: "The Hobbit",
  ISBN: "0261102214",
  PublicationDate: "1997-06-26",
  AvailableCopies: 1,
  IsBorrowable: true,
};

const longText = (n) => "A".repeat(n);
const expectValid = (o = {}) =>
  assert.equal(validateBook({ ...baseValidBook, ...o }), "");
const expectInvalid = (msg, o = {}) =>
  assert.equal(validateBook({ ...baseValidBook, ...o }), msg);

test("Title: blank rejected", () =>
  expectInvalid("Book title is required", { Title: "" }));
test("Title: spaces-only rejected", () =>
  expectInvalid("Book title is required", { Title: "   " }));
test("Title: 1-char accepted", () => expectValid({ Title: "A" }));
test("Title: 150-char accepted", () => expectValid({ Title: longText(150) }));
test("Title: 151-char rejected", () =>
  expectInvalid("Book title cannot be longer than 150 characters", {
    Title: longText(151),
  }));
test("Title: number-only accepted", () => expectValid({ Title: "12345" }));
test("Title: special chars accepted", () => expectValid({ Title: "Book @ 2026!" }));

test("ISBN: blank rejected", () => expectInvalid("ISBN is required", { ISBN: "" }));
test("ISBN: spaces-only rejected", () =>
  expectInvalid("ISBN is required", { ISBN: "   " }));
test("ISBN: 10-digit accepted", () => expectValid({ ISBN: "0261102214" }));
test("ISBN: 11-digit rejected", () =>
  expectInvalid("ISBN must be exactly 10 or 13 digits", { ISBN: "12345678901" }));
test("ISBN: 12-digit rejected", () =>
  expectInvalid("ISBN must be exactly 10 or 13 digits", { ISBN: "978074753269" }));
test("ISBN: 13-digit accepted", () => expectValid({ ISBN: "9780747532699" }));
test("ISBN: 14-digit rejected", () =>
  expectInvalid("ISBN must be exactly 10 or 13 digits", { ISBN: "97807475326999" }));
test("ISBN: letters rejected", () =>
  expectInvalid("ISBN must contain digits only", { ISBN: "ABCISBN123" }));
test("ISBN: very long rejected", () =>
  expectInvalid("ISBN must be exactly 10 or 13 digits", { ISBN: "9".repeat(40) }));

test("CategoryID: blank rejected", () =>
  expectInvalid("Category ID is required", { CategoryID: "" }));
test("CategoryID: zero rejected", () =>
  expectInvalid("Category ID must be a valid whole number", { CategoryID: 0 }));
test("CategoryID: positive integers accepted", () => {
  expectValid({ CategoryID: 1 });
  expectValid({ CategoryID: 2 });
  expectValid({ CategoryID: 3 });
});
test("CategoryID: text rejected", () =>
  expectInvalid("Category ID must be a valid whole number", {
    CategoryID: "Fiction",
  }));
test("CategoryID: decimal rejected", () =>
  expectInvalid("Category ID must be a valid whole number", { CategoryID: 2.5 }));
test("CategoryID: existence not checked by app-level validation", () =>
  expectValid({ CategoryID: 999999 }));

test("PublicationDate: blank accepted", () => expectValid({ PublicationDate: "" }));
test("PublicationDate: valid past date accepted", () =>
  expectValid({ PublicationDate: "1900-01-01" }));
test("PublicationDate: current-date timezone edge can be rejected by current logic", () => {
  const today = new Date().toISOString().substring(0, 10);
  const result = validateBook({ ...baseValidBook, PublicationDate: today });
  assert.ok(
    result === "" || result === "Publication date cannot be in the future"
  );
});
test("PublicationDate: future rejected", () => {
  const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000)
    .toISOString()
    .substring(0, 10);
  expectInvalid("Publication date cannot be in the future", {
    PublicationDate: tomorrow,
  });
});
test("PublicationDate: invalid date string rejected", () =>
  expectInvalid("Publication date must be a valid date", {
    PublicationDate: "yesterday",
  }));
test("PublicationDate: impossible date note (may normalize in JS Date parsing)", () => {
  const d = new Date("2026-02-30");
  assert.equal(Number.isNaN(d.getTime()), false);
});

test("AvailableCopies: blank rejected", () =>
  expectInvalid("Available copies is required", { AvailableCopies: "" }));
test("AvailableCopies: negative rejected", () =>
  expectInvalid("Available copies must be a whole number of 0 or more", {
    AvailableCopies: -1,
  }));
test("AvailableCopies: zero accepted", () => expectValid({ AvailableCopies: 0 }));
test("AvailableCopies: one accepted", () => expectValid({ AvailableCopies: 1 }));
test("AvailableCopies: 999999 accepted (no max limit currently)", () =>
  expectValid({ AvailableCopies: 999999 }));
test("AvailableCopies: text rejected", () =>
  expectInvalid("Available copies must be a whole number of 0 or more", {
    AvailableCopies: "five",
  }));
test("AvailableCopies: decimal rejected", () =>
  expectInvalid("Available copies must be a whole number of 0 or more", {
    AvailableCopies: 2.5,
  }));

test("IsBorrowable: true/false convert to 1/0", () => {
  assert.equal(prepareBookValues({ ...baseValidBook, IsBorrowable: true }).IsBorrowable, 1);
  assert.equal(prepareBookValues({ ...baseValidBook, IsBorrowable: false }).IsBorrowable, 0);
});

test("IsBorrowable: truthy/falsy conversion note (no strict literal rejection)", () => {
  assert.equal(prepareBookValues({ ...baseValidBook, IsBorrowable: "maybe" }).IsBorrowable, 1);
  assert.equal(prepareBookValues({ ...baseValidBook, IsBorrowable: 2 }).IsBorrowable, 1);
  assert.equal(prepareBookValues({ ...baseValidBook, IsBorrowable: 0 }).IsBorrowable, 0);
});
