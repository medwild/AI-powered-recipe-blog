# SEO Audit — 2 Pages Recettes (Piccata + Salmon)

**Date:** 2026-07-26 | **Score combiné:** 75/100

URLs:
1. `/recettes/creamy-lemon-chicken-piccata-for-two-2` (Recette #80)
2. `/recettes/pan-seared-salmon-with-lemon-dill-sauce-for-two` (Recette #77)

---

## Executive Summary

| Catégorie | Piccata | Salmon |
|-----------|---------|--------|
| On-Page SEO | 85/100 | 82/100 |
| Content Quality | 92/100 | 90/100 |
| Schema | 45/100 | 30/100 |
| Images | 60/100 | 55/100 |
| Internal Links | 70/100 | 68/100 |
| AI Readiness | 82/100 | 80/100 |
| **Score** | **75** | **72** |

---

## 🔴 Critical Issues

### 1. JSON-LD absent du HTML source
**Impact:** Google ne peut pas afficher les rich results (recipe carousel, cooking time, calories). Le schema est présent en DB mais n'est pas injecté dans la page rendue.

**Fix:** Vérifier le composant Next.js de la page recette — le JSON-LD doit être dans une balise `<script type="application/ld+json">` dans le `<head>`.

### 2. Meta description absente du HTML
**Impact:** Google affiche un snippet auto-généré au lieu de la meta écrite. Les deux pages ont une meta en DB (Piccata: 136c, Salmon: 151c).

**Fix:** Injecter `<meta name="description">` dans le `<head>` via Next.js Metadata API.

### 3. Liens internes probablement cassés
| Page | Lien | Cible |
|------|------|-------|
| Piccata | `one-pan lemon garlic chicken` | `/recettes/one-pan-lemon-garlic-chicken` |
| Salmon | `One-pan garlic butter chicken` | `/recettes/garlic-butter-chicken-for-two` |

Le slug réel en DB pour cette recette est `one-pan-garlic-butter-chicken-for-two` (#75). Le lien de Piccata pointe vers un slug inexistant. Celui de Salmon est incomplet (manque "one-pan").

---

## 🟠 High Priority

### 4. Placeholder `<placeholder>` dans image JSON-LD
Les deux pages ont `"image": "<placeholder>"` dans le Recipe schema. Remplacer par l'URL Cloudinary réelle après génération.

### 5. Word count insuffisant
- Piccata: 1427 mots (cible 1800)
- Salmon: ~1230 mots (cible 1800)

**Fix Salmon:** Ajouter 500+ mots — section food science sur pourquoi la peau croustillante (collagène → gélatine, réaction de Maillard), ou +2 FAQ.

### 6. Slug `-2` disgracieux
`/creamy-lemon-chicken-piccata-for-two-2` — conséquence de 2 générations échouées (#78, #79). Supprimer les recettes failed pour libérer le slug propre.

### 7. Alt text redondant
Les deux hero images ont un alt = H1. Ajouter des détails visuels : "Golden-seared chicken cutlets in a glossy lemon-cream sauce with capers, served in a cast iron skillet".

### 8. nutrition + aggregateRating manquants
Ajouter `nutrition.calories` (estimé) et `aggregateRating` (même un placeholder "4.8") au Recipe schema. Les étoiles dans les SERPs augmentent le CTR de 15-35%.

---

## 🟡 Medium Priority

### 9. H2 dupliqué "Why This Recipe Works"
Présent 2× sur chaque page (recipe card + article body). Différencier : le H2 de la card pourrait être "At a Glance" ou similaire.

### 10. Titres de cards en H2
Les sections "More Recipes You'll Love" créent des H2 par carte. Structure suggérée : `<section>` avec un seul H2 "More Recipes", cartes en `<h3>`.

### 11. Titre Salmon trop long
69 caractères (limite Google: 60). Suggestion: `Pan-Seared Salmon with Lemon Dill Sauce | Chef Augustin` (57c).

### 12. Créer llms.txt
Fichier `/llms.txt` listant les URLs de recettes pour les crawlers AI.

---

## ✅ Ce qui est excellent

| Critère | Piccata | Salmon |
|--------|---------|--------|
| H1 keyword-first | ✅ | ✅ |
| USDA temperatures | ✅ 165°F/74°C | ✅ 145°F/63°C |
| Diamond Crystal salt | ✅ | ✅ |
| Double unités | ✅ | ✅ |
| FAQ avec réponses chiffrées | ✅ 4 Q&A | ✅ 5 Q&A |
| Voice / E-E-A-T | ✅ Exceptionnel | ✅ Excellent |
| Food science depth | ✅ Émulsion | ✅ Searing |
| Date fraîcheur | ✅ 2026-07-26 | ✅ 2026-07-26 |
| Hero image Cloudinary | ✅ f_auto,q_auto | ✅ f_auto,q_auto |
| Internal linking | ✅ 4 contextuels | ✅ 3 contextuels |
| Breadcrumb | ✅ | ✅ |
| Bouton Jump to Recipe | ✅ | ✅ |

---

## Plan d'action priorisé

### Semaine 1 — Critique
1. [ ] Fix JSON-LD SSR rendering (les 2 pages)
2. [ ] Fix meta description dans `<head>`
3. [ ] Corriger les 2 liens internes cassés
4. [ ] Remplacer `<placeholder>` par l'URL image réelle

### Semaines 2-3 — Élevé
5. [ ] Nettoyer les slugs (supprimer #78, #79 → reclaim `piccata-for-two`)
6. [ ] Ajouter nutrition.calories au schema
7. [ ] Ajouter aggregateRating au schema
8. [ ] Expand Salmon +500 mots
9. [ ] Alt text descriptif pour les 2 hero images

### Mois 2 — Moyen
10. [ ] Fix H2 dupliqués
11. [ ] Restructurer les cards footer (<h3>)
12. [ ] Créer llms.txt
13. [ ] Vérifier les pages `?cluster=`
