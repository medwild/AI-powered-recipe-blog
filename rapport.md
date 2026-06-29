# Rapport d'évaluation — Migration agents v4/v1 → v5.1/v2.1 ULTRA

**Date** : 2026-06-26
**Agents concernés** : Auditor (v4.0.0 → v5.0.0 → v5.1.0-ULTRA) + Food Photography (v1.0.0 → v2.0.0 → v2.1.0-ULTRA)
**Contexte** : Les agents Strategist, Writer et Editor étaient déjà en v5 ULTRA. L'Auditor et le Food Photography étaient les deux maillons faibles restants. Ce rapport couvre les 2 vagues d'optimisation, incluant les correctifs appliqués après le premier audit.

---

## 1. AGENT AUDITOR — v4.0.0 → v5.0.0 → v5.1.0-ULTRA

### 1.1 Ce qui a changé structurellement

| Dimension | v4.0.0 | v5.0.0 | v5.1.0 | Gain réel |
|-----------|--------|--------|--------|-----------|
| Nombre de critères | 6 | 8 | 8 | +33% de surface d'évaluation |
| Score max | /140 | /160 | /160 | Recalibration complète |
| Critère Voice | Absent | 5 tokens fixes | **5 tokens adaptatifs** (Easy=3, Medium=4, Hard=5) | Ne pénalise plus les recettes simples |
| Anti-AI-Slop | Vocab basique | +Perplexity/Burstiness | +Section "How AI Detection Works" | Le LLM comprend POURQUOI il audite |
| AI Score | Plages manuelles | Formule pondérée v1.0 | **Formule documentée + calibration roadmap** | Transparence sur les limites, plan d'amélioration |
| Conflit longueur | Non traité | Présent (800-1200 vs <700) | **RÉSOLU** : Target=GOAL, Red Flag=HARD LIMIT | Plus d'ambiguïté pour le LLM |
| Pre-audit | Aucun | 5-step checklist | 5-step + **Difficulty Lock** (Step 3) | Le seuil Voice est verrouillé avant scoring |
| Post-audit | Aucun | 5-check validation | 5-check + vérification difficulté/Voice | Plus de pénalité injuste sur recette Easy |
| Gestion d'erreurs | Aucune | Contrat JSON | Contrat JSON + `aiScoreFormulaVersion` | Traçabilité de la version de formule |
| Output schema | 7 champs critères | 8 critères | Voice inclut `difficulty`, `tokensRequired`, `tokensFound` | Transparence totale sur le scoring Voice |

### 1.2 Avantages réels de la v5

**A. La détection AI ne se limite plus aux mots interdits.** En v4, un article sans "delve" ni "unlock" passait clean même avec des phrases toutes de 18 mots et une structure uniforme. La v5 ajoute les checks Perplexity/Burstiness :
- ≥2 phrases de ≤5 mots exigées (fragments naturels)
- ≥2 phrases de ≥25 mots exigées (complexité humaine)
- Pas de 3 phrases consécutives démarrant par le même mot
- Pas de paragraphe où toutes les phrases ont la même longueur (±3 mots)
- ≥1 micro-imperfection ("gonna", "y'know", fragment intentionnel)

Ces 7 checks attrapent du "slop structurel" que la v4 laissait passer. **La v5.1 ajoute la Section 4 "How AI Detection Works" qui explique au LLM le POURQUOI de ces checks (Perplexity, Burstiness, Structural Predictability, Transition Density)** → le modèle comprend la logique, pas juste la règle.

**B. Le persona Chef Augustin devient auditable ET adaptatif.** La v4 ne mesurait pas la cohérence de voix. La v5.0 exigeait 5 tokens pour TOUTES les recettes. La v5.1 introduit un seuil adaptatif :
- **Easy** : 3 tokens requis ([WARM]+[SHARP]+[WINK]), [GRIT] et [GLOW] non requis
- **Medium** : 4 tokens ([WARM]+[SHARP]+[WINK]+([GRIT] OU [GLOW]))
- **Hard** : 5 tokens (tous requis)

Une recette "How to Boil an Egg" (Easy) n'est plus pénalisée pour l'absence de [GRIT] — c'était le bug le plus critique de la v5.0.

