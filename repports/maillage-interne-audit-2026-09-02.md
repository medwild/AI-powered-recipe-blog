# Audit Maillage Interne — chefaugustin.com
> 2026-09-02 · crawl complet prod (86 URLs sitemap, 86 pages fetchées, 10 destinations hors-sitemap testées avec chaînes de redirection) · graphe : `scripts/_maillage/graph.json`, analyse : `scripts/_maillage/analysis.json`

## Verdict global : **88/100 — structure saine, 3 corrections à faire**

| Critère | Norme SEO | Résultat |
|---|---|---|
| Pages orphelines (hors nav globale) | 0 | ✅ 0 / 48 recettes |
| Accessibilité depuis la home | 100 % | ✅ 100 % |
| Profondeur de clic | ≤ 3 | ✅ max 3 |
| Liens internes cassés (4xx/5xx) | 0 | ✅ 0 |
| Liens internes via redirection | 0 | ⚠️ **7 hrefs → 308** (4 contenus + 3 index) |
| Ancres génériques | ~0 % | ✅ 0 sur 1 749 liens entrants recettes |
| Liens sortants contextuels par recette | 2-3 (≈3/1000 mots) | ✅ toutes les 48 recettes ≥1 |
| Cohérence sitemap ↔ live | 100 % | ✅ (les 3 nouveautés #116/#119/#121 live 200, déjà au sitemap) |
| Fuites drafts | 0 page draft live | ✅ #107-109 404 natif · #101/103/105 308 volontaires (cannibalisation) |

Points forts confirmés : le **silo internal-linker v2** (`lib/internal-linker.ts`) produit des liens contextuels in-flow avec ancres naturelles (texte matched, pas de keyword-stuffing d'ancre), les related-recipes (`components/related-recipes.tsx` → `/recipes/{slug}`) donnent aux 3 nouvelles recettes 9-33 liens entrants dès le premier jour, et chaque recette est couverte par ≥1 listing + hub.

---

## 🔴 High — 4 recettes avec liens contextuels vers des slugs morts (308)

Ces liens ont été insérés par le linker **avant** la consolidation anti-cannibalisation du 20/08 ; le renommage des slugs n'a pas été répercuté dans le `content_markdown`. Un lien passe par un 308 →PageRank atténué + crawl budgété deux fois.

| Page source | Lien actuel (308) | Destination finale à mettre |
|---|---|---|
| `/recipes/garlic-butter-chicken-pasta-for-two` | `/recipes/recipes-for-two` | `/recipes/one-pan-chicken-rice-for-two` |
| `/recipes/garlic-butter-chicken-pasta-for-two` | `/recipes/dinner-recipe-ideas-for-two` | `/recipes/one-pan-chicken-rice-garlic-butter-tomato-sauce` |
| `/recipes/one-pan-chicken-rice-garlic-butter-tomato-sauce` | `/recipes/easy-dinner-ideas-for-two` ×1 | `/recipes/one-pan-garlic-butter-chicken-tomato-orzo` |
| `/recipes/one-pan-chicken-rice-garlic-butter-tomato-sauce` | `/recipes/easy-meal-ideas-for-two` | `/recipes/one-pan-chicken-tomato-rice` |
| `/recipes/one-pan-chicken-vegetable-skillet` | `/recipes/easy-dinner-ideas-for-two` | `/recipes/one-pan-garlic-butter-chicken-tomato-orzo` |
| `/recipes/one-pan-garlic-tomato-chicken-rice` | `/recipes/easy-dinner-ideas-for-two` | `/recipes/one-pan-garlic-butter-chicken-tomato-orzo` |

**Fix proposé** : script SQL one-shot `UPDATE recipes SET content_markdown = replace(...)` (précédent : `fix-internal-links.ts` 04/08). Backup avant (motif « z » des backups `repports/`).

## 🟡 Medium — `/guides` et `/idees` lient leurs propres sections mortes

Les pages index listent 3 sections vides dont les URLs sont 308-pées (6 occurrences) :

| Lien trouvé (×2 chacun) | 308 vers |
|---|---|
| `/techniques` | `/guides` (auto-référence) |
| `/histoire` | `/about` |
| `/equipement` | `/guides` (auto-référence) |

Source : `components/category-listing.tsx` (cartes de sections `techniques`/`histoire`/`equipement`, lignes 19-43) rendu par `app/guides/page.tsx` et `app/idees/page.tsx`. **Fix** : retirer ces 3 entrées de la grille de sections (0 article dans chacune — consolidées le 06/08).

## 🟡 Medium — 5 recettes sans inbound recette→recette

Liées uniquement par listings/hubs, jamais par une autre recette (ni contexte, ni related cards) :

| Recette | listing | hub | recette | Note |
|---|---|---|---|---|
| `/recipes/edible-cookie-dough-recipe-for-2` | 1 | **0** | 0 | ⚠️ la plus faible — et c'est le « gap dessert » noté dans TO-POST + pin 20 demain |
| `/recipes/easy-chili-colorado-recipe` | 3 | 11 | 0 | |
| `/recipes/one-pan-chicken-tomato-rice` | 7 | 10 | 0 | |
| `/recipes/romantic-dinner-for-two-at-home` | 2 | 3 | 0 | |
| `/recipes/texas-roadhouse-dinner-for-two` | 3 | 11 | 0 | pin 19 (Romantic) — reçoit du trafic Pinterest sans maillage |

Impact limité (elles ne sont pas orphelines), mais équité transmise plus faible. **Fix** : 2-3 liens contextuels manuels par recette depuis des sœurs de cluster + vérifier pourquoi les related-recipes les excluent (tags ?).

## 🔵 Low — documentation de règle obsolète

`.claude/rules/global.md` règle #3 dit `RecipeCard → href /recettes/{slug}` ; le code émet `/recipes/{slug}` depuis la migration (correct — `/recettes/` n'est plus qu'un handler de redirection legacy). **Risque** : appliquer la lettre de la règle créerait des liens vers des 308 sur chaque card. Fix : mettre à jour la règle.

## 🟡 Medium — 2 phrases mangées par le linker v0 dans le contenu publié

Découvertes en préparant les correctifs (probing d'ancres) : des insertions de liens anciennes ont cassé la grammaire de deux recettes publiées.

| Page | Fragment fautif | Lien ciblé |
|---|---|---|
| `/recipes/easy-chicken-dinners-for-two` | « …healthy dinner recipes **for 2 for 2 dish** [romantic dinner](/guides/…) ideas for two **doesn’t** come… » | hub (cible correcte, phrase cassée) |
| `/recipes/creamy-mashed-potatoes-for-two` | « Creamy mashed potatoes [romantic dinner](**/recipes/chocolate-lava-cakes-for-two**) ideas for two is… » | ⚠️ cible sémantiquement fausse (purée → lava cakes) |

## ✅ Corrections appliquées 02/09 (plan `docs/superpowers/plans/2026-09-02-maillage-interne-fixes.md`)

- **High / liens→308** : 6 UPDATE `content_markdown` (4 recettes) — destinations = successeurs des 308 de `next.config.mjs`. Pré-vol occurrence=1 + post-vol passés, `Liens 308 restants : 0`. Backup : `repports/backup-maillage-links-2026-09-02.json`.
- **Phrases mangées** : réécriture minimale `easy-chicken-dinners-for-two` (hub link conservé, grammaire réparée) ; suppression du lien erroné dans `creamy-mashed-potatoes-for-two`.
- **Cookie dough** : 1er inbound recette→recette inséré dans `chocolate-lava-cakes-for-two` (« and [cookie doughs](/recipes/edible-cookie-dough-recipe-for-2), but… »). Chili/texas-roadhouse : en réalité déjà liés depuis l'article roundup `/guides/15-easy-dinner-recipes-for-two` (le classifieur comptait les articles comme « other ») — pas de forçage. `one-pan-chicken-tomato-rice` et `romantic-dinner-for-two-at-home` gardent 17/5 inlinks listings+hubs : acceptable, pas de lien artificiel.
- **Sections mortes** : `category-listing.tsx` filtre `LIVE_SECTION_PAGES = ["guides","idees"]` sur les chips « Explore more ».
- **Règle #3** de `.claude/rules/global.md` alignée sur le code (`/recipes/{slug}`).
- ⏳ Vérification finale par recrawl après redeploy (voir bas de document).

## 🟡 Medium (ajout 02/09, signal utilisateur) — 14 ancres fragments de liens contextuels

Constat : sur la page gnocchi, lien ancré « with tomatoes » → `whole30-chicken-skillet-tomatoes-garlic`. Vérification DB exhaustive : **14/80 liens contextuels (17,5 %)** ancrés sur un fragment commençant par une préposition, dont **« for two » ×11** (ancre sans aucune valeur descriptive).

**Cause racine double** :
1. `buildPhrases()` (`lib/internal-linker.ts`) génère des chunks de 2 mots des titres sans filtrer les prépositions initiales — ex. titres avec suffixe parenthéthéé « … for Two (Ready in 30 Minutes) » : le strip `for two$` échoue → chunk « for two » candidat → match n'importe où dans le prose.
2. `skills/chef-augustin-mega.md` §Internal Links n'exigeait aucune qualité d'ancre du modèle.

**Corrections** :
- Code : `FUNCTION_START` filter dans `buildPhrases()` + `buildHubPhrases()`, « for two » ajouté à `GENERIC_PHRASES` (`tsc` OK).
- Skill : règle d'ancre (≥3 mots descriptifs de la cible, jamais préposition initiale, sinon 0 lien).
- Contenu : 14 UPDATE (13 drops — phrases comme « 45 minutes for two plates » trahissaient une insertion aveugle — + 1 élargissement « the beef and cheese »). Post-vol : `Ancres fragments restantes : 0`. Backup : `repports/backup-ancres-2026-09-02.json`. Aucune cible orphelinisée (re-compt inbounds ✓).

## ✅ Post-vérification (recrawl après redeploy `8f4bc5a`, 02/09)

| Métrique | Avant | Après |
|---|---|---|
| Liens internes → 308 | **7** | **0** |
| Liens cassés / orphelines / profondeur >3 / ancres génériques | 0 | 0 |
| Recettes sans inbound recette→recette | 5 | 3 |
| `edible-cookie-dough-recipe-for-2` inbound contextuel | 0 | 1 (lien live dans `/recipes/chocolate-lava-cakes-for-two`) |
| `one-pan-chicken-tomato-rice` | 0 | ✓ reçoit le lien repointé de `garlic-butter-chicken-pasta-for-two` |

Les 3 restantes (chili, texas-roadhouse, romantic-dinner-for-two-at-home) reçoivent en réalité des liens de l'article roundup `/guides/15-easy-dinner-recipes-for-two` (classé « hub » par le script) — pas de forçage artificiel. Spot-checks prod : `/recipes/garlic-butter-chicken-pasta-for-two`, `/recipes/easy-chicken-dinners-for-two`, `/recipes/chocolate-lava-cakes-for-two`, `/guides` → 200.

## Méthodologie

1. Crawl : `scripts/_crawl-maillage.mjs` — seed sitemap 86 URLs, `redirect: manual` pour les destinations hors-seed, UA identifié, robots.txt respecté, 5 requêtes simultanées (auto-hébergé).
2. Nav globale exclue de l'analyse orphelines : hrefs présents sur ≥80 % des pages (9 détectés : home, /recipes, /guides, /idees, /about, /privacy, /terms, /contact, /llms.txt).
3. Code examiné : `next.config.mjs` (redirects), `app/recettes/[slug]/route.ts` (308 mono-saut), `lib/internal-linker.ts` (silo v2), `components/{recipe-card,article-card,related-recipes,category-listing,site-header,site-footer}.tsx`, `lib/hub-content.ts`.
