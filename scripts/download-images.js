const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');

// Configuration Cloudflare R2
const R2_CONFIG = {
    endpoint: process.env.R2_ENDPOINT, // Ex: https://xxxxx.r2.cloudflarestorage.com
    region: 'auto',
    credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY
    }
};

const s3Client = new S3Client(R2_CONFIG);
const BUCKET_NAME = 'fm2014-players';
const PUBLIC_URL = process.env.R2_PUBLIC_URL; // Ex: https://images.votredomaine.com

// Liste des joueurs à télécharger
const players = [
    { id: '1', name: 'Player 1' },
    { id: '2', name: 'Player 2' },
    // Ajoutez vos joueurs ici...
];

// Fonction pour télécharger une image depuis sortitoutsi
async function downloadImage(playerId) {
    try {
        const imageUrl = `https://sortitoutsi.net/graphics/portraits/1/${playerId}.png`;
        console.log(`Téléchargement de l'image du joueur ${playerId}...`);
        
        const response = await axios.get(imageUrl, {
            responseType: 'arraybuffer',
            timeout: 10000,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
        });
        
        return Buffer.from(response.data);
    } catch (error) {
        console.error(`Erreur téléchargement joueur ${playerId}:`, error.message);
        return null;
    }
}

// Fonction pour uploader sur R2
async function uploadToR2(imageBuffer, playerId) {
    try {
        const fileName = `players/${playerId}.png`;
        
        const command = new PutObjectCommand({
            Bucket: BUCKET_NAME,
            Key: fileName,
            Body: imageBuffer,
            ContentType: 'image/png',
            CacheControl: 'public, max-age=31536000' // Cache 1 an
        });
        
        await s3Client.send(command);
        console.log(`✅ Image uploadée : ${fileName}`);
        
        return `${PUBLIC_URL}/${fileName}`;
    } catch (error) {
        console.error(`Erreur upload R2 pour ${playerId}:`, error.message);
        return null;
    }
}

// Fonction principale
async function processPlayers() {
    console.log(`🚀 Début du téléchargement de ${players.length} images...`);
    
    const results = [];
    let success = 0;
    let failed = 0;
    
    for (const player of players) {
        console.log(`\n📥 Traitement de ${player.name} (ID: ${player.id})...`);
        
        // Télécharger l'image
        const imageBuffer = await downloadImage(player.id);
        
        if (!imageBuffer) {
            failed++;
            results.push({ ...player, status: 'failed', url: null });
            continue;
        }
        
        // Upload sur R2
        const imageUrl = await uploadToR2(imageBuffer, player.id);
        
        if (imageUrl) {
            success++;
            results.push({ ...player, status: 'success', url: imageUrl });
        } else {
            failed++;
            results.push({ ...player, status: 'failed', url: null });
        }
        
        // Pause pour éviter de surcharger le serveur
        await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    // Sauvegarder les résultats
    fs.writeFileSync(
        path.join(__dirname, 'download-results.json'),
        JSON.stringify(results, null, 2)
    );
    
    console.log('\n✅ Téléchargement terminé !');
    console.log(`   Réussis : ${success}`);
    console.log(`   Échoués : ${failed}`);
    console.log(`   Résultats sauvegardés dans download-results.json`);
}

// Lancer le script
processPlayers().catch(console.error);
