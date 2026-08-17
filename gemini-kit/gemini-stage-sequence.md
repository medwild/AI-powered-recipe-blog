<!-- gemini-kit/gemini-stage-sequence.md -->
# Chef Augustin — Séquence d'étapes (Google AI Studio)

## Déroulé de session

1. Nouveau chat AI Studio → choisis le modèle Gemini (Pro si dispo, vérifier au pilot).
2. Colle le contenu de `gemini-system-prompts.md` comme premier message.
3. Colle le packet SERP (format ci-dessous) SUIVI du bloc Étape 1.
4. Continue avec les blocs Étape 2, 3, 4 selon les besoins.
5. Copie le JSON final et colle-le dans Claude Code pour la review.

## Format du packet SERP

## KEYWORD
<keyword exact>

## TOP RESULTS (from serper.dev)
1. [TITLE] <URL>
   <snippet>
2. ... (3-5 résultats)

## PEOPLE ALSO ASK
- <question>

## RELATED SEARCHES
- <related>

## CUISINE CONTEXT (optionnel)
<thème spécifique : mexicain, italien…>

## CANDIDATE LINKS (optionnel — fourni par Claude Code, jamais inventé)
- [anchor text](/recipes/slug)

---

## Étape 1 — Analyse SERP & angle

<colle le packet ici>

Agis maintenant comme un stratège SEO. Analyse les résultats ci-dessus :
que couvrent-ils, que manquent-ils, où sont-ils faibles (contenu mince,
absence de science culinaire, substitutions absentes, structure pauvre) ?
Identifie LA seule chose que le top 3 rate.

Réponds UNIQUEMENT au format suivant :

ANGLE: <la seule chose que le top 3 rate — formulée en observation de cuisine,
        jamais en langage SERP : « Most recipes I've tried… » / « The mistake I
        keep seeing… ». NE PAS écrire les mots bannis de la liste union.>
H1: <keyword first>
META TITLE: <≤60 chars>
META DESCRIPTION: <150-160 chars>
FAQ CANDIDATES: <5-7 questions>
H2 ROADMAP: <6-8 sections en ordre>

L'angle est un produit de travail — il ne doit JAMAIS apparaître tel quel dans
l'article final (mots bannis « angle », « SERP », « competitors » inclus).

## Étape 2 — Draft complet

<colle ce bloc après l'analyse>

Écris maintenant l'article complet selon le contrat de sortie du system prompt
(14 champs, 1800-2200 mots, dual output cohérent, températures USDA dans text ET
temperature, [IMAGE: alt text] au début du markdown, nutrition réaliste).
Réponds en JSON pur : commence par `{`, termine par `}`, pas de fences.
Si ta réponse est coupée, termine par `TRUNCATED` — l'utilisateur répondra « continue ».

## Étape 3 — Auto-audit (pré-filtre, sans corrections)

<colle ce bloc après le draft>

Deviens un auditeur de conformité strict et impartial. Audite le draft
précédent contre la checklist ci-dessous. NE CORRIGE RIEN : tu produis
uniquement le tableau d'audit. Pour chaque check, indique PASS ou FAIL
avec la preuve (champ, numéro d'étape, extrait court).

| # | Couche | Check |
|---|---|---|
| 1 | Gate | Food safety : températures USDA pour chaque protéine, dans text ET temperature |
| 2 | Gate | Word count : floor dynamique (600 dessert / 800 ≤30min / 1200 sinon) ET cible 1800-2200 — MARCHE « à vérifier par comptage externe » |
| 3 | Gate | Mots bannis (liste union complète du system prompt) |
| 4 | Gate | metaTitle ≤60 chars — MARCHE « à vérifier par comptage externe » |
| 5 | Gate | H2 ≥3 dans contentMarkdown |
| 6 | Gate | JSON-LD : nœud Recipe avec author |
| 7 | Gate | Répétition de tokens (« word word », « for two for two ») |
| 8 | Contrat | Les 14 champs présents, types corrects, ISO 8601 pour les durées |
| 9 | Contrat | metaDescription 150-160 chars — MARCHE « à vérifier par comptage externe » |
| 10 | Contrat | Cohérence dual output : instructions[] et contentMarkdown racontent la même recette |
| 11 | Éditorial | L'angle de l'Étape 1 est-il réellement livré dans l'article ? |
| 12 | Éditorial | FAQ ≥5 au format `## Question ?`, réponses 25-120 mots avec chiffres/entités |
| 13 | Éditorial | Nutrition présente et réaliste dans le nœud Recipe |
| 14 | Éditorial | Clôture par une scène, pas « Enjoy! » |
| 15 | Éditorial | Squelette de sections corpus : étapes dans le premier tiers (jamais après la FAQ), FAQ en dernier, « What Most Recipes Get Wrong » présent, 2-4 tips signés |

Format de sortie :

| Check | PASS/FAIL | Preuve |
|---|---|---|
| 1 | PASS | Step 4 text: "165°F / 74°C" |

Puis une section « FIXES REQUIS » listant uniquement les FAIL :
`#N <libellé check> — <localisation> — <correctif attendu>`

Rappel : les comptages exacts ne sont pas fiables par toi — marque-les
« à vérifier par comptage externe » et concentre-toi sur le structurel.

## Étape 4 — Correction

<colle ce bloc après l'audit>

Applique TOUTES les corrections de la section « FIXES REQUIS » de l'audit
précédent. Sors le JSON final complet et valide : commence par `{`, termine
par `}`, pas de fences, aucune règle du system prompt assouplie.
Si la sortie est coupée, termine par `TRUNCATED`.

## Règles de boucle

- **Loop interne** : après l'Étape 4, re-lance le bloc Étape 3. Max 2 passes.
  Si encore des FAIL après 2 passes, livre le JSON tel quel avec l'audit attaché.
- **Loop externe** : quand Claude Code renvoie un rapport de feedback (P0/P1/P2),
  colle-le dans le chat (la recette est déjà en contexte) et dis : « Applique ce
  feedback avec la logique de l'Étape 4 ». Max 3 retours — au-delà, le problème
  vient du kit, pas de la recette.
- **Réglages recommandés** (si l'UI le permet par génération) : Étape 1-2 à 0.8-0.9,
  Étape 3 à 0.2, Étape 4 à 0.5. Sinon 0.7 unique.
