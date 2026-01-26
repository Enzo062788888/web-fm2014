# Utiliser Node.js 22 (version utilisée en développement)
FROM node:22-alpine

# Installer les dépendances pour better-sqlite3
RUN apk add --no-cache python3 make g++

# Créer le répertoire de l'application
WORKDIR /app

# Copier package.json et package-lock.json
COPY package*.json ./

# Installer les dépendances de production
RUN npm ci --only=production

# Copier le reste du code
COPY . .

# Créer le répertoire pour la base de données
RUN mkdir -p /data

# Exposer le port
EXPOSE 3000

# Variables d'environnement par défaut
ENV NODE_ENV=production
ENV PORT=3000

# Démarrer l'application
CMD ["node", "server.js"]
