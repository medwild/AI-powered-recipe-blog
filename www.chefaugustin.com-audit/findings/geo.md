# GEO — AI Search Readiness (audit 2026-08-08)

**Score GEO : 75/100** — dimensions : Citabilité 85, Lisibilité structurelle 70, Multi-modal 55, Autorité/Brand 60, Accessibilité technique 95.
Pages analysées : `/recipes/easy-whole30-recipes`, `/recipes/fast-and-easy-dinner-for-2`, `/recipes/crockpot-recipes-for-two`, `/guides`.

---

## 1. Accessibilité crawlers IA — robots.txt

Preuve (`curl -s https://www.chefaugustin.com/robots.txt`) :

```
User-Agent: *            → Allow: / (Disallow: /dashboard, /api/ + Allow: /api/recipes/raw)
User-Agent: OAI-SearchBot → Allow: /
User-Agent: PerplexityBot → Allow: /
User-Agent: Bingbot      → Allow: /
User-Agent: Googlebot    → Allow: /
```

- [Sévérité: Info] **Tous les crawlers IA sont autorisés** — GPTBot, ChatGPT-User, ClaudeBot et Google-Extended ne sont pas listés explicitement mais tombent sous la règle wildcard `*` → `Allow: /`. Aucun blocage. Preuve : absence de `Disallow` les concernant + wildcard permissive.
- [Sévérité: Info] **`/api/recipes/raw` explicitement Allow** (override le `Disallow: /api/`) — bon signal : l'API JSON brute des 46 recettes est accessible aux LLM (et référencée dans llms.txt).
- [Sévérité: Low] **Pas de règles explicites GPTBot / ClaudeBot / ChatGPT-User**. Recommandation : ajouter `User-Agent: GPTBot` / `ClaudeBot` / `ChatGPT-User` → `Allow: /` pour lever toute ambiguïté (les crawlers OpenAI vérifient le token `OAI-SearchBot` pour la search, `GPTBot` pour l'entraînement — un allow explicite documente l'intention). Effort : 5 min.

## 2. llms.txt — présent et de qualité

