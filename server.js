const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');

const app = express();
app.use(cors());
app.use(bodyParser.json());
app.use(express.static('public'));

const db = new sqlite3.Database('./pos.db');

// Init DB
db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT,
    type TEXT,
    size TEXT,
    price REAL,
    stock INTEGER,
    gsm INTEGER
  )`);
  db.run(`CREATE TABLE IF NOT EXISTS sales (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id INTEGER,
    qty INTEGER,
    total REAL,
    date TEXT DEFAULT CURRENT_TIMESTAMP
  )`);
});

// API: Get all paper products
app.get('/api/products', (req, res) => {
  db.all("SELECT * FROM products", [], (err, rows) => {
    if(err) return res.status(500).json({error: err.message});
    res.json(rows);
  });
});

// API: Add product
app.post('/api/products', (req, res) => {
  const {name, type, size, price, stock, gsm} = req.body;
  db.run(`INSERT INTO products (name,type,size,price,stock,gsm) VALUES (?,?,?,?,?,?)`,
    [name,type,size,price,stock,gsm],
    function(err){
      if(err) return res.status(500).json({error: err.message});
      res.json({id: this.lastID});
    }
  );
});

// API: Sell / POS Checkout
app.post('/api/sell', (req, res) => {
  const {product_id, qty} = req.body;
  db.get("SELECT * FROM products WHERE id = ?", [product_id], (err, product) => {
    if(!product) return res.status(404).json({error: "Product not found"});
    if(product.stock < qty) return res.status(400).json({error: "Not enough stock"});
    
    const total = product.price * qty;
    db.run("UPDATE products SET stock = stock - ? WHERE id = ?", [qty, product_id]);
    db.run("INSERT INTO sales (product_id, qty, total) VALUES (?,?,?)", [product_id, qty, total]);
    res.json({success: true, total, receipt: `Sold ${qty}x ${product.name} - ${total} RWF`});
  });
});

app.get('/', (req,res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const PORT = 3000;
app.listen(PORT, () => console.log(`POS-PAPER-SPECIALIST running on http://localhost:${PORT}`));
