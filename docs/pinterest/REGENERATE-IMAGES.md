# 🎨 Régénération des 2 images "Untitled" (pipeline cassé)

> **Problème** : `dessert-for-2` (Lava Cakes) et `creamy-mashed-potatoes-for-two` (Mashed Potatoes) pointent vers le MÊME fichier générique `Untitled-v0.png` (MD5 identiques vérifié 10/08).
> **Fix** : régénérer ces 2 images sur Ideogram/Canva, **ratio 2:3 (1000×1500)** — standard Pinterest, compatible héro blog (object-fit cover).

---

## IMAGE 1 — Chocolate Lava Cakes for Two (recette `dessert-for-2`)

**Style** : Dessert/Patisserie — riche & décadent (palette chocolat/caramel/or)

**Prompt Ideogram** (copier-coller, style AUTO, ratio 2:3) :

```
two molten chocolate lava cakes baked in small white ramekins, glossy molten chocolate center spilling out onto the plate, dusted with powdered sugar, a single fresh raspberry on the plate. dark walnut countertop, soft linen napkin. Slightly angled 45-degree shot, f/2.8, shallow depth of field. warm golden-hour backlight glow, side rim light, 3000K. Moisture and texture: glossy molten center catching the light, sugar dusting, silky ganache drip. Canon EOS R5, 85mm, f/2.8, ISO 400. deep chocolate #4B3621, caramel gold #C49A2C, warm cream #F5EFE0. No text, no labels, no logos, no watermarks, no hands, no fingers, no human limbs, no silverware visible.
```

**Enregistrer sous** : `lava-cakes-for-two.png`

---

## IMAGE 2 — Creamy Mashed Potatoes for Two (recette `creamy-mashed-potatoes-for-two`)

**Style** : Comfort Food — cozy, chaleureux

**Prompt Ideogram** (copier-coller, style AUTO, ratio 2:3) :

```
creamy mashed potatoes in a rustic ceramic bowl, a pat of melting butter on top glistening, fresh chives sprinkled, wooden farmhouse table with linen napkin. Slightly angled 45-degree shot, f/2.8, shallow depth of field. warm ambient kitchen light, soft fill, 3000K. Moisture and texture: silky smooth potatoes, glossy melting butter, subtle steam. Canon EOS R5, 85mm, f/2.8, ISO 400. warm cream #F5EFE0, golden butter #E8B04B, herb green #4A7C3F. No text, no labels, no logos, no watermarks, no hands, no fingers, no human limbs, no silverware visible.
```

**Enregistrer sous** : `mashed-potatoes-for-two.png`

---

## 🔧 Workflow

1. **Générer** sur Ideogram (ratio 2:3, style AUTO) ou Canva (1000×1500)
2. **Enregistrer** les 2 fichiers : `lava-cakes-for-two.png` + `mashed-potatoes-for-two.png`
3. **Uploader vers Cloudinary** (upload via le dashboard Cloudinary, ou me donner les fichiers et je m'en occupe)
4. **Me donner les URLs Cloudinary finales** → je mets à jour la DB (script prêt) + le TO-POST.md

> ⚠️ Les 44 autres images sont uniques et correctes (audit MD5 10/08) — seules ces 2 sont concernées.