- [Sévérité: Info] **`https://www.chefaugustin.com/llms.txt` existe** (HTTP 200, `content-type: text/markdown`, 70 lignes). Format conforme : `# Chef Augustin — Easy Weeknight Dinners for Two`, sections `## About`, `## Key Pages`, `## For LLMs`, `## Published Recipes (46)`.
- [Sévérité: Info] **Contenu actionnable** : chaque recette listée avec URL + description d'une phrase + métadonnées (PT35M, Easy, 2 servings). Section `## For LLMs` pointe vers l'API JSON brute et le sitemap. C'est un des meilleurs llms.txt vus en audit.
- [Sévérité: Low] **Pas de lien `llms-full.txt`** — pour un site de 46 pages, un llms-full.txt (contenu complet par URL) augmenterait l'extraction factuelle par les LLM qui ne fetch que ce fichier. Effort : moyen (génération depuis la DB, une route).
- [Sévérité: Info] `## Published Articles (0)` — exact (pas d'articles publiés), mais le hub `/guides` (21 hubs) n'est pas listé dans Key Pages → ajouter les hubs les plus importants à Key Pages. Effort : 5 min.

## 3. Citabilité — passages auto-suffisants (3 recettes + 1 hub)

- [Sévérité: Info] **Longueurs H2 idéales** : sections de 82–223 mots sur whole30 (Ingredients 105, Instructions 223, Why This Works 176, What Most Recipes Get Wrong 121). Les FAQ font 74–109 mots — dans la fourchette basse de l'optimum 134–167 mots, mais suffisamment denses pour citation directe.
- [Sévérité: Info] **Réponses directes avec le mot-clé dans les 60 premiers mots** : FAQ whole30 « What should I make for dinner on Whole30? » → réponse de 74 mots commençant par « A one-pan protein-and-vegetable skillet is the most reliable Whole30 dinner... » (mot-clé présent dès la 1re phrase). Pattern reproduit sur fast (5 FAQ) et crock (5 FAQ).
- [Sévérité: Info] **H2 questions natives** : « Can I make this Whole30 chicken skillet ahead of time? », « Why is my chicken dry? », « Can you freeze crockpot recipes for two? » — alignés sur les requêtes AI Overviews.
- [Sévérité: Medium] **Blocs FAQ sans conteneur sémantique dédié** : `faq_containers = 0` sur les 3 recettes — pas de `<details>`, pas de `<div class="faq">`/`<section>` dédié ; les questions sont des H2 nus sous une `<section>` générique. Les passages restent extractibles (texte linéaire propre), mais un conteneur `FAQPage` HTML (accordion `<details>`) renforcerait l'extraction par les crawlers IA et les rich snippets. Effort : moyen (template + script de migration).
- [Sévérité: Low] **Zéro data table sur les 4 pages** — pas de table de nutrition visible (la nutrition n'existe qu'en JSON-LD). Les AI Overviews citent volontiers les tableaux ; ajouter une table « Nutrition Facts » sur les recettes. Effort : faible (génération depuis le JSON-LD existant).
- [Sévérité: Info] Section « More One-Pan Dinners for Two » (H3 = liens internes) — silo de liens OK, mais les H3 de recettes dans le footer de page peuvent diluer le focus passage-level ; acceptable tel quel.

## 4. Brand mention signals

- [Sévérité: Info] **Marque cohérente** : `| Chef Augustin` dans le title des 3 recettes ET du hub /guides ; JSON-LD `author: {name: "Chef Augustin Lefèvre", @type: Person, url: /about}` ; byline visible « Augustin Lefèvre » ; 6–7 mentions visibles par page (nav + footer + byline). Pas de divergence author JSON-LD vs visible.
- [Sévérité: Info] **Entité Person complète** : `@type Person` avec URL /about dans le @graph Recipe — signal d'entité exploitable par les LLM pour la désambiguïsation.
- [Sévérité: Medium] **Hub /guides sans aucune entité** : 0 script JSON-LD (ni BreadcrumbList, ni ItemList, ni CollectionPage) alors que c'est la porte d'entrée des 21 clusters. Ajouter `ItemList`/`BreadcrumbList` + `CollectionPage`. Effort : faible (composant réutilisable).
- [Sévérité: Info] Pas de présence Wikipedia/Reddit/YouTube mesurable côté site (hors périmètre page) — la corrélation marque↔citations est portée par le byline + Person + about.

## 5. Passage-level — isolation des blocs

- [Sévérité: Info] Les `<section>` sont bien délimitées : `#ingredients-section`, `#article-body` (aria-labelledby présents) — extraction par ancre possible.
- [Sévérité: Info] FAQPage JSON-LD présent dans le @graph (5 Q&A sur whole30, réponses complètes in-page) — les LLM peuvent citer la paire Q/R sans contexte.
- [Sévérité: Medium] Rappel : conteneur HTML FAQ (details/accordion) manquant (cf. §3) — le JSON-LD FAQPage existe mais le markup visible n'est pas auto-suffisant au niveau DOM.

## 6. Méta GEO

- [Sévérité: Info] **Titles 61–67 chars** (whole30 61, fast 67, crock 61) — léger dépassement des 60 chars recommandés ; mot-clé + marque présents (« Easy Whole30 Recipes: One-Pan Chicken for Two | Chef Augustin »). Correct pour les extraits IA (le title est repris tel quel dans les citations).
- [Sévérité: Low] **Descriptions 151–161 chars** — au-delà du seuil de troncature ~155 px/160 chars ; whole30 à 161 chars. Tronquer à ~150 pour éviter la coupe. Effort : 5 min × 46 pages.
- [Sévérité: Low] **Méta du hub /guides faible** : « Browse our guides articles — French cooking tips, techniques, and guides. » (73 chars) — « French cooking tips » est hors focus (cible US/UK/CA/AU, dinner for two) et la promesse de valeur est vague. Réécrire avec un mot-clé de cluster (« Easy dinner ideas for two: step-by-step guides »). Effort : 5 min.

## Points forts (what_works)

- SSR complet : le HTML brut (~200 KB) contient tout l'article — aucun shell SPA, `is_spa=false`. Les crawlers IA (qui ne rendent pas le JS) voient 100 % du contenu.
- llms.txt exemplaire + API raw ouverte aux LLM.
- Dates publication/modification dans le JSON-LD (datePublished 2026-08-05, dateModified aligné).
- JSON-LD Recipe complet (nutrition, cuisine, category, keywords, image Cloudinary).

## Scores plateforme (estimation)

- Google AI Overviews : 75/100 (SSR + FAQ + dates OK ; tables et conteneurs FAQ manquants)
- ChatGPT (browse) : 70/100 (passages denses, mais blocs FAQ non isolés au DOM)
- Perplexity : 80/100 (PerplexityBot explicite + llms.txt riche + API raw)
- Bing Copilot : 65/100 (aucune règle explicite pour Copilot/Microsoft, pas d'ItemList sur hubs)

## Top 5 actions à fort impact

1. **[Medium, effort moyen]** Conteneur HTML FAQ dédié (details/accordion) sur les 46 recettes — +extraction AI Overviews + rich snippets.
2. **[Medium, effort faible]** JSON-LD ItemList + BreadcrumbList sur /guides et les 20 autres hubs.
3. **[Low, effort moyen]** llms-full.txt généré depuis la DB ; ajouter les hubs à Key Pages de llms.txt.
4. **[Low, effort faible]** Table Nutrition Facts visible sur les recettes (source : JSON-LD nutrition existant).
5. **[Low, effort faible]** Méta : tronquer descriptions à ~150 chars, réécrire la méta du hub /guides ; ajouter règles robots.txt explicites GPTBot/ClaudeBot/ChatGPT-User.
