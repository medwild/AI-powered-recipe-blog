# 🎬 TikTok — TO-POST (source de vérité du canal)

> ⛔ Règle 11/08 (héritée de Pinterest) : ne JAMAIS deviner un détail de vidéo — lire ce fichier.
> Ouvre ce fichier dans l'éditeur (pas le terminal) pour le copier-coller du post.
> Spec : `docs/superpowers/specs/2026-09-02-tiktok-strategy-design.md` · Plan semaine 1 : `docs/superpowers/plans/2026-09-02-tiktok-semaine-1.md`
> Rôles : assistant = briefs / captions / hashtags / mesure ; utilisateur = app, génération vidéo, posting.

> 🇬🇧 **100 % ANGLAIS** : hook, overlays, TTS, caption, hashtags — audience cible US/UK/CA/AU.
> 🚫 **WATERMARK** : aucune vidéo avec filigrane d'app tierce (Dola, CapCut outro…) — chaque brief porte une ligne `watermark : [ ] vérifié NON` à cocher AVANT upload.
> 🎞️ **CODEC** : export **H.264 (avc1) + faststart** obligatoire (1ᵉʳ export Canva du 02/09 = HEVC → KO). Sonder avant upload : `node scripts/_probe-mp4.mjs <fichier>`.
> 🔗 **CHAÎNE DE TRAFIC** : caption = « ↓ in bio » + **Pinned comment avec lien UTM** (chemin principal — le lien bio peut être bloqué sur compte neuf, cf. § ⚙️). UTM systématique : `?utm_source=tiktok&utm_medium=social`.
> ⏰ **CRÉNEAU** : 23:00 Maroc ≈ 17:00 New York (fenêtre dîner US Est). Cadence semaine 1 : 1 vidéo/jour.
> 🤖 **Label IA** : si TikTok propose « contenu généré par IA » à la publication → l'ACTIVER (spec §5).

---

## ✅ PUBLIÉES / À POSTER

