# Claude Mastery 2.0 — 10 sous-agents, 172 exercices

> **Installé dans SUPREME GUIDE** : agents dans `.claude/agents/`, skills `/mission` et `/audit-equipe` dans `.claude/skills/`, catalogue et dashboard ici (`docs/claude-mastery/`). Les règles du kit sont dans `REGLES.md` ; celles du dépôt (`CLAUDE.md` racine) priment. L'installateur et la mission Moreh Derech (autre dépôt) n'ont pas été repris.

Un programme **original** inspiré de la répartition 20 + 32 + 35 + 25 + 35 + 25 visible sur la capture. Ce n’est **pas** le programme officiel ni le contenu authentifié de Kodree. Les 172 exercices et les dix agents ont été créés pour ton usage.

## Contenu
- `.claude/agents/` : 10 définitions réelles de sous-agents Claude Code (YAML + prompt).
- `.claude/skills/mission/SKILL.md` : `/mission 04-01` pour réaliser un exercice.
- `.claude/skills/audit-equipe/SKILL.md` : `/audit-equipe` pour contrôler l'installation en lecture seule.
- `CLAUDE.md` : supervision et garde-fous pour projets réels.
- `catalogue/EXERCICES.md` : les 172 exercices, case à cocher et preuve de validation.
- `catalogue/exercices.json` : catalogue structuré pour missions et dashboard.
- `catalogue/exercices.csv` : export tableur.
- `dashboard.html` : interface locale interactive (recherche, filtres, progression sauvegardée dans le navigateur, prompts copiables).
- `PROMPT_DEMARRAGE.md` : prompt pour coordinateur.
- `PREMIERE_MISSION_MOREH_DERECH.md` : exemple d'audit de projet réel.
- `installer.py` : copie sûre des définitions et ressources vers un projet, sans écraser les fichiers existants.

## Installer dans ton projet

**Option A — dossier indépendant pour apprendre**

Décompresse l'archive, ouvre un terminal dans le dossier et lance `claude`. Lance `/audit-equipe`, puis `/mission 01-01`.

**Option B — utiliser les agents dans un dépôt existant**

À partir du dossier décompressé :

```bash
python3 installer.py /chemin/vers/ton-projet
python3 installer.py /chemin/vers/ton-projet --apply
```

La première commande est une simulation; la deuxième copie sans écraser. Vérifie les conflits et fusionne les consignes `CLAUDE.md` manuellement si le projet possède déjà ce fichier. Redémarre Claude Code si le dossier `.claude/agents` n'existait pas au lancement. Les ressources du catalogue sont copiées dans `catalogue/` si elles sont absentes.

Dans Claude Code, vérifie `/agents` (définitions disponibles) et `/tasks` (agents exécutés), puis tape `/mission 04-01`. Selon les versions, le chargement des nouveaux agents peut nécessiter un redémarrage.

## Dashboard

Ouvre `dashboard.html` dans un navigateur récent. L'interface fonctionne sans serveur, ne se connecte à aucune plateforme et mémorise les cases cochées dans le navigateur local uniquement. Le suivi de progression du dashboard n'est pas une preuve d'exécution; les preuves restent à collecter dans le projet.

## Cadre de sécurité

Pas de `push`, merge, déploiement, migration de production, envoi Gmail ou écriture dans des services externes sans consentement. Aucun accès aux dépôts/comptes n'est préconfiguré dans ce ZIP. Les sous-agents peuvent effectuer des appels facturables ou consommant le quota Claude : sélectionner ceux nécessaires à la mission.

## Source de la configuration

Vérifiée le 17 novembre 2026 avec la documentation publique Anthropic :
- https://code.claude.com/docs/en/sub-agents
- https://code.claude.com/docs/en/skills

Le comportement exact peut varier selon la version et le plan Claude Code. Ce ZIP est contrôlé statiquement, mais le lancement des agents sur ton poste n'a pas été testé ici.
