const express = require('express');
const cors = require('cors');
const sql = require('mssql');
const bcrypt = require('bcrypt');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

require('dotenv').config();

const app = express();

// Enhanced CORS configuration
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static files with absolute path
const uploadsPath = path.join(__dirname, 'uploads');
app.use('/uploads', express.static(uploadsPath));

// Database Config with connection pooling
const config = {
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  server: process.env.DB_SERVER,
  database: process.env.DB_NAME,
  options: { 
    encrypt: false,
    trustServerCertificate: true,
    enableArithAbort: true
  },
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000
  }
};

// Global error handler
process.on('unhandledRejection', (err) => {
  console.error('Unhandled Rejection:', err);
});

process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
});

// Database connection pool
let pool;
async function initializeDatabase() {
  try {
    pool = await sql.connect(config);
    console.log('Connected to SQL Server');
    
    // Create tables if they don't exist
    await pool.request().query(`
      IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='Products' AND xtype='U')
      CREATE TABLE Products (
        Id INT IDENTITY(1,1) PRIMARY KEY,
        Name NVARCHAR(255) NOT NULL,
        Description NVARCHAR(MAX),
        Category NVARCHAR(100),
        Price DECIMAL(10, 2) NOT NULL,
        ImagePaths NVARCHAR(MAX),
        CreatedAt DATETIME DEFAULT GETDATE()
      );
      
      IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='Admins' AND xtype='U')
      CREATE TABLE Admins (
        Id INT IDENTITY(1,1) PRIMARY KEY,
        Username NVARCHAR(100) NOT NULL,
        Password NVARCHAR(255) NOT NULL
      );
      
      IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='GalleryImages' AND xtype='U')
      CREATE TABLE GalleryImages (
        Id INT IDENTITY(1,1) PRIMARY KEY,
        Path NVARCHAR(255) NOT NULL,
        Category NVARCHAR(100) NOT NULL,
        UploadedAt DATETIME DEFAULT GETDATE()
      );
    `);
    
    await initializeAdmin();
    return pool;
  } catch (err) {
    console.error('Database initialization error:', err);
    throw err;
  }
}

// Ensure uploads directory exists
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Image Upload Setup
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});
const upload = multer({ 
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  }
});

// Health check endpoint
app.get('/api/health', async (req, res) => {
  try {
    if (!pool) {
      return res.status(500).json({ status: 'Error', database: 'Not connected' });
    }
    await pool.request().query('SELECT 1');
    res.json({ status: 'OK', database: 'Connected' });
  } catch (err) {
    res.status(500).json({ status: 'Error', database: 'Disconnected', error: err.message });
  }
});

