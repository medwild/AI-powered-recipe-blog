# CHEF AUGUSTIN — PUBLIC DEPLOYMENT MANIFEST (PHASE 3A)

**Date :** 2026-11-24  
**Source exportée :** `chef-augustin-public/`  
**Archive reproductible :** `chef-augustin-public-standalone.tar.gz`  
**SHA-256 de l'archive :** `cda9b984a8cf06475541983d830390b3db23fd17929b828ca2601b78b60cdd00`  
**Taille compressée :** 71,510,827 octets (~68.20 Mo)  
**Taille décompressée :** 73,114,423 octets (~69.73 Mo)  
**Nombre exact de fichiers inclus :** **147**  
**Dépôt & branche cible prévus (non créés / non poussés) :** `medwild/AI-powered-recipe-blog` → branche `deploy/public-standalone`

---

## 1. Contenu inclus & Exclusions garanties

### Inclus
- Code frontend public complet (`app/`, `components/`, `lib/`, `middleware.ts`)
- Dépendances verrouillées (`package.json`, `package-lock.json`, 173 paquets runtime/dev sans PostgreSQL ni IA)
- Configurations Next.js, TypeScript, Tailwind CSS v4 (`next.config.mjs`, `tsconfig.json`, `postcss.config.mjs`, `next-env.d.ts`, `.gitignore`)
- Snapshot JSON public déterministe (`data/public-content.json`, hash interne `8faad7fd79c41fbb956a3b6c26e9bfc6adba3bc7508fff696d31a8e18ff2a90b`)
- Ressources statiques `public/` (logos, icônes, vérifications Google/Bing, images collections)
- Scripts de validation (`scripts/public-snapshot-schema.ts`, `scripts/validate-public-snapshot.ts`, `scripts/validate-standalone.ts`)
- Procédure Hostinger standalone (`DEPLOY_STANDALONE.md`)

### Strictement exclus
- Studio privé (`app/dashboard`, `app/login`, `app/actions/*`, `app/api/auth/*`, `app/api/internal/*`, `app/api/recipes/generate`, `app/api/recipes/[id]/*`, `app/api/self-improvement/*`, `app/api/articles/raw*`)
- Couche base de données et agents IA (`lib/db/*`, `lib/queries.ts`, `lib/agents/*`, `lib/pipeline/*`, `lib/auth.ts`)
- Dépendances interdites (`pg`, `drizzle-orm`, `cloudinary`, `@google/genai`, `@anthropic-ai/sdk`)
- Secrets et fichiers d'environnement (`.env`, `.env.local`, `.env.production`, `.env.*`)
- Artefacts générés et caches (`node_modules/`, `.next/`, `out/`, `*.tsbuildinfo`)

---

## 2. Configuration Hostinger Node.js & Démarrage Standalone

À la racine de la branche dédiée `deploy/public-standalone` :

- **Runtime Node.js :** `22.x`
- **Variables requises côté Hostinger :** Aucune variable secrète (`DATABASE_URL`, Gemini, Cloudinary Admin et `DASHBOARD_SECRET_TOKEN` doivent rester **absents**). Seule `NEXT_PUBLIC_SITE_URL=https://www.chefaugustin.com` peut être définie en option.
- **Installation :**
  ```bash
  npm ci --include=dev
  ```
  *(Note importante vérifiée lors de la reproduction propre : `--include=dev` est requis si l'hôte de build exporte `NODE_ENV=production`, afin d'installer `typescript`, `tailwindcss`, `@tailwindcss/postcss`, `shadcn` et `tsx` nécessaires au build.)*
- **Vérification TypeScript & Build Standalone :**
  ```bash
  npx tsc --noEmit
  npm run build
  ```
  Le script `build` exécute `NODE_ENV=production next build --webpack`, puis `postbuild` copie `.next/static` → `.next/standalone/.next/static` et `public` → `.next/standalone/public`.
- **Contrôle qualité post-build :**
  ```bash
  npm test
  ```
- **Commande de démarrage Hostinger :**
  ```bash
  npm start
  ```
  (exécute `node .next/standalone/server.js`).

---

## 3. Inventaire complet & Empreintes SHA-256 (147 fichiers)