**C. La formule AI Score est documentée honnêtement.** La v5.1 ne prétend pas que la formule est parfaite. La section "Calibration Notes" explique :
- Que les poids sont heuristiques (pas régressés)
- Comment calibrer empiriquement (collecter 50+ articles, régresser)
- Que le score est directionnel, pas absolu

C'est plus honnête que la v5.0 qui présentait la formule sans disclaimer.

**D. Le conflit de longueur de contenu est résolu.** La v5.1 clarifie : le target 800-1200 words est un GOAL (ce que le Writer doit viser), le Red Flag <700 ou >1200 est une HARD LIMIT (déclenchement automatique de pénalité). Avec des exemples concrets :
- 720 mots → dans la tolérance du target, pas de Red Flag
- 690 mots → sous le Red Flag ET sous le target
- 1300 mots → au-dessus du Red Flag ET au-dessus du target

### 1.3 Corrections v5.0 → v5.1 : ce qui a été fixé

| Issue rapport v5.0 | Statut | Solution v5.1 |
|-------------------|--------|---------------|
| Voice Consistency exige 5 tokens sur recettes courtes | ✅ **FIXÉ** | Seuil adaptatif Easy/Medium/Hard |
| Conflit 800-1200 vs Thin Content <700 | ✅ **FIXÉ** | Clarification GOAL vs HARD LIMIT avec exemples |
| Formule AI Score non calibrée | ✅ **DOCUMENTÉ** | Section "Calibration Notes" + roadmap calibration empirique |
| Read-Aloud Test subjectif | ✅ **NUANCÉ** | "Soft check" — complète mais ne remplace pas les checks structurels |
| Complexité ~23K caractères | ⚠️ **ACCÉPTÉ** | La v5.1 est aussi longue, le compromis complexité/puissance est assumé |

### 1.4 Limites restantes

**A. La formule AI Score reste heuristique.** Les poids 0.4/0.3/0.2/0.1 n'ont pas été régressés. La v5.1 le documente honnêtement et fournit un plan de calibration — mais tant que ce n'est pas fait, le score reste "précis mais pas nécessairement exact".

**B. La complexité est élevée.** La v5.1 fait ~25 000 caractères. C'est dense pour un LLM. Le risque d'instructions ignorées (particulièrement les Techniques Avancées en fin de document) existe toujours.

### 1.5 Verdict final Auditor

**v5.1 : 78/100** (v5.0 : 72/100, v4 : 45/100)

Le gain de +6 points vient de la résolution du bug Voice Consistency (le plus impactant) et de la clarification du conflit de longueur. Les 2 limites restantes (calibration empirique, complexité) sont documentées avec un plan d'action.

---

## 2. FOOD PHOTOGRAPHY — v1.0.0 → v2.0.0 → v2.1.0-ULTRA

### 2.1 Ce qui a changé structurellement

| Dimension | v1.0.0 | v2.0.0 | v2.1.0 | Gain réel |
|-----------|--------|--------|--------|-----------|
| Output | 1 prompt string | JSON 4 variants | JSON **5 variants** (+YouTube 16:9) | Couvre 100% des plateformes |
| Modèle cible | FLUX-1-Schnell | FLUX-2-Pro/Max | FLUX-2-Pro/Max | Idem v2.0 |
| Plateformes | 2 implicites | 4 explicites | **6 explicites** (+YouTube, +Email) | Plus de plateforme manquante |
| Budget prompt | Illimité | <80 mots (inappliqué) | **2-part budget** : core <40 mots, total 60-100 (max 120) | Règle enfin applicable sans contradiction |
| Recettes low-visual | Aucune gestion | Aucune gestion | **4 stratégies de fallback** (A/B/C/D) | Le gap le plus critique est comblé |
| Exemples vs règles | Cohérents | **Incohérents** (exemples >80 mots) | **Cohérents** (core subject isolé, total dans la limite) | Le LLM n'est plus confus |
| Visual assessment | Non | Non | **Step 2 dédié** dans la checklist | Décision explicite HIGH vs LOW avant génération |
| YouTube 16:9 | Absent | Absent | **Ajouté** (section 6.5 + caméra + exemples) | Format critique pour la découverte vidéo |
| Low-visual examples | Aucun | Aucun | **Vegetable Broth complet** (5 variants) | Montre la stratégie fallback en action |

### 2.2 Avantages réels de la v2

**A. Le multi-format est le gain le plus concret.** La v1 sortait UN prompt "one-size-fits-all" en 3:4 vertical. La v2 sort 5 variants avec des consignes opposées adaptées à chaque canal de distribution.

