import React, { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

const FineManagement = () => {

  const navigate = useNavigate();

  const [fines, setFines] = useState([]);

  const [search, setSearch] = useState("");

  useEffect(() => {

    axios
      .get("http://localhost:5000/api/fines")

      .then((res) => {

        setFines(res.data);
      })

      .catch((err) => {

        console.log(err);
      });

  }, []);

  // ==========================
  // Toggle Paid / Unpaid
  // ==========================

  const toggleStatus = (id) => {

    const updated = fines.map((fine) => {

      if (fine.id === id) {

        return {

          ...fine,

          status:
            fine.status === "Paid"
              ? "Unpaid"
              : "Paid",
        };
      }

      return fine;
    });

    setFines(updated);
  };

  // ==========================
  // Search Filter
  // ==========================

  const filteredFines = fines.filter((fine) =>

    fine.member
      .toLowerCase()
      .includes(search.toLowerCase())

    ||

    fine.book
      .toLowerCase()
      .includes(search.toLowerCase())
  );

  // ==========================
  // Summary
  // ==========================

  const totalPaid = fines

    .filter((fine) => fine.status === "Paid")

    .reduce(
      (sum, fine) => sum + Number(fine.amount),
      0
    );

  const totalUnpaid = fines

    .filter((fine) => fine.status === "Unpaid")

    .reduce(
      (sum, fine) => sum + Number(fine.amount),
      0
    );

  const membersPaid =
    fines.filter(
      (fine) => fine.status === "Paid"
    ).length;

  const membersUnpaid =
    fines.filter(
      (fine) => fine.status === "Unpaid"
    ).length;

  return (

    <div
      style={{
        minHeight: "100vh",
        backgroundColor: "#b8ab97",
        padding: "40px",
        fontFamily: "Arial, sans-serif",
      }}
    >

      <div
        style={{
          maxWidth: "1200px",
          margin: "0 auto",
        }}
      >

        {/* HEADER */}

        <div
          style={{
            backgroundColor: "#e8e0d5",
            borderLeft: "6px solid #66704d",
            borderRadius: "10px",
            padding: "30px",
            marginBottom: "25px",
            boxShadow: "0 2px 6px rgba(0,0,0,0.1)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >

          <div>

            <p
              style={{
                color: "#66704d",
                fontWeight: "bold",
                letterSpacing: "2px",
                marginBottom: "10px",
              }}
            >
              LIBRASYS COMPONENT
            </p>

            <h1
              style={{
                margin: 0,
                fontSize: "48px",
                color: "#1f1f1f",
              }}
            >
              Fine Management
            </h1>

            <p
              style={{
                color: "#555",
                marginTop: "10px",
              }}
            >
              Manage paid and unpaid library fines.
            </p>

          </div>

          {/* BACK BUTTON */}

          <button

            onClick={() => navigate("/dashboard")}

            style={{
              backgroundColor: "#66704d",
              color: "white",
              border: "none",
              padding: "14px 22px",
              borderRadius: "8px",
              cursor: "pointer",
              fontWeight: "bold",
            }}
          >
            ← Back To Dashboard
          </button>

        </div>

        {/* CARDS */}

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: "20px",
            marginBottom: "25px",
          }}
        >

          <div style={card}>
            <p style={cardTitle}>Total Paid</p>
            <h1>${totalPaid}</h1>
          </div>

          <div style={card}>
            <p style={cardTitle}>Total Unpaid</p>
            <h1>${totalUnpaid}</h1>
          </div>

          <div style={card}>
            <p style={cardTitle}>Members Paid</p>
            <h1>{membersPaid}</h1>
          </div>

          <div style={card}>
            <p style={cardTitle}>Members Unpaid</p>
            <h1>{membersUnpaid}</h1>
          </div>

        </div>

        {/* TABLE SECTION */}

        <div
          style={{
            backgroundColor: "#e8e0d5",
            borderRadius: "10px",
            padding: "25px",
            boxShadow: "0 2px 6px rgba(0,0,0,0.1)",
          }}
        >

          {/* SEARCH */}

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              marginBottom: "20px",
              alignItems: "center",
            }}
          >

            <div>

              <p
                style={{
                  color: "#66704d",
                  fontWeight: "bold",
                  letterSpacing: "2px",
                  marginBottom: "10px",
                }}
              >
                FIND, FILTER, LIST
              </p>

              <h2 style={{ margin: 0 }}>
                Fine Table
              </h2>

            </div>

            {/* SEARCH BAR */}

            <input

              type="text"

              placeholder="Search member or book..."

              value={search}

              onChange={(e) =>
                setSearch(e.target.value)
              }

              style={{
                width: "350px",
                padding: "12px",
                borderRadius: "8px",
                border: "1px solid #ccc",
                fontSize: "15px",
              }}
            />

          </div>

          {/* TABLE */}

          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              overflow: "hidden",
              borderRadius: "8px",
            }}
          >

            <thead
              style={{
                backgroundColor: "#66704d",
                color: "white",
              }}
            >

              <tr>

                <th style={th}>ID</th>

                <th style={th}>Member</th>

                <th style={th}>Book</th>

                <th style={th}>Amount</th>

                <th style={th}>Status</th>

              </tr>

            </thead>

            <tbody>

              {filteredFines.map((fine, index) => (

                <tr
                  key={fine.id}

                  style={{
                    backgroundColor:
                      index % 2 === 0
                        ? "#f5f0e8"
                        : "#ffffff",
                  }}
                >

                  <td style={td}>
                    {fine.id}
                  </td>

                  <td style={td}>
                    {fine.member}
                  </td>

                  <td style={td}>
                    {fine.book}
                  </td>

                  <td style={td}>
                    ${fine.amount}
                  </td>

                  {/* TOGGLE BUTTON */}

                  <td style={td}>

                    <button

                      onClick={() =>
                        toggleStatus(fine.id)
                      }

                      style={{
                        backgroundColor:
                          fine.status === "Paid"
                            ? "green"
                            : "#c0392b",

                        color: "white",

                        border: "none",

                        padding: "10px 16px",

                        borderRadius: "8px",

                        cursor: "pointer",

                        fontWeight: "bold",
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

      </div>

    </div>
  );
};

// ==========================
// STYLES
// ==========================

const card = {

  backgroundColor: "#e8e0d5",

  padding: "25px",

  borderRadius: "10px",

  boxShadow: "0 2px 6px rgba(0,0,0,0.1)",
};

const cardTitle = {

  color: "#66704d",

  fontWeight: "bold",
};

const th = {

  padding: "14px",

  textAlign: "left",
};

const td = {

  padding: "14px",
};

export default FineManagement;