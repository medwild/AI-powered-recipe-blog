# FREE_TIER_BASELINE — Chef Augustin (Phase 0A)

Relevé strictement en **lecture seule** effectué avant toute modification de la production ou bascule statique.  
Ce document sépare rigoureusement les **quotas officiels vérifiés**, les **mesures réelles observables localement** et les **valeurs introuvables depuis cet environnement** (sans aucune estimation inventée).

---

## 1. Neon PostgreSQL — Quotas officiels vs Mesures réelles

### A. Quotas officiels vérifiés (Offre Free Tier Neon, par projet)

| Ressource | Limite officielle Free Tier | Comportement en cas de dépassement |
| :--- | :--- | :--- |
| **Stockage SQL** | **`1 Go`** / projet (`20 Go` au niveau compte) | Blocage des écritures ; aucune facturation automatique |
| **Calcul (Compute)** | **`100 CU-heures / mois`** / projet (scale-to-zero après `5 min` d'inactivité) | Suspension du compute jusqu'au cycle suivant ; aucune facturation automatique |
| **Transfert réseau sortant (Egress)** | **`5 Go / mois`** / projet | Suspension jusqu'au cycle suivant ; aucune facturation automatique |
| **Branches** | **`10` branches** / projet | Création bloquée au-delà de 10 branches |

### B. Mesures réelles relevées en base (Lecture seule SQL — PostgreSQL 18.7)

| Métrique mesurée | Valeur réelle relevée | Part du Free Tier |
| :--- | :--- | :---: |
| **Taille totale de la base** | **`10 Mo`** (`10 944 512` octets) | **~1,02 %** de `1 Go` |
| **Table `recipes` (total relation + index)** | **`1 608 ko`** (`1 646 592` octets) pour **`59` lignes** (~`27,9 ko`/ligne) | `0,15 %` de `1 Go` |
| **Contenus publiés — Recettes** | **`52` recettes** (charge utile texte/JSON ~`1 086 ko`) | — |
| **Contenus publiés — Articles** | **`1` article** (`guides`, charge utile ~`23 ko`) | — |
| **Contenus non publiés — Brouillons (`draft`)** | **`6` brouillons** (charge utile ~`63 ko`) | — |
| **Table `pipeline_errors`** | **`192 ko`** (`79` lignes) | `0,02 %` |
| **Table `pin_analytics`** | **`128 ko`** (`0` ligne) | `0,01 %` |
| **Table `pin_drafts`** | **`80 ko`** (`0` ligne) | `< 0,01 %` |
| **Table `recipe_ratings`** | **`64 ko`** (`9` votes répartis sur `7` recettes) | `< 0,01 %` |
| **Table `project_config`** | **`48 ko`** (`1` ligne) | `< 0,01 %` |
| **Table `self_improvement_logs`** | **`48 ko`** (`0` ligne) | `< 0,01 %` |
| **Table `internal_link_logs`** | **`40 ko`** (`0` ligne) | `< 0,01 %` |
| **Tables auth/migrations (`user`, `session`, `account`, etc.)** | **`224 ko`** cumulés (`0` ligne dans chaque table) | `0,02 %` |

### C. Valeurs Neon introuvables depuis cet environnement

| Métrique | Statut | Raison exacte & Méthode de relevé requise |
| :--- | :---: | :--- |
| **CU-heures consommées (`compute_time_seconds`, `active_time_seconds`)** | **Non vérifiable localement** | `NEON_API_KEY` est absent de `.env.local` et de l'environnement. À relever dans la **console Neon** (*Project → Monitoring / Usage*) ou via `GET https://console.neon.tech/api/v2/projects/{project_id}` avec une clé API en lecture seule. *(Note : sur Neon Free Tier, les endpoints `/consumption_history/*` ne sont pas disponibles.)* |
| **Transfert réseau sortant cumulé (`data_transfer_bytes`)** | **Non vérifiable localement** | Même cause (`NEON_API_KEY` absent). À relever dans la console Neon ou `GET /projects/{project_id}`. |
| **Nombre exact de branches actives sur le projet Neon** | **Non vérifiable localement** | Même cause (l'introspection SQL ne voit que la branche courante). À vérifier dans la console Neon (*Branches*). |

---

## 2. Cloudinary — Quotas officiels vs Mesures réelles & Inventaire

### A. Quotas officiels vérifiés (Offre Free Plan Cloudinary)

| Ressource | Limite officielle Free Plan | Règle d'équivalence |
| :--- | :--- | :--- |
| **Pool mensuel global** | **`25 crédits / fenêtre glissante de 30 jours`** | Limite souple ; aucune facturation automatique (risque de throttling en cas d'abus durable) |
| **Stockage géré** | Partagé dans le pool | `1 Go` = `1 crédit` |
| **Transformations** | Partagé dans le pool | `1 000` transformations = `1 crédit` |
| **Bande passante CDN** | Partagé dans le pool | `1 Go` délivré = `1 crédit` |
| **Rate limit Admin API** | `500` requêtes / heure | Applicable aux scripts de relevé `/usage` |

### B. Mesures réelles observables dans la base et le code source

| Élément observé | Valeur réelle relevée |
| :--- | :--- |
| **Cloud name actif** | `dpgm5gata` (observé dans les URLs publiques `res.cloudinary.com`) |
| **Images Hero publiées en base Neon** | **`53`** (`52` recettes + `1` article publiés ; `0` manquant) |
| **Images Hero sur brouillons en base** | **`3`** (sur `6` brouillons ; `3` sans image) |
| **`public_id` Hero distincts en base** | **`56`** |
| **URLs Cloudinary intégrées dans `content_markdown`** | **`15`** URLs relevées |
| **Lignes en base avec `image_variants` non vide** | **`14`** lignes |
| **URLs Cloudinary codées en dur dans le codebase** | **`12`** (`11` hubs de collection + `1` image fallback hero d'accueil `hero-kitchen.png`) |
| **Largeurs demandées actuellement par le frontend** | **4 largeurs disparates** (`w_200`, `w_800`, `w_900`, `w_1200`) + ré-optimisation proxy `next/image` (`deviceSizes`: `384..1536`, `imageSizes`: `16..256`) |
| **Chaîne de transformation injectée à l'upload** | `f_auto,q_auto` |

### C. Valeurs Cloudinary introuvables depuis cet environnement

| Métrique | Statut | Raison exacte & Méthode de relevé requise |
| :--- | :---: | :--- |
| **Crédits consommés sur 30 jours glissants (`credits.usage`)** | **Non vérifiable localement** | `CLOUDINARY_API_KEY` et `CLOUDINARY_API_SECRET` sont absents de `.env.local`. À relever dans le **Cloudinary Dashboard** (*Reports / Usage*) ou via `GET https://api.cloudinary.com/v1_1/dpgm5gata/usage`. |
| **Stockage exact occupé (octets / Go)** | **Non vérifiable localement** | Même cause (requiert Admin API authentifiée). |
| **Transformations consommées sur 30 jours** | **Non vérifiable localement** | Même cause (requiert Admin API authentifiée). |
| **Bande passante CDN consommée sur 30 jours** | **Non vérifiable localement** | Même cause (requiert Admin API authentifiée). |
| **Nombre total d'objets stockés (incluant éventuels orphelins)** | **Non vérifiable localement** | Seules les URLs référencées en base et dans le code sont observables sans Admin API `/resources/image`. |

---

## 3. Observations d'architecture issues du relevé Phase 0A

1. **Conformité stockage Neon** : avec **`10 Mo`** (`~1,02 %` de `1 Go`), le stockage Neon dispose d'une marge très importante ; la priorité Neon est donc le **compute (CU-heures)** et le **transfert réseau**, aujourd'hui maintenus éveillés par le runtime public SSR/ISR.
2. **Anomalie de dates publiées détectée en base** : **`2`** recettes publiées (`stuffed-peppers-for-two` et `one-pan-breakfast-sandwich-for-two`) ont `published_at = NULL` en base ; le schéma d'export statique doit accepter `publishedAt: string | null` sans inventer de date.
3. **Standardisation Cloudinary prête pour la phase statique** : l'unification future de `cloudinaryUrl()` sur un jeu fermé (`400`, `800`, `1200`) et la suppression du double passage `/_next/image` nécessiteront ensuite un relevé réel via `/usage` avant toute conclusion sur `q_auto` vs `q_auto:good`.
4. **Absence de secrets dans l'environnement local** : seul `DATABASE_URL` est configuré localement dans `.env.local` ; aucune clé IA, Cloudinary ou Neon API n'est présente dans ce poste de développement.
