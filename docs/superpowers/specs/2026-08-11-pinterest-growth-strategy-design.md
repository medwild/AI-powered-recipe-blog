# Design — Stratégie de croissance Pinterest 6 mois

> **Date** : 2026-08-11 · **Compte** : cookwithaugustin · **Contexte** : warm-up 18 pins en cours (11-15/08), site vérifié (rich pins), public Tier 1 (US/UK/CA/AU)
> **Status** : validé en brainstorming (approche A+B séquencée, hybride ads)

## 1. Objectifs & KPIs (séquencés trafic → audience)

| Phase | Période | Objectif | KPI de pilotage |
|---|---|---|---|
| Warm-up | 11-15/08 (en cours) | Établir cadence + fraîcheur du compte | 18 pins programmés (11/08 : 10/18) |
| Trafic | Mois 1-3 | Trafic blog depuis Pinterest | Clics/semaine + sessions (croissance hebdo relative — volumes faibles au départ, pas de cibles absolues avant le mois 2) |
| Audience | Mois 3-6 | Abonnés + engagement | Saves, followers, commentaires |

Principes de pilotage :
- Point **Pinterest Analytics hebdo** (impressions / saves / clics / CTR par pin)
- "Pin gagnant" = ratio saves/impressions **au-dessus de la moyenne du compte**
- Décisions (ads, recentrage) **data-driven uniquement**, jamais au ressenti

## 2. Contenu & cadence

### Sources de pins
- 46 recettes publiées × (1 pin héro + variantes d'angle via `lib/pin-variants.ts` — 4 angles/recette existants)
- Production d'images : Ideogram (coût ~1$/image, à budgeter)

### Formats (après warm-up)
| Format | Part | Rôle |
|---|---|---|
| Pins standards 2:3 avec URL | 70% | Trafic blog (objectif phase 1) |
| Vidéos (formats courts) | 15% | Portée organique |
| Idea pins (sans lien) | 15% | Audience (objectif phase 2) |

### Cadence & engagement
- **5-8 pins/jour** organiques (21h/sem disponibles)
- **30-60 min/jour d'engagement** : commentaires, repins de comptes voisins, suivis ciblés
- **Règle absolue** : chaque pin = **image unique** — jamais de doublon (risque n°1 de pénalité de portée)

### Saisonnalité
- Thanksgiving (fin nov) : pins de `thanksgiving-dinner-for-two` dès **octobre**
- Pic dîner US 16:30 ET conservé comme créneau de référence (22:30 Paris)

## 3. Outils & mesures
- **Pinterest Analytics** hebdo (dashboard natif)
- **UTM** : `utm_source=pinterest` (déjà dans le schema DB) → trafic réel suivi dans GSC
- **Ideogram** : variantes d'images (uniquement sur recettes à fort potentiel)
- **Ads 50-100€/mois** dès mois 2, **uniquement sur les pins gagnants**

## 4. Calendrier d'exécution

| Étape | Période | Actions |
|---|---|---|
| 1. Warm-up | S1-2 (11-15/08) | 18 pins programmés, tracker TO-POST.md à jour |
| 2. Volume organique | S3-6 | 5-8 pins/jour + variantes + engagement quotidien + point Analytics hebdo |
| 3. Ads & recentrage | Mois 2 | Top 2-3 pins identifiés → ads 50-100€/mois, volume recentré sur les angles gagnants |
| 4. Audience | Mois 3-6 | Idea pins + vidéos + saisonnier Thanksgiving (octobre) + objectif audience |

## 5. Risques & mitigations
| Risque | Mitigation |
|---|---|
| Pénalité spam (volume/duplication) | Images uniques à 100%, volume progressif |
| Coût Ideogram | Variantes seulement sur recettes à fort potentiel |
| Burnout manuel | Cadence ajustée aux 21h/sem ; pas d'automatisation (app PinScheduler reste FROZEN) |
| Ads inefficaces | Lancement uniquement sur pins gagnants prouvés, budget plafonné |

## 6. Hors périmètre (YAGNI)
- PinScheduler app (FROZEN — pas de réactivation)
- Multi-comptes / réseaux sociaux autres que Pinterest
- Contenu vidéo produit sur mesure (recyclage des images existantes seulement)
