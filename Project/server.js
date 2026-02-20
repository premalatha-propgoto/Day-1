const express = require("express");
const cors = require("cors");
const { Pool } = require("pg");

const app = express();
app.use(cors());
app.use(express.json());

// PostgreSQL Connection
const pool = new Pool({
  user: "postgres",
  host: "localhost",
  database: "product_db",
  password: "Prema",
  port: 5432
});

app.get("/", (req, res) => {
  res.send("Server running");
});


/* ----------------------------------------------------------
   ✅ CHECK IF PRODUCT TITLE EXISTS
---------------------------------------------------------- */
app.get("/check_title", async (req, res) => {
  const title = req.query.title;

  if (!title) {
    return res.json({ exists: false });
  }

  try {
    const result = await pool.query(
      "SELECT COUNT(*) FROM products WHERE LOWER(title) = LOWER($1) AND is_active=true",
      [title]
    );

    const exists = Number(result.rows[0].count) > 0;
    res.json({ exists });

  } catch (err) {
    console.error(err);
    res.json({ exists: false, error: "Database error" });
  }
});
/* ----------------------------------------------------------
   ✅ CREATE PRODUCT
---------------------------------------------------------- */
app.post("/product", async (req, res) => {
  const { title, description, category, price, discount_percentage, rating, stock, brand } = req.body;

  try {
    const result = await pool.query(
      `INSERT INTO products
       (title, description, category, price, discount_percentage, rating, stock, brand, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, true)
       RETURNING id`,
      [title, description, category, price || 0, discount_percentage || 0, rating || 0, stock || 0, brand || ""]
    );

    const insertedId = result.rows[0].id;
    res.json({ message: "Product created successfully", id: insertedId });
  } catch (err) {
    console.error(err);
    res.status(500).send(err);
  }
});

/* ----------------------------------------------------------
   ✅ GET ONE PRODUCT BY ID
---------------------------------------------------------- */
app.get("/get_products/:id", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM products WHERE id=$1 AND is_active=true",
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Product not found" });
    }

    res.json(result.rows[0]);

  } catch (err) {
    console.error(err);
    res.status(500).send("Server error");
  }
});


/* ----------------------------------------------------------
   ✅ PAGINATION + SEARCH + CATEGORY FILTER
---------------------------------------------------------- */
app.get("/get_products", async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 12;
  const keyword = req.query.keyword || "";
  const category = req.query.category || "all";
  const offset = (page - 1) * limit;

  try {
    let query = `SELECT * FROM products WHERE is_active=true`;
    let countQuery = `SELECT COUNT(*) FROM products WHERE is_active=true`;
    const params = [];
    let idx = 1;

    if (keyword) {
      query += ` AND (LOWER(title) LIKE $${idx} OR LOWER(category) LIKE $${idx} OR CAST(price AS TEXT) LIKE $${idx})`;
      countQuery += ` AND (LOWER(title) LIKE $${idx} OR LOWER(category) LIKE $${idx} OR CAST(price AS TEXT) LIKE $${idx})`;
      params.push(`%${keyword.toLowerCase()}%`);
      idx++;
    }

    if (category !== "all") {
      query += ` AND category=$${idx}`;
      countQuery += ` AND category=$${idx}`;
      params.push(category);
      idx++;
    }

    query += ` ORDER BY id LIMIT $${idx} OFFSET $${idx + 1}`;
    params.push(limit, offset);

    const data = await pool.query(query, params);
    const totalRows = await pool.query(countQuery, params.slice(0, idx - 1));

    const count = Number(totalRows.rows[0].count);
    const totalPages = Math.ceil(count / limit);

    res.json({
      page,
      limit,
      totalPages,
      totalRows: count,
      data: data.rows
    });

  } catch (err) {
    console.error(err);
    res.status(500).send("Pagination error");
  }
});


/* ----------------------------------------------------------
   ✅ UPDATE PRODUCT
---------------------------------------------------------- */
app.put("/product/:id", async (req, res) => {
  const id = req.params.id;

  const {
    title, description, category,
    price, discount_percentage, stock,
    rating, brand
  } = req.body;

  try {
    await pool.query(
      `UPDATE products SET
        title=$1, description=$2, category=$3, price=$4,
        discount_percentage=$5, stock=$6, rating=$7, brand=$8
       WHERE id=$9 AND is_active=true`,
      [
        title, description, category, price,
        discount_percentage, stock, rating, brand,
        id
      ]
    );

    res.json({ message: "Product updated" });

  } catch (err) {
    console.error(err);
    res.status(500).send("Update error");
  }
});


// delete
   
app.post("/product/delete", async (req, res) => {
  const { id, title, description, category, price, discount_percentage, rating, stock, brand } = req.body;

  if (!id) {
    return res.status(400).json({ message: "Product id is required for deletion" });
  }

  try {
    const result = await pool.query(
      `UPDATE products
       SET is_active = false
       WHERE id = $1 AND is_active = true
       RETURNING *`,
      [id]
    );

    // if (result.rows.length === 0) {
    //   return res.status(404).json({ message: "No active product found with the given id" });
    // }

    res.json({
      message: "Product deleted successfully",
      deletedProduct: result.rows[0]  // returns the full product info
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Delete error", error: err.message });
  }
});


  //  START SERVER

app.listen(5000, () => {
  console.log("Server running on port 5000");
});
