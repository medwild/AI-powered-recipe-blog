# 📘 Facebook — TO-POST (source de vérité du canal)

> ⛔ Règle 11/08 (héritée Pinterest/TikTok) : ne JAMAIS deviner un détail de post — lire ce fichier.
> Canal ouvert 03/09 (pilote breakfast sandwich). Page pro existante (confirmation utilisateur 03/09). Pas de spec dédiée à ce jour — règles héritées de `docs/superpowers/specs/2026-09-02-tiktok-strategy-design.md` §3/§5/§6.
> Rôles : assistant = briefs / captions / mesure ; utilisateur = page, upload, posting.

> 🇬🇧 **100 % ANGLAIS** (caption, overlays déjà dans le rush).
> 🎞️ **CODEC** : mêmes fichiers que TikTok (H.264 + faststart, sonder via `node scripts/_probe-mp4.mjs`).
> 🔗 **UTM systématique** : `?utm_source=facebook&utm_medium=social` — lien en premier commentaire épinglé ET dans la caption (la portée link-in-caption est faible en 2026, le commentaire reste le chemin principal).
> 🔁 **Cross-post** : Reels = le rush 9:16 natif TikTok, sans re-montage. Publier TikTok d'abord, Reels le même jour ~1 h après (éviter la fingerprint simultané).

---

## ⚙️ Configuration de la page (à vérifier dans l'app — 1ʳᵉ passage)

- [ ] Nom de la page + @handle exacts → notés : … (à reporter ici — source de vérité)
- [ ] Photo de profil : logo master `repports/logos-master-2026-08-12/`
- [ ] Bio/À propos : alignée sur TikTok (`French-style dinners for 2 🍳 …`) → noter le texte exact une fois saisi
- [ ] Onglet « Links » / bouton CTA vers le site activé ? → réponse : …
- [ ] Modération/coms désactivés ou non → réponse : …

## 📊 Baseline J0 (noter AVANT le premier post)

| Métrique | Valeur | Date |
|---|---|---|
| Abonnés page | | |
| Vues Reel #1 @ D+7 | | ~14/09 |
| Sessions GA4 `utm_source=facebook` (semaine 1) | | ~11/09 ⚠️ segment à créer avec celui de GA4 TikTok |

---

## 🔁 Chaîne à suivre à CHAQUE post

1. Upload Reel (même mp4 que le TikTok du jour, nom de fichier anglais) ;
2. Caption = celle du brief (1ʳᵉ ligne = keyword) ;
3. **Commentaire épinglé** = lien UTM `?utm_source=facebook&utm_medium=social` ;
4. Cocher `[x] posté` (l'utilisateur annonce, l'assistant coche + commit) ;
5. Analytics D+7 dans la baseline.

---

## 🎬 REELS-1 — One-Pan Breakfast Sandwich for Two (07/09) — PILOTE

- Rush : **même mp4 que TIKTOK-5** (`docs/tiktok/TO-POST.md` — structure, hook, money shot et verrou d'intégrité décrits là-bas) | watermark : [ ] vérifié NON
- **Caption** : One pan breakfast sandwich for two — the EGG-FLIP method, 17 minutes 🍳 Full recipe in the comments. #breakfastsandwich #onepanmeals #breakfastfor2
- **Pinned comment** : https://www.chefaugustin.com/recipes/one-pan-breakfast-sandwich-for-two?utm_source=facebook&utm_medium=social
- Créneau : DIM 07/09 ~00:00 (soit ~1 h après le TikTok de 23:00) — à confirmer selon l'audience US de la page | Statut : [x] briefé → [ ] posté → [ ] analytics D+7
- 🔬 Ce Reel entre dans le **verdict pilote J+7 (11/09)** : critère = engagement croisé des 3 canaux sur ce rush (vues Reels + vues TikTok + clicks pin) vs médiane des contenus vidéo publiés 24/08-06/09. Positif → hub « Breakfast for Two » (2-3 recettes + board) ; neutre → la fiche reste, aucune suite.
