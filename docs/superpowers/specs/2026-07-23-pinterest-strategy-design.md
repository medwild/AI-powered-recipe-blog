# Pinterest Traffic Strategy — Design Spec
> **Date :** 2026-07-23 | **Status :** Approved | **Version :** V2 (2026-07-24)
> **Niche :** Easy Weeknight Dinners for Two | **Domaine :** chefaugustin.com
>
> *V2 : corrections Mediavine, brevet, Rich Pins + nouvelle section Monétisation (AdSense + Mediavine + Affiliation)*

---

## 1. Architecture des boards (13 boards)

Chaque board est un conteneur SEO indexé par Pinterest. Noms = search queries réelles.

| # | Board Name | Source | Catégorie |
|---|---|---|---|
| 1 | Easy Chicken Dinners for Two | PTRA (35 keywords) | Food & Drink > Cooking |
| 2 | Asian-Inspired Dinners for Two | PTRA (30 keywords) | Food & Drink > Cooking |
| 3 | Quick Weeknight Dinners for Two | PTRA Quick & Healthy, renommé | Food & Drink > Cooking |
| 4 | Budget-Friendly Meals for Two | PTRA (20 keywords) | Food & Drink > Cooking |
| 5 | One-Pan Meals for Two | PTRA (15 keywords) | Food & Drink > Cooking |
| 6 | Slow Cooker Recipes for Two | PTRA Small-Batch Slow Cooker | Food & Drink > Cooking |
| 7 | Pasta & Noodles for Two | Cluster 1 — Protéine | Food & Drink > Cooking |
| 8 | Small-Batch Desserts for Two | Cluster 3 — Sides & Desserts | Food & Drink > Cooking |
| 9 | Small-Batch Sides for Two | Cluster 3 — Sides & Desserts | Food & Drink > Cooking |
| 10 | Romantic Dinner Ideas for Two | Cluster 5 — Guides & Occasions | Food & Drink > Cooking |
| 11 | Comfort Food for Two | Cross-cluster | Food & Drink > Cooking |
| 12 | Cooking Tips & Techniques for Two | Cluster 5 — Guides | Food & Drink > Cooking |
| 13 | Balanced Dinners for Two | PTRA Quick & Healthy, splitté | Food & Drink > Cooking |

### Descriptions complètes

**Easy Chicken Dinners for Two** — Simple chicken dinner recipes scaled for two people. From one-pan chicken thighs to crispy chicken parmesan — all tested for small-batch cooking. No leftovers, no waste, no scaling math. Each recipe includes exact cook times, USDA-safe temperatures, and step-by-step instructions. Perfect for weeknight dinners when you want something satisfying without feeding a crowd. New pins weekly.

**Asian-Inspired Dinners for Two** — Asian-style dinner recipes portioned for two — ramen bowls, stir-fries, dumplings, Thai curries, Korean BBQ for two, and quick weeknight noodle dishes. Every recipe adapted for a Western home kitchen with accessible ingredients and clear techniques. No specialty equipment needed. Each recipe includes exact ingredient quantities for two servings. Chef Augustin's tips on wok hei, sauce building, and the balance of salty-sweet-sour-umami.

**Quick Weeknight Dinners for Two** — Fast dinner ideas for busy weeknights — all scaled for two people and ready in under 45 minutes. No complicated techniques, no specialty ingredients, no hour of prep. Quick sears, fast sauces, 15-minute sides, and pantry-staple meals you can throw together on a Tuesday. Organized by protein, cook method, and total time so you find exactly what you need in seconds. Practical cooking for real life.

**Budget-Friendly Meals for Two** — Affordable dinner recipes for two that don't taste cheap — under $15 total, under $10, and pantry-only meals. Smart ingredient swaps, budget cuts of meat cooked properly, and how to shop for two without waste. Each recipe includes cost-per-serving estimate and a shopping strategy. Batch-cooking tips for freezing half now and eating half tonight. Good food doesn't require expensive ingredients — it requires knowing what to do with the affordable ones.

**One-Pan Meals for Two** — One-pan dinner recipes for two people — sheet pan suppers, skillet meals, and stovetop dishes that minimize cleanup. Every recipe uses a single cooking vessel from prep to plate. Small-batch portions mean no endless leftovers. Includes chicken, beef, pork, seafood, and vegetarian options. Cheat sheets for pan size, oven temperature, and timing included in every recipe.

