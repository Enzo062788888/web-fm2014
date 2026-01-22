# Configuration Microsoft OAuth 2.0

## Étapes pour activer l'authentification Microsoft

### 1. Aller sur Azure Portal
👉 https://portal.azure.com/

### 2. Créer un App Registration
- Dans la barre de recherche, taper "App registrations"
- Cliquer sur "New registration"
- **Name**: FM2014 Web App
- **Supported account types**: Accounts in any organizational directory (Any Azure AD directory - Multitenant) and personal Microsoft accounts
- **Redirect URI**: Web
  ```
  http://localhost:3000/api/auth/callback/microsoft
  ```
- Cliquer sur "Register"

### 3. Noter les identifiants
Sur la page Overview, copier :
- **Application (client) ID** : `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`
- **Directory (tenant) ID** : `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx` (ou utilise `common` pour tous les comptes)

### 4. Créer un Client Secret
- Dans le menu de gauche, aller à "Certificates & secrets"
- Cliquer sur "New client secret"
- **Description**: FM2014 Production
- **Expires**: 24 months (ou plus selon besoin)
- Cliquer sur "Add"
- ⚠️ **IMPORTANT** : Copier immédiatement la **Value** (elle ne sera plus visible après !)

### 5. Configurer les Redirect URIs
- Dans le menu de gauche, aller à "Authentication"
- Sous "Platform configurations", cliquer sur "Add a platform" > "Web"
- Ajouter ces URIs :
  ```
  http://localhost:3000/api/auth/callback/microsoft
  https://web-fm2014.onrender.com/api/auth/callback/microsoft
  ```
  ⚠️ **IMPORTANT** : Remplace `web-fm2014` par le vrai nom de ton app Render !

- Sous "Implicit grant and hybrid flows", cocher :
  - ✅ Access tokens
  - ✅ ID tokens
- Cliquer sur "Save"

### 6. Configurer les API permissions
- Dans le menu de gauche, aller à "API permissions"
- Tu devrais voir déjà "User.Read" (Microsoft Graph)
- C'est suffisant ! Cliquer sur "Grant admin consent" si demandé

## Configuration dans Render.com

### 7. Ajouter les variables d'environnement sur Render
- Va sur ton dashboard Render : https://dashboard.render.com/
- Clique sur ton service
- Aller dans "Environment"
- Ajouter ces variables :

```
MICROSOFT_CLIENT_ID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
MICROSOFT_CLIENT_SECRET=ton_client_secret_ici
MICROSOFT_TENANT_ID=common
BASE_URL=https://web-fm2014.onrender.com
```

**Notes** :
- `MICROSOFT_TENANT_ID=common` permet à tous les comptes Microsoft (personnel + professionnel) de se connecter
- Si tu veux limiter à ton organisation, utilise le **Directory (tenant) ID** spécifique
- ⚠️ Remplace `web-fm2014` par le vrai nom de ton app !

- Cliquer sur "Save Changes"
- L'app va redémarrer automatiquement

## Configuration locale (optionnel)

### 8. Pour tester en local, créer un fichier `.env`

```env
# Microsoft OAuth
MICROSOFT_CLIENT_ID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
MICROSOFT_CLIENT_SECRET=ton_client_secret_ici
MICROSOFT_TENANT_ID=common
BASE_URL=http://localhost:3000

# Session
SESSION_SECRET=change-me-to-random-string

# Email (optionnel, pour reset password)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=ton_email@gmail.com
EMAIL_PASSWORD=ton_app_password

# Cloudflare R2
R2_ENDPOINT=https://xxxxx.r2.cloudflarestorage.com
R2_ACCESS_KEY_ID=ton_access_key
R2_SECRET_ACCESS_KEY=ton_secret_key
R2_BUCKET_NAME=fm2014-players
R2_PUBLIC_URL=https://pub-xxxxx.r2.dev
```

## Test de l'authentification

Une fois configuré :
1. Va sur ton site : https://web-fm2014.onrender.com
2. Clique sur "Se connecter avec Microsoft"
3. Tu devrais être redirigé vers Microsoft Login
4. Après connexion, tu reviens sur `/app.html`

✅ **L'authentification Microsoft est maintenant active !**

## Types de comptes supportés

Avec `MICROSOFT_TENANT_ID=common`, tu supportes :
- ✅ Comptes Microsoft personnels (@outlook.com, @hotmail.com, @live.com)
- ✅ Comptes professionnels/scolaires (Azure AD)
- ✅ Comptes Xbox, Skype, etc.

## Dépannage

### Erreur "redirect_uri_mismatch"
- Vérifie que l'URL dans "Redirect URIs" correspond EXACTEMENT à ton URL Render
- Format : `https://ton-app.onrender.com/api/auth/callback/microsoft`
- La méthode doit être POST (pas GET)

### Erreur "invalid_client"
- Vérifie que le Client Secret est correct
- Attention : le secret expire ! Regarde la date d'expiration dans Azure

### Le bouton Microsoft ne fait rien
- Vérifie dans la console navigateur s'il y a des erreurs
- Vérifie que les 3 variables sont bien configurées sur Render (CLIENT_ID, CLIENT_SECRET, TENANT_ID)

## Avantages de Microsoft OAuth

- 🆓 **100% GRATUIT** (pas de limite d'utilisateurs)
- 🔒 Plus sécurisé que mot de passe
- 🌍 Fonctionne avec comptes Microsoft personnels ET professionnels
- ⚡ Connexion rapide en 1 clic
- 🎮 Compatible avec comptes Xbox/Skype