| Fichier | Taille (octets) | SHA-256 |
|---|---:|---|
| `.gitignore` | 231 | `8b6596896d9fdecf489625dede887216c42eca6c9405582368002b5bf2c18f89` |
| `DEPLOY_STANDALONE.md` | 1,318 | `9b7dd2e6afd80e8a197dfe1a207e92ad8e25682f432766d888442836c0b8b18d` |
| `app/about/page.tsx` | 8,205 | `a74e6c6c976d6cb969523fae9798732d7b90396e947f592a41ec2ada4dc01f05` |
| `app/api/recipes/pins/route.ts` | 2,136 | `32ee2a43ddd49ba39093fd0d4236dec3759dfe0603b50fdce0de23161a0f0cda` |
| `app/api/recipes/raw/[slug]/route.ts` | 1,300 | `a95fc933a57e7dd8e643a2862863945c9e94367aa756713406043a2d6d2379c3` |
| `app/api/recipes/raw/route.ts` | 1,061 | `2f80deb92c5ab832799d0760081e07112e60a45de0f71cdcf4947629a73845b6` |
| `app/apple-icon.png` | 34,690 | `031bbaf31914eb606d100956c3c9d12a4c5cdda7ddce5fe2f0fc5d0840b44b88` |
| `app/equipement/[slug]/page.tsx` | 1,151 | `4cb333f6641f4da6c68be5bdd76b7d3cdf83e2cef139ccae98e291418a1985c6` |
| `app/equipement/page.tsx` | 282 | `ed1d18f0f5e008b0967d2fcb9a1b9bb0e4f7cd0d735cacfc0ecdd8acd0d12784` |
| `app/error.tsx` | 1,367 | `a52c23b93dad7de964bf9b49406929c22de462d565a2d24f0d1f1fdf465aa896` |
| `app/favicon.ico` | 7,165 | `e2e90f1429bebf6c49db8c67e773b69c243ace0e816593cc469d6f8444749e02` |
| `app/feed.xml/route.ts` | 1,501 | `959b8747f29467b376739f588b28ffb680c0d8dde4b9f0c56c8ba420a03bbd84` |
| `app/globals.css` | 6,965 | `f99a6fe12cac57c13ce993e8c9d978451aa2d393d25b27d8514fce485f846448` |
| `app/guides/[slug]/page.tsx` | 2,089 | `b0fc1ee589e87b2e78d39899b8753b86b700832e95df34baa9e0afc5a5cd069c` |
| `app/guides/page.tsx` | 270 | `17ac2e1bdd530679c6f0f0bb75b7fd044819b2ad21e5faf250e03e912e90fa49` |
| `app/histoire/[slug]/page.tsx` | 1,141 | `28fd3fbc54d72e6ab2a31532c2fbf525513cb825a50026fca4cefd1c79ee5f5b` |
| `app/histoire/page.tsx` | 276 | `24e6cce906535a4649c128c20aa431a33b96f992c84c3535d686c7b6e8ce1f77` |
| `app/icon.png` | 6,622 | `667aa713b294b201eea64575f52a749d87bcce7ec1f0f7ed4fe58bbb0a61df42` |
| `app/idees/[slug]/page.tsx` | 2,079 | `f502da47ed08fbd3061323e59df688eb609f1c022e0fe36a62e1c8fc1a63635f` |
| `app/idees/page.tsx` | 267 | `cc0f99375ed44e2bd4e458764633e64dddcbe81c54aabcfdd600cf724fe06625` |
| `app/layout.tsx` | 3,558 | `95952e2ddf18c10a1bb2dbca5af17d8648206e7abad53399a2722b352082a3aa` |
| `app/llms.txt/route.ts` | 2,223 | `e580481332b2e59220a38e9f16902e52febd43974e31cba887396276f2cdb2a0` |
| `app/loading.tsx` | 1,934 | `a697da6f66905d461f81bcea4159269ebc21b91f7dea9d8f27f68b23e51d5289` |
| `app/manifest.ts` | 608 | `a6a58c3eceeb48ce773556add39d6653f753db9dee80f71718b7c2026f4a6e54` |
| `app/not-found.tsx` | 1,140 | `67c7fe7deadb1499390a93de7253f3b1a59da2e5c9b645d943b60821745aacba` |
| `app/page.tsx` | 4,565 | `6e6b5b3b4c29173ba58e09db339221a156d0407c8cc550ce7c83075ec60fdb69` |
| `app/privacy/page.tsx` | 7,490 | `1a8c959f653e9cac827ef51cccbc129afebd7d412de59e2dbd49f40ddc11d036` |
| `app/recettes/[slug]/route.ts` | 1,566 | `20293116125f5c9b5372b43074ee086d22cd1a8139d8346a98abe397b98db54a` |
| `app/recipes/[slug]/page.tsx` | 13,060 | `c4183048d11f13bb8d7c903011d7d7eb16af18b295a2456f47371ae70a8b7186` |
| `app/recipes/category/[slug]/page.tsx` | 24,060 | `3e2a013a151daf560e04bb7d64d1aff4e0a1a264a7251ad6e0acf1f5da965f26` |
| `app/recipes/collections/[slug]/page.tsx` | 8,941 | `a7f14503a6cb1538b3b87156deac412b43e4ea52f76d7d4c7273b7fe8d7d73eb` |
| `app/recipes/page.tsx` | 6,401 | `2126b16662971f1876fe608675080ed1128cd12d4e51aa40ac04887361c43b6b` |
| `app/robots.ts` | 806 | `2b9e13d252a34241c9475a941da2fc2e89a0f1ea74abd4cc5287843f7e2b5e59` |
| `app/sitemap.ts` | 3,558 | `f97a0d72cece2bb322eca782b2b1585892db200a4c9dab882c561cf8be526cee` |
| `app/techniques/[slug]/page.tsx` | 1,151 | `34e2e64fc7b857641c50956f842e922d6e4f55a1cd93f086afcaf91933c8284a` |
| `app/techniques/page.tsx` | 282 | `25cb6bc26f2b031b50ca12411ee94e185f836ee83f0a328dd494605dc05ba108` |
| `app/terms/page.tsx` | 8,357 | `1b16a187b0aa58be6c413e4ce4e54df29d9130f6d18ba2d21f7c0d429140fb58` |
| `components/article-card.tsx` | 2,684 | `c7e3ff50ae7015235f59f209b278ce6fc771d3f6b4a693f0bf4975d899db2b1a` |
| `components/article-detail.tsx` | 7,932 | `1f3a34c6442359370d2b55c779101e833f6ec192462cba9b2c2399359a83a53c` |
| `components/article/article-jsonld.tsx` | 3,196 | `69d95d1fd7c1a1ee82c04dc0307f69440c297d195dcc5ef2d4373c6db8dd51db` |
| `components/breadcrumbs.tsx` | 1,861 | `fda70034272ae9dd3a9aae0772dc452eac0b8d6c02bc736eb147dc5cdf67ad3d` |
| `components/category-listing.tsx` | 14,847 | `a1f0bde0f7ade3df560e5a53d89653d4cd6549f1bd959cfda143d76ea1edc9f0` |
| `components/cook-mode-toggle.tsx` | 2,480 | `eb5792f3abf2533a4b8db5f00f1442d3cd1b2dbf27896dcfcd0e4efe0580ac6b` |
| `components/cookie-banner.tsx` | 1,803 | `0fed540cb6ad916aa05fe7bf26c0878b4bd4c3aefad9e42f37e62ca9274064f7` |
| `components/dynamic-toaster.tsx` | 252 | `0d3a4c9b61db4e733750c157854e30c43630ba6ef5eb676a7a76e2b3321fff85` |
| `components/homepage/homepage-articles.tsx` | 864 | `7ac68408c1c53a74dbbb57ec8a5694d85d6a3dc5d2d414f7199f48341e65c4a5` |
| `components/homepage/homepage-categories.tsx` | 1,423 | `6a664a43b42e5a2f0a2a8beb1f29b116591549ad90c60bf1d30dd75e20b11c79` |
| `components/homepage/homepage-clusters.tsx` | 1,426 | `46668b6d555710baeb11ea257c46b0fa7ab51c96bca67f05decdc5d670f3a485` |
| `components/homepage/homepage-cta.tsx` | 945 | `a8192a0bccd5516a908829aa8a38e92ed0eba992fb0fc7ebf23317aaba3c4d43` |
| `components/homepage/homepage-featured.tsx` | 1,621 | `45decefa51324a348a4ab74271422971c03325c9daf8f4fd43177fe58074d9e4` |
| `components/homepage/homepage-hero.tsx` | 5,041 | `7a1ae53b0fc348b8eaa0f59be294cc53894e772d7d5ddf5d7beebb5a47ce30ea` |
| `components/homepage/homepage-jsonld.tsx` | 1,274 | `931ac136c26d54d80fb7508a34401a30edadef2b0dfd0e8526f9be7ea0cabfe7` |
| `components/homepage/homepage-start-cooking.tsx` | 1,975 | `ee1baf1bffad91e26a7a28e868d6827bbb9067e1ad9f56497a0624c748913113` |
| `components/homepage/homepage-stats.tsx` | 1,689 | `4f60c2b12fceafdc239a874b74013ed809912af21f0ca5b6a181a5daae88aa6b` |
| `components/hub-listing.tsx` | 3,182 | `d8ffb6230bdbf6b16f481357f1a4f087faeaeecbb6c5c3743ac3a28c92fd5d84` |
| `components/jump-to-recipe.tsx` | 4,077 | `3574b0de1cbbe7c6855a63731e97a3108ea12b1f3a6bc507c94da1edded74b96` |
| `components/markdown-renderer.tsx` | 809 | `30369a9f5059afa7e17487a4c3440431f361255e6abd7e9c9b143309c8ec907f` |
| `components/pin-button.tsx` | 1,439 | `b2f3349b188850f3062ea7361686783f4fd3d4e02db0dba7ef7a9d7bb1622143` |
| `components/react-markdown-content.tsx` | 3,051 | `5d4c387b3a23fdec85b33f4183808d640bb3c6c66fc61bbd604d621d9b27162d` |
| `components/recipe-action-bar.tsx` | 2,848 | `f50fe5cd9d0519c07dd3ed3bd0fb57fdb2f30bcab3adfe29ffc812f878f6c879` |
| `components/recipe-article-body.tsx` | 4,022 | `4a9af69f3422d37bb88a202d8b1fe5af4ba680af34a23a01da82b4b98b3e6f3f` |
| `components/recipe-article.tsx` | 3,033 | `12d348fee68d57a3dc8b750cb9c1a728d8dfa92184ff1558fe0a4d5ee25e7218` |
| `components/recipe-card.tsx` | 2,983 | `74021bc9920eebb372d817850c9db63446beb5d6706be94d1bc712b9d86966f2` |
| `components/recipe-grid.tsx` | 1,795 | `cff0029563262f18b1f1ee453bdd07f0291d16fde728f0d6c89c7b8cdd75548d` |
| `components/recipe-hero.tsx` | 13,365 | `ce3da0327640b52f4a16a5b395117534042322092fd36cd2f91a60efc70422ba` |
| `components/recipe-index.tsx` | 2,422 | `b1cc9a2e11cfb5adb592d37b7e70c85e80d61c1e1bad419c464d93e9898990c8` |
| `components/recipe-ingredients.tsx` | 3,227 | `96542785bb04feb79cd5a92abd16e1ef49883b8b189d84668453d894d32587ff` |
| `components/recipe-instructions.tsx` | 1,661 | `5a40378a77c8b22003f36bfacebb853596147d381caebcadddc176bf4e119239` |
| `components/recipe-meta-bar.tsx` | 1,895 | `29ead549d2b1daffd16624880697f45a51653e6bb64ee8096639b73a1ff76e9f` |
| `components/recipe-rating.tsx` | 1,418 | `4a7ba95ba975a7b7bfb8c41d011e30b350bea5357100089bdcbd49a1f7dd5a6a` |
| `components/recipe-related.tsx` | 722 | `4fb9b0a88840e8677b33c5728639e2b71ce0d081714a90463ae1dab056eaa2c9` |
| `components/recipe-search.tsx` | 4,158 | `583ee28a000fe2779997e15f960e438a37dda0037215c021446903e003208f01` |
| `components/related-recipes.tsx` | 3,178 | `0eab1317a2bb16a9b423ffd4e57b4853df5709207fb50ec0615edf0b28876e96` |
| `components/site-footer.tsx` | 4,251 | `641314d5f5faa4ebd32dc3aa1c04b50ab3fd1e424c0626d0b9d8ff5c36c191cb` |
| `components/site-header.tsx` | 3,971 | `3d8a11c6c72a6081116f3eedff048051db82bed770b0a5063cc1bed6389852fc` |
| `components/theme-toggle.tsx` | 1,108 | `3cc3bdc6e611ca17e4662550bcc1c4788a720f33acf43ed30d40553b49913911` |
| `components/ui/badge.tsx` | 1,928 | `aa753a57108ef04a8c2e2ce7fc4ce6deac45592daef2064118e0fac601c0ab1d` |
| `components/ui/button.tsx` | 3,201 | `f2d3d60fdcb167b5e17bb35e56f4f22e0dcb34d97d8781be80096f047286759e` |
| `components/ui/card.tsx` | 2,633 | `e3b0a8f1c0cf6751ea4d023c6c40ec2ad92553dd9b226438b63c8fc79fda84f9` |
| `components/ui/index.ts` | 384 | `14adef9d64b111bbd9bfdf53ff76bc82028e4e910b26721634ab17925fe97139` |
| `components/ui/input.tsx` | 1,043 | `126212f3ebe787ae2d57d4fdd201deb082f0144da909607f850541fbed6a25a7` |
| `components/ui/label.tsx` | 521 | `607ad111661ba503564fc001f39b1332607627411802db5a259095d74ea52688` |
| `components/ui/separator.tsx` | 548 | `bbbd7392cedaa8b220c1789235b11d3083ab6f5656992927823462dfc6881a10` |
| `components/ui/skeleton.tsx` | 278 | `74bfc30e8fc97ee9d7680d5fafc1f17e747d9dc4eded75057469cc73e904861d` |
| `components/ui/social-icons.tsx` | 2,991 | `dbb3f6265ccc018f6413ed507ffe288aa5c0bc2f7299b89b30775805a579950b` |
| `components/ui/sonner.tsx` | 1,226 | `2dd975ad2170ba2570b00e58713dcbda90f26a7fffdaceb1ef7255f450c2d2a6` |
| `components/ui/textarea.tsx` | 845 | `9476716b0f7b5ffbc25a6bd89443d56bee5506a8b39d1089c50e715754c9b68a` |
| `data/public-content.json` | 1,220,183 | `175cf5111a8cbfc2f56d0574c13962294a1e7be4c2a3002cd9e432e5e2330af0` |
| `lib/category-consolidation.ts` | 5,240 | `ab979f2ff6779b0a113f237bdc6d9cedf9463009850b4a52b44101b24c7ef9f8` |
| `lib/cloudinary-url.ts` | 1,460 | `df59432bbda37f8a69581f9bbe52da9a0f0b4087ad97aacfe4d563560dc0e037` |
| `lib/cluster-resolver.ts` | 3,308 | `b09e385b2a95fc83ab00d2622b4f094f58b06f83be2943e8b6118376b2b2f0cd` |
| `lib/hub-content.ts` | 12,412 | `b1618e9f2aa8dccf95ac793c3e26b811c285fab6270777716a51462ad099bfc8` |
| `lib/markdown.ts` | 1,135 | `7c14f3a95b9a773a05cf4e36cb848df842b0b8a15bbdbc7351464e887ab61b95` |
| `lib/pin-variants.ts` | 2,282 | `3e759fb2e954bbf6acc6eb48922f515149bfa4cc707dab8ef18619fb45baab42` |
| `lib/public-data.ts` | 8,464 | `eceb0050bb9643ddc6a6268d2cddd95ad8b4b3a4d1a14fe64b0af165cb9a0dbe` |
| `lib/public-types.ts` | 1,838 | `cb0374f43f22d54d09e04710a211fe28b41deb3943fec9e1b99efec79b03a6ae` |
| `lib/recipe-slug-redirects.ts` | 4,072 | `b9ce1e2f8d3f45e55fdd571d809e39bd4142c3dbde95ff467f3ef093d5116b74` |
| `lib/tag-utils.ts` | 1,224 | `9058473b22149c570392725e00cd5b1d6362003c5f3bc1bf0ad4a6e0bd8a6012` |
| `lib/topical-map.ts` | 28,435 | `99daee40527111df9718444ff7c74a00567a88e537a285723bef8e5ea3a54f6c` |
| `lib/types.ts` | 2,074 | `42ad8b8738989a565aea51ec8ad0ea8a0b37ef5bb1249acdde2cabceddf76b44` |
| `lib/utils/cn.ts` | 743 | `6f9bdb051442287f9715d81d264e65a79cfa2547e764205d4c5edddc6c490d57` |
| `lib/utils/duration.ts` | 1,689 | `f43208a89d34c44457e9e1137379cdecac7f44b9c8fbae4d1611014afe14d4c7` |
| `lib/utils/sanitize.ts` | 546 | `8a8be50d6677eaf67a53896eb3101e046ca0c669dadc9ead1f35ea03a0486d40` |
| `middleware.ts` | 1,088 | `c2fa03a9bd12b5418c107569a6c94bbd1de6338a7a58dfcc15d76dd8ea0b925f` |
| `next-env.d.ts` | 288 | `1862ac4bbbc5192d4bf562161df66ea547ed3e67173100656ab606ae9797db2b` |
| `next.config.mjs` | 20,625 | `75336353293210766815748a2d9d8b30a95688ec8e37190e8e2a78ca51e8e5a2` |
| `package-lock.json` | 242,233 | `a1c1677b0e896ab8c191de5e2bf1bba3a3b28de3ba82646d23d81ed71337d5d8` |
| `package.json` | 1,434 | `4d82d61e5734fee773589680c0924511590c212558b7cda1ef8abdf372acd3a6` |
| `postcss.config.mjs` | 144 | `54b5708e687b8c9ecc8dbeebf29801dbec1213f890c5e018d7ca9c1541a6f7e3` |
| `public/59eee5015a89e4c3cd3f9cafaeb3d8bdef21f399e3cfdf1c.txt` | 48 | `4d6b9e328c6d93eb313478dc649282ab77ff81550fa8c127cc124796c02f7dcf` |
| `public/BingSiteAuth.xml` | 85 | `40590409f99b272caf0b1374964ea293c566d403cbd2b64671ed88874fc38f5a` |
| `public/baking-for-2.jpeg` | 3,141,753 | `1ae987813d90ecc0a909fd6a07088e5185db00ef51172a9f0cf960892ef7d3ba` |
| `public/crockpot-recipes-for-two.jpeg` | 2,901,172 | `7d6c30060aa743f1c6f49983175f6a1fd6c00661e567850e3b4b752a252ae8e5` |
| `public/dinner-recipe-ideas-for-two.jpeg` | 3,340,321 | `e97feabcac36fd09139cbfe5538e443eadd03bfd41a6871cf2c8fcded26c974e` |
| `public/dinner-recipes-for-two.jpeg` | 3,612,786 | `fbb7eb9eb75687c12c188b88e338566ac582693a13bf1c853db15c7ed7ce5af7` |
| `public/easy-carnivore-recipes.jpeg` | 3,337,462 | `7caa9c46ce23b622fd2256f483c2886ebb738f6e4fb0817c7fa1542c7cdfc05f` |
| `public/easy-dinner-ideas-for-two.jpeg` | 3,360,287 | `0c5338c040127fc1d8ba89deaaf499b3a3e82b28eb68f73fad8619c07ffdb829` |
| `public/easy-ibs-dinner-recipes.jpeg` | 3,277,445 | `140ab4ae164e5e46d6a58507b9875c429ad562860ff320f4c61a42af04204d13` |
| `public/easy-lactose-free-dinner-recipes.jpeg` | 3,218,656 | `8f8b8cb29a10a98a283df227a91a0055847e337de878eb765de5394358fe1883` |
| `public/easy-low-fodmap-recipes.jpeg` | 3,060,473 | `2dbbaf0aeb882a193cb25fea0376ffc11010c12b2a3991eeda8ff1975f7acce3` |
| `public/easy-meal-ideas-for-two.jpeg` | 3,124,988 | `661c950a19c9d463a29cf570c1bbd2f5c1d9b08dd04f9a2e61cfcfdba8935361` |
| `public/easy-meals-for-beginners.jpeg` | 3,492,654 | `85c1f7af44157c79aa6b319685497dea353ebc281de824ceddf46b189a6312a0` |
| `public/easy-recipes-for-two.jpeg` | 3,555,664 | `e8a4240171590baf1ec0accaabbe83844ede24aed7708977f6bdd37591697f96` |
| `public/easy-to-cook-dinner-for-two.jpeg` | 3,257,870 | `b62729bbfecdc2da46b7bc2984765b3474f58bea3e1a78a992f99d336090f997` |
| `public/easy-whole30-recipes.jpeg` | 3,330,494 | `0a368bfcb829393e7678d05c4795fe9e78f0d6a912be93352421ec24b8722f17` |
| `public/fast-and-easy-dinner-for-2.jpeg` | 3,185,499 | `7b8a27ed7ecd5af2da4dd9bd32ce01fe5514c193fa690f1a8c3469ac3ae54f2f` |
| `public/google151002a8b34eb75f.html` | 53 | `43fc614fc978ec46d6c652232c0a49aa5b8e45f74eed3e25bd93f97f919b8c67` |
| `public/healthy-dinner-ideas-for-two.jpeg` | 3,411,062 | `06f4f7f1ccc99be4a5cc63b4ca1a42e909afb693ee34a2cf798db03f33573f14` |
| `public/hero-kitchen.png` | 1,845,142 | `36d7ceef10481c4a82571b19fa5790b7ad39235cfc11e57eba223fb8226a857c` |
| `public/images/collections/SUPER-PROMPTS.md` | 16,897 | `4c88a1438b6ff04f5958f8d2bf03ad4efe0c78cfb7aed5afb489bb63d8dc0bff` |
| `public/images/collections/urls.json` | 3,354 | `36299f6a3746e447b419dc9eeeb471ab485fbb6182b75cf158393f46c720043b` |
| `public/logo-header-dark.png` | 461,968 | `1e12c36d1129588a54f8c501823a13738231603c5d683a3bca45456a6426adb2` |
| `public/logo-header.png` | 504,190 | `887990718a25e34d2f9301f3b38e6eccb8b8258bdd2836c5fd9ce937a49afbb6` |
| `public/placeholder-logo.png` | 568 | `d7c39d978af643ba9525de6fb8171e0f834882db4110c82ecad0df3f4f69551a` |
| `public/placeholder-logo.svg` | 3,208 | `19a9e968f4656d52a4c249b4056117ad109370ba9da51cdc630ddded74cec73b` |
| `public/placeholder-user.jpg` | 1,635 | `22be067d748175598a5e00123902f5c8332dd7f101de03dfb92ec08d85bb5e53` |
| `public/placeholder.jpg` | 1,064 | `14be0c7aa11cca1e78f0966176b286a6d36d00ec64be027775dfeb33d8e2dfdf` |
| `public/placeholder.svg` | 3,253 | `64badf7aabda0b9630b87020ffb6095cb858ccbcf66b355c2aa08b1063954d3b` |
| `public/quick-and-easy-dinner-recipes-for-two.jpeg` | 3,417,462 | `e05503c5d178e8ab63c038e28d6d566388e2875502507c09a4277b833940f0c8` |
| `public/recipes-for-two.jpeg` | 3,226,310 | `fd5046fe4dfe71e1f1ceb9419e917b3487f14bc24dbda48b6a9543eabcd2f8f6` |
| `public/romantic-dinner-ideas-for-two.jpeg` | 2,871,585 | `f36cf90bfd4c50f05935ee7c15dd1321a53737a10f30e5ce3563e98560a31032` |
| `public/simple-healthy-dinner-ideas-for-two.jpeg` | 3,205,707 | `f1d18a13cf32144de7576140fc69001283b7ca3f3717152922f4cbbe5d40e24f` |
| `public/slow-cooker-recipes-for-two.jpeg` | 3,046,326 | `0b798155fef05d50d9f5f14355a8d8fa12135dacf3adad53b435c4a631e2667f` |
| `scripts/public-snapshot-schema.ts` | 13,123 | `1de4ea594cfe53ab0b80ffdbda409c9a44d6d06ecea3dc39ccd369d7e4d21494` |
| `scripts/validate-public-snapshot.ts` | 7,591 | `5799e609621b03b7e6ea24967664363f78b734ce510e46268ec1e373d0c33829` |
| `scripts/validate-standalone.ts` | 9,300 | `f8dd5d60241a93d5b019cc536a8d6568de595727b92699dfecc95cc18f191a6f` |
| `tsconfig.json` | 709 | `b2595e3853c0678f161d9c5e5e1f6f8f270930c07ab431778fe3b10e5e95a929` |
