// Gestion de la connexion et inscription
const loginForm = document.querySelector('#login-form')
const signupForm = document.querySelector('#signup-form')

function showMessage(target, type, text) {
  const box = document.querySelector(`.form-message[data-target="${target}"]`)
  if (!box) return
  box.textContent = text
  box.classList.remove('is-success', 'is-error', 'is-visible')
  if (type === 'success') box.classList.add('is-success')
  if (type === 'error') box.classList.add('is-error')
  box.classList.add('is-visible')
}

// Connexion
if (loginForm) {
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault()
    const email = document.querySelector('#login-email')?.value.trim()
    const password = document.querySelector('#login-password')?.value

    if (!email || !email.includes('@')) {
      return showMessage('login', 'error', 'Email invalide.')
    }
    if (password.length < 6) {
      return showMessage('login', 'error', 'Mot de passe trop court (min 6).')
    }

    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      })

      const data = await res.json()

      if (res.ok && data.success) {
        showMessage('login', 'success', '✅ Connexion réussie !')
        setTimeout(() => window.location.href = 'app.html', 1000)
      } else {
        showMessage('login', 'error', data.message || 'Erreur de connexion.')
      }
    } catch (err) {
      showMessage('login', 'error', 'Erreur : ' + err.message)
    }
  })
}

// Inscription
if (signupForm) {
  signupForm.addEventListener('submit', async (e) => {
    e.preventDefault()
    const name = document.querySelector('#signup-name')?.value.trim()
    const email = document.querySelector('#signup-email')?.value.trim()
    const password = document.querySelector('#signup-password')?.value
    const confirm = document.querySelector('#signup-password-confirm')?.value

    if (!name) return showMessage('signup', 'error', 'Le nom est requis.')
    if (!email || !email.includes('@')) return showMessage('signup', 'error', 'Email invalide.')
    if (password.length < 6) return showMessage('signup', 'error', 'Mot de passe trop court (min 6).')
    if (password !== confirm) return showMessage('signup', 'error', 'Les mots de passe ne correspondent pas.')

    try {
      const res = await fetch('/api/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, name })
      })

      const data = await res.json()

      if (res.ok && data.success) {
        showMessage('signup', 'success', '✅ Compte créé ! Redirection...')
        setTimeout(() => window.location.href = 'app.html', 1500)
      } else {
        showMessage('signup', 'error', data.message || 'Erreur lors de la création.')
      }
    } catch (err) {
      showMessage('signup', 'error', 'Erreur : ' + err.message)
    }
  })
}
