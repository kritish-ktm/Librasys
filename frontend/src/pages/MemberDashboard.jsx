import { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { getActiveCategories } from '../services/bookCategoryService';
import { getBooks } from '../services/bookService';
import './MemberDashboard.css';

const API_BASE_URL = 'http://localhost:5000';

const DAILY_FINE_RATE = 1;

const ASSISTANT_WELCOME =
  'Hi, I am your LibraSys assistant. Ask me things like "recommend science books", "what is Dewey 500?", "how do I borrow?", or "find fiction".';

const normalizeText = (value) =>
  String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const assistantStopWords = new Set([
  'the', 'and', 'for', 'with', 'about', 'book', 'books', 'please', 'show',
  'find', 'recommend', 'suggest', 'give', 'me', 'some', 'any', 'from', 'what',
  'which', 'that', 'this', 'are', 'there', 'available', 'category', 'categories',
  'dewey', 'explain', 'tell', 'want', 'need', 'help',
]);

const topicAliases = {
  computer: ['coding', 'programming', 'software', 'developer', 'web', 'database', 'ai', 'cyber', 'network'],
  science: ['biology', 'chemistry', 'physics', 'experiment', 'research', 'nature', 'discovery'],
  fiction: ['novel', 'story', 'stories', 'literature', 'imaginary', 'creative'],
  history: ['war', 'ancient', 'civilization', 'civilisations', 'political', 'past', 'culture'],
  mathematics: ['math', 'maths', 'algebra', 'calculus', 'geometry', 'statistics', 'equation'],
  reference: ['dictionary', 'encyclopedia', 'encyclopaedia', 'atlas', 'manual', 'lookup'],
  philosophy: ['logic', 'ethics', 'morality', 'thinking', 'existence'],
  religion: ['spiritual', 'theology', 'scripture', 'belief', 'tradition'],
  language: ['grammar', 'vocabulary', 'communication', 'linguistics'],
  arts: ['art', 'painting', 'design', 'architecture', 'photography', 'illustration'],
  business: ['economics', 'finance', 'marketing', 'accounting', 'entrepreneurship', 'leadership'],
  medical: ['health', 'healthcare', 'anatomy', 'disease', 'nursing', 'fitness', 'mental'],
  technology: ['robotics', 'innovation', 'digital', 'emerging', 'modern tech'],
  children: ['kids', 'child', 'picture', 'early readers', 'storytelling'],
  travel: ['geography', 'tourism', 'map', 'maps', 'countries', 'destination'],
  poetry: ['poem', 'poems', 'lyrical', 'poetic'],
};

const getQueryTokens = (text) =>
  normalizeText(text)
    .split(' ')
    .filter((token) => token.length > 2 && !assistantStopWords.has(token));

const expandTokens = (tokens) => {
  const expanded = new Set(tokens);

  tokens.forEach((token) => {
    Object.entries(topicAliases).forEach(([topic, aliases]) => {
      if (token === topic || aliases.some((alias) => normalizeText(alias).includes(token) || token.includes(normalizeText(alias)))) {
        expanded.add(topic);
        aliases.forEach((alias) => normalizeText(alias).split(' ').forEach((word) => expanded.add(word)));
      }
    });
  });

  return [...expanded].filter(Boolean);
};

const getBookCategory = (book, categories) =>
  categories.find((category) => Number(category.CategoryID) === Number(book.CategoryID));

const scoreCategoryForQuery = (category, queryTokens) => {
  const name = normalizeText(category.CategoryName);
  const description = normalizeText(category.Description);
  const dewey = String(category.DeweyCode || '').toLowerCase();
  const id = String(category.CategoryID || '');

  return queryTokens.reduce((score, token) => {
    if (name === token) return score + 8;
    if (name.includes(token)) return score + 5;
    if (dewey.includes(token)) return score + 6;
    if (id === token) return score + 4;
    if (description.includes(token)) return score + 3;
    return score;
  }, 0);
};

const findBestCategory = (text, categories) => {
  const query = normalizeText(text);
  const tokens = expandTokens(getQueryTokens(text));
  const deweyMatch = query.match(/\b\d{3}(?:\.\d{1,3})?\b/);

  if (deweyMatch) {
    const byDewey = categories.find((category) => String(category.DeweyCode || '') === deweyMatch[0]);
    if (byDewey) return byDewey;
  }

  return categories
    .map((category) => ({ category, score: scoreCategoryForQuery(category, tokens) }))
    .filter((item) => item.score > 0)
    .sort((first, second) => second.score - first.score || first.category.CategoryName.localeCompare(second.category.CategoryName))[0]?.category;
};

const scoreBookForQuery = (book, category, queryTokens) => {
  const searchableText = normalizeText(
    `${book.Title} ${book.ISBN} ${category?.CategoryName || ''} ${category?.DeweyCode || ''} ${category?.Description || ''}`
  );

  return queryTokens.reduce((score, token) => {
    if (!token) return score;
    if (normalizeText(book.Title).includes(token)) return score + 4;
    if (normalizeText(category?.CategoryName).includes(token)) return score + 3;
    if (String(category?.DeweyCode || '').includes(token)) return score + 3;
    if (normalizeText(category?.Description).includes(token)) return score + 2;
    if (searchableText.includes(token)) return score + 1;
    return score;
  }, 0);
};

const formatBookList = (items) =>
  items
    .map(({ book, category }, index) => {
      const copies = Number(book.AvailableCopies || 0);
      const dewey = category?.DeweyCode ? `, Dewey ${category.DeweyCode}` : '';
      return `${index + 1}. ${book.Title} - ${category?.CategoryName || 'Uncategorised'}${dewey} (${copies} ${copies === 1 ? 'copy' : 'copies'} available)`;
    })
    .join('\n');
function MemberDashboard() {
  const [loans, setLoans] = useState([]);
  const [fines, setFines] = useState([]);
  const [categories, setCategories] = useState([]);
  const [books, setBooks] = useState([]);
  const [assistantQuestion, setAssistantQuestion] = useState('');
  const [assistantMessages, setAssistantMessages] = useState([
    { role: 'assistant', text: ASSISTANT_WELCOME },
  ]);
  const [assistantOpen, setAssistantOpen] = useState(false);
  const navigate = useNavigate();

  const token = localStorage.getItem('token');
  const name = localStorage.getItem('name');

  useEffect(() => {
    axios.get(`${API_BASE_URL}/loans/my`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then((res) => {
        const loanRows = Array.isArray(res.data) ? res.data : [];
        setLoans(loanRows);

        axios.get(`${API_BASE_URL}/api/fines/my`, {
          headers: { Authorization: `Bearer ${token}` }
        })
          .then((fineRes) => {
            const fineRows = Array.isArray(fineRes.data) ? fineRes.data : [];
            setFines(fineRows.length ? fineRows : calculateFinesFromLoans(loanRows));
          })
          .catch(() => setFines(calculateFinesFromLoans(loanRows)));
      })
      .catch((err) => console.error('Failed to load loans:', err));

    getActiveCategories()
      .then((res) => setCategories(Array.isArray(res) ? res : []))
      .catch((err) => console.error('Failed to load categories:', err));

    getBooks()
      .then((res) => setBooks(Array.isArray(res) ? res : []))
      .catch((err) => console.error('Failed to load books:', err));
  }, [token]);

  const handleLogout = () => {
    localStorage.clear();
    navigate('/');
  };

  const activeLoans = loans.filter((loan) => !loan.ReturnDate && loan.Status !== 'Returned').length;
  const unpaidFines = fines.filter((fine) => String(fine.Status || '').toLowerCase() !== 'paid').length;
  const availableBooks = books.filter((book) => Number(book.AvailableCopies || 0) > 0 && book.IsBorrowable);

  const addAssistantExchange = (question, answer) => {
    setAssistantMessages((current) => [
      ...current,
      { role: 'user', text: question },
      { role: 'assistant', text: answer },
    ]);
  };

  // AI ASSISTANT: Ranks real catalogue books against the user's words.
  const createRecommendationAnswer = (text = '') => {
    const queryTokens = expandTokens(getQueryTokens(text));
    const matchedCategory = findBestCategory(text, categories);

    const rankedBooks = availableBooks
      .map((book) => {
        const category = getBookCategory(book, categories);
        const categoryBoost = matchedCategory && Number(category?.CategoryID) === Number(matchedCategory.CategoryID) ? 5 : 0;
        const score = queryTokens.length ? scoreBookForQuery(book, category, queryTokens) + categoryBoost : 1;
        return { book, category, score };
      })
      .filter((item) => item.score > 0)
      .sort((first, second) => second.score - first.score || Number(second.book.AvailableCopies || 0) - Number(first.book.AvailableCopies || 0))
      .slice(0, 5);

    if (!rankedBooks.length) {
      if (matchedCategory) {
        return `${matchedCategory.CategoryName} sounds like the right category for your request.\n` +
          `${matchedCategory.Description || 'This category groups related books.'}\n\n` +
          'I could not find currently available borrowable books in that category, but you can still open Browse Books to inspect the catalogue.';
      }

      return 'I checked the catalogue, but I could not find a strong match for that request. Try a subject like science, fiction, computer science, health, business, travel, or a Dewey code like 500.';
    }

    const categoryNote = matchedCategory
      ? `\n\nWhy: your question matches ${matchedCategory.CategoryName} (${matchedCategory.DeweyCode}) - ${matchedCategory.Description || 'a related library category.'}`
      : '';

    return `I found these good matches from the current catalogue:\n${formatBookList(rankedBooks)}${categoryNote}\n\nYou can open Browse Books to explore the category and borrow an available copy.`;
  };

  // AI ASSISTANT: Explains category meaning and uses the real category/book count.
  const createCategoryAnswer = (text = '') => {
    const category = findBestCategory(text, categories) || categories[0];

    if (!category) {
      return 'I do not have active category data loaded yet. Please try again after the catalogue finishes loading.';
    }

    const categoryBooks = books.filter(
      (book) => Number(book.CategoryID) === Number(category.CategoryID)
    );
    const availableInCategory = categoryBooks.filter(
      (book) => Number(book.AvailableCopies || 0) > 0 && book.IsBorrowable
    );

    const examples = categoryBooks
      .slice(0, 3)
      .map((book) => `• ${book.Title}${Number(book.AvailableCopies || 0) > 0 ? ' - available' : ' - not available right now'}`)
      .join('\n');

    return `${category.CategoryName} uses Dewey code ${category.DeweyCode}.\n` +
      `${category.Description || 'This category groups books from the same subject area.'}\n\n` +
      `In LibraSys, this category currently has ${categoryBooks.length} book record(s), with ${availableInCategory.length} available to borrow.` +
      `${examples ? `\n\nExamples:\n${examples}` : ''}`;
  };

  const createSearchHelpAnswer = () =>
    'You can ask me naturally. Try:\n' +
    '• recommend computer books\n' +
    '• suggest books about ethics\n' +
    '• explain Dewey 500\n' +
    '• what category is business?\n' +
    '• find fiction\n' +
    '• are there history books available?\n' +
    '• how do I borrow a book?';

  const createBorrowingAnswer = () =>
    `Based on your dashboard, you currently have ${activeLoans} active loan(s) and ${unpaidFines} unpaid or pending fine record(s).\n\n` +
    'To borrow a book: open Browse Books, choose a category, select an available book, and use the borrow option. Return books before the due date to avoid fines.';

  const createSmartSearchAnswer = (text) => {
    const matchedCategory = findBestCategory(text, categories);

    if (!matchedCategory) {
      return createSearchHelpAnswer();
    }

    return `For that search, I would start with ${matchedCategory.CategoryName} (${matchedCategory.DeweyCode}).\n` +
      `${matchedCategory.Description || 'This category contains related library resources.'}\n\n` +
      `Try searching with: "${matchedCategory.CategoryName}", "${matchedCategory.DeweyCode}", or one important keyword from the description.`;
  };

  const createCategoryListAnswer = () => {
    if (!categories.length) {
      return 'I do not have active category data loaded yet. Please try again in a moment.';
    }

    return `These active categories are available right now:\n${categories
      .slice(0, 16)
      .map((category) => {
        const shortDescription = category.Description
          ? `${category.Description.slice(0, 90)}${category.Description.length > 90 ? '...' : ''}`
          : 'No description added yet.';
        return `• ${category.CategoryName} (${category.DeweyCode}) - ${shortDescription}`;
      })
      .join('\n')}`;
  };

  const createAvailabilityAnswer = (text) => {
    const tokens = expandTokens(getQueryTokens(text));
    const matchedCategory = findBestCategory(text, categories);

    const matches = books
      .map((book) => {
        const category = getBookCategory(book, categories);
        return {
          book,
          category,
          score: scoreBookForQuery(book, category, tokens) +
            (matchedCategory && Number(category?.CategoryID) === Number(matchedCategory.CategoryID) ? 4 : 0),
        };
      })
      .filter((item) => item.score > 0)
      .sort((first, second) => second.score - first.score)
      .slice(0, 5);

    if (!matches.length) {
      return 'Tell me a title, category, subject, or Dewey code and I can check availability. Example: "is Clean Code available?" or "science copies".';
    }

    return `Here is the availability I found:\n${matches
      .map(({ book, category }) => {
        const copies = Number(book.AvailableCopies || 0);
        const status = copies > 0 && book.IsBorrowable ? 'available' : 'not currently borrowable';
        return `• ${book.Title} - ${status} (${copies} copies, ${category?.CategoryName || 'Uncategorised'})`;
      })
      .join('\n')}`;
  };

  const createLoanSummaryAnswer = () => {
    const currentLoans = loans.filter((loan) => !loan.ReturnDate && loan.Status !== 'Returned');

    if (!currentLoans.length) {
      return 'You do not appear to have active loans right now.';
    }

    return `You have ${currentLoans.length} active loan(s):\n${currentLoans
      .slice(0, 5)
      .map((loan) => `• ${loan.Title || loan.BookTitle || 'Loaned book'}${loan.DueDate ? ` - due ${new Date(loan.DueDate).toLocaleDateString()}` : ''}`)
      .join('\n')}`;
  };

  const createFineSummaryAnswer = () => {
    const pendingFines = fines.filter((fine) => String(fine.Status || '').toLowerCase() !== 'paid');

    if (!pendingFines.length) {
      return 'You do not appear to have unpaid fines right now.';
    }

    return `You have ${pendingFines.length} unpaid or pending fine record(s):\n${pendingFines
      .slice(0, 5)
      .map((fine) => `• ${fine.Title || fine.BookTitle || 'Fine record'} - $${fine.Amount || fine.AmountDue || 0} (${fine.Status || 'Pending'})`)
      .join('\n')}`;
  };

  // AI ASSISTANT: Chooses the best local skill for the user's question.
  const createAssistantAnswer = (text) => {
    const query = normalizeText(text);
    const hasRecommendationIntent =
      query.includes('recommend') ||
      query.includes('suggest') ||
      query.includes('find') ||
      query.includes('looking for') ||
      query.includes('books about') ||
      query.includes('interested in');

    if (!query) {
      return 'Ask me a question first, or use one of the quick buttons above.';
    }

    if (query.includes('hello') || query.includes('hi ') || query === 'hi' || query.includes('hey')) {
      return `Hi${name ? ` ${name}` : ''}. I can recommend books, explain categories, check availability, and help with borrowing questions.`;
    }

    if (query.includes('what can you do') || query.includes('features') || query.includes('commands')) {
      return 'I can help with:\n• book recommendations\n• category and Dewey explanations\n• availability checks\n• search suggestions\n• loan and fine summaries\n• borrowing guidance';
    }

    if (query.includes('thank')) {
      return 'You are welcome. I am here if you want help finding another book.';
    }

    if (query.includes('my loan') || query.includes('active loan') || query.includes('due date')) {
      return createLoanSummaryAnswer();
    }

    if (query.includes('my fine') || query.includes('unpaid fine') || query.includes('pending fine')) {
      return createFineSummaryAnswer();
    }

    if (query.includes('available') || query.includes('availability') || query.includes('copies') || query.includes('copy')) {
      return createAvailabilityAnswer(query);
    }

    if (query.includes('list categor') || query.includes('all categor') || query.includes('show categor') || query.includes('what categories')) {
      return createCategoryListAnswer();
    }

    if (query.includes('borrow') || query.includes('loan') || query.includes('fine') || query.includes('due') || query.includes('return')) {
      return createBorrowingAnswer();
    }

    if (query.includes('search') || (query.includes('how') && !hasRecommendationIntent) || query.includes('help')) {
      return createSmartSearchAnswer(query);
    }

    if (query.includes('category') || query.includes('dewey') || /\b\d{3}\b/.test(query) || query.includes('explain') || query.includes('meaning')) {
      return createCategoryAnswer(query);
    }

    if (hasRecommendationIntent) {
      return createRecommendationAnswer(query);
    }

    return createRecommendationAnswer(query);
  };

  const askAssistant = (question) => {
    const prompt = question.trim();
    const answer = createAssistantAnswer(prompt);
    addAssistantExchange(prompt || 'Help me use the library assistant.', answer);
    setAssistantQuestion('');
    setAssistantOpen(true);
  };

  const handleAssistantAsk = (event) => {
    event.preventDefault();
    askAssistant(assistantQuestion);
  };

  return (
    <div className="member-dashboard-page">
      <header className="member-dashboard-hero">
        <nav className="member-dashboard-nav" aria-label="Member navigation">
          <button className="member-logo" onClick={() => navigate('/')}>
            LibraSys
          </button>
          <div className="member-nav-actions">
            <button onClick={() => navigate('/browse-categories')}>Browse</button>
             <button onClick={() => navigate('/profile')}>
    My Profile
  </button>
            <button onClick={handleLogout}>Logout</button>
          </div>
        </nav>

        <div className="member-hero-content">
          <span className="member-kicker">Member dashboard</span>
          <h1>Welcome back{name ? `, ${name}` : ''}.</h1>
          <p>
            Continue browsing the collection, check your borrowed books, and keep track of any fines from one place.
          </p>

          <div className="member-hero-actions">
            <button className="member-primary-action" onClick={() => navigate('/browse-categories')}>
              Browse Books
            </button>
            <button className="member-secondary-action" onClick={() => navigate('/my-loans')}>
              My Loans
            </button>
            <button className="member-secondary-action" onClick={() => navigate('/my-fines')}>
              My Fines
            </button>
            <button
    className="member-secondary-action"
    onClick={() => navigate('/profile')}
  >
    My Profile
  </button>
          </div>
        </div>
      </header>

      <main className="member-dashboard-main">
        <section className="member-summary-grid" aria-label="Member summary">
          <button className="member-summary-card" onClick={() => navigate('/my-loans')}>
            <span>My Loans</span>
            <strong>{activeLoans}</strong>
            <em>Active borrowed books</em>
          </button>
          <button className="member-summary-card" onClick={() => navigate('/my-fines')}>
            <span>My Fines</span>
            <strong>{unpaidFines}</strong>
            <em>Unpaid or pending fines</em>
          </button>
          <button className="member-summary-card" onClick={() => navigate('/browse-categories')}>
            <span>Categories</span>
            <strong>{categories.length}</strong>
            <em>Available collections</em>
          </button>
        </section>

        <section className="member-category-section">
          <div className="member-section-heading">
            <span className="member-kicker">Organised discovery</span>
            <h2>Browse by Category</h2>
            <p>Pick a collection and continue into the catalogue.</p>
          </div>

          <div className="member-category-grid">
            {categories.slice(0, 6).map((category) => (
              <button
                key={category.CategoryID}
                className="member-category-card"
                style={getCategoryStyle(category)}
                onClick={() => navigate('/browse-categories')}
              >
                <span
                  className="member-category-image"
                  style={category.CategoryImage ? { backgroundImage: `url(${category.CategoryImage})` } : undefined}
                  aria-hidden="true"
                />
                <span className="member-category-copy">
                  <strong>{category.CategoryName}</strong>
                  <small>{category.Description || 'Explore this collection'}</small>
                </span>
              </button>
            ))}
          </div>
        </section>

        <section className="member-recent-section">
          <div className="member-section-heading compact">
            <span className="member-kicker">Recent activity</span>
            <h2>Quick View</h2>
          </div>

          <div className="member-recent-grid">
            <article className="member-recent-card">
              <h3>Latest Loans</h3>
              {loans.slice(0, 3).length ? loans.slice(0, 3).map((loan, index) => (
                <p key={`${loan.LoanID || loan.BookID || index}-loan`}>
                  <strong>{loan.Title || loan.BookTitle}</strong>
                  <span>{loan.DueDate ? `Due ${new Date(loan.DueDate).toLocaleDateString()}` : 'No due date'}</span>
                </p>
              )) : <em>No loaned books yet.</em>}
            </article>

            <article className="member-recent-card">
              <h3>Latest Fines</h3>
              {fines.slice(0, 3).length ? fines.slice(0, 3).map((fine, index) => (
                <p key={`${fine.FineID || index}-fine`}>
                  <strong>{fine.Title || fine.BookTitle || 'Fine record'}</strong>
                  <span>${fine.Amount} · {fine.Status || 'Pending'}</span>
                </p>
              )) : <em>No fines right now.</em>}
            </article>
          </div>
        </section>
      </main>

      <div className={`member-ai-widget ${assistantOpen ? 'open' : ''}`}>
        {assistantOpen && (
          <section className="member-ai-popup" aria-label="AI Library Assistant">
            <header className="member-ai-popup-header">
              <div>
                <span className="member-kicker">AI Library Assistant</span>
                <h2>Ask LibraSys</h2>
              </div>
              <button
                type="button"
                className="member-ai-close"
                onClick={() => setAssistantOpen(false)}
                aria-label="Close AI assistant"
              >
                ×
              </button>
            </header>

            <div className="member-ai-actions">
              <button type="button" onClick={() => askAssistant('Recommend books for me')}>
                Recommend
              </button>
              <button type="button" onClick={() => askAssistant(assistantQuestion || 'List categories')}>
                Categories
              </button>
              <button type="button" onClick={() => askAssistant('Explain computer science')}>
                Explain
              </button>
              <button type="button" onClick={() => askAssistant('Check science availability')}>
                Available
              </button>
              <button type="button" onClick={() => askAssistant('Check my loans')}>
                My loans
              </button>
              <button type="button" onClick={() => askAssistant('Search help')}>
                Help
              </button>
            </div>

            <div className="member-ai-chat" aria-live="polite">
              {assistantMessages.map((message, index) => (
                <div
                  key={`${message.role}-${index}`}
                  className={`member-ai-message ${message.role}`}
                >
                  <strong>{message.role === 'assistant' ? 'LibraSys AI' : 'You'}</strong>
                  <pre>{message.text}</pre>
                </div>
              ))}
            </div>

            <form className="member-ai-form" onSubmit={handleAssistantAsk}>
              <label htmlFor="assistantQuestion">Ask a question</label>
              <div>
                <input
                  id="assistantQuestion"
                  value={assistantQuestion}
                  onChange={(event) => setAssistantQuestion(event.target.value)}
                  placeholder="Try: is Clean Code available?"
                />
                <button type="submit">Ask</button>
              </div>
            </form>
          </section>
        )}

        <button
          type="button"
          className="member-ai-launcher"
          onClick={() => setAssistantOpen((current) => !current)}
          aria-label="Open AI Library Assistant"
        >
          <span>AI</span>
          <strong>Ask</strong>
        </button>
      </div>
    </div>
  );
}

function getCategoryStyle(category) {
  const color = /^#[0-9a-fA-F]{6}$/.test(category?.CategoryColor || '')
    ? category.CategoryColor
    : '#e87924';

  return {
    '--member-category-color': color,
  };
}

function calculateFinesFromLoans(loans) {
  const today = new Date();

  return loans
    .filter((loan) => !loan.ReturnDate && (loan.IsOverdue || isPastDue(loan.DueDate, today)))
    .map((loan) => {
      const daysOverdue = Math.max(getDaysOverdue(loan.DueDate, today), 1);

      return {
        FineID: `calculated-${loan.LoanID}`,
        LoanID: loan.LoanID,
        BookTitle: loan.BookTitle || loan.Title,
        Title: loan.Title || loan.BookTitle,
        Amount: daysOverdue * DAILY_FINE_RATE,
        Status: 'Unpaid',
        FineDate: loan.DueDate,
        Reason: `Calculated from ${daysOverdue} overdue day(s)`,
        IsCalculated: true,
      };
    });
}

function isPastDue(value, today) {
  if (!value) return false;
  return new Date(value) < today;
}

function getDaysOverdue(value, today) {
  if (!value) return 0;
  const msPerDay = 24 * 60 * 60 * 1000;
  return Math.floor((today - new Date(value)) / msPerDay);
}

export default MemberDashboard;
