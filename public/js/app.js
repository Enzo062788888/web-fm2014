// FM2014 Web Generator - 32 attributes
// Parsing logic mirrors the desktop script; defaults & transforms included.

console.log(' App.js chargé !');

const fileInput = document.querySelector('#file-input');
const dropzone = document.querySelector('#dropzone');
const attributesBox = document.querySelector('#attributes');
const output = document.querySelector('#output');
const downloadBtn = document.querySelector('#download-btn');
let currentPlayerId = null; // Stocker l'ID du joueur actuel

const propertyMap = [
  { id: 1094992978, key: 'name', label: 'Wrapper' },
  { id: 1348693601, key: 'name', label: 'Name' },
  { id: 1349416041, key: 'nation_id', label: 'Nation' },
  { id: 1348759394, key: 'born_date', label: 'Birth Date (+7y)' },
  { id: 1349083504, key: 'int_caps', label: 'IntCaps' },
  { id: 1349085036, key: 'int_goals', label: 'IntGoals' },
  { id: 1349871969, key: 'u21_caps', label: 'U21Caps' },
  { id: 1349871975, key: 'u21_goals', label: 'U21Goals' },
  { id: 1346589264, key: 'world_reputation', label: 'WorldReputation (/50)' },
  { id: 1346916944, key: 'home_reputation', label: 'HomeReputation (/50)' },
  { id: 1347899984, key: 'current_reputation', label: 'CurrentReputation (/50)' },
  { id: 1347436866, key: 'pa', label: 'PA' },
  { id: 1346584898, key: 'ca', label: 'CA' },
  { id: 1349018995, key: 'height', label: 'Height' },
  { id: 1350002035, key: 'weight', label: 'Weight' },
  { id: 1346658661, key: 'aerial_ability', label: 'AerialAbility' },
  { id: 1346659169, key: 'command_of_area', label: 'CommandOfArea' },
  { id: 1346659181, key: 'communication', label: 'Communication' },
  { id: 1346659683, key: 'eccentricity', label: 'Eccentricity' },
  { id: 1346660462, key: 'handling', label: 'Handling' },
  { id: 1346661219, key: 'kicking', label: 'Kicking' },
  { id: 1346662255, key: 'one_on_ones', label: 'OneOnOnes' },
  { id: 1346663014, key: 'reflexes', label: 'Reflexes' },
  { id: 1346663023, key: 'rushing_out', label: 'RushingOut' },
  { id: 1346663536, key: 'tendency_to_punch', label: 'TendencyToPunch' },
  { id: 1346663528, key: 'throwing', label: 'Throwing' },
  { id: 1346659187, key: 'corners', label: 'Corners' },
  { id: 1346659186, key: 'crossing', label: 'Crossing' },
  { id: 1346659442, key: 'dribbling', label: 'Dribbling' },
  { id: 1346659950, key: 'finishing', label: 'Finishing' },
  { id: 1346659947, key: 'freekicks', label: 'Freekicks' },
  { id: 1346660452, key: 'heading', label: 'Heading' },
];

const defaults = {
  name: 'Unknown',
  nation_id: '0',
  born_date: '22/07/1989',
  int_caps: '0',
  int_goals: '0',
  u21_caps: '0',
  u21_goals: '0',
  world_reputation: '20',
  home_reputation: '20',
  current_reputation: '20',
  pa: '120',
  ca: '120',
  height: '180',
  weight: '75',
  aerial_ability: '10',
  command_of_area: '10',
  communication: '10',
  eccentricity: '10',
  handling: '10',
  kicking: '10',
  one_on_ones: '10',
  reflexes: '10',
  rushing_out: '10',
  tendency_to_punch: '10',
  throwing: '10',
  corners: '12',
  crossing: '12',
  dribbling: '13',
  finishing: '13',
  freekicks: '11',
  heading: '13',
};

