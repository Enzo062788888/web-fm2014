import 'dotenv/config'
import express from 'express'
import session from 'express-session'
import Database from 'better-sqlite3'
import { S3Client } from '@aws-sdk/client-s3'
import nodemailer from 'nodemailer'
import crypto from 'crypto'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app = express()
const PORT = process.env.PORT || 3000

// Configuration Cloudflare R2
const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL || 'https://pub-99a06253a2e94f25b3d1f8e1029ec30a.r2.dev'

const r2Client = new S3Client({
  region: 'auto',
  endpoint: process.env.R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
})

// Configuration Nodemailer
async function getTransporter() {
  if (process.env.EMAIL_USER && process.env.EMAIL_PASSWORD) {
    return nodemailer.createTransport({
      host: process.env.EMAIL_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.EMAIL_PORT || '587'),
      secure: false,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD
      }
    })
  } else {
    console.log('Mode Ethereal: Email de test')
    const testAccount = await nodemailer.createTestAccount()
    return nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass
      }
    })
  }
}

// CONFIGURATION SQLITE LOCAL
// Utiliser /data pour Fly.io (volume persistant) ou local en dev
const dbPath = process.env.DATABASE_PATH || './fm2014.db'
const db = new Database(dbPath)
console.log(`💾 SQLite connecté (${dbPath})`)

// Créer les tables si elles n'existent pas
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    name TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`)

db.exec(`
  CREATE TABLE IF NOT EXISTS reset_tokens (
    token TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL,
    expires_at INTEGER NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id)
  )
`)

db.exec(`
  CREATE TABLE IF NOT EXISTS user_players (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    player_data TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
  )
`)

db.exec(`
  CREATE TABLE IF NOT EXISTS user_teams (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    team_data TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
  )
`)

db.exec(`
  CREATE TABLE IF NOT EXISTS user_databases (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    database_data TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
  )
