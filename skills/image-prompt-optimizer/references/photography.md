# Photographie professionnelle

Dictionnaire technique pour les couches "cadrage", "angle", "détails techniques" du prompt. Consulte la section pertinente selon ce que tu cherches.

## Sommaire
- Cadrage (shot types)
- Angles de caméra
- Focales
- Profondeur de champ
- Exposition et contrôle tonal
- Balance des blancs / température de couleur
- Texture, netteté, réalisme

## Cadrage (Shot Types)

Le cadrage est l'un des descripteurs les plus fiables en prompt IA — entraîné massivement sur des images annotées. **Choisis un seul cadrage dominant par prompt**, ne les accumule jamais.

| Terme (à utiliser dans le prompt) | Zone cadrée | Usage professionnel |
|---|---|---|
| extreme close-up (ECU) | Détail (œil, main, texture) | Intensité émotionnelle, abstraction |
| close-up (CU) | Tête + épaules | Portrait émotionnel, dialogue intime |
| medium close-up (MCU) | Tête à mi-torse | Dialogue cinéma, interview |
| medium shot (MS) | Tête au-dessus des genoux | Équilibre sujet/contexte |
| medium wide shot (MWS) | Sujet en pied + environnement proche | Narration, action, mode |
| wide shot / long shot (WS) | Sujet entier + environnement large | Paysage, contexte, échelle |
| extreme wide shot / establishing shot (EWS) | Environnement dominant, sujet minuscule | Introduction de lieu, échelle massive |
| over-the-shoulder (OTS) | Dos d'un personnage + sujet face | Dialogue, confrontation, immersion |
| point of view (POV) | Vue subjective d'un personnage | Immersion, subjectivité, tension |
| two-shot | Deux sujets dans le cadre | Relation, interaction, dynamique |
| aerial / bird's eye | Vue du dessus à 90° | Cartographie, puissance, abstraction |
| low angle shot | Sujet vu d'en bas | Puissance, menace, grandeur |
| high angle shot | Sujet vu d'en haut | Vulnérabilité, surveillance, échelle |

Placement recommandé : juste après la description du sujet. Ex. *"A medium wide shot of a female architect reviewing blueprints in a modern loft studio, natural window light from the left…"*

## Angles de caméra

| Angle | Effet psychologique | Formulation prompt |
|---|---|---|
| Eye-level | Neutralité, égalité, accessibilité | "at eye level", "eye-level perspective" |
| Low angle / contre-plongée | Puissance, autorité, menace, grandeur | "low angle shot", "shot from below", "looking up at" |
| High angle / plongée | Vulnérabilité, faiblesse, surveillance | "high angle shot", "shot from above", "overhead view" |
| Dutch angle | Déséquilibre, tension, subjectivité troublée | "Dutch angle", "tilted camera", "canted angle" |
| Bird's eye | Abstraction, contrôle, carte, géométrie | "bird's eye view", "top-down perspective" |
| Worm's eye | Immensité, oppression, vertige | "worm's eye view", "looking straight up" |

## Focales

La focale est l'un des paramètres les plus puissants et sous-utilisés. Elle détermine simultanément l'angle de champ, la perspective et la profondeur de champ. **Toujours spécifier la focale en mm**, même si le modèle ne simule pas optiquement une vraie lentille — la valeur numérique oriente fortement le rendu.

| Catégorie | Focale | Effet visuel | Usage | Formulation |
|---|---|---|---|---|
| Ultra grand-angle | 10-16mm | Distorsion extrême, immersion maximale | Architecture intérieure, astrophoto | "12mm ultra-wide angle lens" |
| Grand-angle | 16-35mm | Champ large, perspective étirée | Paysage, architecture, reportage | "24mm wide-angle lens" |
| Standard | 35-70mm | Perspective naturelle (proche vision humaine) | Portrait environnemental, street | "50mm standard lens" |
| Téléobjectif court | 70-135mm | Compression légère, flatteur, bokeh doux | Portrait, mode, mariage | "85mm portrait lens" |
| Téléobjectif | 135-300mm | Compression forte, sujet isolé | Sport, faune, portrait compressé | "200mm telephoto lens" |
| Super téléobjectif | >300mm | Compression extrême, arrière-plan abstrait | Safari, sport pro | "400mm super-telephoto lens" |
| Macro | 50-200mm (spécifique) | Grossissement 1:1, microcosme | Insectes, textures produit | "100mm macro lens" |
| Fisheye | 8-15mm | Distorsion sphérique, effet VR/360 | Sport extrême, créatif | "fisheye lens", "8mm circular fisheye" |