**Slow Cooker Recipes for Two** — Small-batch slow cooker and crockpot recipes sized for two people. No more drowning in leftovers from a 6-quart recipe — these are built for 2-quart and 3-quart cookers. Dump-and-go dinners, tender fall-apart meats, soups, and stews. Each recipe includes cook time for both low and high settings, plus make-ahead and freezer prep tips.

**Pasta & Noodles for Two** — Pasta recipes portioned for two — carbonara, lasagna, mac and cheese, fettuccine, ramen bowls, and quick weeknight noodle dishes. No half-empty boxes of pasta, no sauce for six. Every recipe scaled to exactly two servings with precise ingredient quantities in both volume and weight. Includes classic Italian, Asian-inspired, and creamy comfort pasta dishes.

**Small-Batch Desserts for Two** — Dessert recipes that make exactly two servings — chocolate lava cakes, small-batch cookies, mini pies, two ramekins of crème brûlée, and more. No temptation of a full cake on the counter, no stale leftovers. Every recipe tested for small-pan baking and precise scaling. Includes quick desserts under 30 minutes, weekend baking projects, and romantic date-night sweets.

**Small-Batch Sides for Two** — Side dish recipes scaled for exactly two people — mashed potatoes for two, roasted vegetables, small-batch biscuits, quick salads, and simple grain sides. No more half-head of cauliflower wilting in the fridge or measuring 1/3 of a package. Each recipe designed to pair with a main dish or stand alone with a protein. Practical portions, zero waste, timed to finish with your main course.

**Romantic Dinner Ideas for Two** — Date-night dinner recipes designed for two — steak dinners, candlelight-worthy pastas, seafood for two, and decadent desserts that feel restaurant-fancy without the restaurant price. Every recipe includes wine pairing suggestions, plating tips, and timing so everything hits the table hot. Special occasion menus plus everyday romantic meals that say "I made an effort" without requiring one.

**Comfort Food for Two** — Comfort food classics scaled down for two — meatloaf, chili, pot pie, mac and cheese, mashed potatoes, beef stew, chicken and dumplings. All the dishes you crave without cooking for an army. Rich, satisfying, nostalgic recipes tested at two-serving scale. Each one includes make-ahead and freezer instructions so comfort food is always within reach. Cold nights, bad days, Sunday dinners — the food that feels like home.

**Cooking Tips & Techniques for Two** — Practical cooking guides for small-batch home cooks — how to scale any recipe to two servings, essential equipment for a two-person kitchen, knife skills, sauce fundamentals, and ingredient substitution charts. No fluff, no culinary school jargon. Each guide solves a real problem: halving an egg, choosing the right pan size, freezing half-batches, speed-thawing proteins.

**Balanced Dinners for Two** — Well-structured dinner recipes for two — protein + vegetables + smart carbs, without the fad diets or food moralizing. Lean proteins, vegetable-forward mains, lighter pastas, grain bowls. Just real food with good plate composition. High-protein options, naturally gluten-free meals, and ways to add vegetables without making a separate side dish. Flavor first, balance second.

### Format de chaque board

- **Nom :** keyword exact que les utilisateurs tapent (`pinterest.com/search/?q=...`)
- **Description :** 200+ caractères, keywords secondaires naturels, pas de keyword stuffing
- **Catégorie :** `Food & Drink > Cooking`
- **Secret :** Non — les boards sont publics pour être indexés

### Règle critique

Les boards incohérents sont **pruned** du content graph. Pinterest élague activement les comptes aux boards topiquement incohérents (famille de brevets : US 10,762,134 → US 11,762,908 → US 12,277,175, "node graph pruning"). Chaque board ne contient QUE des pins qui matchent son thème. Un pin "Chicken Parmesan" ne va PAS sur "Asian-Inspired Dinners for Two" — même si le PTRA original le faisait (data quality issue identifiée).

### Plan de repli pruning/suspension
1. **Pruning détecté** (disparition d'un pin d'un board) : vérifier la cohérence thématique du pin → le ré-épingler sur le bon board → ne pas le remettre sur le board pruné
2. **Suspension de compte** : contacter Pinterest Support via Business Hub (pas le formulaire grand public) → fournir la preuve de propriété du domaine + 3 exemples de contenu original → délai typique 5-10 jours ouvrés
3. **Prévention** : un backup JSON de tous les boards + pins est généré par `scripts/pin-brief.ts`. Aucun contenu tiers n'est épinglé sans vérification manuelle du thème du board cible.

