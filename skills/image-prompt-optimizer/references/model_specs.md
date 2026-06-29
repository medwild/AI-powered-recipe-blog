# Contraintes techniques par modèle IA

⚠️ **Note de fraîcheur** : ces specs (résolutions, prix, ratios) évoluent vite et datent de juin 2026. Utilise-les comme guide de décision et de formulation, mais si l'utilisateur a un doute sur un chiffre précis (prix, limite exacte), invite-le à vérifier la documentation officielle du fournisseur plutôt que d'affirmer une valeur potentiellement obsolète.

## Sommaire
- GPT-image-2 (OpenAI)
- Nano Banana 2 (Google Gemini)
- Nano Banana Pro (Google Gemini)
- Grok image (xAI)
- Seedance 2.0 (ByteDance — vidéo)
- Tableau comparatif
- Stratégies de prompt par famille de modèle
- Matrice de décision : quel modèle choisir ?

## GPT-image-2 (OpenAI)

- Architecture multimodale autoregressive native (intégrée à GPT-4o).
- Résolutions : 1K (1024×1024), 2K (2048×2048), 4K (3840×2160). Edge max 3840px.
- Ratios via paramètre dédié : 1:1, 2:3, 3:2, 9:16, 16:9 — et tout ratio respectant les contraintes de taille via le paramètre `size`.
- Jusqu'à 16 images de référence (100MB chacune).
- Rendu de texte quasi parfait (>99% de précision) — **point fort distinctif**.
- Pas de fond transparent supporté.
- Pas de negative prompt natif — formule les exclusions positivement dans le prompt principal.
- Latence : jusqu'à 2 minutes pour les prompts complexes ("thinking mode" disponible pour les compositions complexes).

**Recommandations de prompt** : privilégier des descriptions verbales détaillées (modèle natif linguistique, comprend les nuances) ; spécifier les codes hex pour les palettes de marque ; demander le texte explicitement ("text reading exactly 'SALE' in Helvetica Bold") ; fournir des références pour le guidage de style/sujet ; ne jamais demander de fond transparent.

## Nano Banana 2 (Google Gemini 3.1 Flash Image)

- Résolutions : 512px, 1K, 2K, 4K.
- 14 ratios disponibles, dont des formats exotiques : 1:1, 2:3, 3:2, 3:4, 4:3, 4:5, 5:4, 9:16, 16:9, 21:9 (ultra-wide), 4:1, 8:1 (bannières/panoramas), 1:4, 1:8 (ultra-tall, stories/infographies).
- Cohérence de personnage jusqu'à 5 personnages, jusqu'à 14 objets fidèles dans un workflow — **point fort distinctif**.
- Jusqu'à 20 images de référence.
- Recherche web temps réel intégrée (utile pour des sujets actuels/spécifiques).
- Rendu de texte précis avec capacité de traduction dans l'image.
- Watermark SynthID + C2PA automatique.
- Rapide : 4-6 secondes par image. Le plus économique des modèles image cités.
- Légère qualité "artificielle" perceptible à très haut niveau de détail vs Nano Banana Pro.

**Recommandations de prompt** : idéal pour les séries (personnages récurrents, storyboards, campagnes multi-visuels) ; exploiter les ratios exotiques (21:9 bannières, 1:4 infographies verticales, 8:1 panoramas) ; préciser la langue du texte si localisation nécessaire ; ne pas craindre les prompts complexes (instruction-following renforcé).

## Nano Banana Pro (Google Gemini 3 Pro Image)

- Résolutions : 1K, 2K, 4K. 10 ratios (1:1, 2:3, 3:2, 3:4, 4:3, 4:5, 5:4, 9:16, 16:9, 21:9).
- Photoréalisme maximal, éclairage dynamique, textures réalistes — **le plus qualitatif de la famille Google**.
- Plus lent (10-15s/image) et ~2× le prix de Nano Banana 2.
- Usage recommandé : hero images, campagnes publicitaires, éditorial haut de gamme — quand le budget n'est pas la contrainte principale.

## Grok image (xAI)

- Architecture "concentrated diffusion", forte cohérence langage/espace latent.
- Batch generation jusqu'à 10 images par requête — utile pour explorer rapidement des variations.
- Résolutions 1K/2K. Large choix de ratios incluant des formats mobiles spécifiques (19.5:9, 9:19.5, 20:9, 9:20).
- **Amélioration automatique de prompt** — les prompts peuvent être plus concis, le modèle les enrichit lui-même.
- Image-to-image (jusqu'à 3 images source) et génération vidéo intégrée (jusqu'à 15s avec audio synchronisé).
- Biais stylistique fort vers un look "highly aesthetic" / poli / cinématique, même quand un style raw est demandé — à corriger explicitement si besoin.
- Excelle dans la génération de visages/anatomie humaine crédibles, et le texte lisible.
- Limite : lacunes sur des concepts très techniques/niche, pas d'inpainting granulaire.

