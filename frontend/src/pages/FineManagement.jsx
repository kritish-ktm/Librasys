import React, { useState } from 'react';

// ==========================
// Fine Data
// ==========================

const fineList = [

  { id: 1, member: 'Ramesh Oli', book: 'Atomic Habits', amount: 25, status: 'Unpaid' },
  { id: 2, member: 'Emily Johnson', book: 'Ikigai', amount: 15, status: 'Paid' },
  { id: 3, member: 'Sophia Williams', book: 'Deep Work', amount: 30, status: 'Unpaid' },
  { id: 4, member: 'David Miller', book: 'Zero to One', amount: 18, status: 'Paid' },
  { id: 5, member: 'Olivia Davis', book: 'The Alchemist', amount: 22, status: 'Unpaid' },
  { id: 6, member: 'James Wilson', book: 'Mindset', amount: 12, status: 'Paid' },
  { id: 7, member: 'Emma Taylor', book: 'Rework', amount: 28, status: 'Unpaid' },
  { id: 8, member: 'Daniel Brown', book: 'Hooked', amount: 20, status: 'Paid' },
  { id: 9, member: 'Mia Thomas', book: 'The One Thing', amount: 17, status: 'Unpaid' },
  { id: 10, member: 'Lucas Martin', book: 'Do Epic Shit', amount: 19, status: 'Paid' },
  { id: 11, member: 'Charlotte White', book: 'Grit', amount: 24, status: 'Unpaid' },
  { id: 12, member: 'Benjamin Harris', book: 'The Subtle Art', amount: 14, status: 'Paid' },
  { id: 13, member: 'Amelia Garcia', book: 'Think and Grow Rich', amount: 27, status: 'Unpaid' },
  { id: 14, member: 'Henry Martinez', book: 'Start With Why', amount: 16, status: 'Paid' },
  { id: 15, member: 'Isabella Anderson', book: 'Rich Dad Poor Dad', amount: 21, status: 'Unpaid' }

];

// ==========================
// Main Component
// ==========================

function Fines() {

  // Store fines
  const [fines, setFines] = useState(fineList);

  // Search text
  const [search, setSearch] = useState('');

  // ==========================
  // Change Status
  // ==========================

  const toggleStatus = (id) => {

    setFines(

      fines.map(fine =>

        fine.id === id

          ? {
              ...fine,

              status:
                fine.status === 'Paid'
                  ? 'Unpaid'
                  : 'Paid'
            }

          : fine
      )
    );
  };

  // ==========================
  // Search Filter
  // ==========================

  const filtered = fines.filter(fine =>

    fine.member.toLowerCase().includes(search.toLowerCase()) ||

    fine.book.toLowerCase().includes(search.toLowerCase())
  );

  // ==========================
  // Statistics
  // ==========================

  const totalPaid =
    fines
      .filter(f => f.status === 'Paid')
      .reduce((a, b) => a + b.amount, 0);

  const totalUnpaid =
    fines
      .filter(f => f.status === 'Unpaid')
      .reduce((a, b) => a + b.amount, 0);

  const paidUsers =
    fines.filter(f => f.status === 'Paid').length;

  const unpaidUsers =
    fines.filter(f => f.status === 'Unpaid').length;

  // ==========================
  // UI
  // ==========================

  return (

    <div
      style={{
        minHeight: '100vh',
        padding: 30,

        background:
          'linear-gradient(135deg,#0f172a,#1e3a8a,#2563eb)',

        fontFamily: 'Arial',
        color: 'white'
      }}
    >

      {/* ==========================
          Back Button
      ========================== */}

      <button

        // Go back to dashboard
        onClick={() => window.history.back()}

        style={{
          position: 'absolute',

          top: 20,
          right: 20,

          background: 'white',

          color: '#1e3a8a',

          border: 'none',

          padding: '10px 18px',

          borderRadius: 10,

          fontWeight: 'bold',

          cursor: 'pointer',

          boxShadow:
            '0 5px 15px rgba(0,0,0,0.3)'
        }}
      >

        ← Back To Dashboard

      </button>

      {/* ==========================
          Header
      ========================== */}

      <div
        style={{
          textAlign: 'center',
          marginBottom: 40
        }}
      >

        <h1
          style={{
            fontSize: 70,
            animation: 'bounce 2s infinite'
          }}
        >
          LibraSys 📚
        </h1>

        <h2>Fine Management System</h2>

      </div>

      {/* ==========================
          Animation
      ========================== */}

      <style>
        {`
          @keyframes bounce {

            0%,100% {
              transform: translateY(0);
            }

            50% {
              transform: translateY(-10px);
            }
          }
        `}
      </style>

      {/* ==========================
          Summary Cards
      ========================== */}

      <div
        style={{
          display: 'flex',
          gap: 20,
          flexWrap: 'wrap',
          marginBottom: 30
        }}
      >

        <div style={card('green')}>
          <h3>Total Paid</h3>
          <h1>${totalPaid}</h1>
        </div>

        <div style={card('red')}>
          <h3>Total Unpaid</h3>
          <h1>${totalUnpaid}</h1>
        </div>

        <div style={card('#2563eb')}>
          <h3>Members Paid</h3>
          <h1>{paidUsers}</h1>
        </div>

        <div style={card('#f59e0b')}>
          <h3>Members Unpaid</h3>
          <h1>{unpaidUsers}</h1>
        </div>

      </div>

      {/* ==========================
          Search Box
      ========================== */}

      <input

        type="text"

        placeholder="Search member or book..."

        value={search}

        onChange={(e) =>
          setSearch(e.target.value)
        }

        style={{
          padding: 12,
          width: 300,
          border: 'none',
          borderRadius: 10,
          marginBottom: 25,
          fontSize: 16
        }}
      />

      {/* ==========================
          Table
      ========================== */}

      <table
        style={{
          width: '100%',
          background: 'white',
          color: 'black',
          borderCollapse: 'collapse',
          borderRadius: 10,
          overflow: 'hidden'
        }}
      >

        {/* Table Header */}

        <thead>

          <tr
            style={{
              background: '#3498db',
              color: 'white'
            }}
          >

            <th style={th}>ID</th>
            <th style={th}>Member</th>
            <th style={th}>Book</th>
            <th style={th}>Amount</th>
            <th style={th}>Status</th>

          </tr>

        </thead>

        {/* Table Body */}

        <tbody>

          {filtered.map(fine => (

            <tr
              key={fine.id}

              style={{
                textAlign: 'center',
                height: 55
              }}
            >

              <td>{fine.id}</td>

              <td>{fine.member}</td>

              <td>{fine.book}</td>

              <td>${fine.amount}</td>

              {/* Status Button */}

              <td>

                <button

                  onClick={() =>
                    toggleStatus(fine.id)
                  }

                  style={{
                    background:
                      fine.status === 'Paid'
                        ? 'green'
                        : 'red',

                    color: 'white',

                    border: 'none',

                    padding: '8px 15px',

                    borderRadius: 6,

                    cursor: 'pointer'
                  }}
                >

                  {fine.status}

                </button>

              </td>

            </tr>

          ))}

        </tbody>

      </table>

    </div>
  );
}

// ==========================
// Card Style
// ==========================

const card = (color) => ({

  background: color,

  padding: 20,

  borderRadius: 12,

  width: 220,

  textAlign: 'center',

  boxShadow:
    '0 5px 15px rgba(0,0,0,0.3)'
});

// ==========================
// Table Header Style
// ==========================

const th = {
  padding: 15
};

// ==========================
// Export
// ==========================

export default Fines;