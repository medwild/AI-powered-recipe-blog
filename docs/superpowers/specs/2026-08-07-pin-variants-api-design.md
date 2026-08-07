# Design — Extension pins : `pinVariants` (les 5 pins) exposés par l'API

> Date : 2026-08-07 — Statut : validé (brainstorming)
> Référence : étend le spec `2026-08-07-pins-api-design.md` (contrat v1, déployé — `GET /api/recipes/pins`)
> Contexte : l'app Google AI Studio génère les 5 pins de chaque recette. Pin 1 = hero (déjà servi). Pins 2-5 = 4 variantes d'angle générées par l'app via image-to-image (hero en référence). L'app ne remplace PAS la machinerie pins du repo (`pin-variants.ts`, `pin-brief.ts`) — elle s'y appuie : la logique d'angles vit côté blog, exposée par l'endpoint.

## 1. Objectif

Étendre `GET /api/recipes/pins` pour que chaque recette expose aussi les **4 prompts d'angle** (pins 2-5), en anglais, résolus par les tags de la recette — une seule source de vérité (le repo), consommée par l'app Gemini.

## 2. Décisions clés (issues du brainstorming)

| Question | Décision | Pourquoi |
|---|---|---|
| Où vit la logique d'angles | **Côté blog, exposée par l'endpoint** | Une seule source de vérité ; l'app ne peut pas exécuter le script CLI (pas de DB, pas de shell) |
| Langue des prompts | **Anglais** (langue du blog, audience US/UK/CA/AU) | Cohérence ; les prompts d'image fonctionnent en toute langue pour Gemini |
| Langue des labels | **Anglais aussi** ("Macro detail", "Lifestyle shot") | Labels = contenu consommé par l'app (noms de fichiers/variantes) ; éviter le franglais dans un contrat anglais |
| Consommation | **Full fetch** (46 recettes, toutes avec leurs 4 prompts) | Un appel par run ; ~100 KB payload avec prompts (71.9 KB actuel + ~27 KB) ; YAGNI par-recette |
| Format par variant | **`{ label, prompt }`** — prompt texte seulement | Le hero (référence) est déjà dans `heroImageUrl` ; pas de rappel redondant |
| Pin 1 | **La même image de la recette** (`heroImageUrl`) | Déjà servi par le contrat v1 ; inchangé |

## 3. Architecture

**1 fichier neuf + 2 modifiés :**

- **Créer `lib/pin-variants.ts`** — la logique extraite de `scripts/pin-variants.ts`, en module **PUR** :
  - `resolveAngles(tags: string[]): Angle[]` — les 3 jeux (default / flat-lay / burger), inchangés
  - `buildPinVariantPrompt(title: string, angle: Angle): string` — le template traduit en anglais
  - **Zéro import DB, zéro dotenv, zéro side-effect** — ⚠️ critique : `lib/db` crée le pool PostgreSQL à l'import (`pin-variants.ts:64-67` documente ce pitfall). Si ce module importait quoi que ce soit de DB, la route Next.js initialiserait le pool au premier import. Le module doit être pur.
- **Modifier `scripts/pin-variants.ts`** — importe `resolveAngles`/`buildPinVariantPrompt` depuis `lib/` au lieu de les dupliquer ; garde TOUT le reste du script intact (chargement DB local, fallback title `recipe.title || recipe.keyword || "Untitled"` à `pin-variants.ts:86`, et le wording console existant aux `:71,90,103`). Seule la logique sort — pas le comportement console.
- **Modifier `app/api/recipes/pins/route.ts`** — ajoute `pinVariants` au mapping