**Recommandations de prompt** : profiter de l'amélioration auto (prompts plus courts possibles) ; spécifier explicitement "raw documentary style, unpolished, authentic" si l'esthétique polie par défaut ne convient pas ; tester plusieurs variations via le batch de 10 ; bon point d'entrée si l'objectif final est une vidéo (écosystème xAI partagé).

## Seedance 2.0 (ByteDance) — vidéo

- Text-to-video et image-to-video. Durée 4-15 secondes. Résolution max 1080p.
- Ratios : 16:9, 9:16, 4:3, 3:4, 21:9, 1:1.
- Inputs multimodaux riches : texte + jusqu'à 9 images + jusqu'à 3 vidéos + jusqu'à 3 audios. Tagging de rôles via @mentions pour assigner des assets à des personnages/objets.
- Cohérence de personnage renforcée, réplication de signatures de mouvement depuis une vidéo de référence.
- Audio natif synchronisé (beat-aware sync), édition in-video sélective, extension de clip, multi-shot (plusieurs plans dans une même génération).
- **Point fort distinctif** : mouvement humain naturel (danse, marche, gestes).
- Vitesse : ~45-90 secondes pour 6s de vidéo.

**Recommandations de prompt** : penser en mouvement et temporalité, pas en image figée — ex. *"A woman walks into frame from the left, pauses to look at the camera, then continues walking"*. Utiliser des références (image perso, vidéo pour le mouvement de caméra, audio pour le rythme). Décrire la caméra explicitement : "slow dolly forward", "static tripod shot", "handheld documentary style". Préciser le style cinématique : "film noir style, high contrast black and white", "anime style with vibrant colors".

## Tableau comparatif

| Capacité | GPT-image-2 | Nano Banana 2 | Nano Banana Pro | Grok image | Seedance 2.0 |
|---|---|---|---|---|---|
| Type | Image | Image | Image | Image | Vidéo |
| Résolution max | 4K | 4K | 4K | 2K | 1080p |
| Rendu texte | Excellent (>99%) | Très bon | Très bon | Très bon | Modéré |
| Photoréalisme | Excellent | Très bon (léger biais artificiel) | Excellent | Excellent | Très bon |
| Images référence | 16 | 20 | 20 | 3 (édition) | 9 |
| Vitesse | Moyenne (jusqu'à 2min) | Rapide (4-6s) | Lente (10-15s) | Rapide | Rapide (45-90s/6s) |
| Point fort unique | Texte + photoréalisme marketing | Ratios variés + consistance | Meilleure qualité Google | Esthétique + vidéo intégrée | Mouvement humain + multimodal |
| Usage optimal | Marketing pro, UI, texte, packshot | Storytelling, séries, formats sociaux | Hero assets, publicité | Marketing social, vidéo | Clips narratifs, danse, motion |

## Stratégies de prompt par famille de modèle

| Famille | Philosophie de prompt | Structure recommandée | Piège à éviter |
|---|---|---|---|
| OpenAI / GPT-image-2 | Langage naturel riche, précision technique | Phrases complètes, descriptions verbales détaillées, codes hex | Ne pas sous-décrire — le modèle excelle avec la richesse sémantique |
| Google / Nano Banana | Instructions claires, suivi de consignes | Listes structurées, préférences explicites, langage direct | Ne pas hésiter sur la longueur — l'instruction-following est fort |
| xAI / Grok | Concis + laisser l'auto-optimisation | Prompts plus courts, l'IA enrichit automatiquement | Ne pas sur-spécifier le style esthétique — biais fort déjà présent |
| ByteDance / Seedance | Pensée en mouvement et temporalité | Actions verbales ("walks into frame"), description caméra, rythme | Ne pas décrire une image statique — penser séquence et transition |

## Matrice de décision : quel modèle choisir ?

| Besoin | Modèle recommandé | Alternative | Pourquoi |
|---|---|---|---|
| Packshot e-commerce fond blanc | GPT-image-2 | Nano Banana 2 | Photoréalisme + texte lisible sur le produit |
| Portrait corporate pro | GPT-image-2 | Grok image | Cohérence faciale, éclairage contrôlable |
| Série de personnages cohérents | Nano Banana 2 | GPT-image-2 (avec refs) | Consistance native jusqu'à 5 persos |
| Bannière web panoramique | Nano Banana 2 | Grok image | Ratios 21:9 et 8:1 natifs |
| Image avec beaucoup de texte | GPT-image-2 | Nano Banana 2 | Rendu de texte >99% |
| Style très esthétique / "Instagrammable" | Grok image | GPT-image-2 | Biais naturel vers le poli et le cinématique |
| Vidéo de danse / mouvement humain | Seedance 2.0 | — | Leader sur le mouvement humain naturel |
| Storyboard / séquence narrative | Seedance 2.0 | — | Multi-shot natif, consistance personnage |
| Vidéo avec musique synchronisée | Seedance 2.0 | — | Beat-sync natif, audio généré ensemble |
| Budget serré, volume élevé | Nano Banana 2 | GPT-image-2 (1K) | Meilleur rapport qualité/prix à 1K |
| Qualité maximale, budget non contraint | Nano Banana Pro | GPT-image-2 (4K) | Photoréalisme maximal |