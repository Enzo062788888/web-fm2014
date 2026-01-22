import 'dotenv/config.js'
import express from 'express'
import session from 'express-session'
import bodyParser from 'body-parser'
import passport from 'passport'
import { Strategy as GoogleStrategy } from 'passport-google-oauth20'
import path from 'path'
import { fileURLToPath } from 'url'
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import nodemailer from 'nodemailer'
import crypto from 'crypto'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app = express()
const PORT = process.env.PORT || 8080

// Stockage en mémoire
const users = []
const resetTokens = {} // { token: { email, expires } }

// Nodemailer: utilise Gmail si configuré, sinon Ethereal (test)
let emailTransporter = null
async function getTransporter() {
  if (emailTransporter) return emailTransporter
  const user = process.env.EMAIL_USER
  const pass = process.env.EMAIL_PASSWORD
  if (user && pass) {
    emailTransporter = nodemailer.createTransport({
      service: 'gmail',
      auth: { user, pass }
    })
    console.log('✉️ Email: Gmail SMTP configuré')
  } else {
    const testAccount = await nodemailer.createTestAccount()
    emailTransporter = nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false,
      auth: { user: testAccount.user, pass: testAccount.pass }
    })
    console.log('✉️ Email: Mode test Ethereal activé')
  }
  return emailTransporter
}

// Configuration Cloudflare R2
const r2Client = new S3Client({
  region: 'auto',
  endpoint: process.env.R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY
  }
})

const R2_BUCKET = process.env.R2_BUCKET_NAME || 'fm2014-players'
const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL

// Configuration Passport Google (optionnel)
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: process.env.CALLBACK_URL || 'http://localhost:8080/api/auth/callback/google'
  }, (accessToken, refreshToken, profile, done) => {
    const email = profile.emails[0].value
    let user = users.find(u => u.email === email)
    
    if (!user) {
      user = {
        id: Date.now(),
        email,
        name: profile.displayName,
        googleId: profile.id,
        provider: 'google'
      }
      users.push(user)
    }
    
    return done(null, user)
  }))
}

passport.serializeUser((user, done) => done(null, user.id))
passport.deserializeUser((id, done) => {
  const user = users.find(u => u.id === id)
  done(null, user)
})

// Middlewares
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: true }))
app.use(session({
  secret: process.env.SESSION_SECRET || 'default-session-secret',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 24 * 60 * 60 * 1000 }
}))
app.use(passport.initialize())
app.use(passport.session())

// Servir les fichiers statiques depuis le dossier public
app.use(express.static(path.join(__dirname, 'public')))

// Google OAuth routes (Passport) - optionnel
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  app.get('/auth/google', (req, res, next) => {
    console.log('🔐 Redirection vers Google OAuth')
    passport.authenticate('google', { 
      scope: ['profile', 'email'] 
    })(req, res, next)
  })

  app.get('/api/auth/callback/google',
    passport.authenticate('google', { failureRedirect: '/auth.html' }),
    (req, res) => {
      res.redirect('/app.html')
    }
  )
} else {
  app.get('/auth/google', (req, res) => {
    res.status(503).json({ error: 'Google OAuth non configuré. Ajoute GOOGLE_CLIENT_ID et GOOGLE_CLIENT_SECRET à .env' })
  })
}

// API Login (session locale)
app.post('/api/login', (req, res) => {
  const { email, password } = req.body
  const user = users.find(u => u.email === email && u.password === password)
  
  if (user) {
    req.session.user = user
    res.json({ success: true, user: { email: user.email, name: user.name } })
  } else {
    res.status(401).json({ success: false, message: 'Email ou mot de passe incorrect' })
  }
})

// API Signup (création compte local)
app.post('/api/signup', (req, res) => {
  const { email, password, name } = req.body
  
  const exists = users.find(u => u.email === email)
  if (exists) {
    return res.status(400).json({ success: false, message: 'Email déjà utilisé' })
  }
  
  const newUser = { email, password, name, id: Date.now() }
  users.push(newUser)
  req.session.user = newUser
  res.json({ success: true, user: { email, name } })
})

// API Logout
app.post('/api/logout', (req, res) => {
  req.logout(() => {
    req.session.destroy()
    res.json({ success: true })
  })
})

// API Check session
app.get('/api/session', (req, res) => {
  if (req.session.user || req.user) {
    res.json({ loggedIn: true, user: req.session.user || req.user })
  } else {
    res.json({ loggedIn: false })
  }
})

// API Upload player image - Retourne directement l'URL R2 de l'image
app.post('/api/upload-player-image', async (req, res) => {
  try {
    const { playerId, playerName } = req.body
    
    if (!playerId) {
      return res.status(400).json({ success: false, error: 'Player ID requis' })
    }
    
    console.log(`🖼️ Construction URL image pour joueur ${playerId} (${playerName})...`)
    
    // Construire l'URL R2 directement
    const publicUrl = `${R2_PUBLIC_URL}/Phot/${playerId}.png`
    console.log(`✅ URL image : ${publicUrl}`)
    
    res.json({ success: true, imageUrl: publicUrl })
    
  } catch (error) {
    console.error('❌ Erreur construction URL image:', error.message)
    res.status(500).json({ success: false, error: error.message })
  }
})

