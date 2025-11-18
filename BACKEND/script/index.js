import express from "express";
import mysql from "mysql";
import cors from "cors";
import cookieParser from "cookie-parser";
import session from "express-session";
import bcrypt from "bcryptjs";

const app = express();

// === MIDDLEWARE ===
app.use(express.json());
app.use(cookieParser());
app.use(cors({
  origin: ["http://127.0.0.1:5500", "http://localhost:5500"], // Live Server
  credentials: true
}));
app.use(session({
  secret: "super-secet-hot3l-ol1mp", // zmień na env w realnym deployu
  resave: false,
  saveUninitialized: false,
  cookie: { httpOnly: true }
}));

// === DB ===
const db = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "123456789",   // <-- twoje hasło
  database: "uzytkownicy"
});

// proste „żyję”
app.get("/", (req,res)=> res.json({ok:true,msg:"Backend działa"}));

// === AUTH ===
// rejestracja
app.post("/api/auth/register", (req,res)=>{
  const { login, password } = req.body || {};
  if(!login || !password || password.length < 6){
    return res.status(400).json({error:"Podaj login i hasło (min. 6 znaków)."});
  }
  const qCheck = "SELECT id FROM uzytkownicy WHERE login = ?";
  db.query(qCheck, [login], (e, rows)=>{
    if(e) return res.status(500).json({error:"DB error (check)"});
    if(rows.length) return res.status(409).json({error:"Taki login już istnieje."});
    const hash = bcrypt.hashSync(password, 10);
    const qIns = "INSERT INTO uzytkownicy (login, password_hash) VALUES(?,?)";
    db.query(qIns, [login, hash], (e2)=>{
      if(e2) return res.status(500).json({error:"DB error (insert)"});
      return res.status(201).json({ok:true});
    });
  });
});

// logowanie
app.post("/api/auth/login", (req,res)=>{
  const { login, password } = req.body || {};
  if(!login || !password) return res.status(400).json({error:"Brak danych"});

  const q = "SELECT id, login, password_hash FROM uzytkownicy WHERE login = ? LIMIT 1";
  db.query(q, [login], (e, rows)=>{
    if(e) return res.status(500).json({error:"DB error"});
    if(!rows.length) return res.status(401).json({error:"Zły login lub hasło"});
    const user = rows[0];
    const ok = bcrypt.compareSync(password, user.password_hash);
    if(!ok) return res.status(401).json({error:"Zły login lub hasło"});
    // zapisz do sesji
    req.session.user = { id: user.id, login: user.login };
    return res.json({ok:true, user:{ id:user.id, login:user.login }});
  });
});

// kim jestem
app.get("/api/auth/me", (req,res)=>{
  if(!req.session.user) return res.status(401).json({error:"Brak sesji"});
  res.json({ok:true, user: req.session.user});
});

// wyloguj
app.post("/api/auth/logout", (req,res)=>{
  req.session.destroy(()=> res.json({ok:true}));
});

app.listen(3000, ()=> console.log("Backend działa na http://localhost:3000"));

fetch('http://localhost:3000/api/auth/register', {
  method:'POST',
  headers:{'Content-Type':'application/json'},
  body: JSON.stringify({login:'test123', password:'sekret1'})
}).then(r => r.json()).then(console.log).catch(console.error);

