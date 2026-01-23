# 💾 Sauvegarde des Joueurs - Guide Utilisateur

## Comment ça fonctionne ?

Ton application FM2014 sauvegarde maintenant **automatiquement** tous tes joueurs sur le serveur. Chaque utilisateur a ses propres données indépendantes !

## ✅ Sauvegarde automatique

Quand tu ajoutes un joueur :
1. Le joueur est sauvegardé **localement** (dans ton navigateur)
2. Il est **automatiquement envoyé** sur le serveur
3. Les données sont **liées à ton compte**

### Quand la sauvegarde se fait :
- ✅ Quand tu importes un nouveau XML
- ✅ Quand tu modifies un joueur
- ✅ Quand tu récupères l'image d'un joueur

## 🔄 Chargement automatique

Quand tu te connectes :
1. L'application **charge automatiquement** tes joueurs depuis le serveur
2. Tous tes joueurs sauvegardés apparaissent dans ta base de données
3. Tu retrouves tout comme tu avais laissé !

## 💾 Bouton de synchronisation manuelle

Un bouton **"💾 Synchroniser"** est disponible dans la barre latérale :
- Utilise-le si tu veux forcer une sauvegarde
- Utile si tu as modifié des joueurs et veux être sûr qu'ils sont sauvegardés
- Affiche une notification quand c'est fait

## 🔐 Sécurité des données

- Chaque utilisateur ne voit que **SES propres joueurs**
- Les données sont **isolées par compte**
- Impossible d'accéder aux joueurs d'un autre utilisateur

## ⚠️ Important : Données en mémoire

**ATTENTION** : Pour le moment, les données sont stockées **en mémoire** sur le serveur.

### Ce que ça signifie :
- ✅ Ça fonctionne parfaitement tant que le serveur tourne
- ❌ Si le serveur redémarre (mise à jour Render, etc.), **toutes les données sont perdues**
- 💡 Les données restent dans le **localStorage** de ton navigateur comme backup

### Solution temporaire :
- Tes joueurs restent dans ton navigateur (localStorage)
- La prochaine fois que tu te connectes après un redémarrage serveur, clique sur **"💾 Synchroniser"** pour les renvoyer au serveur

## 🎯 Prochaine étape : Base de données permanente

Pour une sauvegarde permanente, il faut ajouter une **vraie base de données** :

### Option 1 : MongoDB (Recommandé)
- **MongoDB Atlas** : gratuit jusqu'à 512 MB
- Facile à configurer avec Render
- Sauvegarde permanente

### Option 2 : PostgreSQL
- **Neon.tech** : gratuit jusqu'à 512 MB
- Très performant

### Option 3 : Firebase
- **Firestore** : gratuit jusqu'à 1 GB
- Temps réel

## 📝 Comment migrer vers MongoDB (quand tu veux)

1. Créer un compte MongoDB Atlas (gratuit)
2. Créer un cluster
3. Récupérer l'URL de connexion
4. Ajouter sur Render : `MONGODB_URI=mongodb+srv://...`
5. Je modifierai le code pour utiliser MongoDB au lieu de la mémoire

## 🚀 En attendant

Pour ne pas perdre tes joueurs :
1. Ne pas modifier les variables d'environnement sur Render (ça redémarre le serveur)
2. Utiliser régulièrement le bouton **"💾 Synchroniser"**
3. Ne pas t'inquiéter : tes données restent dans ton navigateur comme backup

## 💡 Astuce

Si tu veux exporter tes joueurs en JSON pour backup :
```javascript
// Dans la console du navigateur (F12)
const players = localStorage.getItem('fm2014_players');
console.log(players);
// Copie le résultat et sauvegarde-le dans un fichier .txt
```

Pour les réimporter :
```javascript
// Colle ton JSON ici
const backup = '[{...}]'; 
localStorage.setItem('fm2014_players', backup);
location.reload();
```

---

**Résumé** : Tes joueurs sont sauvegardés automatiquement, mais pour une solution 100% permanente, on devra ajouter MongoDB plus tard ! 🎉