`)

console.log('✅ Tables SQLite créées avec succès')

// FALLBACK: Structure en mémoire (non utilisée avec SQLite)
const users = []
const resetTokens = {}
const userData = {}

// Authentification par email/password uniquement

// Middleware
app.use(express.json({ limit: '50mb' }))
app.use(express.urlencoded({ extended: true, limit: '50mb' }))
app.use(session({
  secret: process.env.SESSION_SECRET || 'fm2014-secret-change-me',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: process.env.NODE_ENV === 'production' }
}))

// Servir les fichiers statiques depuis le dossier public
app.use(express.static(path.join(__dirname, 'public')))

// Middleware pour proteger les routes et recuperer userId
function isAuthenticated(req, res, next) {
  if (req.session.user) {
    req.userId = req.session.user.id
    return next()
  }
  res.status(401).json({ success: false, message: 'Non authentifie' })
}

// API Login (session locale)
app.post('/api/login', (req, res) => {
  const { email, password } = req.body
  
  try {
    // Chercher dans SQLite
    const user = db.prepare('SELECT * FROM users WHERE email = ? AND password = ?').get(email, password)
    
    if (user) {
      req.session.user = { id: user.id, email: user.email, name: user.name }
      res.json({ success: true, user: { email: user.email, name: user.name } })
    } else {
      res.status(401).json({ success: false, message: 'Email ou mot de passe incorrect' })
    }
  } catch (error) {
    console.error('Erreur login:', error)
    res.status(500).json({ success: false, message: 'Erreur serveur' })
  }
})

// API Signup (creation compte local)
app.post('/api/signup', (req, res) => {
  const { email, password, name } = req.body
  
  try {
    // Vérifier si l'email existe déjà
    const exists = db.prepare('SELECT id FROM users WHERE email = ?').get(email)
    
    if (exists) {
      return res.status(400).json({ success: false, message: 'Email deja utilise' })
    }
    
    // Insérer le nouvel utilisateur
    const insert = db.prepare('INSERT INTO users (email, password, name) VALUES (?, ?, ?)')
    const result = insert.run(email, password, name)
    
    const newUser = {
      id: result.lastInsertRowid,
      email,
      name
    }
    
    req.session.user = newUser
    res.json({ success: true, user: { email: newUser.email, name: newUser.name } })
  } catch (error) {
    console.error('Erreur signup:', error)
    res.status(500).json({ success: false, message: 'Erreur serveur' })
  }
})

// API Logout
app.post('/api/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ success: false, error: err.message })
    }
    res.json({ success: true })
  })
})

// API Check session
app.get('/api/session', (req, res) => {
  if (req.session.user) {
    res.json({ loggedIn: true, user: req.session.user })
  } else {
    res.json({ loggedIn: false })
  }
})

// ============= APIS MULTI-UTILISATEUR =============

// API Sauvegarder les joueurs d'un utilisateur
app.post('/api/user-data/players', isAuthenticated, (req, res) => {
  try {
    const { players } = req.body
    
    // Supprimer les anciens joueurs
    db.prepare('DELETE FROM user_players WHERE user_id = ?').run(req.userId)
    
    // Insérer les nouveaux
    if (players && players.length > 0) {
      db.prepare('INSERT INTO user_players (user_id, player_data) VALUES (?, ?)').run(req.userId, JSON.stringify(players))
    }
    
    res.json({ success: true, message: 'Joueurs sauvegardes' })
  } catch (error) {
    console.error('Erreur sauvegarde joueurs:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

// API Recuperer les joueurs d'un utilisateur
app.get('/api/user-data/players', isAuthenticated, (req, res) => {
  try {
    let players = []
    
    const result = db.prepare('SELECT player_data FROM user_players WHERE user_id = ? ORDER BY id DESC LIMIT 1').get(req.userId)
    if (result) {
      players = JSON.parse(result.player_data)
    }
    
    res.json({ success: true, players })
  } catch (error) {
    console.error('Erreur chargement joueurs:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

// API Sauvegarder les equipes d'un utilisateur
app.post('/api/user-data/teams', isAuthenticated, (req, res) => {
  try {
    const { teams } = req.body
    userData[req.userId].teams = teams
    res.json({ success: true, message: 'Equipes sauvegardees' })
  } catch (error) {
    console.error('Erreur sauvegarde equipes:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

// API Recuperer les equipes d'un utilisateur
app.get('/api/user-data/teams', isAuthenticated, (req, res) => {
  try {
    const teams = userData[req.userId]?.teams || []
    res.json({ success: true, teams })
  } catch (error) {
    console.error('Erreur recuperation equipes:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

// API Sauvegarder les databases d'un utilisateur
app.post('/api/user-data/databases', isAuthenticated, (req, res) => {
  try {
    const { databases } = req.body
    userData[req.userId].databases = databases
    res.json({ success: true, message: 'Databases sauvegardees' })
  } catch (error) {
    console.error('Erreur sauvegarde databases:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

// API Recuperer les databases d'un utilisateur
app.get('/api/user-data/databases', isAuthenticated, (req, res) => {
  try {
    const databases = userData[req.userId]?.databases || []
    res.json({ success: true, databases })
  } catch (error) {
    console.error('Erreur recuperation databases:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

// ============= FIN APIS MULTI-UTILISATEUR =============

// API Upload player image - Retourne directement l'URL R2 de l'image
app.post('/api/upload-player-image', async (req, res) => {
  try {
    const { playerId, playerName } = req.body
    
    if (!playerId) {
      return res.status(400).json({ success: false, error: 'Player ID requis' })
    }
    
    console.log(`Construction URL image pour joueur ${playerId} (${playerName})...`)
    
    // Construire l'URL R2 directement
    const publicUrl = `${R2_PUBLIC_URL}/Phot/${playerId}.png`
    console.log(`URL image : ${publicUrl}`)
    
    res.json({ success: true, imageUrl: publicUrl })
    
  } catch (error) {
    console.error('Erreur construction URL image:', error.message)
    res.status(500).json({ success: false, error: error.message })
  }
})

// API Mot de passe oublie - Envoyer email de reinitialisation
app.post('/api/forgot-password', async (req, res) => {
  try {
    const { email } = req.body

    if (!email) {
      return res.status(400).json({ success: false, message: 'Email requis' })
    }

    // Verifier si l'utilisateur existe
    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email)
    
    if (!user) {
      // Securite : ne pas reveler si l'email existe
      return res.json({ success: true, message: 'Si cet email existe, vous recevrez un lien de reinitialisation' })
    }

    // Generer un token unique
    const token = crypto.randomBytes(32).toString('hex')
    const expiresAt = Date.now() + 3600000 // 1 heure

    // Sauvegarder le token dans la base
    db.prepare('INSERT INTO reset_tokens (token, user_id, expires_at) VALUES (?, ?, ?)').run(token, user.id, expiresAt)

    // Construire le lien de reinitialisation
    const baseUrl = process.env.BASE_URL || `http://localhost:${PORT}`
    const resetLink = `${baseUrl}/confirm-reset.html?token=${token}`

    // Envoyer l'email
    const transporter = await getTransporter()
    await transporter.sendMail({
      from: process.env.EMAIL_USER || 'noreply@fm2014.com',
      to: email,
      subject: 'Reinitialiser votre mot de passe FM2014',
      html: `
        <h2>Reinitialisation de mot de passe</h2>
        <p>Bonjour ${user.name || 'utilisateur'},</p>
        <p>Vous avez demande la reinitialisation de votre mot de passe.</p>
        <p><a href="${resetLink}" style="background-color: #007bff; color: white; padding: 10px 20px; border-radius: 5px; text-decoration: none; display: inline-block;">Reinitialiser mon mot de passe</a></p>
        <p>Ou copiez ce lien : <br><code>${resetLink}</code></p>
        <p>Ce lien expire dans 1 heure.</p>
        <p>Si vous n'avez pas demande cette action, ignorez cet email.</p>
        <p>FM2014 Generator</p>
      `
    })
    
    const previewUrl = nodemailer.getTestMessageUrl(info)
    if (previewUrl) {
      console.log(`Apercu email: ${previewUrl}`)
    }
    
    res.json({ success: true, message: 'Email envoye avec succes' })

  } catch (error) {
    console.error('Erreur envoi email:', error)
    res.status(500).json({ success: false, error: 'Erreur lors de l\'envoi de l\'email' })
  }
})

