import os
import shutil
import pycountry
DOSSIER_ENTREE = r"C:\Users\enzoa\Downloads\w2560"
DOSSIER_SORTIE = r"C:\Users\enzoa\Downloads\output"


os.makedirs(DOSSIER_SORTIE, exist_ok=True)

for filename in os.listdir(DOSSIER_ENTREE):
    name, ext = os.path.splitext(filename)

    # codes ISO alpha-2 uniquement
    if len(name) == 2 and name.isalpha():
        country = pycountry.countries.get(alpha_2=name.upper())

        if country:
            country_name = country.name.replace(",", "").replace(" ", "_")
            new_filename = f"{country_name}{ext}"

            src = os.path.join(DOSSIER_ENTREE, filename)
            dst = os.path.join(DOSSIER_SORTIE, new_filename)

            if not os.path.exists(dst):
                shutil.copy2(src, dst)
                print(f"✔ {filename} → output/{new_filename}")
            else:
                print(f"⚠ Déjà présent : {new_filename}")
