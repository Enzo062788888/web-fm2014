# Configuration des emails pour la réinitialisation de mot de passe

## 🔐 Configurer Gmail SMTP

Vous devez configurer les variables `EMAIL_USER` et `EMAIL_PASSWORD` dans votre `.env`.

### Étape 1 : Activer les "App Passwords" sur votre compte Google

1. Allez sur [Paramètres de sécurité Google](https://myaccount.google.com/security)
2. Cliquez sur **Mots de passe des applications** (ou activez 2FA d'abord si nécessaire)
3. Sélectionnez **Mail** et **Windows Computer**
4. Google génère un mot de passe d'application à 16 caractères
5. Copiez ce mot de passe

### Étape 2 : Ajouter les variables `.env`

```env
EMAIL_USER=votre-email@gmail.com
EMAIL_PASSWORD=votre-mot-de-passe-d-application-a-16-caracteres
```

### Étape 3 : Tester l'envoi

Quand vous cliquez sur "Mot de passe oublié ?", un email est envoyé automatiquement.

## 💡 Alternatives

### Mailtrap (Parfait pour tests)
```javascript
const transporter = nodemailer.createTransport({
  host: "smtp.mailtrap.io",
  port: 2525,
  auth: {
    user: process.env.MAILTRAP_USER,
    pass: process.env.MAILTRAP_PASSWORD
  }
});
```

### SendGrid
```javascript
const transporter = nodemailer.createTransport({
  host: "smtp.sendgrid.net",
  port: 587,
  auth: {
    user: "apikey",
    pass: process.env.SENDGRID_API_KEY
  }
});
```

## 🔗 Flux de réinitialisation

1. Utilisateur clique sur "Mot de passe oublié ?"
2. Entre son email
3. Server génère un token unique + expire dans 1h
4. Email envoyé avec lien `/confirm-reset.html?token=xxx`
5. Utilisateur clique le lien
6. Entre nouveau mot de passe
7. Server valide token et met à jour le mot de passe

## 📧 Customisation de l'email

Modifiez le contenu HTML dans `server.js` à la ligne ~195 :

```javascript
await transporter.sendMail({
  from: process.env.EMAIL_USER,
  to: email,
  subject: 'Votre sujet personnalisé',
  html: `Votre HTML personnalisé`
})
```
