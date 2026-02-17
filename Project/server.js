const express = require("express");
const cors = require("cors");
const { Pool } = require("pg");

const app = express();

app.use(cors());
app.use(express.json());

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


app.post("/product", async (req, res) => {
  const {
    id,
    title,
    description,
    category,
    price,
    discount_percentage,
    rating,
    stock,
    brand
  } = req.body;

  try {
    await pool.query(
      `INSERT INTO products
       (id,title,description,category,price,
        discount_percentage,rating,stock,brand)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
       ON CONFLICT (id) DO NOTHING`,
      [
        id,
        title,
        description,
        category,
        price || 0,
        discount_percentage || 0,
        rating || 0,
        stock || 0,
        brand || ""
      ]
    );

    res.json({ message: "Product stored" });
  } catch (err) {
    console.error("Product insert error:", err);
    res.status(500).send("Insert error");
  }
});

app.post("/search", async (req, res) => {
  let { product_id, keyword } = req.body;

  try {
    if (!keyword || keyword.trim() === "") {
      return res.json({ titles: [] });
    }

    keyword = keyword.trim();

    
    await pool.query(
      `INSERT INTO search_history(product_id, search_keyword)
       VALUES ($1,$2)`,
      [product_id, keyword]
    );

    
    const result = await pool.query(
      `SELECT title FROM products
       WHERE LOWER(title) LIKE LOWER($1)
       OR LOWER(category) LIKE LOWER($1)
       LIMIT 50`,
      [`%${keyword}%`]
    );

    
    res.json({
      search: keyword,
      total: result.rows.length,
      titles: result.rows.map(r => r.title)
    });

  } catch (err) {
    console.error("Search error:", err);
    res.status(500).send("Search error");
  }
});



app.post("/view", async (req, res) => {
  const { product_id, product_name } = req.body;

  try {
    await pool.query(
      `INSERT INTO product_views(product_id, product_name)
       VALUES ($1,$2)`,
      [product_id, product_name || ""]
    );

    res.json({ message: "View stored" });
  } catch (err) {
    console.error("View error:", err);
    res.status(500).send("View error");
  }
});

app.listen(5000, () =>
  console.log("Server running on port 5000")
);
