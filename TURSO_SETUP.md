# 🚀 Configuration Turso (SQLite Cloud)

## Étape 1 : Créer un compte Turso

1. Va sur https://turso.tech/
2. Clique sur "Sign up" (connexion avec GitHub recommandée)
3. C'est **100% gratuit** jusqu'à 9 GB !

## Étape 2 : Installer Turso CLI

### Sur Windows (PowerShell) :
```powershell
irm https://get.turso.tech/install.ps1 | iex
```

### Sur Mac/Linux :
```bash
curl -sSfL https://get.turso.tech/install.sh | bash
```

## Étape 3 : Se connecter à Turso

```bash
turso auth login
```

Une page web s'ouvrira pour confirmer la connexion.

## Étape 4 : Créer une base de données

```bash
turso db create fm2014-db
```

Tu verras un message comme :
```
Created database fm2014-db in fra1
URL: libsql://fm2014-db-xxx.turso.io
```

## Étape 5 : Récupérer les identifiants

### 1. URL de la base de données :
```bash
turso db show fm2014-db --url
```

Résultat : `libsql://fm2014-db-xxx.turso.io`

### 2. Token d'authentification :
```bash
turso db tokens create fm2014-db
```

Résultat : `eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9...` (très long token)

⚠️ **COPIE CES DEUX VALEURS** immédiatement !

## Étape 6 : Configurer Render.com

1. Va sur ton dashboard Render : https://dashboard.render.com/
2. Clique sur ton service `web-fm2014`
3. Aller dans "Environment"
4. Ajouter ces 2 nouvelles variables :

```
TURSO_DATABASE_URL=libsql://fm2014-db-xxx.turso.io
TURSO_AUTH_TOKEN=eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9...
```

⚠️ Remplace par **tes vraies valeurs** !

5. Cliquer sur "Save Changes"
6. L'app va redémarrer automatiquement

## Étape 7 : Tester en local (optionnel)

Créer un fichier `.env` à la racine du projet :

```env
TURSO_DATABASE_URL=libsql://fm2014-db-xxx.turso.io
TURSO_AUTH_TOKEN=eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9...

# Autres variables existantes
SESSION_SECRET=change-me-to-random-string
R2_PUBLIC_URL=https://pub-xxxxx.r2.dev
# ...
```

Puis lancer :
```bash
npm start
```

Tu verras dans la console :
```
💾 Turso Database connectée
✅ Tables créées avec succès
```

## ✅ C'est fait !

Maintenant :
- ✅ **Sauvegarde permanente** : les données ne sont JAMAIS perdues
- ✅ **Multi-utilisateur** : chaque utilisateur a ses propres joueurs
- ✅ **Rapide** : SQLite est ultra-performant
- ✅ **Gratuit** : jusqu'à 9 GB de données

## 🔍 Commandes utiles Turso

### Voir tes bases de données :
```bash
turso db list
```

### Se connecter en SQL :
```bash
turso db shell fm2014-db
```

Puis tu peux faire des requêtes SQL :
```sql
SELECT * FROM users;
SELECT * FROM user_players;
```

### Voir les stats :
```bash
turso db show fm2014-db
```

## 🎯 Migration des données existantes

Si tu as déjà des joueurs dans localStorage :
1. Connecte-toi sur ton app
2. Clique sur le bouton **"💾 Synchroniser"**
3. Les joueurs seront automatiquement sauvegardés dans Turso !

## 🆘 Dépannage

### Erreur "Database not found"
- Vérifie que l'URL est correcte
- Vérifie que tu as bien créé la base avec `turso db create`

### Erreur "Unauthorized"
- Génère un nouveau token avec `turso db tokens create fm2014-db`
- Remplace le token sur Render

### Les tables ne se créent pas
- Vérifie les logs sur Render
- Les tables sont créées automatiquement au démarrage du serveur

## 🎉 Résultat final

- **Avant** : Données perdues au redémarrage du serveur
- **Après** : Données **PERMANENTES** dans le cloud
- **Bonus** : Backup automatique par Turso

---

**Note** : Le code fonctionne aussi SANS Turso (fallback en mémoire), mais avec Turso c'est 1000x mieux ! 🚀