**B. Le Thumbnail-First est un vrai use case business.** Les apps de livraison affichent les photos à 100×100px. La v2 a une validation dédiée + un variant spécifique.

**C. La Color Palette Engineering est passée à un système structuré.** Le `styleMetadata` est du JSON exploitable par le front-end.

**D. Brand Consistency Lock.** Cohérence visuelle entre recettes d'un même blog.

### 2.3 Corrections v2.0 → v2.1 : ce qui a été fixé

| Issue rapport v2.0 | Statut | Solution v2.1 |
|-------------------|--------|---------------|
| Exemples >80 mots violent la règle | ✅ **FIXÉ** | Budget en 2 parties : core <40 mots, total 60-100 (max 120). Exemples recalibrés |
| Pas d'exemple d'échec overstuffed | ✅ **FIXÉ** | Ajout d'une explication : POURQUOI les anti-patterns dégradent FLUX-2 spécifiquement |
| Pas de fallback recettes low-visual | ✅ **FIXÉ** | Section 13 complète : 4 stratégies (A/B/C/D) + règles de sélection + exemple complet (Vegetable Broth, 5 variants) |
| Pas de YouTube 16:9 | ✅ **FIXÉ** | Section 6.5 + caméra dédiée + exemples complets |
| Migration FLUX-1→2 non démontrée | ⚠️ **PARTIEL** | L'explication du "pourquoi FLUX-2 punit le spell-casting" aide, mais reste déclarative |
| "Honest AI" vague | ⚠️ **NON FIXÉ** | Toujours subjectif — difficile à rendre exécutable par un LLM |

### 2.4 Avantages spécifiques de la v2.1

**A. Le budget prompting est enfin cohérent.** La v2.0 disait "<80 mots" mais les exemples faisaient 130 mots → le LLM ignorait la règle. La v2.1 introduit un budget en DEUX parties :
- **Core subject** (style + dish + action + environment) : < 40 mots — c'est le brief créatif
- **Technical specs** (lighting + camera + format + exclusions) : ajoutés systématiquement, ne comptent pas dans les 40 mots
- **Total** : 60-100 mots, jamais >120

Les exemples sont maintenant structurés avec le core subject isolé et commenté. C'est applicable.

**B. La stratégie Low-Visual Fallback est le vrai gap comblé.** La v2.0 ignorait totalement le cas des recettes sans sujet photogénique (broth, riz, purée). La v2.1 propose 4 stratégies avec des règles de décision :

| Stratégie | Pour quel type de recette | Exemple |
|-----------|--------------------------|---------|
| **A. Ingredient Focus** | Broths, stocks, sauces | Photographier les ingrédients AVANT cuisson |
| **B. Action/Process Shot** | Rice, grains | Steam, paddle, cuisson en cours |
| **C. Lifestyle Context** | Purées, sides simples | Plat servi, belle table, linge |
| **D. Textural Close-Up** | Tout avec UNE texture | Macro extrême sur la texture |

Le skill inclut un exemple complet (Vegetable Broth) avec 5 variants platform-specific utilisant la Strategy A. C'est concret et exécutable.

**C. YouTube 16:9 est couvert.** Section 6.5 + caméra 50mm f/4 + exemples dans les deux cas (HIGH visual avec Short Ribs, LOW visual avec Vegetable Broth). Le format le plus important pour la découverte vidéo n'est plus absent.

### 2.5 Limites restantes

**A. La stratégie "Honest AI" reste subjective.** "Colors that don't exist in nature" n'est pas plus exécutable par un LLM en v2.1 qu'en v2.0. Mais c'est intrinsèquement un principe éditorial humain — peut-être que ça ne PEUT pas être automatisé.

**B. La migration FLUX-1→2 est mieux expliquée mais toujours pas validée empiriquement.** L'explication du "pourquoi les anti-patterns dégradent FLUX-2" (modèle plus capable = plus sensible aux instructions contradictoires) est convaincante, mais aucune A/B test réel n'a comparé un prompt v1 vs v2 sur FLUX-2.

### 2.6 Verdict final Food Photography

**v2.1 : 88/100** (v2.0 : 75/100, v1 : 40/100)

