require('dotenv').config();
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const session = require('express-session');
const pool = require('./db');

const app = express();

// CORS – pozwalamy na cookies z frontu
app.use(cors({
  origin: true,        // w dev: akceptuj dowolny origin (echouje dokładny)
  credentials: true,   // zezwól na ciasteczka
}));

app.use(express.json());
app.use(cookieParser());
app.use(session({
  secret: process.env.SESSION_SECRET || 'dev-secret-olimp',
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: false,              // w dev bez https
    maxAge: 24 * 60 * 60 * 1000 // 1 dzień
  }
}));


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

// POST /api/reservations - zapis rezerwacji pokoju
app.post('/api/reservations', async (req, res) => {
  const { room_id, start_date, end_date, guest_name, guest_email } = req.body;

  if (!room_id || !start_date || !end_date || !guest_name || !guest_email) {
    return res.status(400).json({
      message: 'Wymagane pola: room_id, start_date, end_date, guest_name, guest_email'
    });
  }

  try {
    const [result] = await pool.query(
      `INSERT INTO reservations (room_id, start_date, end_date, guest_name, guest_email)
       VALUES (?, ?, ?, ?, ?)`,
      [room_id, start_date, end_date, guest_name, guest_email]
    );

    res.status(201).json({
      message: 'Rezerwacja zapisana',
      id: result.insertId
    });
  } catch (err) {
    console.error('Błąd POST /api/reservations:', err);
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
  
// ===== AUTH =====

// Rejestracja
app.post('/api/auth/register', async (req, res) => {
  const { login, password } = req.body;

  if (!login || !password) {
    return res.status(400).json({ error: 'Podaj login i hasło' });
  }

  try {
    // czy login już istnieje?
    const [existing] = await pool.query(
      'SELECT id FROM uzytkownicy WHERE login = ?',
      [login]
    );
    if (existing.length > 0) {
      return res.status(400).json({ error: 'Taki login już istnieje' });
    }

    const [result] = await pool.query(
  'INSERT INTO uzytkownicy (login, password_hash) VALUES (?, ?)',
  [login, password]   
);


    // od razu logujemy usera w sesji
    req.session.userId = result.insertId;
    req.session.login = login;

    res.status(201).json({
      message: 'Utworzono konto',
      user: { id: result.insertId, login }
    });
  } catch (err) {
    console.error('Błąd /api/auth/register:', err);
    res.status(500).json({ error: 'Błąd bazy danych' });
  }
});

// Logowanie
app.post('/api/auth/login', async (req, res) => {
  const { login, password } = req.body;

  if (!login || !password) {
    return res.status(400).json({ error: 'Podaj login i hasło' });
  }

  try {
   const [rows] = await pool.query(
  'SELECT id, login, password_hash FROM uzytkownicy WHERE login = ?',
  [login]
);

if (rows.length === 0 || rows[0].password_hash !== password) {
  return res.status(401).json({ error: 'Zły login lub hasło' });
}


    req.session.userId = rows[0].id;
    req.session.login = rows[0].login;

    res.json({
      message: 'Zalogowano',
      user: { id: rows[0].id, login: rows[0].login }
    });
  } catch (err) {
    console.error('Błąd /api/auth/login:', err);
    res.status(500).json({ error: 'Błąd bazy danych' });
  }
});

// Kim jestem
app.get('/api/auth/me', (req, res) => {
  if (!req.session.userId) {
    return res.status(401).json({ error: 'Nie zalogowano' });
  }
  res.json({
    user: {
      id: req.session.userId,
      login: req.session.login
    }
  });
});

// Wylogowanie
app.post('/api/auth/logout', (req, res) => {
  req.session.destroy(err => {
    if (err) {
      console.error('Błąd /api/auth/logout:', err);
      return res.status(500).json({ error: 'Nie udało się wylogować' });
    }
    res.json({ message: 'Wylogowano' });
  });
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