| # | Vidéo | Recette / cible | Créneau | Statut |
|---|---|---|---|---|
| 1 🎬 | Edible Cookie Dough | `edible-cookie-dough-recipe-for-2` | MER 03/09 23:00 | ✅ posté 03/09 — ⚠️ **0 vues à D+1** (diag 04/09 : format 1000×1500 ≠ 9:16 + config ⚙️ non cochée — voir § Diagnostic TIKTOK-1) |
| 2 🎬 | Molten Lava Cakes | `chocolate-lava-cakes-for-two` | JEU 04/09 23:00 | ⏳ vidéo à générer |
| 3 🎬 | One-Pan Gnocchi | `one-pan-gnocchi-for-two` | VEN 05/09 23:00 | ⏳ vidéo à générer |
| 4 🎬 | Search-content « what to cook for two tonight » | hub `/guides/15-easy-dinner-recipes-for-two` | SAM 06/09 23:00 | ⏳ vidéo à générer |
| 5 🎬 | **One-Pan Breakfast Sandwich** (PILOTE trend) | `one-pan-breakfast-sandwich-for-two` | DIM 07/09 23:00 | ⏳ fiche publiée ✅ (#125, 03/09) — rush 9:16 à tourner |

> J5-J7 : recalibrés (décision 03/09) — J5 = **TIKTOK-5 sandwich**, capturer la fenêtre du trend egg-wrap (la vidéo de référence date du 03/09 ; J5 = J+4, dernier moment utile). J6/J7 restent à briefer après les 4 premières (spec §7 : aucun jugement avant J14).
> ℹ️ TIKTOK-1 recycle `cookie-dough-pin20.mp4` (publié en pin Pinterest 20 le 03/09 ~14:15) — cross-post délibéré, test de la chaîne complète.

### 🔍 Diagnostic TIKTOK-1 — 0 vues à D+1 (04/09)

Causes classées, par test le plus rapide d'abord. ⚠️ Hygiène : **NE PAS supprimer/reposter en boucle** (facteur signalement spam rapporté par les praticiens).

| # | Cause probable | Test (2 min) | Si oui → |
|---|---|---|---|
| 1 | Visibilité du post limitée | Ouvre le lien de la vidéo en **navigation privée, déconnecté** (ou téléphone d'un tiers) | « vidéo indisponible » → Share/Who can watch ≠ Tout le monde → corriger la visibilité |
| 2 | En attente de modération (compte neuf + contenu IA : rétention fréquente rapportée, ⚠️ non confirmable par source) | App → profil de la vidéo → statut ; et Studio → contenu | Ça dure < 48-72 h d'habitude → poster TIKTOK-2 ce soir quand même, re-mesurer J+3 |
| 3 | **Format non natif** : TIKTOK-1 = 1000×1500 (**4:5**, pilier letterboxé) et non 9:16. Guidelines d'upload TikTok = 9:16 recommandé (confiance moyenne-high, doc officiel existant non re-vérifié ici) | Regarder le rendu du post dans le feed : barres latérales ? | Les twins suivants (lava/gnocchi/sandwich) en **1080×1920 strict**, et envisager re-render 9:16 du cookie dough pour YT-1 |
| 4 | Compte/VPN : case ⚙️ « sortie fixée » **jamais remplie** — rotation de pays = cause classique de 0-diffusion sur compte neuf (consensus praticiens, ⚠️ pas de source primaire) | De quoi la publication s'est-elle faite ? (VPN actif ?quel pays ? changé récemment ?) | Fixer la sortie dès ce soir AVANT TIKTOK-2, ne plus jamais la bouger |
| 5 | Cold-start normal compte neuf (0-50 vues / 24 h = fréquent, ⚠️ observation praticiens) — mais « 0 » strict est plus suspect | Re-regarder à D+2/D+3 | Si déverrouillage sans rien toucher → cold start ; sinon cause 1-4 |

**Règle de jugement inchangée (spec §7) : aucun verdict avant J14 (17/09).** Ce diagnostic sert à corriger le pipeline, pas à conclure sur le canal.

---

## 🔁 Chaîne à suivre à CHAQUE post (spec §2 + §6)

1. Upload du mp4 (nom de fichier anglais descriptif) ;
2. Coller la **caption** du brief telle quelle (1ʳᵉ ligne = keyword) ;
3. Son : trending (compte Personnel) ou audio d'origine — pas de musique sous licence pro ;
4. Activer le label IA si proposé ;
5. **Épingler le commentaire** = lien UTM du brief (immédiatement après publication) ;
6. Cocher `[x] posté` → l'utilisateur annonce, l'assistant coche + commit ;
7. Notes : baseline J0 ci-dessous, analytics D+7 par vidéo.

---

## ⚙️ Configuration du compte (spec §2 + §9 — à faire / à vérifier dans l'app)

- [ ] Username → `cookwithaugustin` (Pinterest est déjà sous ce nom ; cohérence multi-canal)
      Probe : `curl -s -o /dev/null -w '%{http_code}\n' https://www.tiktok.com/@cookwithaugustin` → 404 = libre ; 200 = pris → variante proche uniquement.
- [ ] Nom affiché : `Chef Augustin`
- [ ] Photo de profil : logo master `repports/logos-master-2026-08-12/`
- [ ] Bio (~79 car.) : `French-style dinners for 2 🍳 Quick, cheap, from scratch` / `Full recipes ↓ 80+ tested`
- [ ] Type de compte : **Personnel** (garde les sons trending)
- [ ] VPN : sortie **fixée une fois** (Allemagne ou 4G sans VPN) — jamais de rotation de pays → notée : …
- [ ] §9.1 Champ « Website » présent sans seuil d'abonnés ? → réponse : …
- [ ] §9.2 Creator Rewards éligible (compte marocain) ? → réponse : …
- [ ] §9.3 Username disponible ? → réponse : …

---

## 📊 Baseline J0 (noter AVANT le premier post)

| Métrique | Valeur | Date |
|---|---|---|
| Abonnés | 0 (compte neuf) | 03/09 |
| Vues TIKTOK-1 @ D+7 | | ~10/09 |
| Sessions GA4 `utm_source=tiktok` (semaine 1) | | ~10/09 ⚠️ aucune vue GA4 configurée → créer le segment au 1ᵉʳ passage |

**Paliers (spec §7)** : J14 = phase test, AUCUN jugement de perf · J30 (~02/10) = 1ʳᵉ revue patterns · J60 = go/no-go cadence.

---

## TIKTOK-1 — Small-Batch Edible Cookie Dough for Two (edible-cookie-dough-recipe-for-2)

- Vidéo : `cookie-dough-pin20.mp4` — 15,1 s · 1000×1500 · H.264/AAC · 13,3 Mo (⚠️ pas de claim de durée « 15 min » : la fiche dit PT45M total, actif ~15 — ne rien afficher qui contredit la fiche) | watermark : [ ] vérifié NON
- **Hook (0-2 s)** : « EDIBLE cookie dough — no eggs, no baking, made for TWO »
- **Overlays étapes** (des 5 vraies étapes) :
  1. « heat-treat the flour → 165°F — this is what makes it safe raw »
  2. « butter + brown & white sugar · 2 min »
  3. « vanilla + a splash of milk »
  4. « fold in flour + salt → no dry streaks »
  5. « mini chips → chill 10 min → TWO spoons »
- **Voix off TTS** : « This is edible cookie dough — for two, zero baking. The one non-negotiable step: heat-treat the flour to 165°F, because that is what makes raw dough safe. Cream soft butter with brown and white sugar, add vanilla and a splash of milk until fluffy, fold in the flour, then a handful of mini chocolate chips. Chill ten minutes, grab two spoons. Full recipe is ↓ in bio. »
- **Caption** : Edible cookie dough recipe for 2 — egg-free and no-bake 🍪 Full recipe ↓ in bio. #cookwithaugustin #ediblecookiedough #dessertfor2 #nobakedessert
- **Pinned comment** : https://www.chefaugustin.com/recipes/edible-cookie-dough-recipe-for-2?utm_source=tiktok&utm_medium=social
- Créneau : J1 MER 03/09 23:00 (Maroc) | Statut : [x] briefé → [ ] vidéo ok (déjà ✅) → [ ] posté → [ ] analytics D+7

---

## TIKTOK-2 — Molten Chocolate Lava Cakes for Two (chocolate-lava-cakes-for-two)

- Vidéo : à générer — 9:16 ou 2:3, 30-45 s, anglais, export H.264 SANS watermark (⚠️ 1ᵉʳ export Canva du 02/09 était en HEVC hvc1 → vérifier avc1 avec `node scripts/_probe-mp4.mjs <fichier>` AVANT upload) | watermark : [ ] vérifié NON
- **Hook (0-2 s)** : « Molten lava cakes — TWO ramekins, 25 minutes, the center POURS »
- **Overlays étapes** (des 6 vraies étapes) :
  1. « butter + cocoa-dust 2 ramekins »
  2. « melt chocolate + butter — cool 2 min (don't scramble the eggs) »
  3. « 1 egg + 1 yolk + sugar → pale · PASTEURIZED eggs = safe soft center »
  4. « fold flour + salt — stop at no streaks »
  5. « 425°F · 12-13 min — center must JIGGLE »
  6. « rest 1 min → invert → the pour »
- **Voix off TTS** : « Restaurant molten lava cakes — two ramekins, twenty-five minutes. Butter and cocoa-dust them. Melt chocolate and butter, then cool it two minutes so it doesn't cook the eggs. Whisk one whole egg, one yolk and sugar until pale — use pasteurized eggs, because the middle stays soft. Fold in flour, fill, bake at four-twenty-five for twelve minutes — the center must still jiggle. Rest one minute, invert, and watch it pour. Full recipe ↓ in bio. »
- **Caption** : Molten chocolate lava cakes for two — 25 minutes, the center pours 🍫 Full recipe ↓ in bio. #cookwithaugustin #lavacake #dessertfor2 #datenightdessert
- **Pinned comment** : https://www.chefaugustin.com/recipes/chocolate-lava-cakes-for-two?utm_source=tiktok&utm_medium=social
- Créneau : J2 JEU 04/09 23:00 | Statut : [x] briefé → [ ] vidéo ok → [ ] posté → [ ] analytics D+7

---

## TIKTOK-3 — One-Pan Gnocchi for Two (one-pan-gnocchi-for-two)

- Vidéo : à générer — mêmes contraintes que TIKTOK-2 (H.264, probe avant upload) | watermark : [ ] vérifié NON
- **Hook (0-2 s)** : « One-PAN gnocchi for two — 30 minutes, and you never boil the gnocchi »
- **Overlays étapes** (des 6 vraies étapes) :
  1. « pat dry → SEAR 2-3 min (that's the crust) »
  2. « onion + salt → glossy »
  3. « garlic + tomato paste → brick red »
  4. « deglaze: tomato juice + broth — scrape the brown bits »
  5. « tomatoes, veg, gnocchi back · 5-7 min until sauce CLINGS »
  6. « off heat: butter + basil »
- **Voix off TTS** : « One-pan tomato basil gnocchi — for two, thirty minutes, and you never boil the gnocchi. Pat them dry and sear until golden — that crust is the whole point. Onion, then garlic and tomato paste fried to brick red. Deglaze with tomato juice and broth, scraping up the brown bits. Tomatoes and frozen veg back in, five to seven minutes until the sauce clings. Off the heat: butter and basil. Full recipe ↓ in bio. »
- **Caption** : One-pan gnocchi for two — 30 minutes, seared crispy, zero boiling 🍝 Full recipe ↓ in bio. #cookwithaugustin #gnocchi #onepanmeals #vegetariandinner
- **Pinned comment** : https://www.chefaugustin.com/recipes/one-pan-gnocchi-for-two?utm_source=tiktok&utm_medium=social
- Créneau : J3 VEN 05/09 23:00 | Statut : [x] briefé → [ ] vidéo ok → [ ] posté → [ ] analytics D+7

---

## TIKTOK-4 — Search-content : what to cook for two tonight (hub 15-easy-dinner-recipes-for-two)

- Vidéo : à générer — montage rapide des 3 plats (extraits des 3 vidéos ou photos animées), 30 s max | watermark : [ ] vérifié NON
- **Hook (0-2 s)** : « What to cook for two TONIGHT — 3 one-pan answers, 35 minutes max »
- **Overlays** : « 1 · tomato basil gnocchi — 30 min » / « 2 · garlic butter chicken + tomato orzo — 35 min » / « 3 · veggie stir fry — 22 min »
- **Voix off TTS** : « Three dinners for two, tonight, all in one pan. One — tomato basil gnocchi, thirty minutes, no boiling. Two — garlic butter chicken with tomato orzo, thirty-five. Three — a vegetable stir fry, twenty-two minutes. All scaled for two, not four. Fifteen more ↓ in the bio. »
- **Caption** : What to cook for two tonight — 3 one-pan dinners, 35 minutes max 🍳 Full list of 15 ↓ in bio. #cookwithaugustin #dinnerfor2 #onepanmeals #easydinnerideas
- **Pinned comment** : https://www.chefaugustin.com/guides/15-easy-dinner-recipes-for-two?utm_source=tiktok&utm_medium=social
- Créneau : J4 SAM 06/09 23:00 | Statut : [x] briefé → [ ] vidéo ok → [ ] posté → [ ] analytics D+7

---

## TIKTOK-5 — One-Pan Breakfast Sandwich for Two (one-pan-breakfast-sandwich-for-two) — PILOTE TREND

> 📐 **Structure rythmique calquée sur la vidéo de référence** (repo `Easy one pan breakfast sandwich.mp4`, 10,06 s 9:16 analysée 03/09) : hook contrarien 0-2 s → gimmick 2-4 s → empilement rythmé 4-6 s → chapeau + cut 6-8 s → **cross-section money shot 8-10 s**. POV mains seules, pas de visage, une seule poêle. Version for two : **deux sandwichs côte à côte** dans la même poêle, cadrage identique.
> ⛔ **Verrou d'intégrité (spec §5) — VERROUILLÉ 03/09 sur la fiche publiée #125** : la fiche enseigne la méthode **EGG-FLIP** (verser les œufs, poser le pain sur l'œuf humide, retourner toute la feuille comme une crêpe, replier les bords sur le cheddar), variante publiée du trend « egg-wrap » de la référence. Overlays/TTS ci-dessous = étapes RÉELLES de la fiche (4 œufs, 4 tranches de pain solide beurrées, cheddar, ciboulette, sauce piquante option — **pas de bacon/légume dans la fiche**, ne rien filmer qui n'y est pas). Temps affiché : « 17 minutes » = le titre de la fiche (⚠️ pas les durées génériques).

- Vidéo : à tourner — 9:16, 10-15 s, anglais, export **H.264 + faststart** SANS watermark → `node scripts/_probe-mp4.mjs <fichier>` AVANT upload. **Même rush** cross-posté : TikTok (ici) + Facebook Reels (`docs/facebook/TO-POST.md`) + Pinterest PIN VIDÉO 6 (`docs/pinterest/TO-POST.md`) | watermark : [ ] vérifié NON
- **Hook (0-2 s)** : « You don't need a toaster for a breakfast sandwich — just ONE pan » (esprit contrarien de la référence, sans cloner leur ligne)
- **Overlays étapes** (verrouillés 03/09 sur les 8 étapes de la fiche #125) :
  1. « 4 eggs + splash of water — whisk 30 s »
  2. « pour into a buttered 12-inch pan → thin rectangle »
  3. « 2 buttered bread slices ON THE WET EGG · lid, 2-3 min »
  4. « THE FLIP — the whole sheet, at once 🤯 »
  5. « cheddar on the eggy face → fold the edges in »
  6. « cap · toast 2-3 min a side → rest 1 min → CUT »
- **Voix off TTS** (cible ~15 s pour un rush 10-15 s) : « Eggs go into the buttered pan. Bread straight onto the wet egg — lid on, two minutes. Then the flip: the whole sheet, at once. Cheddar on the eggy face, fold the edges in, cap, toast both sides. Two sandwiches, one pan, seventeen minutes. Full recipe ↓ in bio. »
- **Caption** : One pan breakfast sandwich for two — the EGG-FLIP method, 17 minutes 🍳 Full recipe ↓ in bio. #cookwithaugustin #breakfastsandwich #onepanmeals #breakfastfor2
- **Pinned comment** : https://www.chefaugustin.com/recipes/one-pan-breakfast-sandwich-for-two?utm_source=tiktok&utm_medium=social
- Créneau : J5 DIM 07/09 23:00 | Statut : [x] briefé → [x] overlays/TTS verrouillés sur la fiche (#125 publiée 03/09) → [ ] vidéo ok → [ ] posté → [ ] analytics D+7
