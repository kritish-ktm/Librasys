const express = require("express");
const router = express.Router();

const db = require("../config/db");

router.get("/", (req, res) => {

  const sql = "SELECT * FROM fine";

  db.query(sql, (err, results) => {

    if (err) {
      console.log(err);
      return res.status(500).json(err);
    }

    console.log(results);

    res.json(results);

  });

});

module.exports = router;