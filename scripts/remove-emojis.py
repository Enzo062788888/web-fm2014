import re
import os

# Patterns d'emojis à supprimer
emoji_pattern = re.compile(r'[\U0001F300-\U0001F9FF\U00002600-\U000026FF\U00002700-\U000027BF]', re.UNICODE)

# Fichiers à nettoyer
files_to_clean = [
    'public/js/app.js',
    'public/js/auth-handler.js',
    'public/js/auth-check.js',
    'public/app.html',
    'public/reset-password.html',
    'public/confirm-reset.html',
    'src/js/app.js',
    'scripts/download-images.js',
    'scripts/import-to-db.js'
]

for file_path in files_to_clean:
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Supprimer les emojis
        cleaned_content = emoji_pattern.sub('', content)
        
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(cleaned_content)
        
        print(f'Nettoyé: {file_path}')
    except Exception as e:
        print(f'Erreur avec {file_path}: {e}')

print('\nNettoyage terminé!')
