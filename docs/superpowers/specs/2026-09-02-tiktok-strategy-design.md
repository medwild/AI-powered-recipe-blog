# Spec — Stratégie TikTok Chef Augustin

> Date : 2026-09-02 · Statut : validée oralement section par section, en attente de relecture écrite
> Owner : utilisateur (production + posting) · Assistant (briefs, keywords, mesure)
> Contexte : nouveau compte TikTok associé à chefaugustin.com. Miroir du canal Pinterest
> (`docs/pinterest/TO-POST.md`), qui a décollé fin août (458 impr/j, ×11).

---

## 1. Objectif et arbitrage

- **Objectif principal (A)** : trafic vers chefaugustin.com (revenus AdSense au clic), comme Pinterest.
- **Sous-produit (B)** : la croissance d'audience est bienvenue mais n'est jamais l'arbitre.
- **Règle d'arbitrage** : en cas de conflit entre « viral » et « trafic/recette », **trafic/recette gagne**.
- **Hors périmètre (YAGNI)** : lives, DM automation, deuxième compte, achats de mentions,
  Creator Rewards comme source de revenus (compte marocain non éligible — cf. §9).

## 2. Configuration du compte

| Champ | Valeur |
|---|---|
| Username | `@cookwithaugustin` (aligné Pinterest ; remplacer `cokkwithaugust` actuel — Réglages → Compte → Nom d'utilisateur) |
| Nom affiché | `Chef Augustin` |
| Photo de profil | Logo master `repports/logos-master-2026-08-12/` (cohérence multi-canal) |
| Bio (~79/80 car.) | `French-style dinners for 2 🍳 Quick, cheap, from scratch`<br>`Full recipes ↓ 80+ tested` |
| Site web | `chefaugustin.com` si le champ est débloqué (cf. §9) ; sinon texte dans la bio |
| Type de compte | **Personnel** (garde les sons trending — nécessaire à l'option B) |

**Chemin de trafic principal (indépendant du lien bio)** :
1. **Pinned comment** sous chaque vidéo : `chefaugustin.com/recipes/{slug}` (slug exact de la recette) ;
2. CTA texte à l'écran en fin de vidéo : « Full recipe ↓ in bio » ;
3. UTM sur tous les liens : `?utm_source=tiktok&utm_medium=social` (mesurable GA4, comparable Pinterest).

## 3. Distribution & technique

**Situation** : compte créé au Maroc, VPN à sortie Allemagne, audience cible US/UK/CA/AU.

- Contenu **100 % anglais** (voix off, texte à l'écran, captions, hashtags) : l'audience finale est
  déterminée par qui interagit, pas par le pays du compte.
- Rampe d'ajustement assumée : les 2-4 premières semaines peuvent diffuser hors cible (compte jeune +
  amorçage local documenté historiquement). **Pas de triche d'engagement** (pas de fermes de vues).
- **VPN** : une seule sortie stable, jamais de rotation de pays (signal anti-spam). Alternative
  également acceptable : connexion stable sans VPN. À garder constant pendant toute la phase de test.
- **Horaires** : fenêtre dîner US = 17h-20h New York ≈ 23h-02h Maroc. En 2 posts/jour :
  un créneau ≈ soirée US Est, un créneau ≈ matinée US Est.
- **W watermark** : aucune vidéo avec filigrane d'app tierce (Dola, CapCut outro, etc.) — pénalisées et
  moches. Export propre obligatoire.

## 4. Stratégie de contenu

**Angle de marque** : *French-style dinners for 2* — premium perçu, rapide, bon marché, calibré pour
deux. Différenciateur face aux comptes « quick dinners » US.

### Piliers (ratio ~70/20/10)

| Pilier | Rôle | Formats |
|---|---|---|
| **Recipe-First** | Trafic + saves | Recette complète auto-suffisante en 30-45 s (étapes + quantités à l'écran) ; le « plus » (fiche imprimable, photos étapes, version longue) reste sur le blog |
| **Séries récurrentes** | Récurrence/abonnés | « $10 Dinner Date » · « French in 25 » · « Two Bites » — une voix TTS signature par série |
| **Search-Content** | TikTok SEO / AI answers | Vidéos-réponses à requêtes : « what to cook for two tonight », « cheap easy dinner for 2 » |

### Anatomie d'une vidéo (30-45 s, optimisée complétion)

```
0-2 s    HOOK : plat fini + overlay chiffré ("Dinner for 2. $9. 25 min. One pan.")
2-8 s    BEAT désirable : cheese pull / sauce / craquant
8-35 s   ÉTAPES compressées — quantités + temps à l'écran (vidéo utilisable seule → saves)
35-45 s  PLATING + CTA "Full recipe ↓ in bio"
```

- Voix off : TTS natif TikTok, anglais, voix signature cohérente.
- Texte à l'écran systématique : TikTok indexe le texte affiché et parlé.

### Checklist SEO par vidéo

1. Keyword cible = keyword SEO de la recette sur le blog (source : DB +
   `claude_code_recipe_keywords_MASTER_combined.csv` + GSC) → présente dans le hook (texte+voix) et en
   **première ligne de caption** ;
2. 3-4 hashtags : 1 broad + 2 niche + 1 marque (`#cookwithaugustin`) ;
3. Nom de fichier vidéo descriptif en anglais avant upload.

### Choix des recettes

Priorisées par la demande déjà validée : **Desserts** (board Pinterest gagnant en outbound),
**Romantic/One-Pan** (n°1 volume), tests vidéo Quick Weeknight/Easy Chicken. 1 vidéo = 1 recette
existante (83 recettes indexées = calendrier quasi gratuit). VAGUE 3 (vegetarian) intégrée au fil de l'eau.

### Calendrier (budget 20 h+/sem)

- 1-2 posts/jour ;
- 2 sessions de batch/semaine (lundi + jeudi, ~7 h) : 8-12 vidéos (génération → overlays → captions →
  planification TikTok Studio ou upload manuel).

## 5. Intégrité (règle dure)

- **La vidéo doit suivre la vraie recette** : le prompt de génération est dérivé des ingrédients et
  étapes réels de la fiche (comme le mega-skill derive l'image prompt). Une vidéo qui montre un process
  faux = recette fausse servie au spectateur. Interdit, même principe que le gate claims santé.
- Si TikTok propose le label **« contenu généré par IA »**, l'activer (conformité CGU, protège la marque).
- Aucun claim de test/expérience faux dans les captions (règle globale #13).

## 6. Workflow

`docs/tiktok/TO-POST.md` = **source de vérité** (même discipline que Pinterest : ne jamais deviner un
détail de pin/vidéo sans lire le fichier). Sections par vidéo :

```
## TIKTOK-{n} — {titre recette} ({slug})
- Vidéo : {fichier mp4, durée, résolution} | watermark : NON ✅
- Hook (texte écran) : ...
- Overlays étapes : ...
- Voix off (texte TTS) : ...
- Caption : ...
- Hashtags : ...
- Pinned comment : chefaugustin.com/recipes/{slug}?utm_source=tiktok&utm_medium=social
- Créneau : {date} {heure} | Statut : [ ] briefé → [ ] vidéo ok → [ ] posté → [ ] analytics D+7
```

Répartition des rôles (identique à Pinterest) : l'assistant extrait les keywords de la recette (DB),
rédige hook/overlays/TTS/caption/hashtags/board et tient le fichier ; l'utilisateur génère la vidéo et
poste manuellement.

## 7. Mesure

- **North star** : sessions GA4 avec `utm_source=tiktok` (comparé à `utm_source=pinterest`).
- Leading : **saves** et taux de complétion (prédicteurs de portée en niche cuisine).
- Hebdo (via l'app) : vues, visites de profil, taps lien bio, abonnés.

### Paliers (garde-fous, pas des promesses)

| Jalon | Décision |
|---|---|
| J1-J14 | Phase test : 2 formats × 2 catégories en alternance. **Aucun jugement de perf** (compte jeune + rampe §3) |
| J30 | Première revue : identifier les patterns gagnants, recalibrer le calendrier dessus |
| J60 | Go/no-go cadence : si médiane < 200 vues et zéro pattern sortant du lot → revisiter la stratégie au lieu d'empiler |

## 8. Première semaine d'exécution (extrait du plan)

1. Corriger l'username → `cookwithaugustin` ; photo + bio conformes §2 ; vérifier le champ site web (§9) ;
2. Briefer 4 vidéos via `docs/tiktok/TO-POST.md` (2 desserts, 1 one-pan, 1 search-content) ;
3. Tester la chaîne complète (génération sans watermark → TTS → upload → pinned comment UTM) ;
4. Noter la baseline (abonnés = 0, vues des premières vidéos).

## 9. Points à vérifier dans l'app (non confirmables ce soir par source officielle)

1. **Champ « Website »** sur compte personnel (règle historiquement documentée : seuil ~1 000 abonnés ;
   règles TikTok ayant changé plusieurs fois → vérifier Réglages → Modifier le profil).
   La spec n'en dépend pas (pinned comment = chemin principal).
2. **Éligibilité régionale réelle** du Creator Rewards (Réglages → TikTok Studio → Outils pour les
   créateurs) — hypothèse forte : non éligible depuis le Maroc → B reste « actif d'audience », pas revenus.
3. **Disponibilité du username** `cookwithaugustin` (sinon variante proche cohérente, jamais un nom différent).

## 10. Sources & limites d'honnêteté

- Connaissances internes TikTok (règles de bio, Creator Rewards, watermark) : **approximatives et
  susceptibles d'avoir changé** — marquées §9 plutôt qu'affirmées. Les vérifications web du 02/09 ont
  échoué (outillage indisponible) ; à refaire avant ou pendant la première semaine.
- Données internes citées : `repports/pinterest-analytics-2026-08-24.md`, mémoire
  `pinterest-video-pins` (décollage 22-29/08), `data/` keywords.