const tagMap = {
  Name: 'name',
  NationID: 'nation_id',
  Born: 'born_date',
  IntCaps: 'int_caps',
  IntGoals: 'int_goals',
  U21Caps: 'u21_caps',
  U21Goals: 'u21_goals',
  WorldReputation: 'world_reputation',
  HomeReputation: 'home_reputation',
  CurrentReputation: 'current_reputation',
  PA: 'pa',
  CA: 'ca',
  Height: 'height',
  Weight: 'weight',
  AerialAbility: 'aerial_ability',
  CommandOfArea: 'command_of_area',
  Communication: 'communication',
  Eccentricity: 'eccentricity',
  Handling: 'handling',
  Kicking: 'kicking',
  OneOnOnes: 'one_on_ones',
  Reflexes: 'reflexes',
  RushingOut: 'rushing_out',
  TendencyToPunch: 'tendency_to_punch',
  Throwing: 'throwing',
  Corners: 'corners',
  Crossing: 'crossing',
  Dribbling: 'dribbling',
  Finishing: 'finishing',
  Freekicks: 'freekicks',
  Heading: 'heading',
};

function parseXml(text) {
  const parser = new DOMParser();
  const xml = parser.parseFromString(text, 'application/xml');
  if (xml.querySelector('parsererror')) throw new Error('XML invalide');

  const data = { ...defaults };
  
  // Extraire l'UID du joueur depuis la balise UID
  console.log(' Recherche de la balise UID...');
  const uidNode = xml.querySelector('UID');
  console.log('UID Node trouvé:', uidNode);
  const playerId = uidNode?.getAttribute('Value') || null;
  console.log('Player ID extrait:', playerId);
  
  if (playerId) {
    currentPlayerId = playerId;
    console.log(' UID détecté:', playerId);
    showImagePreview(playerId);
  } else {
    console.log(' Aucun UID trouvé dans le XML');
    // Essayer d'autres balises possibles
    const generalNode = xml.querySelector('General');
    const altPlayerId = generalNode?.getAttribute('UI') || null;
    console.log('Tentative avec General UI:', altPlayerId);
    if (altPlayerId) {
      currentPlayerId = altPlayerId;
      showImagePreview(altPlayerId);
    }
  }
  
  Object.entries(tagMap).forEach(([tag, key]) => {
    const node = xml.querySelector(tag);
    const val = node?.getAttribute('Value');
    if (val) data[key] = val;
  });

  // Transforms
  ['world_reputation', 'home_reputation', 'current_reputation'].forEach(k => {
    data[k] = Math.round((Number(data[k]) || 0) / 50).toString();
  });
  // Birth date +7 years (if format dd/mm/yyyy)
  if (data.born_date && data.born_date.includes('/')) {
    const parts = data.born_date.split('/');
    if (parts.length === 3) {
      const y = Number(parts[2]) || 0;
      parts[2] = (y + 7).toString();
      data.born_date = parts.join('/');
    }
  }

  return data;
}

function renderAttributes(data) {
  attributesBox.innerHTML = '';
  propertyMap.forEach(p => {
    const value = data[p.key] ?? '';
    const div = document.createElement('div');
    div.className = 'attr';
    div.innerHTML = `<div class="label">${p.label}</div><div class="value">${value}</div>`;
    attributesBox.appendChild(div);
  });
}

function buildOutputXml(data) {
  const records = propertyMap.map(p => {
    const randomId = Math.floor(100000000 + Math.random() * 900000000);
    return `        <record>
            <integer id="database_table_type" value="1"/>
            <large id="db_unique_id" value="2520827801080479005"/>
            <unsigned id="property" value="${p.id}"/>
            <string id="new_value" value="${escapeXml(data[p.key] ?? '')}"/>
            <integer id="version" value="3509"/>
            <integer id="db_random_id" value="${randomId}"/>
            <integer id="odvl" value="0"/>
        </record>`;
  }).join('\n');

  return `<?xml version="1.0" encoding="utf-8"?>
<ProfessionalPlayer>
    <alterations>
${records}
    </alterations>
    <integer id="version" value="3569"/>
</ProfessionalPlayer>`;
}