**Traduction :** on traduit le prompt **du code actuel** (`pin-variants.ts:54-62`), source de vérité — PAS celui de la spec du 05/08 §5.2 (qui mentionnait des clauses "crisp focus…, Sony A7R IV" que l'implémentation a simplifiées).

## 4. Contrat étendu — chaque recette gagne `pinVariants`

```json
{
  "id": 123,
  "slug": "easy-lasagna",
  "title": "Easy Lasagna",
  "heroImageUrl": "https://res.cloudinary.com/…/easy-lasagna.jpg",
  "pinVariants": [
    { "label": "45° close-up", "prompt": "Recreate this exact same dish — Easy Lasagna — same ingredients, same colors, same style, same light. Change only the camera angle: 45° close-up.\n\n90mm macro, f/2.8, shallow depth of field (bokeh)\n\n2:3 vertical, Pinterest. Simple background. No text on image." },
    { "label": "Overhead", "prompt": "…" },
    { "label": "Macro detail", "prompt": "…" },
    { "label": "Lifestyle shot", "prompt": "…" }
  ]
}
```

- `pinVariants` est **toujours un tableau de 4** (les 4 angles de la recette, résolus par `resolveAngles(tags)`)
- Jeu d'angles résolu **par recette** via les tags (pizza/salad/board/cake/tart → flat-lay ; burger/sandwich/wrap → burger ; sinon default)
- Aucun autre champ ne change ; `pinVariants` s'ajoute, le reste du contrat v1 est identique

### Template du prompt (anglais, depuis le code)

```
Recreate this exact same dish — <TITLE> — same ingredients, same colors, same style, same light. Change only the camera angle: <ANGLE LABEL>.

<ANGLE SPECS>

2:3 vertical, Pinterest. Simple background. No text on image.
```

### Labels + specs traduits (3 jeux)

| Jeu | Pin 2 | Pin 3 | Pin 4 | Pin 5 |
|---|---|---|---|---|
| default | "45° close-up" — `90mm macro, f/2.8, shallow depth of field (bokeh)` | "Overhead" — `50mm, f/5.6, deep depth of field (everything sharp)` | "Macro detail" — `90mm macro, f/2.2, very shallow depth of field` | "Lifestyle shot" — `35mm, f/2.0, shallow depth of field` |
| flat-lay | "Overhead flat lay" — `50mm, f/5.6, deep depth of field (everything sharp)` | "45° close-up" — `90mm macro, f/2.8, shallow depth of field (bokeh)` | "Macro detail" — `90mm macro, f/2.2, very shallow depth of field` | "Lifestyle shot" — `35mm, f/2.0, shallow depth of field` |
| burger | "45° hero (height/layers)" — `35mm, f/2.0, shallow depth of field` | "Side cut-away (layers)" — `50mm, f/4, moderate depth of field` | "Macro detail (sauce dripping)" — `90mm macro, f/2.2, very shallow depth of field` | "Lifestyle shot" — `35mm, f/2.0, shallow depth of field` |

## 5. En-têtes / Erreurs

- Inchangés depuis le contrat v1 : `Cache-Control: public, max-age=3600, s-maxage=3600`, pas de CORS, 500 générique sans `error.message`

## 6. Vérification

1. `npx tsc --noEmit` passe
2. `npx tsx scripts/pin-variants.ts <slug>` → sortie console identique, prompts en anglais
3. `curl localhost:3000/api/recipes/pins` → chaque recette a `pinVariants` de longueur 4
4. Cas limites : "pizza" → overhead flat lay en pin 2 ; "burger" → 45° hero en pin 2 ; recette lambda → 45° close-up en pin 2 (test manuel de la spec du 05/08)
5. `npm run build` avant push

**Fait observé au moment de la rédaction** : payload actuel du contrat v1 = **71.9 KB** pour 46 recettes (vérifié en prod via `curl`). L'ajout de `pinVariants` (~27 KB) porte le full fetch à ~100 KB — reste un seul appel par run, OK.

## 7. Non-goals

- Pas de génération d'images côté blog (l'app génère)
- Pas d'écriture DB, pas de migration, pas de nouvelle dépendance
- Pas de touché à `pin-brief.ts` (textes/overlays — hors périmètre)
- Pas de sync incrémentale (full fetch, 46 recettes)
- **Nutrition (calories/macros) : hors périmètre** — politique projet : pas de section nutrition (sensibilité Google/AdSense, risque d'infos erronées). Le warning W4 `NUTRITION_MISSING_IN_SCHEMA` du SEO gate (`lib/seo/gate.ts:189-195`) est un reliquat contradictoire → **au backlog**, pas dans ce travail.