---

## 2. Stratégie de contenu par board

### Mapping clusters → boards

```
CLUSTER 1 — Recettes par Protéine (17 articles)
  → Easy Chicken Dinners for Two
  → Pasta & Noodles for Two
  → Comfort Food for Two

CLUSTER 2 — Recettes par Méthode (8 articles)
  → One-Pan Meals for Two
  → Slow Cooker Recipes for Two

CLUSTER 3 — Sides & Desserts (13 articles)
  → Small-Batch Desserts for Two
  → Small-Batch Sides for Two

CLUSTER 4 — Idées & Menus (14 articles)
  → Quick Weeknight Dinners for Two
  → Budget-Friendly Meals for Two
  → Balanced Dinners for Two

CLUSTER 5 — Guides & Occasions (18 articles)
  → Romantic Dinner Ideas for Two
  → Cooking Tips & Techniques for Two
  → Asian-Inspired Dinners for Two (cross avec Cluster 1)
```

---

## 3. Design des pins

### Spécifications techniques

| Paramètre | Valeur |
|---|---|
| Dimensions | 1000 × 1500 px (ratio 2:3) |
| Format | PNG ou JPEG (haute qualité) |
| Text overlay | Titre lisible + 2-3 attributs clés + URL |
| Police | Sans-serif bold, lisible sur mobile |
| Source image | Ideogram V_3 via pipeline v14 + 1-2 photos réelles/recette sur les articles phares |

### Variantes par article

**5 variantes par recette (4 en S1 pilote, 5 à partir de S2) :**

| # | Angle | Text overlay exemple |
|---|---|---|
| A | Titre exact | "Easy Chicken Parmesan for Two" |
| B | Temps/rapidité | "30-Minute Chicken Parmesan (One Pan)" |
| C | Méthode | "Crispy Chicken Parmesan — No Deep Frying" |
| D | Résultat/bénéfice | "The Chicken Parmesan That Actually Serves 2" |
| E | Long-tail SEO | "Small-Batch Baked Chicken Parmesan Recipe" |

### Règle des 3 boards par pin

Chaque pin est épinglé sur **3 boards max**, espacés de 2-3 jours :
1. Board primaire : le plus spécifique (ex: Easy Chicken Dinners for Two)
2. Board secondaire : méthode ou occasion (ex: One-Pan Meals for Two)
3. Board tertiaire : audience/large (ex: Quick Weeknight Dinners for Two)

---

## 4. Workflow de publication

### Cadence

| Période | Fréquence | Volume hebdo |
|---|---|---|
| Semaine 1 | Setup + 2 recettes pilotes | 8 pins créés |
| Semaine 2-4 | 3 articles/semaine | 12-15 pins/semaine |
| À partir de S5 | 3 articles/semaine | 15 pins/semaine, 2-3 pins/jour |

### Routine hebdomadaire

```
Lundi    : Générer 1 article → pipeline v14 → draft
           → Passage éditorial humain (voix, notes, 1 photo réelle si possible)
Mardi    : Publier l'article + Créer 5 variantes de pins + programmation Tailwind
Mercredi : Générer 1 article → draft → review humaine
Jeudi    : Publier + Créer 5 variantes de pins + programmation
Vendredi : Générer 1 article → draft → review humaine
Samedi   : Publier + Créer 5 variantes de pins + curation (2-3 repins d'autres créateurs)
Dimanche : Repos ou buffer
```

### Passage éditorial humain (obligatoire avant publication)

Chaque article généré par le pipeline v14 passe par une review humaine rapide (~10-15 min/article) :
1. **Voix** : Vérifier que le ton "Chef Augustin" est cohérent (pas de jargon corporate, pas de fluff SEO visible)
2. **Précision** : Vérifier 2-3 points factuels (temps de cuisson, températures USDA, quantités)
3. **Image** : Remplacer le placeholder hero par une photo réelle si disponible (objectif : 1 photo réelle par recette phare)
4. **Liens** : Ajouter 2-3 liens affiliés dans le bloc "Shop this recipe"

**Pourquoi c'est obligatoire :** Mediavine (réseau pub cible) évalue manuellement la qualité et l'originalité du contenu lors de la candidature. Le contenu 100% IA sans passage humain est un motif de rejet documenté.

### Saisonnalité

