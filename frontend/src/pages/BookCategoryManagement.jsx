/*
  BookCategoryManagement.jsx
  ---------------------------------------------
  This React component is responsible for the Book Category Management page
  in the LibraSys admin/librarian dashboard.

  Main responsibilities of this file:
  1. Load all book categories from the backend/database.
  2. Display category statistics such as total, active, inactive, and assigned books.
  3. Allow the librarian/admin to search, filter, sort, and paginate category records.
  4. Allow adding a new category using a modal form.
  5. Allow editing an existing category using the same modal form.
  6. Allow activating/deactivating a category.
  7. Require an archive reason when a category is made inactive.
  8. Allow deleting a category, but only if the backend permits it.
  9. Show category details and assigned books inside a details modal.
  10. Show a special “Most Borrowed” view by calling a different backend service.
  11. Handle optional category image upload, resizing, and preview.

  This file is mostly a frontend/controller-style React component.
  It does not directly talk to the database. Instead, it uses service functions
  imported from ../services/bookCategoryService. Those service functions are
  responsible for making API requests to the backend.
*/

import { useEffect, useState } from "react";
import { ArrowUpDown, Eye, Pencil, Power, Trash2 } from "lucide-react";

/*
  These service functions are imported from the API service layer.

  Keeping API calls inside a separate service file makes this component cleaner.
  Instead of writing fetch/axios logic everywhere in the UI file, this component
  simply calls functions such as getCategories(), addCategory(), updateCategory(), etc.
*/
import {
  getCategories,
  getMostBorrowedBooks,
  getCategoryBooks,
  addCategory,
  updateCategory,
  deleteCategory,
  toggleCategoryStatus,
} from "../services/bookCategoryService";

/*
  Sidebar is the navigation menu used in the admin/librarian layout.
  The CSS file contains all styling for this page, including table, modal,
  buttons, filters, pagination, loading overlay, and category cards.
*/
import Sidebar from "../components/Sidebar";
import "./BookCategoryManagement.css";

/*
  LOADING_DELAY_MS is used to keep the loading animation visible for a short time.
  This can make the UI feel smoother because the loading overlay does not flash too quickly.

  LOADING_SWITCH_MS controls when the loading overlay changes from the large text
  phase to the smaller detailed message phase.
*/
const LOADING_DELAY_MS = 3500;
const LOADING_SWITCH_MS = 2000;

/*
  Dewey Decimal Classification code validation pattern.

  This pattern accepts:
  - exactly 3 digits, for example: 500
  - 3 digits followed by a decimal point and 1 to 3 digits, for example: 500.1 or 500.123

  Examples that pass:
  - 000
  - 100
  - 500
  - 823.9
  - 005.133

  Examples that fail:
  - 50        because it has only 2 digits
  - 5000      because it has 4 digits before the decimal
  - ABC       because it is not numeric
  - 500.1234  because it has more than 3 digits after the decimal
*/
const deweyPattern = /^\d{3}(?:\.\d{1,3})?$/;

/*
  These are the fixed reasons that a librarian/admin can choose from
  when making a category inactive.

  The reason is important because simply hiding a category without explanation
  can confuse other team members. For example, a category might be inactive
  because it was merged into another category, is outdated, or is only hidden temporarily.
*/
const archiveReasons = [
  { value: "merged", label: "Merged" },
  { value: "outdated", label: "Outdated" },
  { value: "temporary hidden", label: "Temporary hidden" },
];

/*
  Maximum allowed category image size after resizing/compression.
  850 * 1024 means roughly 850 KB.

  This protects the database and page performance because storing very large
  base64 images can make API requests and rendering slow.
*/
const CATEGORY_IMAGE_MAX_SIZE = 850 * 1024;