// Admin Login
app.post('/api/admin/login', async (req, res) => {
  const { username, password } = req.body;
  
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }

  try {
    const result = await pool.request()
      .input('username', sql.NVarChar, username)
      .query('SELECT * FROM Admins WHERE Username = @username');

    if (result.recordset.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const admin = result.recordset[0];
    const isMatch = await bcrypt.compare(password, admin.Password);

    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    res.json({ message: 'Login successful' });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Product Endpoints
app.get('/api/products', async (req, res) => {
  try {
    const result = await pool.request().query('SELECT * FROM Products ORDER BY CreatedAt DESC');
    const products = result.recordset.map(p => ({
      ...p,
      ImagePaths: p.ImagePaths ? p.ImagePaths.split(',') : []
    }));
    res.json(products);
  } catch (err) {
    console.error('Products fetch error:', err);
    res.status(500).json({ error: 'Failed to fetch products' });
  }
});

app.post('/api/products', upload.array('images', 5), async (req, res) => {
  const { name, description, category, price } = req.body;
  
  if (!name || !price) {
    return res.status(400).json({ error: 'Name and price are required' });
  }

  try {
    const imagePaths = req.files?.map(file => `/uploads/${file.filename}`).join(',') || '';
    
    await pool.request()
      .input('name', sql.NVarChar, name)
      .input('description', sql.NVarChar, description || '')
      .input('category', sql.NVarChar, category || 'Uncategorized')
      .input('price', sql.Decimal(10, 2), parseFloat(price))
      .input('imagePaths', sql.NVarChar, imagePaths)
      .query(`
        INSERT INTO Products (Name, Description, Category, Price, ImagePaths)
        VALUES (@name, @description, @category, @price, @imagePaths)
      `);

    res.json({ message: 'Product added successfully' });
  } catch (err) {
    console.error('Product addition error:', err);
    
    // Clean up uploaded files if database operation fails
    if (req.files) {
      req.files.forEach(file => {
        fs.unlinkSync(file.path);
      });
    }
    
    res.status(500).json({ error: 'Failed to add product' });
  }
});

// Image Gallery Endpoints
app.post('/api/images', upload.array('images', 10), async (req, res) => {
  const { category } = req.body;
  const files = req.files;
  
  if (!files || files.length === 0) {
    return res.status(400).json({ error: 'No images uploaded' });
  }

  try {
    for (const file of files) {
      await pool.request()
        .input('path', sql.NVarChar, `/uploads/${file.filename}`)
        .input('category', sql.NVarChar, category)
        .query('INSERT INTO GalleryImages (Path, Category) VALUES (@path, @category)');
    }
    res.json({ message: `${files.length} images uploaded successfully` });
  } catch (err) {
    console.error('Image upload error:', err);
    
    // Clean up uploaded files if database operation fails
    if (files) {
      files.forEach(file => {
        fs.unlinkSync(file.path);
      });
    }
    
    res.status(500).json({ error: 'Failed to upload images' });
  }
});

app.get('/api/images/:category', async (req, res) => {
  try {
    const result = await pool.request()
      .input('category', sql.NVarChar, req.params.category)
      .query('SELECT * FROM GalleryImages WHERE Category = @category ORDER BY UploadedAt DESC');
    res.json(result.recordset);
  } catch (err) {
    console.error('Images fetch error:', err);
    res.status(500).json({ error: 'Failed to fetch images' });
  }
});

// Initialize admin user if none exists
async function initializeAdmin() {
  try {
    const result = await pool.request().query('SELECT COUNT(*) as count FROM Admins');
    if (result.recordset[0].count === 0) {
      const hashedPassword = await bcrypt.hash('admin123', 10);
      await pool.request()
        .input('username', sql.NVarChar, 'admin')
        .input('password', sql.NVarChar, hashedPassword)
        .query('INSERT INTO Admins (Username, Password) VALUES (@username, @password)');
      console.log('Default admin user created (username: admin, password: admin123)');
    }
  } catch (err) {
    console.error('Admin initialization error:', err);
  }
}

// Delete product
app.delete('/api/products/:id', async (req, res) => {
  try {
    // First get product to check for images
    const productResult = await pool.request()
      .input('id', sql.Int, req.params.id)
      .query('SELECT ImagePaths FROM Products WHERE Id = @id');
    
    if (productResult.recordset.length === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }

    // Delete product from database
    await pool.request()
      .input('id', sql.Int, req.params.id)
      .query('DELETE FROM Products WHERE Id = @id');

    // Delete associated image files
    const imagePaths = productResult.recordset[0].ImagePaths;
    if (imagePaths) {
      const paths = imagePaths.split(',');
      paths.forEach(imagePath => {
        const fullPath = path.join(__dirname, imagePath);
        if (fs.existsSync(fullPath)) {
          fs.unlinkSync(fullPath);
        }
      });
    }

    res.json({ message: 'Product deleted successfully' });
  } catch (err) {
    console.error('Product deletion error:', err);
    res.status(500).json({ error: 'Failed to delete product' });
  }
});

// Delete image
app.delete('/api/images/:id', async (req, res) => {
  try {
    // Get image path first
    const result = await pool.request()
      .input('id', sql.Int, req.params.id)
      .query('SELECT Path FROM GalleryImages WHERE Id = @id');
    
    if (result.recordset.length === 0) {
      return res.status(404).json({ error: 'Image not found' });
    }
    
    const imagePath = result.recordset[0].Path;
    
    // Delete from database
    await pool.request()
      .input('id', sql.Int, req.params.id)
      .query('DELETE FROM GalleryImages WHERE Id = @id');
    
    // Delete file
    const fullPath = path.join(__dirname, imagePath);
    if (fs.existsSync(fullPath)) {
      fs.unlinkSync(fullPath);
    }
    
    res.json({ message: 'Image deleted successfully' });
  } catch (err) {
    console.error('Image deletion error:', err);
    res.status(500).json({ error: 'Failed to delete image' });
  }
});

// Delete image file only
app.post('/api/images/delete-file', async (req, res) => {
  try {
    const { path: imagePath } = req.body;
    if (!imagePath) {
      return res.status(400).json({ error: 'Path is required' });
    }
    
    const fullPath = path.join(__dirname, imagePath);
    if (fs.existsSync(fullPath)) {
      fs.unlinkSync(fullPath);
      res.json({ message: 'File deleted successfully' });
    } else {
      res.status(404).json({ error: 'File not found' });
    }
  } catch (err) {
    console.error('File deletion error:', err);
    res.status(500).json({ error: 'Failed to delete file' });
  }
});

// Global error handling middleware
app.use((err, req, res, next) => {
  console.error('Global error handler:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Initialize server
async function startServer() {
  try {
    await initializeDatabase();
    const PORT = process.env.PORT || 5000;
    app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
}

startServer();