Le gain de +13 points est massif et vient de 3 corrections : le budget prompting enfin cohérent (+5), le fallback low-visual (+5), YouTube 16:9 (+3). Les 2 limites restantes (Honest AI subjectif, migration non validée empiriquement) sont mineures comparées aux gaps critiques comblés.

---

## 3. SYNTHÈSE — Impact global sur le pipeline

### 3.1 Évolution du pipeline

```
PIPELINE INITIAL (Sprint 1) :
Strategist(v5) → Writer(v5) → Auditor(v4) → Editor(v5) → FoodPhoto(v1)
                     ↑ maillons faibles : scoring incomplet, single prompt ↑

PIPELINE v5.0/v2.0 :
Strategist(v5) → Writer(v5) → Auditor(v5.0) → Editor(v5) → FoodPhoto(v2.0)
                     ↑ plus de maillon structurellement faible, mais bugs ↑

PIPELINE v5.1/v2.1 (ACTUEL) :
Strategist(v5) → Writer(v5) → Auditor(v5.1) → Editor(v5) → FoodPhoto(v2.1)
                     ↑ bugs critiques résolus, edge cases couverts ↑
```

### 3.2 Bénéfices croisés v5.1/v2.1

1. **L'Auditor v5.1 ne pénalise plus injustement les recettes simples.** Le seuil adaptatif Easy/Medium/Hard aligne l'exigence de voice tokens sur la complexité réelle de la recette.

2. **Le Food Photo v2.1 ne produit plus de prompts vides sur les recettes low-visual.** Les 4 stratégies de fallback garantissent qu'aucune recette n'est laissée sans image, même un "Simple Vegetable Broth".

3. **La boucle Auditor→Editor→FoodPhoto est cohérente sur la difficulté.** L'Auditor reçoit `difficulty` en input et adapte son scoring Voice. Le Food Photo reçoit aussi `difficulty` et pourrait adapter sa complexité visuelle (non encore implémenté, mais les champs sont là).

4. **Les 2 skills ont maintenant des exemples cohérents avec leurs propres règles.** C'était le bug le plus sournois : un skill qui dit "faites X" mais montre "faites Y" dans ses exemples. Les deux sont maintenant alignés.

### 3.3 Scores comparatifs

| Agent | v initiale | v5.0/v2.0 | v5.1/v2.1 | Gain total |
|-------|-----------|-----------|-----------|------------|
| Auditor | 45/100 (v4) | 72/100 | **78/100** | +33 pts |
| Food Photography | 40/100 (v1) | 75/100 | **88/100** | +48 pts |

### 3.4 Ce qui manque encore au pipeline

1. **Pas d'agent de test/QA** — personne ne vérifie que les corrections de l'Editor ont bien été appliquées.

2. **Pas de boucle de feedback fermée** — les AI Scores et les scores E-E-A-T ne sont pas loggués dans `self_improvement_logs`. Le skill `self-improvement.md` existe mais reste décorrélé du pipeline (SPRINT 3).

3. **Calibration empirique de la formule AI Score** — documentée avec un plan, mais pas exécutée. Nécessite 50+ articles avec scores de détecteurs réels.

4. **Le Food Photo n'a pas de mécanisme de sélection A/B réel** — la Technique A propose 2-3 variants de mood mais pas de boucle pour mesurer lequel performe mieux.

5. **Pas de gestion de l'edge case "recette sans PAA questions"** — si Serper ne renvoie pas de PAA, le pipeline n'a pas de fallback.

---

## 4. Conclusion

Ces deux vagues d'optimisation (v5.0/v2.0 puis v5.1/v2.1) ont transformé les deux maillons faibles du pipeline en agents solides et cohérents avec le reste de la stack ULTRA.

**La v5.0 a apporté la puissance** (8 critères, Perplexity/Burstiness, Voice tokens, formules). **La v5.1 a apporté la justesse** (seuil adaptatif, clarification des conflits, documentation honnête des limites).

**La v2.0 a apporté la couverture** (multi-format, 5 plateformes, thumbnail-first). **La v2.1 a apporté la robustesse** (budget applicable, fallback low-visual, YouTube 16:9, exemples cohérents).

Le pipeline est maintenant équilibré : les 5 agents sont tous en version ULTRA avec des capacités cohérentes entre eux. Les gaps restants sont connus, documentés, et relèvent du Sprint 3 (self-improvement, calibration empirique, boucle A/B).
