import 'dotenv/config'
import express from 'express'
import session from 'express-session'
import { createClient } from '@libsql/client'
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

// CONFIGURATION TURSO DATABASE
let db = null

if (process.env.TURSO_DATABASE_URL && process.env.TURSO_AUTH_TOKEN) {
  db = createClient({
    url: process.env.TURSO_DATABASE_URL,
    authToken: process.env.TURSO_AUTH_TOKEN
  })
  console.log('💾 Turso Database connectée')
  
  // Créer les tables si elles n'existent pas
  await db.execute(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      name TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `)
  
  await db.execute(`
    CREATE TABLE IF NOT EXISTS reset_tokens (
      token TEXT PRIMARY KEY,
      email TEXT NOT NULL,
      expires_at INTEGER NOT NULL
    )
  `)
  
  await db.execute(`
    CREATE TABLE IF NOT EXISTS user_players (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      player_data TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `)
  
  await db.execute(`
    CREATE TABLE IF NOT EXISTS user_teams (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      team_data TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `)
  
  await db.execute(`
    CREATE TABLE IF NOT EXISTS user_databases (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      database_data TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `)
  
  console.log('✅ Tables créées avec succès')
} else {
  console.warn('⚠️ Turso non configuré, utilisation de la mémoire (données perdues au redémarrage)')
}

// FALLBACK: Structure en mémoire si Turso non configuré
const users = []  // Utilisateurs avec identifiants
const resetTokens = {}  // Tokens de reinitialisation de mot de passe
const userData = {}  // Structure: userData[userId] = { players: [], teams: [], databases: [] }

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
app.post('/api/login', async (req, res) => {
  const { email, password } = req.body
  
  try {
    let user = null
    
    if (db) {
      // Chercher dans Turso
      const result = await db.execute({
        sql: 'SELECT * FROM users WHERE email = ? AND password = ?',
        args: [email, password]
      })
      user = result.rows[0] ? {
        id: result.rows[0].id,
        email: result.rows[0].email,
        name: result.rows[0].name
      } : null
    } else {
      // Fallback: chercher en mémoire
      user = users.find(u => u.email === email && u.password === password)
    }
    
    if (user) {
      req.session.user = user
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
app.post('/api/signup', async (req, res) => {
  const { email, password, name } = req.body
  
  try {
    let exists = false
    let newUser = null
    
    if (db) {
      // Vérifier dans Turso
      const check = await db.execute({
        sql: 'SELECT id FROM users WHERE email = ?',
        args: [email]
      })
      exists = check.rows.length > 0
      
      if (!exists) {
        // Insérer dans Turso
        const result = await db.execute({
          sql: 'INSERT INTO users (email, password, name) VALUES (?, ?, ?) RETURNING *',
          args: [email, password, name]
        })
        newUser = {
          id: result.rows[0].id,
          email: result.rows[0].email,
          name: result.rows[0].name
        }
      }
    } else {
      // Fallback: mémoire
      exists = users.find(u => u.email === email)
      if (!exists) {
        newUser = { email, password, name, id: Date.now() }
        users.push(newUser)
        userData[newUser.id] = { players: [], teams: [], databases: [] }
      }
    }
    
    if (exists) {
      return res.status(400).json({ success: false, message: 'Email deja utilise' })
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
app.post('/api/user-data/players', isAuthenticated, async (req, res) => {
  try {
    const { players } = req.body
    
    if (db) {
      // Supprimer les anciens joueurs
      await db.execute({
        sql: 'DELETE FROM user_players WHERE user_id = ?',
        args: [req.userId]
      })
      
      // Insérer les nouveaux
      if (players && players.length > 0) {
        await db.execute({
          sql: 'INSERT INTO user_players (user_id, player_data) VALUES (?, ?)',
          args: [req.userId, JSON.stringify(players)]
        })
      }
    } else {
      // Fallback: mémoire
      userData[req.userId] = userData[req.userId] || {}
      userData[req.userId].players = players
    }
    
    res.json({ success: true, message: 'Joueurs sauvegardes' })
  } catch (error) {
    console.error('Erreur sauvegarde joueurs:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

// API Recuperer les joueurs d'un utilisateur
app.get('/api/user-data/players', isAuthenticated, async (req, res) => {
  try {
    let players = []
    
    if (db) {
      const result = await db.execute({
        sql: 'SELECT player_data FROM user_players WHERE user_id = ? ORDER BY id DESC LIMIT 1',
        args: [req.userId]
      })
      if (result.rows[0]) {
        players = JSON.parse(result.rows[0].player_data)
      }
    } else {
      // Fallback: mémoire
      players = userData[req.userId]?.players || []
    }
    
    res.json({ success: true, players })
  } catch (error) {
    console.error('Erreur recuperation joueurs:', error)
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
    console.log('\n=== DEMANDE DE REINITIALISATION ===')
    console.log(`Email demande: ${email}`)

    if (!email) {
      console.log('Erreur: Email manquant')
      return res.status(400).json({ success: false, message: 'Email requis' })
    }

    // Verifier si l'utilisateur existe
    const user = users.find(u => u.email === email)
    console.log(`Utilisateur trouve: ${user ? 'OUI' : 'NON'}`)
    console.log(`Utilisateurs enregistres: ${users.map(u => u.email).join(', ')}`)
    
    if (!user) {
      console.log('Email non trouve en base, reponse generique envoyee')
      // Securite : ne pas reveler si l'email existe
      return res.json({ success: true, message: 'Si cet email existe, vous recevrez un lien de reinitialisation' })
    }

    // Generer un token unique
    const token = crypto.randomBytes(32).toString('hex')
    const expiresAt = Date.now() + 3600000 // 1 heure

    resetTokens[token] = { email, expiresAt }
    console.log(`Token genere: ${token.substring(0, 16)}...`)

    // Construire le lien de reinitialisation
    const baseUrl = process.env.BASE_URL || `http://localhost:${PORT}`
    const resetLink = `${baseUrl}/confirm-reset.html?token=${token}`
    console.log(`Lien de reinitialisation: ${resetLink}`)

    // Envoyer l'email
    console.log('Tentative d\'envoi d\'email...')
    console.log(`   - De: ${process.env.EMAIL_USER || 'noreply@fm2014.com'}`)
    console.log(`   - A: ${email}`)
    
    const transporter = await getTransporter()
    const info = await transporter.sendMail({
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
    
    console.log(`Email envoye avec succes!`)
    console.log(`   - Message ID: ${info.messageId}`)
    console.log(`   - Accepted: ${info.accepted?.join(', ') || 'N/A'}`)
    console.log(`   - Rejected: ${info.rejected?.join(', ') || 'Aucun'}`)
    console.log(`   - Response: ${info.response || 'N/A'}`)
    
    const previewUrl = nodemailer.getTestMessageUrl(info)
    if (previewUrl) {
      console.log(`Apercu email (Ethereal): ${previewUrl}`)
    }
    console.log('=================================\n')
    
    res.json({ success: true, message: 'Email envoye avec succes' })

  } catch (error) {
    console.error('\n=== ERREUR D\'ENVOI ===')
    console.error(`Message: ${error.message}`)
    console.error(`Code: ${error.code || 'N/A'}`)
    console.error(`Stack: ${error.stack}`)
    console.error('=================================\n')
    res.status(500).json({ success: false, error: 'Erreur lors de l\'envoi de l\'email' })
  }
})

// API Reinitialiser le mot de passe
app.post('/api/reset-password', async (req, res) => {
  try {
    const { token, password } = req.body

    if (!token || !password) {
      return res.status(400).json({ success: false, message: 'Token et mot de passe requis' })
    }

    if (password.length < 6) {
      return res.status(400).json({ success: false, message: 'Mot de passe trop court (min 6)' })
    }

    // Verifier le token
    const resetData = resetTokens[token]
    if (!resetData) {
      return res.status(400).json({ success: false, message: 'Lien invalide ou expire' })
    }

    if (resetData.expiresAt < Date.now()) {
      delete resetTokens[token]
      return res.status(400).json({ success: false, message: 'Le lien a expire' })
    }

    // Trouver l'utilisateur et mettre a jour le mot de passe
    const user = users.find(u => u.email === resetData.email)
    if (!user) {
      return res.status(404).json({ success: false, message: 'Utilisateur non trouve' })
    }

    user.password = password
    delete resetTokens[token]

    console.log(`Mot de passe reinitialise pour ${user.email}`)
    res.json({ success: true, message: 'Mot de passe reinitialise avec succes' })

  } catch (error) {
    console.error('Erreur reinitialisation:', error.message)
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
