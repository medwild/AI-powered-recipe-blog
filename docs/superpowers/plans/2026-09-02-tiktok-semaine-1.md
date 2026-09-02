# TikTok — Semaine 1 (stratégie Chef Augustin) — Plan d'exécution

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans ( INLINE — sous-agents impossibles : gateway B.Ai 403 sur modèles premium, vérifié 02/09). Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Lancer le canal TikTok selon la spec validée : compte configuré, 4 briefs vidéo écrits dans `docs/tiktok/TO-POST.md`, première vidéo postée via la chaîne complète (upload → pinned comment UTM → baseline).

**Architecture:** `docs/tiktok/TO-POST.md` = source de vérité du canal (miroir de `docs/pinterest/TO-POST.md`, règle 11/08). Rôles : assistant rédige fichier + briefs + mesure ; utilisateur fait l'app (config compte, génération vidéo, posting). Aucun code applicatif touché — plan 100 % docs/scripts scratch.

**Tech Stack:** Markdown (docs/tiktok), PostgreSQL/Neon via `scripts/_*.ts` gitignorés (source des données recette), curl pour vérifs prod.

**Spec:** `docs/superpowers/specs/2026-09-02-tiktok-strategy-design.md` (`5d2cf41`)

## Global Constraints

- **100 % anglais** (hook, overlays, TTS, captions, hashtags) — spec §3.
- **Intégrité §5** : overlays dérivés des étapes RÉELLES de la fiche (dump DB dans `/tmp/tiktok-candidates.json`, source `scripts/_tiktok-candidates.ts`) ; **aucun claim de prix** (pas de données prix en DB — le « $10 Dinner Date » de la spec est un nom de série, pas une promesse par vidéo) ; pas de faux claims d'expérience (règle globale #13).
- **UTM systématique** : `?utm_source=tiktok&utm_medium=social` sur tout lien.
- **Watermark** : interdite (Dola/CapCut outro) — chaque brief porte une ligne watermark `[ ] vérifié NON`.
- Docs only : ne pas toucher au pipeline, aux composants, ni pousser de code applicatif.
- Un seul push en fin de plan (les commits intermédiaires restent locaux).

---

### Task 1: Créer `docs/tiktok/TO-POST.md` (squelette + config compte)

**Files:**
- Create: `docs/tiktok/TO-POST.md`

**Interfaces:**
- Produces : le fichier que les Tasks 2-5 remplissent et que l'utilisateur lit avant tout post (source de vérité).

- [ ] **Step 1: Écrire le fichier**

```markdown
# TikTok — TO-POST (source de vérité)

> Règle 11/08 (héritée de Pinterest) : ne JAMAIS deviner un détail de vidéo — lire ce fichier.
> Spec : docs/superpowers/specs/2026-09-02-tiktok-strategy-design.md
> Rôles : assistant = briefs/keywords/mesure ; utilisateur = app, génération vidéo, posting.

## ⚙️ Configuration du compte (à faire / à vérifier — spec §2 + §9)

- [ ] Username → `cookwithaugustin` (dispo ? sinon variante proche cohérente ; sinon garder + Re-vérifier J+7)
- [ ] Nom affiché : `Chef Augustin`
- [ ] Photo de profil : logo master `repports/logos-master-2026-08-12/`
- [ ] Bio : `French-style dinners for 2 🍳 Quick, cheap, from scratch` / `Full recipes ↓ 80+ tested`
- [ ] Type de compte : **Personnel** (garder les sons trending)
- [ ] §9.1 Champ « Website » présent sans seuil d'abonnés ? → réponse : …
- [ ] §9.2 Creator Rewards : éligible ? → réponse : …
- [ ] VPN : sortie fixée une fois (Allemagne ou 4G sans VPN) → notée : …

## 📊 Baseline J0 (noter AVANT le premier post)

| Métrique | Valeur | Date |
|---|---|---|
| Abonnés | | |
| Vues vidéo 1 @ D+7 | | |
| Sessions GA4 utm_source=tiktok (semaine 1) | | |

## 🎬 Vidéos

<!-- gabarit par vidéo (spec §6) :
## TIKTOK-{n} — {titre} ({slug})
- Vidéo : {fichier mp4, durée, résolution} | watermark : [ ] vérifié NON
- Hook (0-2 s, texte écran + voix) : …
- Overlays étapes (8-35 s, dérivés des vraies étapes) : …
- Voix off TTS : …
- Caption (1ʳᵉ ligne = keyword) : …
- Hashtags (1 broad + 2 niche + 1 marque) : …
- Pinned comment : {url + UTM}
- Créneau : … | Statut : [ ] briefé → [ ] vidéo ok → [ ] posté → [ ] analytics D+7
-->

```

- [ ] **Step 2: Commit**