function escapeXml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}

function handleFile(file) {
  console.log(' Fichier reçu:', file.name);
  const reader = new FileReader();
  reader.onload = () => {
    try {
      console.log(' Contenu XML lu, taille:', reader.result.length);
      const data = parseXml(reader.result);
      renderAttributes(data);
      const xmlOut = buildOutputXml(data);
      output.value = xmlOut;
      downloadBtn.disabled = false;
      
      //  Afficher le drapeau basé sur le NationID
      if (data.nation_id) {
        const flagSection = document.getElementById('flag-section');
        const flagDisplay = document.getElementById('flag-display');
        
        if (flagSection && flagDisplay) {
          const country = getCountryByNationId(data.nation_id);
          
          if (country) {
            flagSection.style.display = 'block';
            displayFlagByNationId(data.nation_id, flagDisplay);
          }
        }
      }
      
      // Sauvegarder le joueur dans la base de données
      savePlayerToDatabase(data, xmlOut);
      
      downloadBtn.onclick = () => downloadXml(xmlOut, `${data.name || 'player'}_FM2014.xml`);
    } catch (e) {
      console.error(' Erreur parsing:', e);
      alert('Erreur: ' + e.message);
    }
  };
  reader.readAsText(file);
}

function savePlayerToDatabase(data, xmlContent) {
  try {
    // Récupérer l'UID directement depuis le XML et construire l'URL R2
    const imageUrl = currentPlayerId ? `https://pub-775c150b8211432db9dbf4f59277c50f.r2.dev/Phot/${currentPlayerId}.png` : null;
    
    // Créer un nouvel objet joueur
    const player = {
      id: Date.now(),
      name: data.name || 'Sans nom',
      nation: data.nation_id || 'N/A',
      birthDate: data.born_date || 'N/A',
      ca: data.ca || '0',
      pa: data.pa || '0',
      height: data.height || '0',
      weight: data.weight || '0',
      worldReputation: data.world_reputation || '0',
      homeReputation: data.home_reputation || '0',
      currentReputation: data.current_reputation || '0',
      intCaps: data.int_caps || '0',
      intGoals: data.int_goals || '0',
      imageUrl: imageUrl || null,
      xml: xmlContent,
      createdAt: new Date().toISOString(),
      data: data // Sauvegarder toutes les données
    };
    
    // Charger les joueurs depuis le serveur
    fetch('/api/user-data/players')
      .then(res => res.json())
      .then(serverData => {
        const players = serverData.success ? serverData.players : [];
        
        // Vérifier si le joueur existe déjà (par nom)
        const existingIndex = players.findIndex(p => p.name === player.name);
        if (existingIndex !== -1) {
          // Mettre à jour le joueur existant
          players[existingIndex] = player;
        } else {
          // Ajouter le nouveau joueur
          players.push(player);
        }
        
        // Sauvegarder dans localStorage ET sur le serveur
        localStorage.setItem('fm2014_players', JSON.stringify(players));
        savePlayersToServer(); // Synchroniser avec le serveur
        
        // Afficher une notification
        showNotification(`🎯 ${player.name} ajouté à la base de données avec image R2`);
      })
      .catch(error => {
        console.error('Erreur chargement serveur:', error);
        // Fallback: utiliser localStorage si le serveur ne répond pas
        const saved = localStorage.getItem('fm2014_players');
        const players = saved ? JSON.parse(saved) : [];
        
        const existingIndex = players.findIndex(p => p.name === player.name);
        if (existingIndex !== -1) {
          players[existingIndex] = player;
        } else {
          players.push(player);
        }
        
        localStorage.setItem('fm2014_players', JSON.stringify(players));
        showNotification(`🎯 ${player.name} ajouté localement (hors ligne)`);
      });
  } catch (e) {
    console.error('Erreur sauvegarde:', e);
  }
}

