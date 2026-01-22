# Scripts de téléchargement automatique d'images

## 🎯 Objectif
Télécharger automatiquement les images de tous les joueurs depuis sortitoutsi.net et les uploader sur Cloudflare R2.

## 📋 Prérequis

1. **Installer les dépendances :**
   ```bash
   npm install axios @aws-sdk/client-s3
   ```

2. **Configurer les variables d'environnement** dans `.env` :
   ```
   R2_ENDPOINT=https://xxxxx.r2.cloudflarestorage.com
   R2_ACCESS_KEY_ID=votre_access_key
   R2_SECRET_ACCESS_KEY=votre_secret_key
   R2_PUBLIC_URL=https://images.votredomaine.com
   ```

## 🚀 Utilisation

### Étape 1 : Préparer la liste des joueurs

Dans `download-images.js`, remplacez le tableau `players` par votre liste :

```javascript
const players = [
    { id: '12345', name: 'Lionel Messi' },
    { id: '67890', name: 'Cristiano Ronaldo' },
    // ... tous vos joueurs
];
```

**Ou** chargez depuis un fichier JSON :
```javascript
const players = require('./players-list.json');
```

### Étape 2 : Lancer le téléchargement

```bash
node scripts/download-images.js
```

Le script va :
- ✅ Télécharger chaque image depuis sortitoutsi.net
- ✅ L'uploader sur Cloudflare R2
- ✅ Générer un fichier `download-results.json` avec toutes les URLs

### Étape 3 : Importer dans la base de données

```bash
node scripts/import-to-db.js
```

## ⚙️ Options avancées

### Télécharger par lots (batch)
Pour éviter de surcharger le serveur, le script fait une pause de 500ms entre chaque image. Vous pouvez modifier cette valeur :

```javascript
await new Promise(resolve => setTimeout(resolve, 1000)); // 1 seconde
```

### Reprendre après une erreur
Le script sauvegarde les résultats. Si certains téléchargements échouent, vous pouvez relancer uniquement les échecs :

```javascript
const failedPlayers = results.filter(p => p.status === 'failed');
```

## 📊 Format du fichier de résultats

`download-results.json` :
```json
[
  {
    "id": "12345",
    "name": "Lionel Messi",
    "status": "success",
    "url": "https://images.votredomaine.com/players/12345.png"
  },
  {
    "id": "67890",
    "name": "Cristiano Ronaldo",
    "status": "failed",
    "url": null
  }
]
```

## 🔧 Alternatives

### Télécharger localement d'abord
Si vous voulez d'abord télécharger toutes les images en local avant de les uploader :

```javascript
fs.writeFileSync(`./images/${playerId}.png`, imageBuffer);
```

### Utiliser Supabase Storage au lieu de R2
Remplacez le client S3 par le client Supabase Storage :

```javascript
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(url, key);

await supabase.storage.from('players').upload(`${playerId}.png`, imageBuffer);
```
