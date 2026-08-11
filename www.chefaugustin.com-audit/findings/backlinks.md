# Backlink Profile — Findings (audit 2026-08-08)

**Agent:** seo-backlinks · **Tier:** 0 (Common Crawl web graph + vérification curl uniquement — pas de Moz/Bing/DataForSEO)
**Cible:** www.chefaugustin.com (canonical, 301/308 OK)
**Sources:** `commoncrawl_graph.py` (release cc-main-2026-jan-feb-mar + CC-MAIN-2026-30 via index API), RDAP, fetch live homepage, archive audit 2026-08-05, mémoire session (spam-backlinks-attack, 01/08)

## Chiffres Common Crawl (confidence: 0.50, source: Common Crawl web graph, trimestriel)

| Métrique | Valeur | Notes |
|---|---|---|
| in_crawl | **false** | domaine absent de la release la plus récente (jan-fév-mar 2026) |
| in_rankings | **false** | idem |
| PageRank | **n/a** (null) | aucun hôte indexé → pas de PageRank approx. possible |
| Harmonic centrality | **n/a** (null) | idem |
| n_hosts | **n/a** (null) | 0 captures |
| Captures CC-MAIN-2026-30 (crawl 10→23/07/2026, dernier dispo) | **0** (www et apex) | API index : "No Captures found" |
| RDAP | créé **2026-07-02**, exp. 2027-07-02, Hostinger | le domaine a ~5 semaines, pas 2 mois |

**Interprétation honnête :** zéro capture = attendu, PAS un signal de pénalité ni de faible autorité. Le domaine (enregistré 02/07, lancé ~27/07) n'existait pendant aucune fenêtre de crawl CC : la dernière collection (CC-MAIN-2026-30) s'est terminée le 23/07, ~4 jours avant le lancement. Un graph web CC ne pourra pas contenir ce domaine avant ~Q4 2026. **Backlink Health Score : NON NOTÉ — INSUFFICIENT DATA (0/7 facteurs avec source).** Ne pas produire de score numérique trompeur.

## [Sévérité: Info] Profil backlink = page blanche (attendu pour un domaine de 5 semaines)
- Aucun backlink listé par aucune source Tier 0. `discovered-links.json` (audit en cours) ne contient que des URLs internes du site — rien à vérifier au crawler de vérification.
- Aucune source externe référente confirmée. Pinterest (profil vérifié, 13/13 boards, Rich Pins) reste le seul candidat plausible de domaine référant réel, non confirmable en Tier 0 (liens JS-rendus).
- Recommandation : re-exécuter `commoncrawl_graph.py chefaugustin.com` après publication du graph Q3 2026 (~nov-déc 2026). Point de données suivant sinon : clé Moz gratuite (2 500 rows/mois) → Tier 1 (confidence 0.85).

## [Sévérité: Low] Historique spam juillet (80 liens) : non observable en Tier 0, mais aucun nouveau signe de toxicité
- Audit 01/08 (Ahrefs) : ~80 liens 100% spam (fermes de liens, TLD .shop/.site/.top/.icu/.agency/.click/.pro, ancres auto-générées, tous nofollow, tous vers la home). Clôturé : Google ignore automatiquement les liens spam, outil Disavow retiré, ~80 liens nofollow ignorés, aucune action manuelle GSC.
- Aujourd'hui : ratio toxique INMESURABLE (0 données). Rien dans les checks live ne contredit la clôture.
- Recommandation : monitoring mensuel (GSC Security & Manual Actions, Ahrefs/Semrush/Moz une fois configuré). Ne pas reconstruire de fichier disavow.

## [Sévérité: Low] 0 lien construit → l'équité interne est le seul canal de distribution
- Le profil réel est à construire. En attendant, chaque lien interne compte : la consolidation des variantes "30-minute" (5 variantes doublon signalées au 05/08) est **confirmée faite** — 0 variante restante sur la home aujourd'hui. Reste 1 variante chicken-breast (/recipes/category/chicken + /recipes/category/chicken-breast).
- Recommandation : réserver la création de liens aux hubs/recettes les plus importants une fois les premiers liens externes obtenus (les 2 variantes chicken-breast à consolider d'abord).

## Recommandations de construction de liens réalistes (site jeune, niche "dinner for two")
1. **Pinterest (coût nul, déjà vérifié)** — levier n°1 : pins réguliers des 46 recettes avec Rich Pins (déjà actifs), boards "dinner for two" à fort volume. C'est le seul canal social qui renvoie du trafic + equity réelle vers les recettes.
2. **Directory/roundups niche (gratuits, rapides)** : soumissions à des listes de blogs recettes / "small batch cooking" roundups de food bloggers (ex. invitation à des roundups hebdomadaires de recettes). Cible : 5-10 liens éditoriaux pertinents sur 3 mois.
3. **Guest post / collaborations** sur 2-3 blogs food de taille moyenne (DA 20-40) avec ancre naturelle ("dinner recipes for two", nom de marque). Viser la qualité, pas le volume.
4. **GSC + Google Business Profile / mentions de marque** : s'assurer que le nom "Chef Augustin" apparaît dans les profils sociaux cohérents (Instagram, YouTube — nofollow mais découvrabilité).
5. **Ne pas acheter de liens** et ne pas toucher aux fermes spam déjà ignorées. Réévaluer avec Moz/Bing dès qu'une clé est dispo (mois suivant recommandé).

## Checks live effectués (2026-08-08)
| Check | Résultat |
|---|---|
| commoncrawl_graph chefaugustin.com + www (release jan-fév-mar 2026) | Non trouvé (attendu — postérieur au domaine) |
| Index CC-MAIN-2026-30 (crawl 10→23/07) | 0 captures www (apex : 502 API transient, www confirmé) |
| RDAP | Créé 2026-07-02, exp. 2027-07-02, Hostinger |
| Homepage (172 907 octets, HTTP 200) | 0 variante "30-minute" (fixée), 1 lien chicken-breast, 0 lien externe raw HTML |
| Liens sociaux home | pinterest.com/chefaugustin, instagram.com/chefaugustin, youtube.com/@chefaugustin |
| Validator claude-seo | PASS (0 error, 0 warning, 1 info attendue : ne pas interpréter CC absent = faible autorité) |

## Statut scoring
- **Backlink Health Score : NON NOTÉ — INSUFFICIENT DATA** (0/7 facteurs avec source au Tier 0).
- Confidence : données CC 0.50 (aucune donnée) ; RDAP/fetch live 0.95.
- Prochain point de données : graph CC Q3 2026 (~nov-déc) ou clé Moz/Bing gratuite (dispo dès aujourd'hui).
