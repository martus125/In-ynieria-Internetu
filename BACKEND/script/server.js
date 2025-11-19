require('dotenv').config();
const express = require('express');
const cors = require('cors');
const pool = require('./db'); 


const app = express();

app.use(cors());
app.use(express.json());

app.get('/api/health', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT 1 + 1 AS result');
    res.json({ status: 'ok', db: rows[0].result });
  } catch (err) {
    console.error('Błąd /api/health:', err);
    res.status(500).json({ status: 'error', error: err.message });
  }
});

// 🔹 przykładowy endpoint z tabeli "wiersze"
app.get('/api/rooms', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM rooms');
    res.json(rows);
  } catch (err) {
    console.error('Błąd /api/wiersze:', err);  
    res.status(500).json({ message: 'Błąd bazy danych', error: err.message });
  }
});

app.get('/api/uzytkownicy', async (req, res) => {
    try {
      const [rows] = await pool.query('SELECT * FROM uzytkownicy');
      res.json(rows);
    } catch (err) {
      console.error('Błąd /api/autorzy:', err);
      res.status(500).json({ message: 'Błąd bazy danych', error: err.message });
    }
  });

  app.get('/api/uzytkownicy/:id', async (req, res) => {
    try {
      const [rows] = await pool.query(
        'SELECT * FROM uzytkownicy WHERE id = ?',
        [req.params.id]
      );
  
      if (rows.length === 0) {
        return res.status(404).json({ message: 'Autor nie znaleziony' });
      }
  
      res.json(rows[0]);
    } catch (err) {
      console.error('Błąd /api/autorzy/:id:', err);
      res.status(500).json({ message: 'Błąd bazy danych', error: err.message });
    }
  });

  app.post('/api/autorzy', async (req, res) => {
    const { imie, nazwisko } = req.body;
  
    if (!imie || !nazwisko) {
      return res.status(400).json({
        message: 'Wymagane pola: imie, nazwisko'
      });
    }
  
    try {
      const [result] = await pool.query(
        'INSERT INTO autorzy (imie, nazwisko) VALUES (?, ?)',
        [imie, nazwisko]
      );
  
      res.json({
        message: 'Autor dodany',
        id: result.insertId
      });
    } catch (err) {
      console.error('Błąd POST /api/autorzy:', err);
      res.status(500).json({ message: 'Błąd bazy danych', error: err.message });
    }
  });
  

const port = process.env.PORT || 3001;

app.listen(port, async () => {
  console.log(`Backend działa na http://localhost:${port}`);

  // przy starcie od razu sprawdzamy połączenie z DB
  try {
    const [rows] = await pool.query('SELECT 1 AS test');
    console.log('Połączenie z DB działa w server.js, wynik:', rows[0].test);
  } catch (err) {
    console.error('Błąd połączenia z DB przy starcie server.js:', err);
  }
});
