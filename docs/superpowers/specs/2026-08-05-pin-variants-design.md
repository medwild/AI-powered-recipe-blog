# Design — Pin Variants (5 pins par recette, image de référence)

> **Date :** 2026-08-05
> **Status :** Validé (revue Karpathy appliquée)
> **Contexte :** Pipeline v14, Blog Chef Augustin, Stratégie Pinterest PTRA

---

## 1. Problème

La stratégie Pinterest prévoit 5 pins par recette. Actuellement :

- **1 hero image** par recette, générée par Ideogram v4 (API, ratio 2:3 Pinterest), uploadée Cloudinary → `heroImageUrl`
- `scripts/pin-brief.ts` génère 5 variants **texte** (overlays Canva, descriptions, boards, schedule) — les 5 pins utilisent la **même image** hero

L'idée : **exploiter l'hero image comme référence** pour générer 4 images variantes du **même plat** avec des **angles photo différents** — suffisamment distinctes pour ne pas cannibaliser dans le feed Pinterest, mais cohérentes (même plat, mêmes ingrédients, même style).

**Mode de génération : manuel, dans le chat Ideogram** (pas l'API) — l'utilisateur charge la hero image comme référence, colle le prompt produit par le script. Aucune automatisation dans le pipeline v14.

---

## 2. Objectifs

1. **Pin 1** = hero image existante (déjà générée, ratio 2:3)
2. **Pins 2-5** = 4 images variantes, générées dans le chat Ideogram via image de référence + prompt
3. Le script produit le matériau complet : lien Cloudinary de la référence + 4 prompts prêts à coller
4. **Zéro écriture DB** (option 1 retenue), zéro appel API, zéro appel LLM — script local déterministe

---

## 3. Architecture

```
scripts/pin-variants.ts <recipeId|slug>
        │
        ▼
   DB (read-only) — recipes : title, tags, imagePrompt, heroImageUrl, totalTime, difficulty
        │
        ▼
   Console — lien Cloudinary hero (pin 1) + 4 prompts image-to-image (pins 2-5)
        │
        ▼
   [MANUEL] Utilisateur : charge l'image dans le chat Ideogram → colle le prompt
```

**Un seul fichier nouveau** (`scripts/pin-variants.ts`). Aucun autre fichier touché : pas de schema, pas de lib, pas de skill, pas de migration.

---

## 4. Comportement du script

### 4.1 Entrées / erreurs

| Cas | Comportement |
|---|---|
| Usage sans argument | `Usage: npx tsx scripts/pin-variants.ts <recipeId\|slug>` + `exit 1` |
| Recette introuvable | `Recipe not found: <target>` + `exit 1` |
| `heroImageUrl` null | `⚠️ Génère la hero image d'abord — elle sert de référence` + `exit 1` |
| Tags vides | Mapping fallback (45° close-up → overhead → macro → lifestyle) |

### 4.2 Sortie console

```
═══ PIN 1 — HERO EXISTANTE ═══
Image de référence (à charger dans le chat Ideogram) :
<heroImageUrl Cloudinary>

═══ PIN 2 — <angle> ═══
[PROM] <prompt prêt à coller>

═══ PIN 3 — <angle> ═══
[PROM] <prompt prêt à coller>

═══ PIN 4 — <angle> ═══
[PROM] <prompt prêt à coller>

═══ PIN 5 — <angle> ═══
[PROM] <prompt prêt à coller>

💡 Overlays texte : npx tsx scripts/pin-brief.ts <id> (pas de duplication ici)
```

---

## 5. Les 4 angles + mapping par type de plat

Le mapping est une **constante TS** avec le commentaire `// reflète food-photography.md §6` — c'est la source de vérité (pas de duplication silencieuse).

| Type de plat (tags) | Pin 2 | Pin 3 | Pin 4 | Pin 5 |
|---|---|---|---|---|
| Pâtes / plat dressé | 45° close-up (cheese pull, sauce) | Overhead (composition) | Détail macro (vapeur, texture) | Lifestyle en situation |
| Pizza / salade / board | Overhead flat lay | 45° close-up | Détail macro (garnitures) | Lifestyle en situation |
| Burger / sandwich | 45° hero (hauteur/layers) | Side cut-away (couche) | Détail macro (sauce qui coule) | Lifestyle en situation |
| Dessert / cake | 45° close-up | Overhead | Détail macro (coulage, texture) | Lifestyle en situation |
| Soupe / mijoté | 45° close (vapeur) | Overhead | Détail macro (texture) | Lifestyle en situation |
| Fallback | 45° close-up | Overhead | Détail macro | Lifestyle |

### 5.1 Structure du prompt (template déterministe, zéro LLM)

```
Recrée exactement ce même plat — mêmes ingrédients, mêmes couleurs, même style,
même lumière. Change uniquement l'angle de prise de vue : <ANGLE>.

<Description pro du nouvel angle : cadrage, lens, aperture, DOF — selon le tableau
food-photography.md §7, ex: "45° medium, 24-70mm à 50mm, f/4, profondeur de champ
modérée">

<Extrait déterministe de l'imagePrompt original : première phrase, tronquée à
~160 chars — contient déjà plat + lighting + style, ex: "pâtes al dente, sauce
tomate riche, cheese pull, lumière naturelle fenêtre 3500K">

2:3 vertical, Pinterest. Fond simple. Pas de texte sur l'image.
```

**Extraction déterministe (pas d'LLM)** : le script prend la **première phrase** de l'`imagePrompt` original (découpe sur le premier `. `), tronquée à ~160 chars. Elle contient déjà le plat, le lighting et le style — pas besoin de parsing sémantique. Fallback si `imagePrompt` vide : `title + top 2 tags`.

**Clause de cohérence courte** (l'image de référence est déjà sous les yeux d'Ideogram — pas de récitation longue) :
`Recrée exactement ce même plat — mêmes ingrédients, mêmes couleurs, même style, même lumière. Change uniquement l'angle de prise de vue : X.`

### 5.2 Spécs pro (tirées du skill, une seule combo par prompt)

| Cadrage | Lens | Aperture | DOF |
|---|---|---|---|
| Overhead flat lay | 50mm | f/5.6 | Deep (tout net) |
| 45° medium | 24-70mm à 50mm | f/4 | Modérée |
| 45° close-up | 90mm macro | f/2.8 | Shallow (bokeh) |
| Détail macro | 90mm macro | f/2.2 | Très shallow |
| Hero shot | 35mm | f/2.0 | Shallow |

Toujours : `crisp focus on the main dish, subtle film grain texture, professional food photography` + camera body `Sony A7R IV` ou `Canon EOS R5` (extrait de l'imagePrompt original si présent).

### 5.3 Pas de texte sur l'image

Les 4 variantes ne portent **pas** d'overlay texte — il est ajouté dans Canva via `pin-brief.ts` (5 angles marketing par recette). Idéogram écrit le texte mal si forcé ; mieux vaut l'image pure.

---

## 6. Risque Pinterest (analyse)

Réponse à la question « 5 pins du même plat = risque spam ? » :

- **Images distinctes ≠ dupliquées.** Pinterest détecte les doublons par image exacte (hash/URL). Des angles différents = images différentes. L'outil d'A/B testing Pinterest (Pinterest for Business) supporte jusqu'à **5 variantes d'un même pin** — structure identique à la nôtre.
- **Le vrai risque** est la ressemblance excessive + la cadence : si les 4 variantes sont trop proches et postées d'un coup, ça cannibalise le feed et ressemble à du spam. Mitigations déjà dans le design : angles très différents par construction + schedule Tailwind de `pin-brief.ts` (Day 1/3/5/7/9) + titres/descriptions variés par variant.
- **Label "AI Modified"** (depuis oct. 2025, documenté dans la stratégie 2026-07-23) : s'applique **par image**, pas au volume. Le compte est déjà exposé dès la première image IA — passer à 5 n'augmente pas le risque.
- **À vérifier** : l'état exact des politiques Pinterest août 2026 (outils web indisponibles au moment du design — à re-vérifier avant un mass pinning).

---

## 7. Étape 0 — Assomption à vérifier AVANT de coder

**Le chat Ideogram accepte une image de référence uploadée + un prompt texte pour produire une variante du même plat.** L'utilisateur confirme que oui — mais c'est la seule assomption factuelle du design. Test manuel sur 1 recette d'abord, puis code.

## 8. Critères de succès (revue Karpathy)

1. `npx tsc --noEmit` passe
2. Sur 2 recettes de types différents (ex: lasagne + dessert), les angles changent selon les tags
3. **1 prompt généré par le script testé dans le chat Ideogram avec la hero en référence** → variante reconnaissable + angle réellement différent (test manuel par l'utilisateur, AVANT mass pinning)

## 9. Non-goals (YAGNI)

- ❌ Pas d'écriture dans `pin_drafts` (option console-only retenue — le stockage viendra plus tard si le workflow manuel est rodé)
- ❌ Pas de génération d'images via l'API Ideogram (tout passe par le chat, manuel)
- ❌ Pas d'automatisation dans le pipeline v14
- ❌ Pas d'appel LLM pour rédiger les prompts (template déterministe suffit)
- ❌ Pas de refacto de `pin-brief.ts` (toujours utilisé pour les overlays texte)

---

## 8. Non-goals (YAGNI)

- ❌ Pas d'écriture dans `pin_drafts` (option console-only retenue — le stockage viendra plus tard si le workflow manuel est rodé)
- ❌ Pas de génération d'images via l'API Ideogram (tout passe par le chat, manuel)
- ❌ Pas d'automatisation dans le pipeline v14
- ❌ Pas d'appel LLM pour rédiger les prompts (template déterministe suffit)
- ❌ Pas de refacto de `pin-brief.ts` (toujours utilisé pour les overlays texte)