// API Reinitialiser le mot de passe
app.post('/api/reset-password', (req, res) => {
  try {
    const { token, password } = req.body

    if (!token || !password) {
      return res.status(400).json({ success: false, message: 'Token et mot de passe requis' })
    }

    if (password.length < 6) {
      return res.status(400).json({ success: false, message: 'Mot de passe trop court (min 6)' })
    }

    // Verifier le token
    const resetData = db.prepare('SELECT * FROM reset_tokens WHERE token = ?').get(token)
    if (!resetData) {
      return res.status(400).json({ success: false, message: 'Lien invalide ou expire' })
    }

    if (resetData.expires_at < Date.now()) {
      db.prepare('DELETE FROM reset_tokens WHERE token = ?').run(token)
      return res.status(400).json({ success: false, message: 'Le lien a expire' })
    }

    // Mettre a jour le mot de passe
    db.prepare('UPDATE users SET password = ? WHERE id = ?').run(password, resetData.user_id)
    db.prepare('DELETE FROM reset_tokens WHERE token = ?').run(token)
    
    res.json({ success: true, message: 'Mot de passe change avec succes' })
  } catch (error) {
    console.error('Erreur reset password:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

// API Export vers FM2014 (format XML officiel)
app.post('/api/export-fm2014', isAuthenticated, (req, res) => {
  try {
    const { players } = req.body
    
    if (!players || players.length === 0) {
      return res.status(400).json({ success: false, message: 'Aucun joueur a exporter' })
    }

    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n<record>\n'
    xml += '\t<list id="verf"/>\n'
    xml += '\t<list id="db_changes">\n'

    players.forEach((player, index) => {
      const baseId = 2520827801080479000 + index
      const version = 3509
      
      // CHAQUE attribut dans son propre <record> séparé
      
      // Wrapper (1094992978)
      xml += '\t\t<record>\n'
      xml += '\t\t\t<integer id="database_table_type" value="1"/>\n'
      xml += '\t\t\t<large id="db_unique_id" value="' + baseId + '"/>\n'
      xml += '\t\t\t<unsigned id="property" value="1094992978"/>\n'
      xml += '\t\t\t<string id="new_value" value="' + (player.name || '') + '"/>\n'
      xml += '\t\t\t<integer id="version" value="' + version + '"/>\n'
      xml += '\t\t\t<integer id="db_random_id" value="' + Math.floor(Math.random() * 999999999) + '"/>\n'
      xml += '\t\t\t<integer id="odvl" value="0"/>\n'
      xml += '\t\t</record>\n'
      
      // Name (1348693601)
      xml += '\t\t<record>\n'
      xml += '\t\t\t<integer id="database_table_type" value="1"/>\n'
      xml += '\t\t\t<large id="db_unique_id" value="' + baseId + '"/>\n'
      xml += '\t\t\t<unsigned id="property" value="1348693601"/>\n'
      xml += '\t\t\t<string id="new_value" value="' + (player.name || '') + '"/>\n'
      xml += '\t\t\t<integer id="version" value="' + version + '"/>\n'
      xml += '\t\t\t<integer id="db_random_id" value="' + Math.floor(Math.random() * 999999999) + '"/>\n'
      xml += '\t\t\t<string id="odvl" value=""/>\n'
      xml += '\t\t</record>\n'
      
      // Nationality (1349416041)
      if (player.nationality) {
        xml += '\t\t<record>\n'
        xml += '\t\t\t<integer id="database_table_type" value="1"/>\n'
        xml += '\t\t\t<large id="db_unique_id" value="' + baseId + '"/>\n'
        xml += '\t\t\t<unsigned id="property" value="1349416041"/>\n'
        xml += '\t\t\t<string id="new_value" value="' + player.nationality + '"/>\n'
        xml += '\t\t\t<integer id="version" value="' + version + '"/>\n'
        xml += '\t\t\t<integer id="db_random_id" value="' + Math.floor(Math.random() * 999999999) + '"/>\n'
        xml += '\t\t\t<unsigned id="odvl" value="0"/>\n'
        xml += '\t\t</record>\n'
      }
      
      // Birth Date (1348759394) - format date
      if (player.dateOfBirth) {
        const date = new Date(player.dateOfBirth)
        xml += '\t\t<record>\n'
        xml += '\t\t\t<integer id="database_table_type" value="1"/>\n'
        xml += '\t\t\t<large id="db_unique_id" value="' + baseId + '"/>\n'
        xml += '\t\t\t<unsigned id="property" value="1348759394"/>\n'
        xml += '\t\t\t<date id="new_value" day="' + date.getDate() + '" month="' + (date.getMonth() + 1) + '" year="' + date.getFullYear() + '" time="0"/>\n'
        xml += '\t\t\t<integer id="version" value="' + version + '"/>\n'
        xml += '\t\t\t<integer id="db_random_id" value="' + Math.floor(Math.random() * 999999999) + '"/>\n'
        xml += '\t\t\t<date id="odvl" day="1" month="1" year="1900" time="0"/>\n'
        xml += '\t\t</record>\n'
      }
      
      // Position (1349083504)
      if (player.position !== undefined && player.position !== '') {
        xml += '\t\t<record>\n'
        xml += '\t\t\t<integer id="database_table_type" value="1"/>\n'
        xml += '\t\t\t<large id="db_unique_id" value="' + baseId + '"/>\n'
        xml += '\t\t\t<unsigned id="property" value="1349083504"/>\n'
        xml += '\t\t\t<integer id="new_value" value="' + player.position + '"/>\n'
        xml += '\t\t\t<integer id="version" value="' + version + '"/>\n'
        xml += '\t\t\t<integer id="db_random_id" value="' + Math.floor(Math.random() * 999999999) + '"/>\n'
        xml += '\t\t\t<unsigned id="odvl" value="0"/>\n'
        xml += '\t\t</record>\n'
      }
      
      // Tous les autres attributs numériques avec <integer> ou <string>
      const integerAttrs = [
        { prop: 1349085036, key: 'int_caps' },
        { prop: 1349871969, key: 'u21_caps' },
        { prop: 1349871975, key: 'u21_goals' },
        { prop: 1346589264, key: 'ca' },
        { prop: 1346916944, key: 'corners' },
        { prop: 1347899984, key: 'crossing' },
        { prop: 1347436866, key: 'dribbling' },
        { prop: 1346584898, key: 'finishing' },
        { prop: 1349018995, key: 'first_touch' },
        { prop: 1350002035, key: 'freekicks' }
      ]
      
      integerAttrs.forEach(attr => {
        if (player[attr.key] !== undefined && player[attr.key] !== '') {
          xml += '\t\t<record>\n'
          xml += '\t\t\t<integer id="database_table_type" value="1"/>\n'
          xml += '\t\t\t<large id="db_unique_id" value="' + baseId + '"/>\n'
          xml += '\t\t\t<unsigned id="property" value="' + attr.prop + '"/>\n'
          xml += '\t\t\t<integer id="new_value" value="' + player[attr.key] + '"/>\n'
          xml += '\t\t\t<integer id="version" value="' + version + '"/>\n'
          xml += '\t\t\t<integer id="db_random_id" value="' + Math.floor(Math.random() * 999999999) + '"/>\n'
          xml += '\t\t\t<integer id="odvl" value="0"/>\n'
          xml += '\t\t</record>\n'
        }
      })
      
      // Attributs avec <string> pour new_value
      const stringAttrs = [
        { prop: 1346658661, key: 'aerial_ability' },
        { prop: 1346659169, key: 'command_of_area' },
        { prop: 1346659181, key: 'communication' },
        { prop: 1346659683, key: 'eccentricity' },
        { prop: 1346660462, key: 'handling' },
        { prop: 1346661219, key: 'kicking' },
        { prop: 1346662255, key: 'one_on_ones' },
        { prop: 1346663014, key: 'reflexes' },
        { prop: 1346663023, key: 'rushing_out' },
        { prop: 1346663536, key: 'tendency_to_punch' },
        { prop: 1346663528, key: 'throwing' },
        { prop: 1346659187, key: 'corners' },
        { prop: 1346659186, key: 'crossing' },
        { prop: 1346659442, key: 'dribbling' },
        { prop: 1346659950, key: 'finishing' },
        { prop: 1346659956, key: 'agility' },
        { prop: 1346659947, key: 'freekicks' },
        { prop: 1346660452, key: 'heading' }
      ]
      
      stringAttrs.forEach(attr => {
        if (player[attr.key] !== undefined && player[attr.key] !== '') {
          xml += '\t\t<record>\n'
          xml += '\t\t\t<integer id="database_table_type" value="1"/>\n'
          xml += '\t\t\t<large id="db_unique_id" value="' + baseId + '"/>\n'
          xml += '\t\t\t<unsigned id="property" value="' + attr.prop + '"/>\n'
          xml += '\t\t\t<string id="new_value" value="' + player[attr.key] + '"/>\n'
          xml += '\t\t\t<integer id="version" value="' + version + '"/>\n'
          xml += '\t\t\t<integer id="db_random_id" value="' + Math.floor(Math.random() * 999999999) + '"/>\n'
          xml += '\t\t\t<integer id="odvl" value="0"/>\n'
          xml += '\t\t</record>\n'
        }
      })
    })

    xml += '\t</list>\n'
    xml += '\t<integer id="version" value="3509"/>\n'
    xml += '\t<integer id="rule_group_version" value="1503"/>\n'
    xml += '\t<boolean id="beta" value="false"/>\n'
    xml += '\t<string id="orvs" value="2430"/>\n'
    xml += '\t<string id="svvs" value="2340"/>\n'
    xml += '\t<list id="files"/>\n'
    xml += '\t<string id="description" value=""/>\n'
    xml += '\t<string id="author" value=""/>\n'
    xml += '\t<integer id="EDvb" value="1"/>\n'
    xml += '\t<string id="EDfb" value=""/>\n'
    xml += '</record>'

    res.setHeader('Content-Type', 'application/xml; charset=utf-8')
    res.setHeader('Content-Disposition', 'attachment; filename="fm2014-export.xml"')
    res.send(xml)

  } catch (error) {
    console.error('Erreur export FM2014:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

// Global error handler
app.use((err, _req, res, _next) => {
  console.error('Server error:', err?.stack || err)
  res.status(500).json({ error: 'Internal Server Error' })
})

app.listen(PORT, () => {
  console.log(`Serveur lance sur http://localhost:${PORT}`)
  console.log(`Authentification: Email/Password`)
  console.log(`Email: ${process.env.EMAIL_USER ? 'OK Configure' : 'Utilise le mode test Ethereal'}`)
  console.log(`Cloudflare R2: ${process.env.R2_BUCKET_NAME ? 'OK Configure' : 'Non configure (optionnel)'}`)
  console.log('=== SYSTEME MULTI-UTILISATEUR ACTIF ===')
  console.log('Chaque utilisateur a ses propres donnees independantes')
})