```bash
git add docs/tiktok/TO-POST.md
git commit -m "docs(tiktok): TO-POST.md — source de vérité canal + checklist config compte (spec §2/§9)

Co-Authored-By: Claude Code <noreply@anthropic.com>"
```

---

### Task 2: Brief TIKTOK-1 — Edible Cookie Dough (vidéo déjà prête)

**Files:**
- Modify: `docs/tiktok/TO-POST.md` (ajouter la section)

**Interfaces:**
- Consumes : `cookie-dough-pin20.mp4` (racine repo, validé 02/09 : 15,1 s, 1000×1500, avc1+AAC, faststart, 13,3 Mo, sans watermark) ; recette #11 (slug `edible-cookie-dough-recipe-for-2`, 5 étapes réelles).
- Produces : la vidéo de test de la chaîne complète (Task 7).

- [ ] **Step 1: Écrire la section** (copier tel quel — données vérifiées DB 02/09)

```markdown
## TIKTOK-1 — Small-Batch Edible Cookie Dough for Two (edible-cookie-dough-recipe-for-2)

- Vidéo : `cookie-dough-pin20.mp4` — 15,1 s · 1000×1500 · H.264/AAC · 13,3 Mo (⚠️ pas de claim de durée « 15 min » : la fiche dit PT45M total, actif ~15 — ne rien afficher qui contredit la fiche) | watermark : [ ] vérifié NON
- **Hook (0-2 s)** : « EDIBLE cookie dough — no eggs, no baking, made for TWO »
- **Overlays étapes** (8-35 s, des 5 vraies étapes) :
  1. « heat-treat the flour → 165°F — this is what makes it safe raw »
  2. « butter + brown & white sugar · 2 min »
  3. « vanilla + a splash of milk »
  4. « fold in flour + salt → no dry streaks »
  5. « mini chips → chill 10 min → TWO spoons »
- **Voix off TTS** : « This is edible cookie dough — for two, zero baking. The one non-negotiable step: heat-treat the flour to 165°F, because that is what makes raw dough safe. Cream soft butter with brown and white sugar, add vanilla and a splash of milk until fluffy, fold in the flour, then a handful of mini chocolate chips. Chill ten minutes, grab two spoons. Full recipe is ↓ in bio. »
- **Caption** : Edible cookie dough recipe for 2 — egg-free and no-bake 🍪 Full recipe ↓ in bio. #cookwithaugustin #ediblecookiedough #dessertfor2 #nobakedessert
- **Pinned comment** : https://www.chefaugustin.com/recipes/edible-cookie-dough-recipe-for-2?utm_source=tiktok&utm_medium=social
- Créneau : J1 23:00 (Maroc) | Statut : [x] briefé → [ ] vidéo ok (déjà ✅) → [ ] posté → [ ] analytics D+7
```

- [ ] **Step 2: Commit** (`docs(tiktok): brief TIKTOK-1 cookie dough (vidéo prête, chaîne de test)`)

---

### Task 3: Brief TIKTOK-2 — Molten Lava Cakes (vidéo à générer)

**Files:**
- Modify: `docs/tiktok/TO-POST.md`

**Interfaces:**
- Consumes : recette `chocolate-lava-cakes-for-two` (6 étapes réelles, PT25M ✓ claimable).
- Produces : brief complet pour génération par l'utilisateur.

- [ ] **Step 1: Écrire la section**

```markdown
## TIKTOK-2 — Molten Chocolate Lava Cakes for Two (chocolate-lava-cakes-for-two)

- Vidéo : à générer — 9:16 ou 2:3, 30-45 s, anglais, export H.264 SANS watermark (⚠️ 1er export Canva du 02/09 était en HEVC hvc1 → vérifier avc1 avec `node scripts/_probe-mp4.mjs <fichier>` AVANT upload) | watermark : [ ] vérifié NON
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
- Créneau : J2 23:00 | Statut : [x] briefé → [ ] vidéo ok → [ ] posté → [ ] analytics D+7
```

- [ ] **Step 2: Commit** (`docs(tiktok): brief TIKTOK-2 lava cakes`)

---

### Task 4: Brief TIKTOK-3 — One-Pan Gnocchi (vidéo à générer)

**Files:**
- Modify: `docs/tiktok/TO-POST.md`

- [ ] **Step 1: Écrire la section**

```markdown
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
- Créneau : J3 23:00 | Statut : [x] briefé → [ ] vidéo ok → [ ] posté → [ ] analytics D+7
```

- [ ] **Step 2: Commit** (`docs(tiktok): brief TIKTOK-3 one-pan gnocchi`)

---

### Task 5: Brief TIKTOK-4 — Search-Content « what to cook for two tonight »

**Files:**
- Modify: `docs/tiktok/TO-POST.md`

