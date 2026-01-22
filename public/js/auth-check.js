// Vérification d'authentification au démarrage
async function checkAuth() {
  try {
    const res = await fetch('/api/session')
    const data = await res.json()
    if (data.loggedIn) return data.user
  } catch (_) {
    /* noop */
  }

  window.location.href = 'auth.html'
  return false
}

async function logout() {
  // Déconnexion session
  try {
    await fetch('/api/logout', { method: 'POST' })
  } catch (_) {
    /* ignore */
  }

  window.location.href = 'auth.html'
}

// Vérifie l'auth au chargement
const loggedInUser = await checkAuth()

if (loggedInUser) {
  const actionsDiv = document.querySelector('.actions')
  if (actionsDiv) {
    const userInfo = document.createElement('div')
    userInfo.className = 'user-info'
    userInfo.innerHTML = `
      <span class="user-name">${loggedInUser.name || 'Utilisateur'}</span>
      <button class="btn btn-sm" onclick="logout()"> Déconnexion</button>
    `
    actionsDiv.appendChild(userInfo)
  }
}

window.logout = logout