Publier le contenu saisonnier **45-60 jours avant** le pic :
- Thanksgiving : contenu live en septembre
- Noël : contenu live en octobre
- Valentine's : contenu live en janvier
- Été/BBQ : contenu live en avril

### Vidéo (test S4-S6)

La vidéo courte capte l'attention plus efficacement qu'un visuel statique dans le flux Pinterest en 2026. À partir de S4, tester sur 1-2 recettes phares :
- Format : 9:16 vertical, 15-30 secondes
- Contenu : plan séquence de la recette (3-4 étapes clés) + text overlay
- Production : CapCut ou Canva, pas de tournage réel requis (animation des images du pipeline)
- Métrique de succès : CTR vidéo vs. CTR statique sur le même pin board

---

## 5. Rich Pins & configuration technique

### Rich Pins (automatique depuis sept. 2022)

Pinterest a supprimé le validateur manuel le 28 septembre 2022. Les Rich Pins sont désormais **automatiques** :
1. Le site a déjà le JSON-LD Recipe (implémenté dans pipeline v14) ✅
2. Le claim du domaine est fait (Settings → Claim → Website) ✅
3. **Aucune validation manuelle nécessaire.** Pinterest détecte automatiquement les métadonnées Schema.org/Open Graph et active les Rich Pins dans les 24h suivant le premier Pin sauvegardé.

Conditions techniques pour les Rich Pins automatiques :
- JSON-LD Recipe complet avec `name`, `image`, `recipeIngredient`, `recipeInstructions` (généré par pipeline v14)
- Open Graph tags : `og:title`, `og:image`, `og:description`, `og:url` (via Next.js metadata)
- Pinterest domain verification : `p:domain_verify` meta tag (déjà en place ✅)
- Pas de `meta name="pinterest-rich-pin" content="false"`

### Profil Pinterest

- **Nom :** Chef Augustin | Easy Weeknight Dinners for Two
- **Bio :** Small-batch dinner recipes for two people. French-trained chef sharing practical weeknight meals — no leftovers, no scaling math, no fuss. New pins daily. 🇫🇷→🇺🇸
- **Photo :** logo Chef Augustin ou hero image

---

## 6. Stratégie de monétisation

### Architecture 3 couches

La monétisation est empilée en continu, pas par paliers. Chaque couche s'active dès que les conditions sont remplies et les revenus se cumulent.

```
Couche 1 — Affiliation (J+1)           → Amazon Associates, Instacart
Couche 2 — AdSense (dès ~25 articles)  → Display ads Google
Couche 3 — Journey by Mediavine (1K+ sessions) → 70% RPM, remplace AdSense
Couche 4 — Mediavine Official ($5K cumulé)     → RPM complet
```

### 6.1 Affiliation — Amazon Associates (J+1)

**Activation :** immédiate, sans seuil de trafic.

**Condition de maintien :** 3 ventes qualifiées en 180 jours (sinon le compte est fermé). Avec un trafic même faible, 3 ventes en 6 mois est atteignable dès M1-M2.

**Intégration dans le template recette :**
- Bloc "Shop this recipe" sous la liste d'ingrédients
- 2-3 liens par recette : ingrédient clé (ex: "Chicken breast — $X.XX/lb"), ustensile (ex: "Our favorite skillet"), produit spécifique (ex: "Parmigiano-Reggiano")
- Lien taggé `?tag=chefaugustin-20`

**Revenu estimé :** $5-20/mois en M1-M3, $50-200/mois à partir de M6.

### 6.2 AdSense (dès ~25 articles, ~S7-S8)

**Condition d'acceptation :** Google examine manuellement le site. Les critères :
- **Contenu substantiel :** 20-30+ articles étoffés (>800 mots, contenu original) — c'est le critère bloquant
- **Pages obligatoires :** About, Contact, Privacy Policy (Privacy déjà en place ✅)
- **Navigation claire :** structure de site propre (Next.js App Router ✅)
- **Contenu original :** pas de scraping ou duplication. Le contenu généré par IA est accepté s'il est substantiel et utile (pas de spam low-effort) — le pipeline v14 produit du contenu qualitatif >1200 mots
- **Langue supportée :** anglais ✅
- **Policies :** pas de contenu interdit (health claims déjà filtrés par le quality gate ✅)

**Timeline réaliste :** À 3 articles/semaine, on atteint 25 articles publiés en ~S8. Candidature AdSense à S8 → approbation sous 1-2 semaines → AdSense actif ~S9-S10.

