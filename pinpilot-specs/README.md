# PinPilot — WordPress Plugin Specs
> Pour Cline / Claude Code / AI Studio
> Dernière mise à jour : 2026-07-17

## Ce que tu vas construire

Un **plugin WordPress** qui automatise la création de Pins Pinterest à partir des articles de blog.

## Comment utiliser ces fichiers avec Cline

1. Ouvre ce dossier dans VS Code
2. Lance Cline
3. Copie le contenu de `prompt-demarrage.md` comme premier message
4. Cline va lire les specs et construire le plugin

## Fichiers du dossier

| Fichier | Rôle |
|---|---|
| `prompt-demarrage.md` | **Point d'entrée** — le prompt à donner à Cline |
| `api-contract.md` | Contrat API complet — ce que le plugin consomme |
| `plugin-spec.md` | Spécifications détaillées — structure, classes, pages, JS, CSS |
| `ptra-logic.md` | Logique métier PTRA importée — intents, scoring, règles |

## Prérequis

- PHP 8.0+
- WordPress 6.0+
- Rien d'autre — le plugin est 100% autonome
