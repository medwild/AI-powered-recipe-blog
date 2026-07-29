# Règles globales — À lire avant TOUTE modification

> **Ces 15 règles s'appliquent à toute tâche, sans exception.**
> En cas de conflit avec une autre règle, ce fichier prime.

---

## NEVER — Règles absolues

### 1. Ne jamais créer de route catch-all dynamique
- `[category]`, `[...slug]`, `[param]` — toute route qui matche des segments arbitraires
- Toujours utiliser des **routes explicites** (`/techniques`, `/guides`, etc.)
- Référence : `.claude/rules/routing-seo.md` §1

### 2. Ne jamais retirer un filtre `content_type` d'une query publique
- Toute query qui alimente une page publique DOIT filtrer par `content_type`
- `getRecipeBySlug()` → `WHERE content_type = 'recipe'`
- `getArticleBySlug()` → `WHERE content_type = 'article'`
- Sans ce filtre : un article servi comme recette → `/recettes/{article-slug}` → 404
- Référence : `.claude/rules/routing-seo.md` §2.2

### 3. Ne jamais utiliser le mauvais composant card
- `RecipeCard` → UNIQUEMENT pour `content_type = "recipe"` → href `/recettes/{slug}`
- `ArticleCard` → UNIQUEMENT pour `content_type = "article"` → href `/{category}/{slug}`
- Inverser les deux → liens cassés → 404 utilisateur
- Référence : `.claude/rules/routing-seo.md` §6

### 4. Ne jamais truncate mécaniquement un meta title
- `substring(0, 57) + "…"` est un **fallback**, pas la règle
- L'Editor doit réécrire naturellement sous 60 chars
- Référence : `.claude/rules/routing-seo.md` §3.5

### 5. Ne jamais ajouter un claim santé sans source vérifiable
- Claims bloqués automatiquement : probiotics, digestibility, gut health, immune boost, detox, anti-inflammatory, fat-burning
- Le ContentValidator les bloque avant publication
- Référence : `.claude/rules/routing-seo.md` §3.3

### 6. Ne jamais remplacer un élément de la stack
- Framework : Next.js 16 App Router
- ORM : Drizzle (pas Prisma, pas Knex)
- Styling : Tailwind CSS 4 + shadcn/ui
- Background jobs : N/A (plus utilisé)
- DB : Neon PostgreSQL
- Référence : `CLAUDE.md` Stack

### 7. Ne jamais exposer une variable d'env côté client
- `DATABASE_URL`, `*_API_KEY`, `*_SECRET*`, `DASHBOARD_SECRET_TOKEN` → SERVER ONLY
- Les variables exposées au client sont dans `NEXT_PUBLIC_*`
- Référence : `.claude/rules/security.md`

### 8. Ne jamais commit, log, ou exposer un secret
- Pas de `.env.local` dans git
- Pas de `console.log(process.env.DATABASE_URL)`
- Pas de clé API dans le code source
- Référence : `.claude/rules/security.md`

### 9. Ne jamais désactiver TypeScript ou ESLint pour faire passer du code
- Pas de `// @ts-ignore`, `// @ts-expect-error`, `as any`
- Pas de `eslint-disable`
- Si le code ne compile pas, le corriger — pas le supprimer
- Référence : `.claude/rules/karpathy.md`

### 10. Ne jamais modifier le schema DB sans backup explicite
- `drizzle-kit push` applique directement — pas de rollback
- Pas de `DROP TABLE` ou `DROP COLUMN` sans backup
- Nouvelles colonnes : `nullable` ou `.default()` obligatoire
- Référence : `.claude/rules/database.md`

### 11. Ne jamais ajouter de dépendance sans justification documentée
- La tâche ne peut PAS être résolue avec les dépendances existantes
- La dépendance est activement maintenue
- Elle n'ajoute pas de poids inutile au bundle
- Expliquer le choix dans le commit message
- Référence : `.claude/rules/karpathy.md` §2

### 12. Ne jamais refactorer du code non lié à la tâche
- Modifications chirurgicales : toucher uniquement ce qui est nécessaire
- Ne pas "améliorer" le code adjacent, les commentaires, le formatage
- Si un refacto plus large semble nécessaire : expliquer pourquoi, proposer un plan, **ne pas exécuter sans approbation**
- Référence : `.claude/rules/karpathy.md` §3

### 13. Ne jamais générer de fausses credentials auteur
- Pas de "French-trained baker" si le persona est fictif
- Pas de "tested 200+ times" sans log de test réel
- Pas de "20 years of experience" sans source vérifiable
- Le persona Chef Augustin est un persona de marque — rester transparent
- Référence : `.claude/rules/routing-seo.md` §3.1, `skills/agent-writer.md` §7.5

---

## Avant chaque modification — Checklist rapide

- [ ] Ai-je lu le fichier rules correspondant à la zone que je touche ?
- [ ] Suis-je en train de modifier un fichier listé dans `routing-seo.md` §9 (fichiers clés) ?
- [ ] Ma modification respecte-t-elle les 15 NEVER ci-dessus ?
- [ ] Si ma modification touche le routing : `curl /articles/test` doit rester 404
- [ ] Après modification : `npx tsc --noEmit` doit passer

---

## Fichiers rules — Ordre de priorité

1. **`global.md`** (ce fichier) — règles absolues, prime sur tout
2. **`routing-seo.md`** — architecture de routing, SEO, content_type
3. **`security.md`** — secrets, auth, validation
4. **`database.md`** — schema Drizzle, queries
5. **`api.md`** — conventions API routes
6. **`frontend.md`** — composants, App Router, styling
7. **`karpathy.md`** — qualité de code, simplicité
8. **`accuracy.md`** — honnêteté intellectuelle, ne pas inventer