function showNotification(message) {
  const notification = document.createElement('div');
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: #4caf50;
    color: white;
    padding: 1rem 1.5rem;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.2);
    z-index: 10000;
    font-weight: 600;
    animation: slideIn 0.3s ease;
  `;
  notification.textContent = message;
  document.body.appendChild(notification);
  
  setTimeout(() => {
    notification.style.animation = 'slideOut 0.3s ease';
    setTimeout(() => notification.remove(), 300);
  }, 3000);
}

function downloadXml(content, filename) {
  const blob = new Blob([content], { type: 'application/xml' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

fileInput?.addEventListener('change', e => {
  const file = e.target.files?.[0];
  if (file) handleFile(file);
});

dropzone?.addEventListener('dragover', e => {
  e.preventDefault();
  dropzone.classList.add('dragover');
});

dropzone?.addEventListener('dragleave', () => dropzone.classList.remove('dragover'));

dropzone?.addEventListener('drop', e => {
  e.preventDefault();
  dropzone.classList.remove('dragover');
  const file = e.dataTransfer?.files?.[0];
  if (file) handleFile(file);
});

// L'UID est maintenant récupéré automatiquement depuis le XML

// ===== GESTION DES DRAPEAUX PAR NATION_ID =====

let countryMap = {}; // { "788": "Portugal", ... }

// Charger le CSV au démarrage
async function loadCountriesCsv() {
  try {
    console.log(' Tentative de chargement du CSV...');
    
    // Essayer d'abord le chemin direct dans public/
    const response = await fetch('countries-codes.csv');
    
    if (!response || !response.ok) {
      throw new Error(`HTTP ${response?.status}: ${response?.statusText}`);
    }
    
    const csvText = await response.text();
    console.log(' CSV brut récupéré:', csvText.substring(0, 100) + '...');
    
    // Parser le CSV
    const lines = csvText.trim().split('\n');
    console.log(` ${lines.length} lignes trouvées`);
    
    lines.forEach((line, index) => {
      if (index === 0) {
        console.log('Header:', line);
        return; // Ignorer le header (id,pays)
      }
      
      // Nettoyer la ligne et séparer par virgule
      const cleanLine = line.trim().replace(/\r/g, '');
      const parts = cleanLine.split(',');
      const id = parts[0] ? parts[0].trim() : '';
      const country = parts[1] ? parts[1].trim() : '';
      
      console.log(`Ligne ${index}: id="${id}" country="${country}" (ligne brute: "${cleanLine}")`);
      
      if (id && country) {
        countryMap[id] = country;
        console.log(` Ajouté: "${id}" → "${country}"`);
      } else {
        console.warn(`️ Ligne ${index} ignorée: id="${id}" country="${country}"`);
      }
    });
    
    console.log(' CSV des pays chargé:', countryMap);
    
    // Forcer l'ajout des pays manquants si pas chargés
    if (!countryMap['1649']) {
      countryMap['1649'] = 'Argentina';
      console.log('🇦🇷 Argentine ajoutée manuellement');
    }
    if (!countryMap['1651']) {
      countryMap['1651'] = 'Brazil';
      console.log('🇧🇷 Brésil ajouté manuellement');
    }

    // Test spécifique pour le Brésil
    console.log(' Test Brésil - ID "1651":', countryMap['1651']);
    console.log(' Test Portugal - ID "788":', countryMap['788']);
    console.log(' Test Argentine - ID "1649":', countryMap['1649']);
    console.log(' Toutes les clés:', Object.keys(countryMap));
  } catch (e) {
    console.error(' Erreur chargement CSV:', e);
  }
}

// Récupérer le pays à partir d'un NationID
function getCountryByNationId(nationId) {
  console.log(` Recherche pays pour NationID: "${nationId}"`);
  console.log('️ CountryMap actuel:', countryMap);
  const country = countryMap[nationId] || null;
  console.log(` Résultat: ${country || 'Non trouvé'}`);
  return country;
}

// Afficher le drapeau basé sur le NationID
function displayFlagByNationId(nationId, containerElement) {
  const country = getCountryByNationId(nationId);
  
  if (!country) {
    console.warn(`️ Aucun pays trouvé pour NationID: ${nationId}`);
    return null;
  }
  
  const flagUrl = `https://pub-775c150b8211432db9dbf4f59277c50f.r2.dev/drapeaux/${country}.png`;
  
  console.log(` Drapeau pour ${country} (ID: ${nationId}):`, flagUrl);
  
  if (containerElement) {
    containerElement.innerHTML = `
      <img 
        src="${flagUrl}" 
        alt="Drapeau de ${country}" 
        style="width: 80px; height: 50px; border-radius: 4px; box-shadow: 0 2px 8px rgba(0,0,0,0.15);"
        onerror="this.alt='Drapeau non trouvé'; this.style.background='#eee';"
        onload="console.log(' Drapeau chargé pour ${country}')"
      />
      <p style="margin: 0.5rem 0 0 0; font-size: 0.9rem; font-weight: 600;">${country}</p>
    `;
  }
  
  return flagUrl;
}

