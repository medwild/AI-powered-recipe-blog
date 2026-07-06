# Règles Karpathy — Qualité du code

Ces guidelines réduisent les erreurs courantes des LLM. À appliquer pour tout le coding non-trivial.

**Tradeoff:** Ces règles biaisent vers la prudence. Pour les tâches triviales (typo, fix une ligne), utiliser son jugement.

## 1. Réfléchir avant de coder

**Ne pas assumer. Ne pas cacher la confusion. Exposer les tradeoffs.**

Avant d'implémenter :
- Énoncer ses hypothèses explicitement. Si incertain, demander.
- Si plusieurs interprétations existent, les présenter — ne pas choisir en silence.
- Si une approche plus simple existe, le dire. Push back si justifié.
- Si quelque chose n'est pas clair, s'arrêter. Nommer ce qui est confus. Demander.

## 2. Simplicité d'abord

**Le minimum de code qui résout le problème. Rien de spéculatif.**

- Pas de features au-delà de ce qui est demandé.
- Pas d'abstractions pour du code utilisé une seule fois.
- Pas de "flexibilité" ou "configurabilité" non demandée.
- Pas de gestion d'erreur pour des scénarios impossibles.
- Si tu écris 200 lignes et ça pourrait être 50, réécris.

Se demander : "Est-ce qu'un senior engineer dirait que c'est trop compliqué ?" Si oui, simplifier.

## 3. Changements chirurgicaux

**Toucher uniquement ce qui est nécessaire. Ne nettoyer que son propre bazar.**

Quand on édite du code existant :
- Ne pas "améliorer" le code adjacent, les commentaires, ou le formatage.
- Ne pas refactorer ce qui n'est pas cassé.
- Matcher le style existant, même si on ferait différemment.
- Si on remarque du code mort non lié, le mentionner — ne pas le supprimer.

Quand nos changements créent des orphelins :
- Supprimer les imports/variables/fonctions que NOS changements ont rendu inutilisés.
- Ne pas supprimer le code mort préexistant sans demande.

Le test : chaque ligne changée doit tracer directement à la demande de l'utilisateur.

## 4. Exécution orientée objectifs

**Définir des critères de succès. Boucler jusqu'à vérification.**

Transformer les tâches en objectifs vérifiables :
- "Ajouter la validation" → "Écrire les tests pour les entrées invalides, puis les faire passer"
- "Fixer le bug" → "Écrire un test qui le reproduit, puis le faire passer"
- "Refactorer X" → "S'assurer que les tests passent avant et après"

Pour les tâches multi-étapes, énoncer un plan bref :
```
1. [Étape] → vérifier: [check]
2. [Étape] → vérifier: [check]
3. [Étape] → vérifier: [check]
```

Des critères de succès forts permettent de boucler de façon autonome. Des critères faibles ("faire que ça marche") nécessitent des clarifications constantes.

---

**Ces guidelines fonctionnent si :** moins de changements inutiles dans les diffs, moins de réécritures dues à la sur-complexification, et les questions de clarification viennent avant l'implémentation plutôt qu'après les erreurs.