**Interfaces:**
- Consumes : 3 recettes réelles live 200 (gnocchi 30 min ✓, `one-pan-garlic-butter-chicken-tomato-orzo` 35 min ✓, `vegetable-stir-fry-for-two` 22 min ✓ — #123) ; roundup hub `/guides/15-easy-dinner-recipes-for-two` (200 vérifié 02/09).

- [ ] **Step 1: Écrire la section**

```markdown
## TIKTOK-4 — Search-content : what to cook for two tonight (hub 15-easy-dinner-recipes-for-two)

- Vidéo : à générer — montage rapide des 3 plats (extraits des 3 vidéos ou photos animées), 30 s max | watermark : [ ] vérifié NON
- **Hook (0-2 s)** : « What to cook for two TONIGHT — 3 one-pan answers, 35 minutes max »
- **Overlays** : « 1 · tomato basil gnocchi — 30 min » / « 2 · garlic butter chicken + tomato orzo — 35 min » / « 3 · veggie stir fry — 22 min »
- **Voix off TTS** : « Three dinners for two, tonight, all in one pan. One — tomato basil gnocchi, thirty minutes, no boiling. Two — garlic butter chicken with tomato orzo, thirty-five. Three — a vegetable stir fry, twenty-two minutes. All scaled for two, not four. Fifteen more ↓ in the bio. »
- **Caption** : What to cook for two tonight — 3 one-pan dinners, 35 minutes max 🍳 Full list of 15 ↓ in bio. #cookwithaugustin #dinnerfor2 #onepanmeals #easydinnerideas
- **Pinned comment** : https://www.chefaugustin.com/guides/15-easy-dinner-recipes-for-two?utm_source=tiktok&utm_medium=social
- Créneau : J4 23:00 | Statut : [x] briefé → [ ] vidéo ok → [ ] posté → [ ] analytics D+7
```

- [ ] **Step 2: Commit** (`docs(tiktok): brief TIKTOK-4 search-content what to cook for two`)

---

### Task 6: Config compte dans l'app (utilisateur) + points §9

**Files:** aucune (l'utilisateur coche la checklist TO-POST ; assistant consigne les réponses).

- [ ] **Step 1: L'utilisateur exécute la checklist ⚙️** de `docs/tiktok/TO-POST.md` (username, bio, photo, type Personnel) et reporte les 3 réponses §9 dans le fichier. L'assistant consigne les cases ⚙️/§9 cochées par l'utilisateur (commit).

- [ ] **Step 2: Vérifier l'username pris**

Run : `curl -s -o /dev/null -w '%{http_code}\n' https://www.tiktok.com/@cookwithaugustin`
Attendu : `404` = libre (le réserver) ; `200` = pris → variante proche (ex. `cookwithaugustintv`), jamais un nom différent.

---

### Task 7: Lancer la chaîne complète (J1) + baseline

**Files:**
- Modify: `docs/tiktok/TO-POST.md` (baseline J0 + statuts)

- [ ] **Step 1: Avant tout post** — l'utilisateur note abonnés = valeur du jour dans Baseline J0. Assistant consigne + commit.

- [ ] **Step 2: Post J1** (vers 23:00 Maroc) : uploader `cookie-dough-pin20.mp4`, coller caption, épingler le commentaire UTM, cocher `[x] posté` dans TO-POST (l'utilisateur annonce, l'assistant coche — commit).

- [ ] **Step 3: Probe liens** (après J1) :

```bash
curl -s -o /dev/null -w '%{http_code}\n' "https://www.chefaugustin.com/recipes/edible-cookie-dough-recipe-for-2?utm_source=tiktok&utm_medium=social"   # attendu 200
```

- [ ] **Step 4: D+7 (~10/09)** : lire vues + taps profil dans l'app (l'utilisateur) → Baseline ; vérifier GA4 sessions `utm_source=tiktok` (skill `claude-seo:seo-google` ou export manuel — aucune vue GA4 configurée à ce jour : premier passage = créer le segment). **Aucun jugement de perf avant J14** (spec §7).

- [ ] **Step 5: Push final du plan** (1 cycle)

```bash
git push
```

---

## Self-review (fait 02/09)

- **Couverture spec §8** : username/bio/photo → Task 6 ; 4 briefs (2 desserts, 1 one-pan, 1 search) → Tasks 2-5 ; chaîne complète testée → Task 7 step 2 ; baseline → Task 7 step 1. ✅
- **§9** : 3 vérifs app → checklist Task 1 + Task 6. ✅
- **Honnêteté** : aucun prix dans les hooks ; temps affichés = `total_time` DB (25/30/35 min ✓, cookie dough : pas de claim de durée, PT45M ≠ 15 min actif). ✅
- **Constantes cohérentes** : mêmes URLs slug que les fiches (vérifiées 200 ou publiées), même UTM partout, même gabarit §6. ✅
- **Limites connues** : les TTS font ~30-38 s lus à vitesse native — dans la fenêtre 30-45 s de la spec ; si TikTok bride la durée sur le compte neuf, couper la dernière phrase avant le CTA (le CTA est obligatoire).