// Charger le CSV au démarrage de la page
document.addEventListener('DOMContentLoaded', () => {
  loadCountriesCsv();
  // Charger les joueurs de l'utilisateur depuis le serveur
  loadPlayersFromServer();
});

// ===== SYNCHRONISATION AVEC LE SERVEUR =====

// Charger les joueurs de l'utilisateur depuis le serveur
async function loadPlayersFromServer() {
  try {
    const response = await fetch('/api/user-data/players');
    const data = await response.json();
    
    if (data.success && data.players && data.players.length > 0) {
      // Sauvegarder dans localStorage pour la compaté
      localStorage.setItem('fm2014_players', JSON.stringify(data.players));
      console.log(`💾 ${data.players.length} joueurs chargés depuis le serveur`);
      
      // Rafraîchir l'affichage si on est sur la page base de données
      const dbSection = document.getElementById('database-section');
      if (dbSection && !dbSection.classList.contains('hidden')) {
        loadPlayersDatabase();
      }
    } else {
      console.log('💾 Aucun joueur sauvegardé sur le serveur');
    }
  } catch (error) {
    console.error('❌ Erreur chargement joueurs:', error);
    // Si non connecté ou erreur, utiliser localStorage local
  }
}

// Sauvegarder les joueurs sur le serveur
async function savePlayersToServer() {
  try {
    const saved = localStorage.getItem('fm2014_players');
    const players = saved ? JSON.parse(saved) : [];
    
    const response = await fetch('/api/user-data/players', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ players })
    });
    
    const data = await response.json();
    
    if (data.success) {
      console.log(`✅ ${players.length} joueurs sauvegardés sur le serveur`);
      showNotification(`💾 ${players.length} joueurs sauvegardés !`);
    } else {
      console.warn('⚠️ Erreur sauvegarde serveur:', data);
    }
  } catch (error) {
    console.error('❌ Erreur sauvegarde serveur:', error);
    // Si non connecté, garder en localStorage seulement
  }
}

// Appeler savePlayersToServer() après chaque modification de joueur
function savePlayerAndSync(playerData) {
  // Sauvegarder en localStorage d'abord
  const saved = localStorage.getItem('fm2014_players');
  const players = saved ? JSON.parse(saved) : [];
  players.push(playerData);
  localStorage.setItem('fm2014_players', JSON.stringify(players));
  
  // Puis synchroniser avec le serveur
  savePlayersToServer();
}

