# Erreurs fréquentes dans les prompts image

Vérifie cette liste avant de livrer un prompt — c'est la dernière étape de contrôle qualité.

## Sommaire
- Erreurs structurelles
- Erreurs techniques
- Erreurs de style et de direction artistique
- Artefacts spécifiques aux modèles IA

## Erreurs structurelles

| Erreur | Pourquoi c'est problématique | Correction |
|---|---|---|
| Cadrages contradictoires ("extreme close-up wide shot of a city") | Le modèle ne peut pas produire un gros plan extrême ET un plan d'ensemble — résultat médiocre | Choisir un seul cadrage dominant par prompt |
| Instructions contradictoires ("photorealistic cartoon style") | Termes mutuellement exclusifs, le modèle privilégie souvent le dernier ou mélange incohérent | Hiérarchiser : "cartoon style with realistic textures" ou choisir un style dominant |
| Trop d'éléments (7+ sujets dans la même scène) | Capacité limitée à gérer les relations spatiales entre nombreux éléments — fusion, proportions incorrectes, oublis | Limiter à 3-5 éléments principaux, hiérarchiser le sujet principal |
| Ordre désordonné ("beautiful amazing stunning gorgeous picture of...") | Les premiers mots ont plus de poids sémantique — les adjectifs empilés gaspillent ce poids | Placer le sujet et le cadrage en premier, les adjectifs après |
| Vagueur extrême ("something nice", "a beautiful scene") | Aucune information exploitable — résultat aléatoire | Spécifier sujet, contexte, style, éclairage |
| Négation maladroite ("a person without a hat") | Les modèles gèrent mal les négations — l'élément nié reste présent dans l'espace latent | Formuler positivement : "a person with uncovered head" |
| Spécifications impossibles ("a 360-degree view in a single image") | Une image 2D ne peut pas contenir une vue à 360° | Générer plusieurs vues ou utiliser un format adapté (vidéo, 3D) |

## Erreurs techniques

| Erreur | Conséquence | Correction |
|---|---|---|
| Oublier la focale | Le modèle choisit arbitrairement, souvent un "mélange" sans caractère optique identifiable | Toujours spécifier "XXmm lens" ou "wide-angle"/"telephoto" |
| "Zoom" au lieu de focale ("zoomed in", "zoom on the face") | "Zoom" n'est pas une caractéristique optique | Remplacer par "shot on 200mm telephoto lens" ou "close-up portrait" |
| Confusion DoF/focus ("blurry background" sans préciser la qualité) | Peut produire un flou artificiel ou de mauvaise qualité | "shallow depth of field f/1.8 with creamy bokeh" |
| Température de couleur absente | L'image manque d'atmosphère et de cohérence chromatique | "warm 3200K tungsten light" ou "cool 6500K daylight" |
| Pas de style visuel défini | Résultat "générique IA" sans identité visuelle | Préciser "photorealistic", "digital illustration", "oil painting", etc. |
| Ratio absent | Le modèle utilise son ratio par défaut (souvent 1:1), incompatible avec l'usage prévu | Spécifier le ratio en paramètre API + dans le prompt ("16:9 cinematic widescreen") |

## Erreurs de style et de direction artistique

| Erreur | Conséquence | Correction |
|---|---|---|
| Mélange de styles incongrus ("Studio Ghibli style photorealistic corporate headshot") | Styles incompatibles, résultat incohérent | Choisir un style dominant ou un hybride explicite : "corporate headshot with subtle anime-inspired color palette" |
| Référence à un artiste vivant/protégé ("in the style of [artiste sous copyright]") | Risque juridique, les modèles récents filtrent activement ces références | Décrire les caractéristiques stylistiques sans nommer l'artiste : "bold primary colors in flat areas, reminiscent of 1960s pop art" |
| Palette absente | Résultat chromatiquement aléatoire, incohérent avec la marque | Définir une palette : "warm earth tones of terracotta and sage green" |
| Mood non défini | Image techniquement correcte mais émotionnellement plate | Ajouter des descripteurs atmosphériques : "serene and contemplative mood" |

## Artefacts spécifiques aux modèles IA

| Artefact | Cause probable | Prévention via prompt |
|---|---|---|
| Doigts déformés (supplémentaires, fusionnés, mal articulés) | Difficulté avec les détails anatomiques fins | "realistic hands with five correctly proportioned fingers", "hands naturally posed" |
| Visage asymétrique | Génération faciale latente instable | "symmetrical facial features", "professional portrait with balanced face" |
| Texte illisible / gibberish | Les modèles (hors GPT-image-2) ne "comprennent" pas le texte comme du langage | GPT-image-2 : "text reading exactly 'EXAMPLE' in clean sans-serif font". Autres modèles : éviter le texte ou le générer/ajouter séparément |
| Incohérence de perspective | Difficulté à maintenir une géométrie 3D cohérente | "consistent one-point perspective", "architecturally accurate perspective" |
| Mélange d'éléments (deux sujets fusionnés en un hybride) | Surprompting, éléments trop proches dans l'espace latent | Séparer spatialement : "person on the left, cat on the right, clearly separated" |
| Style drift (le style change dans l'image) | Pas de cohérence stylistique globale | Renforcer le style en début de prompt comme contrainte : "consistent minimalist style throughout" |