// API Mot de passe oublié - Envoyer email de réinitialisation
app.post('/api/forgot-password', async (req, res) => {
  try {
    const { email } = req.body
    console.log('\n🔐 === DEMANDE DE RÉINITIALISATION ===')
    console.log(`📧 Email demandé: ${email}`)

    if (!email) {
      console.log('❌ Erreur: Email manquant')
      return res.status(400).json({ success: false, message: 'Email requis' })
    }

    // Vérifier si l'utilisateur existe
    const user = users.find(u => u.email === email)
    console.log(`👤 Utilisateur trouvé: ${user ? 'OUI' : 'NON'}`)
    console.log(`📋 Utilisateurs enregistrés: ${users.map(u => u.email).join(', ')}`)
    
    if (!user) {
      console.log('⚠️ Email non trouvé en base, réponse générique envoyée')
      // Sécurité : ne pas révéler si l'email existe
      return res.json({ success: true, message: 'Si cet email existe, vous recevrez un lien de réinitialisation' })
    }

    // Générer un token unique
    const token = crypto.randomBytes(32).toString('hex')
    const expiresAt = Date.now() + 3600000 // 1 heure

    resetTokens[token] = { email, expiresAt }
    console.log(`🔑 Token généré: ${token.substring(0, 16)}...`)

    // Construire le lien de réinitialisation
    const baseUrl = process.env.BASE_URL || `http://localhost:${PORT}`
    const resetLink = `${baseUrl}/confirm-reset.html?token=${token}`
    console.log(`🔗 Lien de réinitialisation: ${resetLink}`)

    // Envoyer l'email
    console.log('📤 Tentative d\'envoi d\'email...')
    console.log(`   - De: ${process.env.EMAIL_USER || 'noreply@fm2014.com'}`)
    console.log(`   - À: ${email}`)
    
    const transporter = await getTransporter()
    const info = await transporter.sendMail({
      from: process.env.EMAIL_USER || 'noreply@fm2014.com',
      to: email,
      subject: '🔐 Réinitialiser votre mot de passe FM2014',
      html: `
        <h2>Réinitialisation de mot de passe</h2>
        <p>Bonjour ${user.name || 'utilisateur'},</p>
        <p>Vous avez demandé la réinitialisation de votre mot de passe.</p>
        <p><a href="${resetLink}" style="background-color: #007bff; color: white; padding: 10px 20px; border-radius: 5px; text-decoration: none; display: inline-block;">Réinitialiser mon mot de passe</a></p>
        <p>Ou copiez ce lien : <br><code>${resetLink}</code></p>
        <p>Ce lien expire dans 1 heure.</p>
        <p>Si vous n'avez pas demandé cette action, ignorez cet email.</p>
        <p>FM2014 Generator</p>
      `
    })
    
    console.log(`✅ Email envoyé avec succès!`)
    console.log(`   - Message ID: ${info.messageId}`)
    console.log(`   - Accepted: ${info.accepted?.join(', ') || 'N/A'}`)
    console.log(`   - Rejected: ${info.rejected?.join(', ') || 'Aucun'}`)
    console.log(`   - Response: ${info.response || 'N/A'}`)
    
    const previewUrl = nodemailer.getTestMessageUrl(info)
    if (previewUrl) {
      console.log(`🔎 Aperçu email (Ethereal): ${previewUrl}`)
    }
    console.log('=================================\n')
    
    res.json({ success: true, message: 'Email envoyé avec succès' })

  } catch (error) {
    console.error('\n❌ === ERREUR D\'ENVOI ===')
    console.error(`Message: ${error.message}`)
    console.error(`Code: ${error.code || 'N/A'}`)
    console.error(`Stack: ${error.stack}`)
    console.error('=================================\n')
    res.status(500).json({ success: false, error: 'Erreur lors de l\'envoi de l\'email' })
  }
})

// API Réinitialiser le mot de passe
app.post('/api/reset-password', async (req, res) => {
  try {
    const { token, password } = req.body

    if (!token || !password) {
      return res.status(400).json({ success: false, message: 'Token et mot de passe requis' })
    }

    if (password.length < 6) {
      return res.status(400).json({ success: false, message: 'Mot de passe trop court (min 6)' })
    }

    // Vérifier le token
    const resetData = resetTokens[token]
    if (!resetData) {
      return res.status(400).json({ success: false, message: 'Lien invalide ou expiré' })
    }

    if (resetData.expiresAt < Date.now()) {
      delete resetTokens[token]
      return res.status(400).json({ success: false, message: 'Le lien a expiré' })
    }

    // Trouver l'utilisateur et mettre à jour le mot de passe
    const user = users.find(u => u.email === resetData.email)
    if (!user) {
      return res.status(404).json({ success: false, message: 'Utilisateur non trouvé' })
    }

    user.password = password
    delete resetTokens[token]

    console.log(`✅ Mot de passe réinitialisé pour ${user.email}`)
    res.json({ success: true, message: 'Mot de passe réinitialisé avec succès' })

  } catch (error) {
    console.error('❌ Erreur réinitialisation:', error.message)
    res.status(500).json({ success: false, error: error.message })
  }
})

// Global error handler
app.use((err, _req, res, _next) => {
  console.error('❌ Server error:', err?.stack || err)✅ Configuré' : '⚠️ Non configuré (optionnel)'}`)
  console.log(`📧 Email: ${process.env.EMAIL_USER ? '✅ Configuré' : '⚠️ Utilise le mode test Ethereal'}`)
  console.log(`🪣 Cloudflare R2: ${process.env.R2_BUCKET_NAME ? '✅ Configuré' : '⚠️ Non configuré (optionnel)'}
})

app.listen(PORT, () => {
  console.log(`✅ Serveur lancé sur http://localhost:${PORT}`)
  console.log(`🔐 Google OAuth: ${process.env.GOOGLE_CLIENT_ID ? 'Configuré' : 'Non configuré (complète .env)'}`)
  console.log(`🔑 NextAuth endpoints disponibles sur http://localhost:${PORT}/api/auth`)
})