**Intégration technique :** Déjà câblée dans `app/layout.tsx` via `NEXT_PUBLIC_ADSENSE_PUBLISHER_ID`. L'infrastructure est prête, il ne manque que le volume de contenu pour l'approbation.

### 6.3 Journey by Mediavine (dès 1 000 sessions/mois)

**Nouveaux seuils (depuis le 15 janvier 2026) :**

| Seuil | Ce que ça débloque |
|---|---|
| 1 000 sessions/mois sur 30 jours glissants (tracké via plugin Grow) | Éligible Journey by Mediavine — partage de revenu 70% |
| 5 000 $ de revenu pub cumulé sur 12 mois | Passage automatique Journey → réseau "Official" |
| 100K visites/mois | Repère informel pour sponsors/affiliation (ne conditionne plus un palier Mediavine) |
| 1M vues Pinterest (impressions mensuelles) | Autorité de niche, commissions affiliées |

**Critères d'acceptation Mediavine (les 4 piliers) :**
1. **Contenu original et centré sur l'audience** — le contenu superficiel ou généré par IA sans voix éditoriale est un motif de rejet. → C'est pour ça que le passage éditorial humain (§4) est obligatoire, pas optionnel.
2. **Trafic organique et diversifié** — GA4 doit montrer une croissance soutenue, pas un pic mono-source (Pinterest seul). → Diversifier avec un filet de SEO Google + email avant de candidater.
3. **Design propre et navigation claire** — ✅ Next.js + Tailwind
4. **Contenu conforme aux policies** — ✅ Quality gate AdSense-compatible

**Timeline réaliste :** Sur les projections du §7, 1 000 sessions/mois est atteignable dès M2 (1 600-3 000). Mais attention au critère n°2 (trafic mono-source Pinterest). Recommandation : candidater à Journey à M3-M4, quand un filet de trafic Google + email est visible dans GA4.

### 6.4 Email capture (dès l'article 1)

**Pourquoi c'est critique :** Chaque visiteur qui part sans laisser d'email est une audience perdue à jamais. L'email est le seul canal 100% possédé (pas d'algo, pas de seuil). C'est aussi un signal positif pour Mediavine (trafic diversifié).

