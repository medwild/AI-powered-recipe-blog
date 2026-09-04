# Pinterest Analytics — Fenêtre 14/08 → 04/09 + réalités GSC (funnel complet)

> Source : `Pinterest Analytics overview 20260814-20260904.csv` (export manuel, compte `cookwithaugustin`) + API GSC `sc-domain:chefaugustin.com` (Search Analytics, lecture seule, interrogée le 04/09 via `scripts/_gsc-traffic.mjs`).
> ⚠️ Le CSV Pinterest indique lui-même : **« Data starting from 2026-09-02 is an estimate that gets adjusted as it's verified over time »** → re-vérifier vers le 10-12/09.

## 1. Impressions Pinterest : décollage réel, mais sur 3 jours estimés

| Fenêtre | Impr/jour | Total |
|---|---|---|
| 14–25/08 | ~57 | 679 |
| 26/08–01/09 | ~253 (×4,5) | 1 772 |
| **02–04/09 (ESTIMÉ)** | **~1 549 (×27 vs mi-août)** | **4 647** |

- Le pic démarre le **02/09**, soit ~24 h après la publication du **pin 19 (Copycat Texas Roadhouse, board Romantic, 01/09 22:30)**.
- Top pin du CSV : 1 401 impr (« From you ») ≈ top board Romantic : 1 614 impr → le pic passe par ce pin/cette board. **Inférence forte, identification exacte non vérifiée** (pages de pins inaccessibles en fetch : `1127518456806618286`).
- 2ᵉ pin : `461548661836035689` (851 impr, source « From you + Not from you ») = très probablement le steak Romantic (651 impr au 29/08 → 851 au 04/09), toujours dopé par des repins de tiers.

## 2. Le funnel Pinterest (3 semaines, top 10 boards)

**~2 850 impressions → ~85 pin clicks (3 %) → 22 outbound clicks (0,8 %)**

| Board | Impr | Saves | Save rate | Outbound | Outbound/impr |
|---|---|---|---|---|---|
| Romantic Dinner Ideas for Two | 1 614 | 36 | **2,2 %** | 3 | 0,19 % |
| Small-Batch Desserts for Two | 607 | 2 | 0,3 % | 14 | **2,3 %** |
| Quick Weeknight | 173 | 0 | — | 3 | 1,7 % |
| (8 autres boards) | <110 chacune | ~0 | — | 2 au total | — |

### Lecture (mécanisme confirmé par `data/pinterest-content-graph-research.md`, vérifié 10/07)

- **Saves = moteur de distribution** (Pixie WWW 2018 : chaque save déclenche la diffusion du pin aux utilisateurs similaires ; TransAct V2 CIKM 2025 : repin volume = métrique de succès). Le Romantic pin à 2,2 % de save rate est *structurellement* boosté par l'algo → c'est ce qui explique les 1 614 impr et le pic du 02/09.
- **Piège recettes** : les users « sauvegardent pour plus tard » au lieu de cliquer → reach + saves élevés, clics quasi nuls (Romantic : 3/1614).
- **Le board desserts prouve que l'outbound est atteignable** (2,3 %) mais sur d'autres formats/intentions.
- KPI à suivre désormais : **outbound clicks/jour** (objectif court : >5/j tenu une semaine), pas les impressions.

### Actions dérivées
1. Reproduire le profil « save-magnétique » (close-up, overlay lisible descriptif, promesse à-faire-plus-tard) sur les boards faibles.
2. Tester des variants qui transforment le save en clic : question posée au moment du feed (« what's for tonight? »), info présente uniquement sur la page (temps total, liste de courses, imprimable).
3. Mesurer save-rate et outbound/impr par pin, répliquer les gagnants.
4. ⛔ Ne PAS faire d'échanges de saves / pods / repins automatisés (zone spam policy). Sauvegarder le contenu d'autrui n'est PAS un levier de croissance (vieux playbook mort) — seulement un fond de curation ≤20 % pour la cohérence des boards.

## 3. GSC — réalité organique (à ne pas confondre avec Pinterest)

- **28 j (05/08 → 01/09) : 6 clics / 1 115 impr / CTR 0,5 % / pos. moy. 53.** Période précédente : 2 clics / 948 impr (pos. 14 = artefact de la requête de marque).
- Trend hebdo **plat depuis 6 semaines** : 502 → 350 → 398 → 218 → 251 → 301 impr/sem.
- Top requêtes non-marque : presque tout en **pos. 56–92** (« 2 person meals » 84, « beef dinner recipes for two » 56…). Seuls signaux : « simple dinner ideas » pos. 9,5 et « 30 minute dinner ideas for two » pos. 28.
- Verdict : le bottleneck SEO est **l'autorité du domaine (2 mois, ~0 backlink de qualité)**, pas l'on-page (tout vérifié : 100 % indexation, schema, cannibalisation résolue). Ne pas juger le SEO sur GSC avant ~6 mois ; les clics Pinterest n'apparaissent pas dans GSC (ne pas croiser les deux courbes).

## 4. Prochaine mesure

- **~10-12/09** : re-exporter le CSV → confirmer/informer le pic estimé 02-04/09 + verdict pilote vidéo (slot 12-15/09, inchangé).
- Vérifier côté **GA4/sessions site** si les ~22 outbound se retrouvent bien en sessions (cohérence funnel).