/*
  Small helper function that returns a Promise which resolves after a given delay.

  It is used with Promise.all() to artificially keep the loading overlay visible.
  Example:
    await Promise.all([addCategory(form), wait(LOADING_DELAY_MS)]);

  That means the UI waits for both:
  1. the real backend request, and
  2. the minimum loading delay.
*/
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function BookCategoryManagement() {
  /*
    This object represents the default/empty state of the category form.

    It is used when:
    - opening the form to create a new category,
    - resetting the form after submit,
    - clearing editing mode,
    - closing the modal.

    Each key here should match the field names expected by the backend API
    or used by the form inputs.
  */
  const emptyForm = {
    CategoryName: "",
    Description: "",
    DeweyCode: "",
    IsActive: true,
    CategoryColor: "#2f6b52",
    CategoryImage: "",
    ArchiveReason: "",
  };

  /*
    categories stores the full list of categories loaded from the backend.
    This is the original data source used for searching, filtering, sorting,
    statistics, and displaying table records.
  */
  const [categories, setCategories] = useState([]);

  /*
    form stores the current input values in the Add/Edit Category modal.
    It is controlled by React, meaning every input value comes from this state
    and every input change updates this state.
  */
  const [form, setForm] = useState(emptyForm);

  /*
    editingId decides whether the form is in "add mode" or "edit mode".

    - null means the librarian is creating a new category.
    - a CategoryID value means the librarian is editing an existing category.
  */
  const [editingId, setEditingId] = useState(null);

  /*
    message is used for successful feedback, for example:
    "Category added successfully!"

    error is used for validation errors, failed API calls, or user warnings.
  */
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  /*
    searchTerm stores the text typed in the search box.
    The search works against category name, Dewey code, and description.
  */
  const [searchTerm, setSearchTerm] = useState("");

  /*
    isFormOpen controls whether the Add/Edit modal is visible.
  */
  const [isFormOpen, setIsFormOpen] = useState(false);

  /*
    displayedCategories stores the list that is actually shown in the table.

    This is different from categories because displayedCategories may be:
    - searched,
    - filtered by active/inactive/all,
    - sorted,
    - replaced with most borrowed book records in Most Borrowed mode.
  */
  const [displayedCategories, setDisplayedCategories] = useState([]);

  /*
    Loading and busy states.

    isFetching: true while the page is loading category data.
    isSearching: true while the search delay/debounce is active.
    isSaving: true while the add/edit form is submitting.
    busyAction: stores a string showing which row action is currently running.
                Example: "delete-4" or "status-7".
    loadingOverlay: stores information shown in the full-page loading overlay.
  */
  const [isFetching, setIsFetching] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [busyAction, setBusyAction] = useState("");
  const [loadingOverlay, setLoadingOverlay] = useState(null);

  /*
    Pagination state.

    page: current page number.
    pageSize: how many records should be shown per page.
  */
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  /*
    statusFilter decides which category records are shown.

    Possible values:
    - "all"
    - "active"
    - "inactive"
  */
  const [statusFilter, setStatusFilter] = useState("all");

  /*
    sortConfig stores the current table sorting setting.

    key: which field is being sorted, for example "CategoryName" or "BookCount".
    direction: "asc" for ascending or "desc" for descending.
  */
  const [sortConfig, setSortConfig] = useState({ key: "CategoryName", direction: "asc" });

  /*
    bookviewMode controls whether the table shows normal category records
    or a special analytical view.

    - "all" means normal Book Category Management mode.
    - "mostBorrowed" means the table shows most borrowed books instead of categories.

    The variable name could be improved to bookViewMode for naming consistency,
    but the existing logic is kept unchanged here.
  */
  const [bookviewMode, setBookviewMode] = useState("all");

  /*
    detailCategory and detailBooks are used by the Category Details modal.

    detailCategory stores the selected category record.
    detailBooks stores the books assigned to that category.
    isLoadingDetails shows a loading message while assigned books are being fetched.
  */
  const [detailCategory, setDetailCategory] = useState(null);
  const [detailBooks, setDetailBooks] = useState([]);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);

  /*
    confirmAction controls the confirmation modal.

    It is used for two actions:
    1. deleting a category,
    2. deactivating a category.

    Instead of immediately deleting/deactivating after a button click,
    the page first asks the user to confirm the decision.
  */
  const [confirmAction, setConfirmAction] = useState(null);

  /*
    showLoadingOverlay displays a loading overlay with two phases.

    Phase 1: large message, for example "Fetching" or "Updating".
    Phase 2: smaller detail message after LOADING_SWITCH_MS.

    The function returns the timer ID so it can be cleared later.
    Clearing the timer is important because if the component finishes early,
    we do not want a delayed timer to update the UI after the action is done.
  */
  const showLoadingOverlay = (title, detail) => {
    setLoadingOverlay({ title, detail, phase: "large" });

    return setTimeout(() => {
      setLoadingOverlay({ title, detail, phase: "small" });
    }, LOADING_SWITCH_MS);
  };

  /*
    fetchCategories loads all categories from the backend.

    Parameter:
    - showDelay = true means show the full loading overlay and wait for the
      artificial delay. This is useful when the page first loads.
    - showDelay = false means refresh the list quickly without showing the full delay.
      This is useful after add/edit/delete/status updates.

    Main steps:
    1. Turn on fetching state.
    2. Optionally show the loading overlay.
    3. Call getCategories() from the service file.
    4. Store the result in categories state.
    5. If the request fails, show an error message.
    6. Always clear the loading state in finally block.
  */
  const fetchCategories = async (showDelay = true) => {
    setIsFetching(true);
    const overlayTimer = showDelay
      ? showLoadingOverlay("Fetching", "Fetching information from database")
      : null;

    try {
      const [res] = await Promise.all([
        getCategories(),
        showDelay ? wait(LOADING_DELAY_MS) : Promise.resolve(),
      ]);

      /*
        Some API functions may return the array directly.
        Other API functions may return an object like { data: [...] }.
        This line supports both response shapes so the UI does not break easily.
      */
      setCategories(Array.isArray(res) ? res : res.data || []);
    } catch (err) {
      setError("Failed to load categories.");
    } finally {
      if (overlayTimer) clearTimeout(overlayTimer);
      if (showDelay) setLoadingOverlay(null);
      setIsFetching(false);
    }
  };

  /*
    This useEffect runs once when the component first appears on the screen.

    The empty dependency array [] means this effect behaves like componentDidMount.
    In simple terms: load the category data when the page opens.
  */
  useEffect(() => {
    fetchCategories();
  }, []);

  /*
    This useEffect controls searching, filtering, sorting, and the Most Borrowed view.

    It runs whenever one of these values changes:
    - categories
    - searchTerm
    - statusFilter
    - sortConfig
    - bookviewMode

    It also uses a timer to debounce search input.
    Debouncing means the search does not run instantly on every single key press.
    Here, when there is a search term, it waits 1000ms before applying the search.
    This gives a smoother user experience.
  */
  useEffect(() => {
    const trimmedSearchTerm = searchTerm.trim().toLowerCase();

    if (trimmedSearchTerm) {
      setIsSearching(true);
    } else {
      setIsSearching(false);
    }

    const timer = setTimeout(async () => {
      /*
        MOST BORROWED MODE
        --------------------------------------------------
        This is a special view, not the normal category list.
        When the user clicks "Most Borrowed", the component calls a different
        backend function: getMostBorrowedBooks().

        The returned book records are mapped into the same shape as category rows
        so they can reuse the same table layout.
      */
      if (bookviewMode === "mostBorrowed") {
        try {
          const data = await getMostBorrowedBooks();

          const mapped = data.map((b) => ({
            /*
              The table expects CategoryID, but the most borrowed data is based on books.
              So BookID is temporarily placed in CategoryID for table rendering.
            */
            CategoryID: b.BookID,
            CategoryName: b.Title,
            DeweyCode: b.ISBN || "-",
            Description: b.CategoryName ? `Category: ${b.CategoryName}` : "Most borrowed book",
            BookCount: b.BorrowCount,
            IsActive: 1,
            CategoryColor: "#2f6b52",
            CategoryImage: "",
            CreatedAt: null,
            UpdatedAt: null,
          }));

          setDisplayedCategories(mapped);
          setPage(1);
          setIsSearching(false);
          return;
        } catch (err) {
          setError("Failed to load most borrowed books.");
          return;
        }
      }

      /*
        NORMAL CATEGORY MODE
        --------------------------------------------------
        This block handles the normal category table:
        1. Search by category name, Dewey code, or description.
        2. Filter by status: all, active, or inactive.
        3. Sort using the selected table heading.
      */
      const filtered = categories
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

      setDisplayedCategories(filtered);
      setPage(1);
      setIsSearching(false);
    }, trimmedSearchTerm ? 1000 : 0);

    /*
      Cleanup function.
      If the user types again before the timer finishes, the previous timer is cancelled.
      This prevents outdated searches from running after newer input has been entered.
    */
    return () => clearTimeout(timer);
  }, [categories, searchTerm, statusFilter, sortConfig, bookviewMode]);

  /*
    handleChange is a reusable input handler for most fields in the form.

    It supports:
    - normal text inputs,
    - textarea fields,
    - color input,
    - checkbox input.

    For checkboxes, it uses checked instead of value.
    For all other input types, it uses value.
  */
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  /*
    handleCategoryImageFile runs when the user selects an image file.

    Main steps:
    1. Get the first selected file.
    2. Resize/compress it using resizeCategoryImage().
    3. Check if the final base64 image is still too large.
    4. If valid, store the image string inside the form state.
    5. If something fails, show an error message.

    The image is saved in form.CategoryImage and later submitted to the backend.
  */
  const handleCategoryImageFile = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    resizeCategoryImage(file)
      .then((image) => {
        if (image.length > CATEGORY_IMAGE_MAX_SIZE) {
          setError("Category image is still too large. Please choose a smaller image.");
          return;
        }

        setForm((prev) => ({
          ...prev,
          CategoryImage: image,
        }));
        setError("");
      })
      .catch(() => setError("Could not read this image. Please try another file."));
  };

  /*
    resetForm returns the form and related states back to a clean starting point.
    This prevents old edit data, old success messages, or old validation errors
    from staying visible when the user opens the form again.
  */
  const resetForm = () => {
    setForm(emptyForm);
    setEditingId(null);
    setMessage("");
    setError("");
  };

  /*
    Opens the form for creating a new category.
    It resets all fields first so the user does not see old data from a previous edit.
  */
  const openCreateForm = () => {
    resetForm();
    setIsFormOpen(true);
  };

  /*
    Closes the Add/Edit modal.

    The form is not allowed to close while saving is in progress.
    This protects the user from accidentally closing the form during submit.
  */
  const closeForm = () => {
    if (isSaving) return;
    resetForm();
    setIsFormOpen(false);
  };

  /*
    validateForm checks all important form rules before sending data to the backend.

    Frontend validation improves user experience because the user gets quick feedback.
    Backend validation is still also needed for security, but frontend validation helps
    stop simple mistakes before the request is sent.

    Rules checked here:
    - Category name is required and must not be too long.
    - Dewey code is required, must not be too long, and must match the Dewey format.
    - Category color must be a valid hex color.
    - Archive reason is required if the category is inactive.
    - Description is required and limited to 200 characters.
  */
  const validateForm = () => {
    if (!form.CategoryName.trim()) return "Category name is required.";
    if (form.CategoryName.trim().length > 100) return "Category name is too long.";
    if (!form.DeweyCode.trim()) return "Dewey Code is required.";
    if (form.DeweyCode.trim().length > 10) return "Dewey Code is too long.";
    if (!deweyPattern.test(form.DeweyCode.trim())) return "Dewey Code must look like 500 or 500.1.";
    if (!/^#[0-9a-fA-F]{6}$/.test(form.CategoryColor)) return "Category color must look like #2f6b52.";
    if (!form.IsActive && !form.ArchiveReason) return "Archive reason is required when category is inactive.";
    if (!form.Description.trim()) return "Description is required.";
    if (form.Description.trim().length > 200) return "Description cannot be more than 200 characters.";
    return "";
  };

  /*
    handleSubmit runs when the Add/Edit form is submitted.

    Main flow:
    1. Stop the browser from refreshing the page.
    2. Clear previous messages/errors.
    3. Validate the form.
    4. Turn on saving state.
    5. Show loading overlay.
    6. If editingId exists, update the existing category.
    7. If editingId is null, create a new category.
    8. Close the form and refresh the category table.
    9. If an error occurs, show the backend error or a general error message.
    10. Always clear loading states at the end.
  */
  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage("");
    setError("");

    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    setIsSaving(true);
    const overlayTimer = showLoadingOverlay(
      editingId ? "Updating" : "Adding",
      editingId ? "Updating database" : "Adding data to database"
    );

    try {
      if (editingId) {
        await Promise.all([updateCategory(editingId, form), wait(LOADING_DELAY_MS)]);
        resetForm();
        setMessage("Category updated successfully!");
      } else {
        await Promise.all([addCategory(form), wait(LOADING_DELAY_MS)]);
        resetForm();
        setMessage("Category added successfully!");
      }

      setIsFormOpen(false);
      await fetchCategories(false);
    } catch (err) {
      setError(err.response?.data?.error || "Failed to save category.");
    } finally {
      clearTimeout(overlayTimer);
      setLoadingOverlay(null);
      setIsSaving(false);
    }
  };

  /*
    handleEdit prepares the form for editing an existing category.

    It takes the selected category row and copies its values into the form state.
    Then it sets editingId so handleSubmit knows this is an update, not a create.
  */
  const handleEdit = (category) => {
    setEditingId(category.CategoryID);
    setForm({
      CategoryName: category.CategoryName,
      Description: category.Description || "",
      DeweyCode: category.DeweyCode,
      IsActive: category.IsActive,
      CategoryColor: category.CategoryColor || "#2f6b52",
      CategoryImage: category.CategoryImage || "",
      ArchiveReason: category.ArchiveReason || "",
    });
    setMessage("");
    setError("");
    setIsFormOpen(true);
  };

  /*
    runToggleStatus performs the actual backend request for activating or
    deactivating a category.

    This is separated from handleToggleStatus because deactivation needs a
    confirmation modal and archive reason first, while activation can happen directly.
  */
  const runToggleStatus = async (category, nextStatus, archiveReason = "") => {
    setBusyAction(`status-${category.CategoryID}`);
    const overlayTimer = showLoadingOverlay("Changing Status", "Updating database");

    try {
      await Promise.all([
        toggleCategoryStatus(category.CategoryID, nextStatus, archiveReason),
        wait(LOADING_DELAY_MS),
      ]);
      setMessage(`Category ${nextStatus ? "activated" : "deactivated"} successfully.`);
      await fetchCategories(false);
    } catch (err) {
      setError(err.response?.data?.error || "Failed to change status.");
    } finally {
      clearTimeout(overlayTimer);
      setLoadingOverlay(null);
      setBusyAction("");
    }
  };

  /*
    handleToggleStatus decides what should happen when the power button is clicked.

    If the category is currently active, clicking means deactivate.
    Before deactivation, the system opens a confirmation modal and asks for reason.

    If the category is inactive, clicking means activate.
    Activation does not need an archive reason, so the backend action runs directly.
  */
  const handleToggleStatus = async (category) => {
    const nextStatus = !category.IsActive;
    if (!nextStatus) {
      setConfirmAction({ type: "deactivate", category, reason: "outdated" });
      return;
    }

    await runToggleStatus(category, nextStatus);
  };

  /*
    handleDelete does not delete immediately.
    It opens the confirmation modal first so the user can confirm the risky action.
  */
  const handleDelete = async (category) => {
    setConfirmAction({ type: "delete", category });
  };

  /*
    confirmDelete performs the actual delete request after the user confirms.

    The backend may reject deletion if books are already assigned to this category.
    That is why the catch block shows:
    "Cannot delete: Books are assigned to this category."
  */
  const confirmDelete = async (category) => {
    setConfirmAction(null);
    setBusyAction(`delete-${category.CategoryID}`);
    const overlayTimer = showLoadingOverlay("Deleting", "Removing data from database");

    try {
      await Promise.all([deleteCategory(category.CategoryID), wait(LOADING_DELAY_MS)]);
      setMessage("Category deleted successfully.");
      await fetchCategories(false);
    } catch (err) {
      setError("Cannot delete: Books are assigned to this category.");
    } finally {
      clearTimeout(overlayTimer);
      setLoadingOverlay(null);
      setBusyAction("");
    }
  };

  /*
    Closes the confirmation modal.
    If an action is already running, the modal cannot be closed.
  */
  const closeConfirmAction = () => {
    if (busyAction) return;
    setConfirmAction(null);
  };

  /*
    handleSort changes the sort field and direction when a sortable table header is clicked.

    If the same column is clicked again, the direction switches between ascending and descending.
    If a different column is clicked, sorting starts with ascending order.
  */
  const handleSort = (key) => {
    setSortConfig((current) => ({
      key,
      direction: current.key === key && current.direction === "asc" ? "desc" : "asc",
    }));
  };

  /*
    openCategoryDetails opens the details modal for one category.

    It also calls getCategoryBooks() to load all books assigned to that category.
    This gives the librarian more information before editing, deleting, or reviewing
    the category.
  */
  const openCategoryDetails = async (category) => {
    setDetailCategory(category);
    setDetailBooks([]);
    setIsLoadingDetails(true);

    try {
      const books = await getCategoryBooks(category.CategoryID);
      setDetailBooks(Array.isArray(books) ? books : []);
    } catch (err) {
      setError("Failed to load books for this category.");
    } finally {
      setIsLoadingDetails(false);
    }
  };

  /*
    closeCategoryDetails clears the selected category and assigned book list.
    This hides the details modal and resets its loading state.
  */
  const closeCategoryDetails = () => {
    setDetailCategory(null);
    setDetailBooks([]);
    setIsLoadingDetails(false);
  };

  /*
    Dashboard summary values.

    totalBooks counts the number of books assigned across all categories.
    activeCategories counts categories where IsActive equals 1.
    inactiveCategories is calculated by subtracting active from total.
  */
  const totalBooks = categories.reduce((sum, category) => sum + Number(category.BookCount || 0), 0);
  const activeCategories = categories.filter((category) => Number(category.IsActive) === 1).length;
  const inactiveCategories = categories.length - activeCategories;

  /*
    Pagination calculations.

    totalPages prevents the table from going below 1 page.
    safePage protects the UI if the current page becomes higher than the total pages
    after filtering/searching.
    startIndex decides where slicing should begin.
    paginatedCategories is the final list rendered on the current page.
    firstRecord and lastRecord are used for the "Showing X to Y" text.
  */
  const totalPages = Math.max(1, Math.ceil(displayedCategories.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const startIndex = (safePage - 1) * pageSize;
  const paginatedCategories = displayedCategories.slice(startIndex, startIndex + pageSize);
  const firstRecord = displayedCategories.length ? startIndex + 1 : 0;
  const lastRecord = Math.min(startIndex + pageSize, displayedCategories.length);

  return (
    <div className="app-shell">
      {/* Sidebar stays on the left side of the admin dashboard layout. */}
      <Sidebar />

      <main className="book-page category-page">
        {/*
          Page header / hero section.
          This explains which module the user is currently using.
        */}
        <div className="book-hero">
          <div>
            <p className="book-kicker">LIBRARY ADMINISTRATION</p>
            <h1>Book Category Management</h1>
            <p className="book-hero-text">
              Create, edit, and manage book categories
            </p>
          </div>
        </div>

        {/*
          Success and error alerts.
          These only appear when message or error contains text.
        */}
        {message && <div className="book-alert success">{message}</div>}
        {error && <div className="book-alert error">{error}</div>}

        {/*
          Statistic cards give the librarian a quick overview of the category module.
          They are calculated from the categories state loaded from the backend.
        */}
        <section className="category-stats" aria-label="Category summary">
          <article className="category-stat-card">
            <span>
              <small>Total Categories</small>
              <strong>{categories.length}</strong>
              <em>All category records</em>
            </span>
          </article>

          <article className="category-stat-card">
            <span>
              <small>Active Categories</small>
              <strong>{activeCategories}</strong>
              <em>Visible to students</em>
            </span>
          </article>

          <article className="category-stat-card">
            <span>
              <small>Inactive Categories</small>
              <strong>{inactiveCategories}</strong>
              <em>Hidden from students</em>
            </span>
          </article>

          <article className="category-stat-card">
            <span>
              <small>Assigned Books</small>
              <strong>{totalBooks}</strong>
              <em>Books linked to categories</em>
            </span>
          </article>
        </section>

        <div className="book-content-grid">
          <div className="book-table-panel">
            {/*
              Table heading area.
              Contains the title, record count, add button, and search input.
            */}
            <div className="book-table-header">
              <div>
                <h2>Book Categories</h2>
                <p>View, search and manage all category records ({displayedCategories.length}).</p>
              </div>

              <div className="book-table-tools">
                <button
                  type="button"
                  className="book-primary-button"
                  onClick={openCreateForm}
                  disabled={isFetching || isSaving}
                >
                  + Add New Category
                </button>

                <input
                  type="text"
                  placeholder={isSearching ? "Searching..." : "Search categories..."}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="book-search"
                  disabled={isFetching}
                />
              </div>
            </div>

            {/*
              Filter tabs.

              All, Active, and Inactive use normal category data.
              Most Borrowed switches the table into insight mode and loads borrowed-book data.
            */}
            <div className="category-filter-tabs" aria-label="Filter categories by status">
              {["all", "active", "inactive", "mostBorrowed"].map((status) => (
                <button
                  key={status}
                  type="button"
                  className={
                    (status === "mostBorrowed"
                      ? bookviewMode === "mostBorrowed"
                      : statusFilter === status && bookviewMode === "all")
                      ? "active"
                      : ""
                  }
                  onClick={() => {
                    if (status === "mostBorrowed") {
                      setBookviewMode("mostBorrowed");
                    } else {
                      setBookviewMode("all");
                      setStatusFilter(status);
                    }
                    setPage(1);
                  }}
                >
                  {status === "mostBorrowed"
                    ? "Most Borrowed"
                    : status === "all"
                      ? "All"
                      : status[0].toUpperCase() + status.slice(1)}
                </button>
              ))}
            </div>

            {/*
              Main table.
              The table changes slightly depending on whether the page is in normal mode
              or Most Borrowed mode.
            */}
            <div className="book-table-wrap">
              <table className="book-table">
                <thead>
                  <tr>
                    <th>ID</th>

                    {/* Sortable table header for category/book title. */}
                    <th>
                      <button type="button" className="sort-header" onClick={() => handleSort("CategoryName")}>
                        Category Name <ArrowUpDown size={13} />
                      </button>
                    </th>

                    {/* Sortable table header for Dewey code / ISBN in Most Borrowed mode. */}
                    <th>
                      <button type="button" className="sort-header" onClick={() => handleSort("DeweyCode")}>
                        Dewey Code <ArrowUpDown size={13} />
                      </button>
                    </th>

                    <th>Description</th>

                    {/* In Most Borrowed mode, BookCount is used as BorrowCount. */}
                    <th>
                      <button type="button" className="sort-header" onClick={() => handleSort("BookCount")}>
                        {bookviewMode === "mostBorrowed" ? "Borrow Count" : "Book Count"} <ArrowUpDown size={13} />
                      </button>
                    </th>

                    <th>Status</th>
                    <th>Created</th>

                    <th>
                      <button type="button" className="sort-header" onClick={() => handleSort("UpdatedAt")}>
                        Updated <ArrowUpDown size={13} />
                      </button>
                    </th>

                    <th>Actions</th>
                  </tr>
                </thead>

                <tbody>
                  {/* Show loading row when the first data load is running and no records are visible yet. */}
                  {isFetching && displayedCategories.length === 0 ? (
                    <tr>
                      <td colSpan="9" className="book-empty">
                        <span className="book-inline-loading">
                          <span className="book-spinner" />
                          Fetching information<span className="book-loading-dots" />
                        </span>
                      </td>
                    </tr>
                  ) : paginatedCategories.length > 0 ? (
                    /* Render only the records for the current page. */
                    paginatedCategories.map((cat) => (
                      <tr key={cat.CategoryID}>
                        <td className="book-id">{cat.CategoryID}</td>

                        <td className="book-title">
                          <span className="category-identity">
                            {/* Small colored dot helps users visually identify a category. */}
                            <span
                              className="category-color-dot"
                              style={{ backgroundColor: cat.CategoryColor || "#2f6b52" }}
                              aria-hidden="true"
                            />
                            <span>{cat.CategoryName}</span>
                          </span>
                        </td>

                        <td><code>{cat.DeweyCode}</code></td>
                        <td>{cat.Description || <em>No description</em>}</td>

                        <td>
                          <span className="book-count-badge">
                            {Number(cat.BookCount || 0)}
                          </span>
                        </td>

                        <td>
                          <span className={`book-status ${cat.IsActive ? "available" : "locked"}`}>
                            <span className="book-status-dot" />
                            {cat.IsActive ? "Active" : "Inactive"}
                          </span>
                        </td>

                        <td>{formatDate(cat.CreatedAt)}</td>
                        <td>{formatDate(cat.UpdatedAt)}</td>

                        <td className="book-row-actions">
                          {bookviewMode === "mostBorrowed" ? (
                            /*
                              In Most Borrowed mode, the row is an insight record.
                              It should not show edit/delete/status actions because it is not
                              a real category record.
                            */
                            <span className="book-readonly-action">Insight</span>
                          ) : (
                            <>
                              <button
                                type="button"
                                aria-label="View category details"
                                title="View category details"
                                onClick={() => openCategoryDetails(cat)}
                                disabled={Boolean(busyAction)}
                              >
                                <Eye size={15} />
                              </button>

                              <button
                                type="button"
                                aria-label="Edit category"
                                title="Edit category"
                                onClick={() => handleEdit(cat)}
                                disabled={Boolean(busyAction)}
                              >
                                <Pencil size={15} />
                              </button>

                              <button
                                type="button"
                                aria-label={cat.IsActive ? "Deactivate category" : "Activate category"}
                                title={cat.IsActive ? "Deactivate category" : "Activate category"}
                                className={cat.IsActive ? "switch-off" : "switch-on"}
                                onClick={() => handleToggleStatus(cat)}
                                disabled={Boolean(busyAction)}
                              >
                                <Power size={15} />
                              </button>

                              <button
                                type="button"
                                aria-label="Delete category"
                                title="Delete category"
                                onClick={() => handleDelete(cat)}
                                disabled={Boolean(busyAction)}
                              >
                                <Trash2 size={15} />
                              </button>
                            </>
                          )}
                        </td>
                      </tr>
                    ))
                  ) : (
                    /* Empty state when search/filter returns no results. */
                    <tr>
                      <td colSpan="9" className="book-empty">
                        {searchTerm ? "No categories found." : "No categories added yet."}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/*
              Pagination footer.
              Allows the user to move between pages and choose how many rows to show.
            */}
            <div className="book-pagination">
              <span>
                Showing {firstRecord} to {lastRecord} of {displayedCategories.length} records
              </span>

              <div className="book-page-buttons" aria-label="Category pagination">
                <button type="button" disabled={safePage <= 1} onClick={() => setPage(1)}>
                  &laquo;
                </button>
                <button type="button" disabled={safePage <= 1} onClick={() => setPage((current) => Math.max(1, current - 1))}>
                  &lsaquo;
                </button>
                <strong>{safePage}</strong>
                <button type="button" disabled={safePage >= totalPages} onClick={() => setPage((current) => Math.min(totalPages, current + 1))}>
                  &rsaquo;
                </button>
                <button type="button" disabled={safePage >= totalPages} onClick={() => setPage(totalPages)}>
                  &raquo;
                </button>
              </div>

              <select
                value={pageSize}
                onChange={(event) => {
                  setPageSize(Number(event.target.value));
                  setPage(1);
                }}
                aria-label="Rows per page"
              >
                <option value="5">5 / page</option>
                <option value="10">10 / page</option>
                <option value="20">20 / page</option>
              </select>
            </div>
          </div>
        </div>

        {/*
          Add/Edit Category Modal
          --------------------------------------------------
          This modal is reused for both creating and updating categories.
          The text and submit behavior change depending on whether editingId exists.
        */}
        {isFormOpen && (
          <div className="book-modal-backdrop" role="presentation" onMouseDown={closeForm}>
            <div
              className="book-modal"
              role="dialog"
              aria-modal="true"
              aria-labelledby="category-form-title"
              onMouseDown={(event) => event.stopPropagation()}
            >
              <div className="book-section-title">
                <p>{editingId ? "EDIT CATEGORY" : "ADD NEW CATEGORY"}</p>
                <h2 id="category-form-title">{editingId ? "Update Category" : "Create New Category"}</h2>
              </div>

              {error && <div className="book-modal-alert error">{error}</div>}

              <form onSubmit={handleSubmit} className="book-form">
                <div className="book-field">
                  <label>Category Name *</label>
                  <input
                    name="CategoryName"
                    placeholder="e.g., Science Fiction"
                    value={form.CategoryName}
                    onChange={handleChange}
                    required
                    autoFocus
                    disabled={isSaving}
                  />
                </div>

                <div className="book-field">
                  <label>Dewey Code *</label>
                  <input
                    name="DeweyCode"
                    placeholder="e.g., 500"
                    value={form.DeweyCode}
                    onChange={handleChange}
                    required
                    pattern="\d{3}(\.\d{1,3})?"
                    title="Use a Dewey code like 500 or 500.1"
                    disabled={isSaving}
                  />
                </div>

                <div className="book-field">
                  <label>Display Color *</label>
                  <div className="book-color-row">
                    {/* Visual color picker. */}
                    <input
                      type="color"
                      name="CategoryColor"
                      value={form.CategoryColor}
                      onChange={handleChange}
                      disabled={isSaving}
                    />

                    {/* Text version of the same color value, useful if the user wants to paste a hex code. */}
                    <input
                      name="CategoryColor"
                      value={form.CategoryColor}
                      onChange={handleChange}
                      pattern="#[0-9a-fA-F]{6}"
                      title="Use a hex color like #2f6b52"
                      disabled={isSaving}
                    />
                  </div>
                </div>

                <div className="book-field full">
                  <label>Category Image</label>
                  <div className="category-image-field">
                    {/* Preview area. If an image exists, it is shown as a background image. */}
                    <div
                      className="category-image-preview"
                      style={form.CategoryImage ? { backgroundImage: `url(${form.CategoryImage})` } : undefined}
                    >
                      {!form.CategoryImage && <span>No image selected</span>}
                    </div>

                    <div className="category-image-controls">
                      {/* User can paste an image URL or base64 image string. */}
                      <input
                        name="CategoryImage"
                        placeholder="Paste an image URL, or choose a file below"
                        value={form.CategoryImage}
                        onChange={handleChange}
                        disabled={isSaving}
                      />

                      {/* User can upload a local image file. */}
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleCategoryImageFile}
                        disabled={isSaving}
                      />

                      {form.CategoryImage && (
                        <button
                          type="button"
                          onClick={() => setForm((prev) => ({ ...prev, CategoryImage: "" }))}
                          className="book-ghost-button"
                          disabled={isSaving}
                        >
                          Remove Image
                        </button>
                      )}
                    </div>
                  </div>
                  <small className="book-field-hint">Saved to the database when you submit the form.</small>
                </div>

                <div className="book-field full">
                  <label>Description *</label>
                  <textarea
                    name="Description"
                    placeholder="Short description of this category..."
                    value={form.Description}
                    onChange={handleChange}
                    maxLength="200"
                    rows="4"
                    required
                    disabled={isSaving}
                  />
                  <small className="book-field-hint">
                    {form.Description.trim().length}/200 characters
                  </small>
                </div>

                {/* Checkbox decides whether this category is visible to students. */}
                <label className="book-toggle-row">
                  <input
                    type="checkbox"
                    name="IsActive"
                    checked={form.IsActive}
                    onChange={handleChange}
                    disabled={isSaving}
                  />
                  <span>Active (Visible to students)</span>
                </label>

                {/* Archive reason is only needed when the category is inactive. */}
                {!form.IsActive && (
                  <div className="book-field full">
                    <label>Archive Reason *</label>
                    <select
                      name="ArchiveReason"
                      value={form.ArchiveReason}
                      onChange={handleChange}
                      required={!form.IsActive}
                      disabled={isSaving}
                    >
                      <option value="">Select reason</option>
                      {archiveReasons.map((reason) => (
                        <option key={reason.value} value={reason.value}>
                          {reason.label}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="book-actions">
                  <button type="submit" className="book-primary-button" disabled={isSaving}>
                    {editingId ? "Update Category" : "Add Category"}
                  </button>
                  <button type="button" onClick={closeForm} className="book-ghost-button" disabled={isSaving}>
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/*
          Category Details Modal
          --------------------------------------------------
          Opens when the user clicks the eye icon.
          It shows important category information and all books assigned to it.
        */}
        {detailCategory && (
          <div className="book-modal-backdrop" role="presentation" onMouseDown={closeCategoryDetails}>
            <div
              className="book-modal category-detail-modal"
              role="dialog"
              aria-modal="true"
              aria-labelledby="category-detail-title"
              onMouseDown={(event) => event.stopPropagation()}
            >
              <div className="book-section-title">
                <p>CATEGORY DETAILS</p>
                <h2 id="category-detail-title">{detailCategory.CategoryName}</h2>
              </div>

              <dl className="category-detail-grid">
                <div>
                  <dt>Dewey Code</dt>
                  <dd>{detailCategory.DeweyCode}</dd>
                </div>

                <div>
                  <dt>Status</dt>
                  <dd>{detailCategory.IsActive ? "Active" : "Inactive"}</dd>
                </div>

                <div>
                  <dt>Display</dt>
                  <dd>
                    <span className="category-identity">
                      <span
                        className="category-color-dot"
                        style={{ backgroundColor: detailCategory.CategoryColor || "#2f6b52" }}
                        aria-hidden="true"
                      />
                      <span>{detailCategory.CategoryColor || "#2f6b52"}</span>
                    </span>
                  </dd>
                </div>

                <div>
                  <dt>Image</dt>
                  <dd>{detailCategory.CategoryImage ? "Added" : "No image"}</dd>
                </div>

                <div>
                  <dt>Book Count</dt>
                  <dd>{Number(detailCategory.BookCount || 0)}</dd>
                </div>

                {!detailCategory.IsActive && detailCategory.ArchiveReason && (
                  <div>
                    <dt>Archive Reason</dt>
                    <dd>{detailCategory.ArchiveReason}</dd>
                  </div>
                )}

                <div>
                  <dt>Created</dt>
                  <dd>{formatDate(detailCategory.CreatedAt)}</dd>
                </div>

                <div>
                  <dt>Updated</dt>
                  <dd>{formatDate(detailCategory.UpdatedAt)}</dd>
                </div>

                <div className="full">
                  <dt>Description</dt>
                  <dd>{detailCategory.Description}</dd>
                </div>
              </dl>

              <h3 className="category-books-title">Assigned Books</h3>

              <div className="category-books-list">
                {isLoadingDetails ? (
                  <div className="book-empty">Loading books...</div>
                ) : detailBooks.length ? (
                  detailBooks.map((book) => (
                    <article key={book.BookID} className="category-book-item">
                      <strong>{book.Title}</strong>
                      <span>ISBN: {book.ISBN}</span>
                      <span>Available: {Number(book.AvailableCopies || 0)}</span>
                      <em>{book.IsBorrowable ? "Borrowable" : "Reference only"}</em>
                    </article>
                  ))
                ) : (
                  <div className="book-empty">No books assigned to this category.</div>
                )}
              </div>

              <div className="book-actions">
                <button type="button" className="book-ghost-button" onClick={closeCategoryDetails}>
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/*
          Confirmation Modal
          --------------------------------------------------
          Used for delete and deactivate actions.

          Delete is risky because it removes the category.
          Deactivate is also important because the category becomes hidden from students.
          Therefore, both actions ask the user for confirmation first.
        */}
        {confirmAction && (
          <div className="book-modal-backdrop confirm-backdrop" role="presentation" onMouseDown={closeConfirmAction}>
            <div
              className="book-modal confirm-modal"
              role="dialog"
              aria-modal="true"
              aria-labelledby="category-confirm-title"
              onMouseDown={(event) => event.stopPropagation()}
            >
              <div className="book-section-title">
                <p>{confirmAction.type === "delete" ? "DELETE CATEGORY" : "DEACTIVATE CATEGORY"}</p>
                <h2 id="category-confirm-title">
                  {confirmAction.type === "delete" ? "Delete this category?" : "Deactivate this category?"}
                </h2>
              </div>

              <p className="confirm-copy">
                {confirmAction.type === "delete"
                  ? `Are you sure you want to delete "${confirmAction.category.CategoryName}"? This cannot be undone.`
                  : `Choose why "${confirmAction.category.CategoryName}" is being switched inactive.`}
              </p>

              {/* Archive reason choices are shown only for deactivation. */}
              {confirmAction.type === "deactivate" && (
                <div className="archive-reason-options" role="radiogroup" aria-label="Archive reason">
                  {archiveReasons.map((reason) => (
                    <label key={reason.value} className="archive-reason-card">
                      <input
                        type="radio"
                        name="ArchiveReason"
                        value={reason.value}
                        checked={confirmAction.reason === reason.value}
                        onChange={() => setConfirmAction((current) => ({ ...current, reason: reason.value }))}
                      />
                      <span>{reason.label}</span>
                    </label>
                  ))}
                </div>
              )}

              <div className="book-actions">
                <button
                  type="button"
                  className={confirmAction.type === "delete" ? "book-danger-button" : "book-primary-button"}
                  onClick={() => {
                    if (confirmAction.type === "delete") {
                      confirmDelete(confirmAction.category);
                    } else {
                      const { category, reason } = confirmAction;
                      setConfirmAction(null);
                      runToggleStatus(category, false, reason);
                    }
                  }}
                >
                  {confirmAction.type === "delete" ? "Delete" : "Deactivate"}
                </button>

                <button type="button" className="book-ghost-button" onClick={closeConfirmAction}>
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/*
          Full-page loading overlay.
          This appears during longer actions such as fetching, adding, updating,
          deleting, and changing category status.
        */}
        {loadingOverlay && (
          <div className="book-page-loading" role="status" aria-live="polite">
            <div className="book-page-loading-panel">
              <span className="book-page-spinner" />
              {loadingOverlay.phase === "large" ? (
                <strong>{loadingOverlay.title}</strong>
              ) : (
                <span className="book-page-loading-detail">
                  {loadingOverlay.detail}
                  <span className="book-runner-dots" />
                </span>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

/*
  compareCategories is a helper function used by the table sorting system.

  It receives:
  - a: first record
  - b: second record
  - sortConfig: the selected key and direction

  It handles different data types correctly:
  - BookCount is numeric, so it is compared as a number.
  - UpdatedAt is a date, so it is compared as a Date object.
  - Other fields are compared as strings using localeCompare().

  direction controls whether the result is ascending or descending.
*/
function compareCategories(a, b, sortConfig) {
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
}

/*
  resizeCategoryImage converts an uploaded image file into a compressed base64 string.

  Why this is needed:
  - A raw image from a phone/camera can be very large.
  - Large images slow down the frontend and backend.
  - If images are stored as base64 in the database, size control becomes even more important.

  Main process:
  1. FileReader reads the selected file as a data URL.
  2. A browser Image object loads that data URL.
  3. A canvas is created.
  4. The image is drawn on the canvas at a smaller size if needed.
  5. The canvas exports a JPEG base64 string.
  6. Quality is reduced step by step until the output is below the max size
     or until the minimum quality limit is reached.
*/
function resizeCategoryImage(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onerror = reject;
    reader.onload = () => {
      const source = typeof reader.result === "string" ? reader.result : "";
      const image = new Image();

      image.onerror = reject;
      image.onload = () => {
        const maxSide = 900;

        /*
          scale keeps the image proportional.
          Math.min(1, ...) means small images are not enlarged.
          Only images larger than maxSide are reduced.
        */
        const scale = Math.min(1, maxSide / Math.max(image.width, image.height));

        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.round(image.width * scale));
        canvas.height = Math.max(1, Math.round(image.height * scale));

        const context = canvas.getContext("2d");
        context.drawImage(image, 0, 0, canvas.width, canvas.height);

        /*
          Start with good image quality.
          If the output is still too large, reduce quality little by little.
        */
        let quality = 0.78;
        let output = canvas.toDataURL("image/jpeg", quality);
        while (output.length > CATEGORY_IMAGE_MAX_SIZE && quality > 0.42) {
          quality -= 0.08;
          output = canvas.toDataURL("image/jpeg", quality);
        }

        resolve(output);
      };

      image.src = source;
    };

    reader.readAsDataURL(file);
  });
}

/*
  formatDate converts database date values into a readable local date/time string.

  If the value is empty, null, or undefined, it returns "N/A" instead of showing
  an invalid date.
*/
function formatDate(value) {
  return value ? new Date(value).toLocaleString() : "N/A";
}

export default BookCategoryManagement;