**Intégration :**
- Popup light ou bannière inline dans le template recette ("Get weekly dinner-for-two recipes →")
- Service : ConvertKit (gratuit jusqu'à 1 000 abonnés) ou Mailchimp
- Lead magnet : "The 5-Ingredient Dinners for Two Cheat Sheet" (PDF généré depuis 3 recettes existantes)

**Coût de mise en place :** ~1 jour de dev pour l'intégration frontend + config du service email.

---

## 7. Métriques et projections

### Définitions

- **Vues Pinterest** = Impressions mensuelles (nombre de fois qu'un pin apparaît dans un flux ou une recherche). À ne pas confondre avec les vues uniques (utilisateurs distincts) ou les saves (enregistrements).
- **Visiteurs blog** = Sessions GA4 (pas utilisateurs uniques). Le CTR de 2% est appliqué aux impressions pour estimer le trafic sortant.
- **CTR 2%** = taux de clic moyen observé sur Pinterest pour les Rich Pins cuisine en 2026 (source : benchmarks Pinterest Analytics, médiane 1.5-2.5%).

### Timeline réaliste

| Mois | Articles | Pins live | Vues Pinterest (impressions) | Visiteurs blog (CTR 2%) | Google SEO | Revenu estimé |
|---|---|---|---|---|---|---|
| M0 | 0 | 0 | 30K (résiduel) | ~100/mois | 0 | $0 |
| M1 | 11 | 44-48 | 40-60K | 400-600 | ~0 | Affiliation : $0-10 |
| M2 | 23 | 92-115 | 80-150K | 1 600-3 000 | 10-20/j | Affiliation : $10-30 |
| M3 | 35 | 140-175 | 150-300K | 3 000-6 000 | 20-50/j | Affil. $20-50 + Journey candidature |
| M4 | 47 | 188-235 | 250-500K | 5 000-10 000 | 50-100/j | Journey actif ~$100-300/mois |
| M5 | 59 | 236-295 | 400-700K | 8 000-14 000 | 80-200/j | Journey ~$200-500/mois |
| M6 | 70 | 280-350 | 500K-1M | 10 000-20 000 | 100-300/j | Journey ~$300-800/mois |
| M12 | 70 | 350+ | 1-2M | 20 000-40 000 | 300-800/j | Official ~$500-1 500+/mois |

### Chemin de monétisation (continu, pas par paliers)

```
M0-M2  : Affiliation Amazon Associates (pas de seuil, 3 ventes/180j pour rester actif)
M2-M3  : Candidature Journey by Mediavine (dès 1K sessions, trafic diversifié idéalement)
M3-M4  : Journey actif (70% du RPM pub) + Affiliation
S8-S9  : Candidature AdSense (dès ~25 articles publiés)
S9+    : AdSense actif (backup si Journey refuse, ou疊 jusqu'à Official)
M6-M12 : Mediavine Official (dès $5K cumulé) → AdSense se désactive (exclusivité probable)
```

---

## 8. Risques et anti-patterns

| Risque | Mitigation |
|---|---|
| Burst publishing → pénalité algo | 1-3 pins/jour, jamais de dump massif |
| Boards incohérents → pruned | 1 board = 1 thème strict. Voir plan de repli §1 |
| AI content détecté → dépriorisé | Passage éditorial humain avant publication (§4). Voix authentique, notes personnelles |
| **AI labeling sur Pinterest** — label "AI modified" visible au clic si Pinterest détecte une image générée. Depuis oct. 2025, les utilisateurs peuvent filtrer le contenu IA dans certaines catégories | 1-2 photos réelles par recette phare (hero shot). Les classifieurs Pinterest croisent métadonnées ET contenu visuel — supprimer les métadonnées EXIF ne suffit pas. La labellisation n'est pas une pénalité de ranking aujourd'hui, mais c'est un risque à surveiller |
| **Trafic mono-source Pinterest** → rejet Mediavine | Diversifier avant de candidater à Journey : SEO Google (articles bien structurés, FAQ, JSON-LD), email (liste dès M1), direct |
| **Contenu 100% IA sans voix éditoriale** → rejet Mediavine | Le passage éditorial humain (§4) est une condition d'éligibilité, pas un nice-to-have. Mediavine examine manuellement la qualité du contenu |
| Fatigué après 2 mois → abandon | 6-9 mois minimum avant d'évaluer |
| 70 articles = 70 designs identiques → CTR faible | 5 variantes par article, angles différents |
| Pinterest = seul canal → risque plateforme | Google SEO en parallèle (hub & spokes déjà prévu) + email (canal possédé) |
| **Suspension de compte Pinterest** | Plan de repli §1. Backup JSON des boards/pins. Pas de contenu tiers épinglé sans vérification |

---

## 9. Checklist d'exécution

### Phase 1 — Setup (S1)
- [x] Créer les 13 boards avec noms, descriptions, catégories ✅
- [ ] Optimiser le profil Pinterest (nom, bio, photo)
- [ ] ~~Activer Rich Pins (claim website + validator)~~ **OBSOLÈTE :** Rich Pins automatiques depuis sept. 2022. Il suffit d'avoir JSON-LD Recipe + OG tags + domaine claimé
- [ ] Générer 2 recettes pilotes (semaine 1)
- [ ] Créer 5 variantes de pins par recette
- [ ] Configurer Tailwind pour scheduling
- [ ] **Ajouter email capture** (popup/inline + ConvertKit) — avant le premier article publié
- [ ] **Ajouter bloc "Shop this recipe"** (Amazon Associates) dans le template recette

### Phase 2 — Croissance (S2-S8)
- [ ] Programmer 1 pin/jour semaine 1, puis 2-3 pins/jour
- [ ] Publier 3 articles/semaine avec passage éditorial humain
- [ ] Review Analytics Pinterest toutes les 2 semaines
- [ ] Ajuster les angles de pins selon les données (CTR par variant)
- [ ] **Postuler à Amazon Associates** (dès le 1er article publié)
- [ ] **Postuler à AdSense** (dès ~25 articles publiés, ~S8)
- [ ] **Postuler à Journey by Mediavine** (dès 1K sessions/mois ET trafic diversifié, ~M3-M4)

### Phase 3 — Maturité (S9+)
- [ ] Tester 1-2 vidéos courtes sur les recettes phares (~S4-S6)
- [ ] Candidater Mediavine Official (dès $5K revenu cumulé)
- [ ] Explorer partenariats de marque CPG + Instacart (M6+)
