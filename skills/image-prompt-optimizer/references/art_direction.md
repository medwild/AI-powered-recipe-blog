# Direction artistique

Dictionnaire pour les couches "mood", "couleur/palette", "détails techniques (niveau de finition)" et pour adapter le prompt à l'usage commercial visé.

## Sommaire
- Mood et ambiance
- Palette de couleurs et harmonies chromatiques
- Niveau de détail et de finition
- Différenciation par usage commercial

## Mood et ambiance

Le mood est transmis par l'accumulation cohérente de descripteurs atmosphériques — ne te contente jamais d'un seul adjectif vague ("beau", "joli").

| Mood | Descripteurs clés | Éléments visuels associés | Formulation |
|---|---|---|---|
| Serein / peaceful | Calme, doux, apaisant, méditatif | Lumière douce, pastel, espace négatif, nature | "serene atmosphere", "peaceful mood", "calm and meditative" |
| Dramatique | Intense, puissant, théâtral | Éclairage fort, ciel menaçant, silhouettes | "dramatic lighting", "intense atmosphere", "theatrical composition" |
| Mélancolique | Triste doux, nostalgique | Blue hour, tons froids, pluie, désaturation | "melancholic mood", "bittersweet atmosphere", "nostalgic blue tones" |
| Énergique | Dynamique, vibrant, plein de vie | Couleurs saturées, mouvement, diagonales | "energetic composition", "vibrant and dynamic", "full of life" |
| Mystérieux | Inconnu, intriguant, sombre | Ombres profondes, lumière ciblée, brouillard | "mysterious atmosphere", "intriguing shadows", "enigmatic mood" |
| Luxueux | Richesse, élégance, exclusif | Matériaux nobles, éclairage doré, DoF courte | "luxurious atmosphere", "opulent golden lighting", "high-end editorial" |
| Vintage / retro | Passé, nostalgique, analogique | Grain de film, sépia, vignettage, textures usées | "vintage aesthetic", "retro film look", "analog photography style" |
| Futuriste | Technologie, innovation, sci-fi | Néons, métal, surfaces lisses, LED | "futuristic atmosphere", "sci-fi lighting", "high-tech environment" |
| Organique | Naturel, vivant, texturé, authentique | Matériaux bruts, lumière naturelle, imperfections | "organic textures", "natural authentic feel", "earthy materials" |
| Clinique | Propre, stérile, précis, médical | Blanc dominant, éclairage uniforme | "clinical aesthetic", "sterile white environment", "clean medical lighting" |

## Palette de couleurs et harmonies chromatiques

Les modèles comprennent aussi bien les descriptions verbales que les codes hexadécimaux. Pour une marque/identité visuelle, **préfère toujours les codes hex** — bien plus fiables qu'une description verbale ("nice colors" est inexploitable).

| Harmonie | Description | Exemple | Formulation |
|---|---|---|---|
| Monochromatique | Variations d'une seule teinte | Bleu marine → bleu pâle | "monochromatic blue palette", "shades of deep teal" |
| Analogue | Couleurs adjacentes sur le cercle chromatique | Jaune, orange, rouge-orange | "analogous warm palette of yellow and orange" |
| Complémentaire | Couleurs opposées sur le cercle | Bleu et orange | "complementary blue and orange color scheme" |
| Triadique | Trois couleurs équidistantes | Rouge, jaune, bleu | "triadic color palette of red yellow and blue" |
| Complémentaire splitée | Une teinte + deux adjacentes à son opposé | Bleu, jaune-orange, rouge-orange | "split-complementary palette with blue dominant" |
| Tons terreux | Brun, ocre, vert olive, rouille | Nature, vintage, authenticité | "earthy color palette", "warm earth tones" |
| Pastel | Versions désaturées et éclaircies | Rose pâle, bleu ciel, lavande | "pastel color palette", "soft pastel tones" |
| Néon / cyberpunk | Couleurs fluorescentes saturées | Rose néon, cyan, violet électrique | "neon color palette", "cyberpunk neon pink and cyan" |
| Noir et blanc | Absence de couleur | Classique, dramatique, intemporel | "black and white photography", "monochrome" |
| Sépia / teinté | Dominante chaude vintage | Photos anciennes, nostalgie | "sepia toned", "warm vintage color grade" |

