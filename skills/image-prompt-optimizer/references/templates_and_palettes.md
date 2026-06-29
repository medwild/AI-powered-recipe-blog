# Templates, schéma JSON et palettes prêtes à l'emploi

## Sommaire
- Templates de prompts réutilisables
- Schéma JSON de sortie (quand le format JSON est demandé/justifié)
- Tableau de correspondance rapide : concept → formulation
- Palettes hex pré-construites

## Templates de prompts réutilisables

Utilise ces squelettes comme point de départ, à remplir avec les choix faits dans les autres fichiers de référence — ne les recopie jamais tels quels avec les `{placeholders}` visibles dans la sortie finale.

**Portrait professionnel**
```
{medium_shot_type} of a {subject_description}, {context_or_setting}.
{photography_style} photography, {quality_level}.
{lighting_scheme} lighting, {light_quality} {light_direction}, {color_temperature} color temperature, {shadow_quality}.
{composition_rule}, {subject_placement}.
Color palette: {primary_color} and {secondary_color} with {neutral_tone} neutrals.
Shot on {focal_length}mm f/{aperture} lens, {depth_of_field}, {focus_point}, {texture_detail}.
{mood_atmosphere} mood.
{format_ratio} format.
```

**Produit e-commerce**
```
{product_photography_type} of a {product_description}, isolated on {background_color} background.
{lighting_type} from {light_direction}, {light_quality}, even illumination with soft shadows.
{angle_view} angle, {depth_of_field}, {sharpness_quality}.
Color-accurate, {color_temperature} balanced.
{format_ratio} e-commerce packshot.
```

**Illustration éditoriale**
```
{illustration_style} illustration of {subject_description} in {context_or_scene}.
{artistic_technique}, {detail_level}.
Color palette: {color_description}.
{composition_type} composition, {mood_atmosphere} atmosphere.
{format_ratio}, {usage_context} illustration.
```

**Cinématique / vidéo (Seedance)**
```
{cinematic_description}: {subject} {action_in_motion} in {setting}.
{camera_movement} camera, {shot_type}.
{lighting_type}, {color_temperature} tones, {contrast_level}.
{mood_atmosphere} mood, {pacing_description}.
{aspect_ratio} cinematic format.
```

## Schéma JSON de sortie

À utiliser uniquement quand la demande de l'utilisateur justifie un format structuré (voir SKILL.md, étape 4). Adapte les champs à ce qui est réellement pertinent pour la demande — ne force pas tous les champs si certains n'ont pas de sens (ex. pas de `negative_prompt` pour un modèle qui n'en supporte pas).

```json
{
  "prompt_optimise": "Le prompt complet optimisé, en anglais",
  "prompt_original": "Le prompt/idée d'entrée de l'utilisateur",
  "negative_prompt": "Les exclusions formatées, si le modèle cible le supporte",
  "metadata": {
    "sujet_principal": "",
    "cadrage": "",
    "focale_mm": 0,
    "ouverture": "",
    "schema_eclairage": "",
    "temperature_couleur_k": 0,
    "composition": "",
    "style_visuel": "",
    "technique_rendu": "",
    "palette_couleurs": ["#HEX1", "#HEX2"],
    "mood": "",
    "niveau_detail": "",
    "format_destination": "",
    "aspect_ratio": "",
    "usage_commercial": ""
  },
  "model_recommendation": {
    "modele_principal": "",
    "modele_alternatif": "",
    "raison_choix": ""
  },
  "quality_score": {
    "total": 0,
    "qualification": ""
  }
}
```

## Tableau de correspondance rapide : concept → formulation

| Je veux... | J'écris... |
|---|---|
| Un portrait professionnel | "professional corporate headshot, loop lighting, medium close-up" |
| Un flou d'arrière-plan de qualité | "85mm f/1.4 lens, shallow depth of field, creamy bokeh" |
| Une ambiance cinéma | "cinematic lighting, anamorphic lens flare, 2.39:1 widescreen" |
| Un rendu vintage | "shot on Kodak Portra 400, film grain, warm vintage color grade" |
| Une image pour Pinterest | "vertical 2:3 composition, generous negative space, bold subject" |
| Un logo minimaliste | "minimalist logo design, geometric vector, single color, flat" |
| Un sticker | "die-cut sticker design, bold outlines, flat colors, transparent background" |
| Un paysage épique | "epic landscape, extreme wide shot, 16mm ultra-wide, HDR, atmospheric" |
| Une photo de nourriture appétissante | "food photography, overhead flat lay, natural side light, shallow DoF" |
| Un concept art sci-fi | "sci-fi concept art, environment design, dramatic lighting, hyper-detailed" |
| Une image chaude et cozy | "warm tungsten 2700K light, cozy atmosphere, soft shadows, golden tones" |
| Une image froide et futuriste | "cool 8000K blue light, clinical aesthetic, high contrast, neon accents" |
| Du mouvement et de la vitesse | "motion blur, panning technique, dynamic action, sense of speed" |
| De la texture organique | "organic textures, natural materials, wood grain, linen fabric, imperfections" |
| Un rendu 3D propre | "3D render, physically based materials, clean studio lighting, isometric" |

## Palettes hex pré-construites

Utiles dès qu'une marque/ambiance chromatique cohérente est demandée sans que l'utilisateur ait déjà ses propres codes hex.

| Nom | Couleurs (HEX) | Usage | Mood |
|---|---|---|---|
| Ocean Corporate | #0A192F, #112240, #233554, #64FFDA, #CCD6F6 | Tech, corporate, SaaS | Professionnel, fiable, moderne |
| Terra Cotta Warm | #E07A5F, #F2CC8F, #81B29A, #3D405B, #F4F1DE | Lifestyle, bien-être, food | Chaleureux, naturel, accueillant |
| Neon Cyberpunk | #FF006E, #8338EC, #3A86FF, #FB5607, #FFBE0B | Gaming, tech, nightlife | Énergique, futuriste, audacieux |
| Minimal B&W | #000000, #FFFFFF, #333333, #666666, #999999 | Luxe, mode, éditorial | Élégant, intemporel, sophistiqué |
| Pastel Dream | #FFB5BA, #B5EAD7, #C7CEEA, #FFDAC1, #E2F0CB | Enfants, créatif, doux | Doux, rêveur, joyeux |
| Forest Organic | #2D5016, #3A7D44, #69B578, #D4E6B5, #F4F1DE | Nature, éco, bien-être | Naturel, apaisant, authentique |
| Gold Luxury | #1A1A1A, #C9A227, #F5F0E8, #8B7355, #D4AF37 | Luxe, haute joaillerie, premium | Opulent, exclusif, raffiné |
| Sunset Gradient | #FF6B6B, #FEA55B, #FFD93D, #6BCB77, #4D96FF | Voyage, été, lifestyle | Optimiste, chaleureux, énergique |