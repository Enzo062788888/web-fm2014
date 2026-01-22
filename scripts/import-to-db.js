const fs = require('fs');
const path = require('path');

// Charger les résultats du téléchargement
const results = require('./download-results.json');

// TODO: Configuration de votre base de données (Supabase ou autre)
// const { createClient } = require('@supabase/supabase-js');
// const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

async function importToDatabase() {
    console.log(' Import des URLs dans la base de données...');
    
    let imported = 0;
    
    for (const player of results) {
        if (player.status === 'success' && player.url) {
            // Exemple avec Supabase :
            // await supabase.from('players').upsert({
            //     id: player.id,
            //     name: player.name,
            //     image_url: player.url
            // });
            
            console.log(` Importé : ${player.name} -> ${player.url}`);
            imported++;
        }
    }
    
    console.log(`\n ${imported} joueurs importés dans la base de données !`);
}

// Lancer l'import
importToDatabase().catch(console.error);