Exemple de formulation hex (supportée par GPT-image-2 et Nano Banana Pro) : *"Color palette dominated by #1B3A5C deep navy and #E07A5F warm terracotta, with #F2F0EB off-white neutrals"*. Voir aussi `templates_and_palettes.md` pour des palettes hex prêtes à l'emploi.

## Niveau de détail et de finition

| Niveau | Caractéristiques | Usage adapté | Formulation |
|---|---|---|---|
| Minimaliste | Formes géométriques simples, peu d'éléments | Logo, icône, UI | "minimalist", "clean and simple", "reduced to essentials" |
| Épuré / clean | Peu de détails mais professionnel, fond uni | Packshot, portrait corporate | "clean professional look", "isolated on clean background" |
| Détaillé | Textures visibles, contexte riche | Illustration éditoriale, concept art, reportage | "highly detailed", "rich in detail", "intricate textures" |
| Hyper-détaillé | Micro-détails, textures poussées à l'extrême | Art digital, matte painting, rendu 3D haut de gamme | "hyper-detailed", "insane detail", "every element meticulously rendered" |
| Atmosphérique | Détails suggérés plutôt que montrés | Paysage, cinéma, mood, rêve | "atmospheric", "soft focus", "dreamy haze" |

## Différenciation par usage commercial

Chaque usage impose des contraintes visuelles et techniques spécifiques — toujours vérifier cette table avant de finaliser la couche "format/ratio" et "style".

| Usage | Contraintes visuelles | Style typique | Ratio | Formulation type |
|---|---|---|---|---|
| E-commerce / produit | Fond blanc/neutre, produit parfaitement visible, couleurs fidèles | Packshot, studio pro, éclairage uniforme | 1:1, 3:4, 4:3 | "product photography on pure white background, studio softbox lighting, sharp focus" |
| Éditorial | Narrative, contextuelle, humaine, réelle | Reportage, portrait environnemental | 3:2, 4:5, 16:9 | "editorial photography, environmental portrait, natural light, documentary style" |
| Publicité | Impactante, mémorable, message clair | Haute production, éclairage dramatique | 16:9, 9:16, 1:1 | "high-end advertising photography, dramatic studio lighting, hero product shot" |
| Sticker | Contour net, fond transparent, lisible en petit | Vectoriel/cartoon, lignes épaisses | 1:1 | "sticker design, die-cut, bold outlines, flat colors, transparent background" |
| Logo | Simplicité maximale, mémorabilité, scalabilité | Vectoriel, géométrique, typographique | 1:1 | "minimalist logo design, clean geometric shapes, vector style, single color" |
| Poster | Impact de loin, hiérarchie visuelle forte | Illustrative/photo, composition verticale | 2:3, 3:4 | "movie poster composition, dramatic central figure, bold typography space at bottom" |
| Pin Pinterest | Vertical, texte lisible, couleurs vives | Lifestyle, flat lay, infographie | 2:3 (1000×1500) | "Pinterest pin style, vertical 2:3, bold text overlay, bright inviting colors" |
| Illustration de blog | Contextuelle au texte, univers cohérent | Flat design, isométrique, aquarelle | 16:9, 4:3 | "blog illustration, flat design style, friendly and approachable" |
| Social media (feed) | Stop-scroll, vertical, texte minimal | Lifestyle, selfie, produit en situation | 4:5, 1:1 | "Instagram-ready lifestyle photo, natural light, aspirational mood, 4:5 portrait" |
| Social media (story/reel) | Plein écran vertical, mouvement, hook rapide | Authentique, dynamique | 9:16 | "Instagram story style, full vertical 9:16, engaging hook, natural authentic feel" |
| Icône / app icon | Lisible à 48×48px, reconnaissance instantanée | Flat ou légèrement skeuomorphe | 1:1 | "app icon design, simple geometric shape, bold color, recognizable at small size" |