// Fonction pour supprimer un joueur et synchroniser
function deletePlayerAndSync(playerId) {
  const saved = localStorage.getItem('fm2014_players');
  const players = saved ? JSON.parse(saved) : [];
  const updated = players.filter(p => p.id !== playerId);
  localStorage.setItem('fm2014_players', JSON.stringify(updated));
  
  // Synchroniser avec le serveur
  savePlayersToServer();
}

// ===== FIN SYNCHRONISATION =====

// Fonction pour afficher l'image en prévisualisation
function showImagePreview(playerId) {
  console.log(' Affichage image pour UID:', playerId);
  const preview = document.getElementById('image-preview');
  
  if (!preview) {
    console.log(' Élément image-preview non trouvé');
    return;
  }
  
  // Construire l'URL R2
  const imageUrl = `https://pub-775c150b8211432db9dbf4f59277c50f.r2.dev/Phot/${playerId}.png`;
  console.log(' URL image construite:', imageUrl);
  
  // Afficher l'image
  preview.innerHTML = `
    <img 
      src="${imageUrl}" 
      alt="Joueur ${playerId}" 
      style="max-width: 200px; max-height: 200px; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.15);"
      onerror="this.parentElement.innerHTML='<p style=\\'color: #f5576c; margin: 0;\\'> Image non trouvée pour UID: ${playerId}</p>'"
      onload="console.log(' Image chargée avec succès')"
    />
    <p style="margin-top: 0.5rem; font-size: 0.9rem; color: #666;">UID: ${playerId}</p>
    <p style="font-size: 0.85rem; color: #888;">URL: ${imageUrl}</p>
  `;
}

// Fonction pour récupérer automatiquement l'URL de l'image d'un joueur
async function uploadPlayerImage(playerId, playerName, localPlayerId) {
  try {
    showNotification(`️ Récupération de l'image de ${playerName}...`);
    
    const response = await fetch('/api/upload-player-image', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ playerId, playerName })
    });
    
    const result = await response.json();
    
    if (result.success && result.imageUrl) {
      // Mettre à jour le joueur dans localStorage avec la nouvelle URL
      const saved = localStorage.getItem('fm2014_players');
      const players = saved ? JSON.parse(saved) : [];
      
      const playerIndex = players.findIndex(p => p.id === localPlayerId);
      if (playerIndex !== -1) {
        players[playerIndex].imageUrl = result.imageUrl;
        localStorage.setItem('fm2014_players', JSON.stringify(players));
        savePlayersToServer(); // Synchroniser avec le serveur
      }
      
      showNotification(` URL image de ${playerName} récupérée !`);
      
      // Rafraîchir l'affichage de la base de données si visible
      const dbSection = document.getElementById('database-section');
      if (dbSection && !dbSection.classList.contains('hidden')) {
        loadPlayersDatabase();
      }
    } else {
      showNotification(`️ Erreur lors de la récupération de l'URL image`);
    }
  } catch (error) {
    console.error('Erreur récupération URL image:', error);
    showNotification(` Erreur lors de la récupération de l'URL image`);
  }
}

// Charger le CSV automatiquement au démarrage
loadCountriesCsv();

// ===== EXPORT VERS FM2014 =====
async function exportToFM2014() {
  try {
    const saved = localStorage.getItem('fm2014_players');
    const players = saved ? JSON.parse(saved) : [];
    
    if (players.length === 0) {
      showNotification('⚠️ Aucun joueur à exporter');
      return;
    }

    showNotification(`📥 Export de ${players.length} joueur(s)...`);

    const response = await fetch('/api/export-fm2014', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ players })
    });

    if (!response.ok) {
      throw new Error('Erreur export');
    }

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `fm2014-export-${Date.now()}.xml`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);

    showNotification(`✅ Fichier téléchargé !`);
  } catch (error) {
    console.error('Erreur export:', error);
    showNotification('❌ Erreur lors de l\'export');
  }
}

// Rendre les fonctions accessibles globalement
window.getCountryByNationId = getCountryByNationId;
window.countryMap = countryMap;
window.exportToFM2014 = exportToFM2014;
