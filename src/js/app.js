// FM2014 Web Generator - 32 attributes
// Parsing logic mirrors the desktop script; defaults & transforms included.

console.log('🚀 App.js chargé !');

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
  console.log('🔍 Recherche de la balise UID...');
  const uidNode = xml.querySelector('UID');
  console.log('UID Node trouvé:', uidNode);
  const playerId = uidNode?.getAttribute('Value') || null;
  console.log('Player ID extrait:', playerId);
  
  if (playerId) {
    currentPlayerId = playerId;
    console.log('✅ UID détecté:', playerId);
    showImagePreview(playerId);
  } else {
    console.log('❌ Aucun UID trouvé dans le XML');
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
  console.log('📁 Fichier reçu:', file.name);
  const reader = new FileReader();
  reader.onload = () => {
    try {
      console.log('📖 Contenu XML lu, taille:', reader.result.length);
      const data = parseXml(reader.result);
      renderAttributes(data);
      const xmlOut = buildOutputXml(data);
      output.value = xmlOut;
      downloadBtn.disabled = false;
      
      // Sauvegarder le joueur dans la base de données
      savePlayerToDatabase(data, xmlOut);
      
      downloadBtn.onclick = () => downloadXml(xmlOut, `${data.name || 'player'}_FM2014.xml`);
    } catch (e) {
      console.error('❌ Erreur parsing:', e);
      alert('Erreur: ' + e.message);
    }
  };
  reader.readAsText(file);
}

function savePlayerToDatabase(data, xmlContent) {
  try {
    // Récupérer les profils existants
    const saved = localStorage.getItem('fm2014_players');
    const players = saved ? JSON.parse(saved) : [];
    
    // Récupérer l'UID directement depuis le XML - plus besoin de champ manuel
    const imageUrl = currentPlayerId ? `${window.location.protocol}//${window.location.host}/api/upload-player-image?playerId=${currentPlayerId}` : null;
    
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
    
    // Vérifier si le joueur existe déjà (par nom)
    const existingIndex = players.findIndex(p => p.name === player.name);
    if (existingIndex !== -1) {
      // Mettre à jour le joueur existant
      players[existingIndex] = player;
    } else {
      // Ajouter le nouveau joueur
      players.push(player);
    }
    
    // Sauvegarder dans localStorage
    localStorage.setItem('fm2014_players', JSON.stringify(players));
    
    // Télécharger automatiquement l'image si on a un ID joueur
    if (currentPlayerId && !imageUrl) {
      uploadPlayerImage(currentPlayerId, player.name, player.id);
    }
    
    // Afficher une notification
    showNotification(`✅ ${player.name} ajouté à la base de données${imageUrl ? ' avec image' : ''}`);
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

// Fonction pour afficher l'image en prévisualisation
function showImagePreview(playerId) {
  console.log('📸 Affichage image pour UID:', playerId);
  const preview = document.getElementById('image-preview');
  
  if (!preview) {
    console.log('❌ Élément image-preview non trouvé');
    return;
  }
  
  // Construire l'URL R2
  const imageUrl = `https://pub-775c150b8211432db9dbf4f59277c50f.r2.dev/Phot/${playerId}.png`;
  console.log('🔗 URL image construite:', imageUrl);
  
  // Afficher l'image
  preview.innerHTML = `
    <img 
      src="${imageUrl}" 
      alt="Joueur ${playerId}" 
      style="max-width: 200px; max-height: 200px; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.15);"
      onerror="this.parentElement.innerHTML='<p style=\\'color: #f5576c; margin: 0;\\'>❌ Image non trouvée pour UID: ${playerId}</p>'"
      onload="console.log('✅ Image chargée avec succès')"
    />
    <p style="margin-top: 0.5rem; font-size: 0.9rem; color: #666;">UID: ${playerId}</p>
    <p style="font-size: 0.85rem; color: #888;">URL: ${imageUrl}</p>
  `;
}

// Fonction pour récupérer automatiquement l'URL de l'image d'un joueur
async function uploadPlayerImage(playerId, playerName, localPlayerId) {
  try {
    showNotification(`🖼️ Récupération de l'image de ${playerName}...`);
    
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
      }
      
      showNotification(`✅ URL image de ${playerName} récupérée !`);
      
      // Rafraîchir l'affichage de la base de données si visible
      const dbSection = document.getElementById('database-section');
      if (dbSection && !dbSection.classList.contains('hidden')) {
        loadPlayersDatabase();
      }
    } else {
      showNotification(`⚠️ Erreur lors de la récupération de l'URL image`);
    }
  } catch (error) {
    console.error('Erreur récupération URL image:', error);
    showNotification(`❌ Erreur lors de la récupération de l'URL image`);
  }
}
