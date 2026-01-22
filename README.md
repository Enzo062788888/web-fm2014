# FM2014 Web Generator 🎮⚽

Application web moderne pour générer et gérer des profils de joueurs Football Manager 2014.

## 🚀 Fonctionnalités

- **Générateur XML** : Import/export de profils joueurs FM2014
- **Base de données** : Sauvegarde et consultation des joueurs
- **Fantasy Mode** : Créer votre équipe avec terrain interactif (4-4-2, 4-3-3, 3-5-2, 4-2-3-1)
- **Authentification** : Connexion sécurisée avec Google OAuth
- **Images automatiques** : Téléchargement automatique depuis sortitoutsi.net vers Cloudflare R2

## 📁 Structure du projet

```
web-fm2014/
├── public/              # Frontend (fichiers statiques)
│   ├── index.html       # Page d'accueil
│   ├── auth.html        # Page de connexion
│   ├── app.html         # Application principale
│   ├── js/              # JavaScript côté client
│   │   ├── app.js       # Logique principale
│   │   └── auth-check.js # Vérification d'authentification
│   └── css/             # Styles
│       └── styles.css
├── scripts/             # Scripts d'automatisation
│   ├── download-images.js # Téléchargement massif d'images
│   ├── import-to-db.js    # Import vers base de données
│   └── README.md
├── server.js            # Backend Node.js/Express
├── package.json         # Dépendances
├── .env                 # Configuration (secrets)
└── .env.example         # Template de configuration
```

## 🛠️ Installation

### 1. Cloner le projet

```bash
git clone <your-repo-url>
cd web-fm2014
```

### 2. Installer les dépendances

```bash
npm install
```

### 3. Configurer les variables d'environnement

Créez un fichier `.env` à la racine :

```env
# Google OAuth (obligatoire pour l'authentification)
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret

# Session Secret (générez une clé aléatoire)
SESSION_SECRET=your_random_secret_key

# Cloudflare R2 (optionnel, pour hébergement d'images)
R2_ENDPOINT=https://xxxxx.r2.cloudflarestorage.com
R2_ACCESS_KEY_ID=your_r2_access_key_id
R2_SECRET_ACCESS_KEY=your_r2_secret_access_key
R2_BUCKET_NAME=fm2014-players
R2_PUBLIC_URL=https://your-r2-public-domain.com
```

### 4. Configurer Google OAuth

1. Allez sur [Google Cloud Console](https://console.cloud.google.com/)
2. Créez un nouveau projet
3. Activez "Google+ API"
4. Créez des identifiants OAuth 2.0
5. Ajoutez l'URL de redirection : `http://localhost:8080/api/auth/callback/google`
6. Copiez le Client ID et Client Secret dans votre `.env`

### 5. Lancer le serveur

```bash
node server.js
```

Le serveur démarre sur **http://localhost:8080**

## 🎯 Utilisation

### Authentification

1. Ouvrez http://localhost:8080
2. Cliquez sur "Se connecter avec Google"
3. Autorisez l'application

### Générer un joueur

1. Cliquez sur "Generator XML" dans le menu
2. Importez un fichier XML FM2014 ou utilisez "Générer avec valeurs par défaut"
3. L'image du joueur est automatiquement téléchargée (si configuré avec R2)
4. Cliquez sur "💾 Sauvegarder" pour ajouter à la base de données

### Fantasy Mode

1. Cliquez sur "Fantasy" dans le menu
2. Choisissez votre formation (4-4-2, 4-3-3, etc.)
3. Glissez-déposez les joueurs depuis la base de données
4. Sauvegardez votre équipe

## 📦 Technologies utilisées

### Backend
- **Node.js** + **Express** : Serveur web
- **Passport.js** : Authentification Google OAuth
- **AWS SDK S3** : Upload vers Cloudflare R2
- **Axios** : Requêtes HTTP

### Frontend
- **JavaScript Vanilla** : Pas de framework
- **HTML5** + **CSS3** : Interface moderne
- **LocalStorage** : Persistance côté client

### Infrastructure
- **Cloudflare R2** : Stockage d'images (0.15$/10GB)
- **Sortitoutsi.net** : Source des images de joueurs

## 🔧 Configuration avancée

### Hébergement d'images avec Cloudflare R2

1. Créez un compte sur [Cloudflare](https://dash.cloudflare.com/)
2. Allez dans **R2 Object Storage**
3. Créez un bucket (ex: `fm2014-players`)
4. Générez des clés API avec permissions "Object Read & Write"
5. Configurez le domaine public pour accéder aux images
6. Ajoutez les variables dans `.env`

### Scripts de téléchargement massif

Pour télécharger automatiquement toutes les images :

```bash
cd scripts
node download-images.js
```

Voir [scripts/README.md](scripts/README.md) pour plus de détails.

## 📝 API Endpoints

### Authentification
- `GET /auth/google` - Redirection vers Google OAuth
- `GET /api/auth/callback/google` - Callback OAuth
- `GET /api/session` - Vérifier la session
- `POST /api/logout` - Déconnexion

### Upload d'images
- `POST /api/upload-player-image` - Upload automatique depuis sortitoutsi.net
  ```json
  {
    "playerId": "12345",
    "playerName": "Messi"
  }
  ```

## 🐛 Dépannage

### Erreur "redirect_uri_mismatch"
- Vérifiez que l'URL de callback dans Google Cloud Console correspond exactement à : `http://localhost:8080/api/auth/callback/google`

### Les images ne se chargent pas
- Vérifiez votre configuration R2 dans `.env`
- Testez l'upload avec : `POST /api/upload-player-image`

### Le serveur ne démarre pas
- Vérifiez que le port 8080 est libre
- Installez les dépendances : `npm install`

## 📄 Licence

Ce projet est sous licence MIT.

## 👥 Contribution

Les contributions sont les bienvenues ! N'hésitez pas à ouvrir une issue ou une pull request.

## 🙏 Crédits

- Images de joueurs : [Sortitoutsi.net](https://sortitoutsi.net)
- Football Manager 2014 : Sports Interactive / SEGA

---

Fait avec ❤️ pour la communauté FM2014