Exemple efficace : *"Portrait of a musician, shot on 85mm f/1.4 lens, shallow depth of field, warm stage lighting in background"* → arrière-plan flou, compression flatteuse, qualité "pro" immédiatement reconnaissable.
Erreur fréquente : "zoomed in close-up" (vague) → préférer "shot on 200mm telephoto lens".

## Profondeur de champ (Depth of Field)

| Type | Caractéristique | Effet visuel | Formulation |
|---|---|---|---|
| Shallow / narrow DoF | f/1.2-f/2.8 | Bokeh crémeux, sujet isolé, intimité, qualité pro | "shallow depth of field", "f/1.8", "creamy bokeh", "subject isolated from background" |
| Moderate DoF | f/4-f/5.6 | Contexte partiellement lisible, équilibre | "moderate depth of field", "f/4" |
| Deep / wide DoF | f/8-f/16 | Toute la scène lisible, paysage, architecture | "deep depth of field", "f/11", "everything in sharp focus", "hyperfocal distance" |
| Bokeh | qualité du flou d'arrière-plan | Esthétique du flou, ambiance onirique | "creamy bokeh", "circular bokeh highlights" |
| Tilt-shift | DoF sélective non naturelle | Effet maquette/jouet, créatif | "tilt-shift effect", "miniature faking" |

Astuce : associer l'ouverture (f/X.X) à la focale renforce la cohérence — "85mm f/1.4" est plus précis que "blurry background" car il implique automatiquement un type de flou particulier.

## Exposition et contrôle tonal

| Concept | Effet sur l'image | Formulation |
|---|---|---|
| Bien exposé | Naturel, lisible, professionnel | "properly exposed", "balanced exposure" |
| Sous-exposé | Sombre, mystère, malaise, film noir | "underexposed", "dark and moody", "low-key lighting" |
| Sur-exposé | Éthéré, innocence, rêve | "overexposed", "high-key lighting", "blown-out highlights" |
| HDR | Très détaillé, parfois artificiel si poussé | "HDR photography", "high dynamic range" |
| Contraste élevé | Impact fort, dramatique, cinématographique | "high contrast", "dramatic contrast", "chiaroscuro lighting" |
| Contraste faible | Doux, brumeux, vintage, pastel | "low contrast", "muted tones", "soft tonal range" |
| High-key | Pureté, innocence, minimalisme, clinique | "high-key photography", "bright white background", "airy and light" |
| Low-key | Drame, mystère, sophistication, film noir | "low-key photography", "dramatic shadows", "dark background with rim light" |

## Balance des blancs / température de couleur

Les modèles répondent très bien à la température de couleur — dimension fondamentale de l'atmosphère.

| Température | Source typique | Effet psychologique | Formulation |
|---|---|---|---|
| 1500-2000K | Bougie, feu | Chaleur extrême, intimité, primitif | "candlelight warmth", "fire glow" |
| 2700-3000K | Tungstène, lampes incandescentes | Chaleur domestique, vintage | "warm tungsten light", "2700K warm glow", "cozy indoor lighting" |
| 3500-4500K | Fluorescent mixte | Neutre légèrement froid, bureau | "neutral white light", "fluorescent office lighting" |
| 5000-6500K | Lumière du jour, flash | Neutre, naturel, journalisme | "daylight balanced", "5500K natural light" |
| 7000-10000K | Ombre, ciel couvert, néon bleu | Froid, distance, futuriste, médical | "cool blue light", "10000K cold tone" |
| Golden hour | Soleil couchant/levant (~3000K) | Nostalgie, beauté, magie | "golden hour light", "warm sunset glow", "magic hour" |
| Blue hour | Crépuscule (~10000K+bleu) | Mélancolie, mystère, urbain | "blue hour", "twilight blue tones" |

Technique avancée : mixer deux températures crée une dimension chromatique. Ex. *"Warm 2700K key light from the left, cool 8000K fill from the right"* → portrait avec tension chromatique et profondeur.

## Texture, netteté, réalisme

| Attribut | Usage | Formulation |
|---|---|---|
| Sharp focus | Produit, portrait pro, détail technique | "sharp focus", "tack sharp", "crisp detail" |
| Soft focus | Portrait romantique, rêve, vintage | "soft focus", "gentle blur", "ethereal softness" |
| Selective focus | Direction du regard, hiérarchie visuelle | "selective focus on the eyes" |
| Motion blur | Dynamique, vitesse, action | "motion blur", "long exposure", "panning motion blur" |
| Lens flare | Cinématique, authenticité, soleil | "lens flare", "anamorphic lens flare", "sun flare" |
| Film grain | Texture organique, vintage, cinéma | "film grain", "Kodak Portra 400 grain", "analog texture" |
| Chromatic aberration | Défaut optique réaliste, vintage | "subtle chromatic aberration" |
| Vignetting | Concentration au centre, style vintage | "natural vignetting", "edge darkening" |