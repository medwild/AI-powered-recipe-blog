# Audit Visuel — www.chefaugustin.com — 2026-08-08

**Pages auditées** : homepage + /recipes/chocolate-lava-cakes-for-two
**Viewports** : desktop 1280x800, mobile 375x812 (+ dark mode desktop)
**Méthode** : Playwright (Chromium 138, build Nix — le bundle claude-seo échouait sur libglib manquant, contourné via `executable_path` du chromium Nix + venv claude-seo). Captures viewport-only + sondes DOM (CLS, overflow, images cassées, tap targets, contraste canvas, elementFromPoint, console).
**Captures** : `www.chefaugustin.com-audit/screenshots/2026-08-08/` (home_desktop.png, home_mobile.png, recipe_desktop.png, recipe_mobile.png, home_desktop_dark.png, home_desktop_toggled.png + .jpg) et `visual-metrics.json` (données structurées).

---

## Findings

### [Critical] Bannière cookies recouvre le CTA principal sur mobile (homepage)
- **Preuve** : `screenshots/2026-08-08/home_mobile.png` + sonde Playwright. CTA « Browse all recipes » : rect y708-744 ; bannière cookies : y699-796. `elementFromPoint(centre CTA)` → paragraphe de la bannière. **Click réel à (187,726) → navigation vers `/privacy`** (le lien « Read our Privacy Policy » de la bannière), pas vers /recipes.
- **Impact** : sur mobile, le CTA principal de la homepage est inutilisable — le tap envoie l'utilisateur sur la page Privacy Policy. Mobile = majorité du trafic recettes.
- **Recommandation** : empêcher le chevauchement du bandeau consentement (padding-bottom du hero = hauteur du bandeau, ou positionnement absolu correct). Vérifier que la bannière n'intercepte jamais les liens en `elementFromPoint` sur tous les breakpoints. Écrire un test de non-recouvrement CTA/bannière.

### [High] Titre de recette sous la ligne de flottaison sur desktop
- **Preuve** : `screenshots/2026-08-08/recipe_desktop.png` + inventaire DOM : image hero y134-1236 (**1102px de haut**), H1 « Molten Chocolate Lava Cakes for Two (25-Minute Dessert for Two) » à y1253-1365 (viewport = 800px). Boutons Save / Jump to Recipe / Print / Cook Mode également sous la ligne de flottaison. Seul lien visible : « Jump to Recipe » dans la nav (y16-48).
- **Impact** : sur desktop, le titre de la recette (élément H1) n'est pas visible sans scroll ; l'utilisateur atterrit sur une image géante. UX dégradée, signal de pertinence faible au-dessus de la ligne de flottaison.
- **Recommandation** : plafonner la hauteur du hero (max ~480-560px, ratio ~2.4:1), faire remonter le H1 + boutons d'action au-dessus de la ligne de flottaison (motif standard recette : breadcrumb + titre + meta + image).

### [Medium] Bannière cookies recouvre le contenu en bas de viewport (mobile recette + desktop)
- **Preuve** : `screenshots/2026-08-08/recipe_mobile.png` — la bannière (y699-796) recouvre le heading « Why This Recipe Works » (y695-711) et le paragraphe d'intro (y715-783) ; `elementFromPoint` confirme que la bannière est au-dessus. Desktop : homepage y744-784 recouvre partiellement le paragraphe d'intro (y694-876) ; recette : recouvre le bas de l'image hero.
- **Recommandation** : padding de fin de page / de hero égal à la hauteur du bandeau ; tester les 4 combos page×viewport en `elementFromPoint` avant release.

### [Medium] Script Vercel Insights mort : 404 + blocage MIME (chaque page, chaque viewport)
- **Preuve** : erreurs console collectées dans `screenshots/2026-08-08/visual-metrics.json` (8 entrées, 4 combos) : `https://www.chefaugustin.com/_vercel/insights/script.js` → 404, « Refused to execute script … MIME type ('text/html') is not executable ».
- **Cause probable** : résidu d'injection Vercel Analytics après migration Hostinger (le site ne tourne plus sur Vercel, cf. notes infra).
- **Recommandation** : retirer le composant/script Vercel Analytics du code (rechercher `@vercel/analytics` / `_vercel/insights`), re-vérifier console propre.

### [Medium] Aria-label en français sur site anglais (bouton dark mode)
- **Preuve** : sonde `theme_toggle_candidates` dans `visual-metrics.json` — bouton n°0 : `aria-label="Passer en mode sombre"` (site 100% anglais ; le label ne décrit pas non plus l'état actuel du thème).
- **Impact** : lecteurs d'écran anglais annoncent du français ; i18n incohérente.
- **Recommandation** : `aria-label="Toggle dark mode"` (ou `aria-pressed`/icône soleil-lune + libellé d'état).

### [Low] Tap targets sous 44px (boutons icônes)
- **Preuve** : `visual-metrics.json` `smallTargets` — hamburger mobile « Open menu » 40x40px (`h-10 w-10`), bouton thème desktop 36x36px, bouton « Accept » cookies 40px de haut.
- **Recommandation** : passer à `h-11 w-11` (44px) au minimum sur mobile ; le bouton thème desktop peut rester 36px (souris) mais 44px est préférable.

### [Low] Bannière cookies : chevauchement desktop homepage (texte)
- **Preuve** : `screenshots/2026-08-08/home_desktop.png` — bannière y744-784 sur paragraphe d'intro y694-876 (chevauchement ~40px, texte masqué). Aucun élément interactif touché sur desktop.
- **Recommandation** : incluse dans le fix du bandeau (voir Critical/Medium).

---

## Points validés (aucune action requise)

- **[Info] Above-the-fold desktop homepage OK** : H1 « Easy Dinners, Made for Two » (y177-297), sous-titre et CTA « Browse all recipes » (y477-513) visibles sans scroll.
- **[Info] Above-the-fold mobile OK (hors CTA masqué)** : H1 homepage y378-458 ; H1 recette y464-572, boutons Save/Jump/Print y588-616, Cook Mode y628-658.
- **[Info] Contraste excellent** : ratios canvas — texte courant 15.0:1, texte muted 8.2:1, cartes 15.6:1 (WCAG AAA). Palette `lab()` : fond crème rgb(253,250,244) / texte rgb(44,33,27).
- **[Info] Zéro CLS** : `window.__cls` = 0 sur les 4 combos (images sans width/height mais ratio CSS correct — aspect-ratio via CSS, pas de décalage).
- **[Info] Pas d'overflow horizontal** : scrollWidth = clientWidth sur les 4 combos.
- **[Info] Aucune image cassée** : 16 images (11 home / 5 recette), 0 en échec (`complete && naturalWidth===0`).
- **[Info] Pas de troncature texte** : 0 élément avec `text-overflow: ellipsis` + overflow caché.
- **[Info] Dark mode fonctionnel** : bouton thème présent ; clic → fond `lab(98.29…)` → `lab(3.67…)` (`home_desktop_toggled.png`) ; rendu initial `color-scheme: dark` OK (`home_desktop_dark.png`).
- **[Info] Navigation sticky** : header `sticky top-0 z-40`, lien « Jump to Recipe » présent dans la nav recette.

---

## Note méthodologique
L'outil Read ne rend pas les PNG/JPEG dans cet environnement (« Unsupported Image ») — l'analyse visuelle a été compensée par des sondes DOM exhaustives (bounding boxes, elementFromPoint, contraste canvas, CLS, console) + captures sauvegardées pour revue humaine. Captures desktop en devicePixelRatio 1 (1280x800), mobile en DPR 2 (750x1624 = 375x812@2x).
