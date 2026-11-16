# Claude Mastery 2.0 — Règles de collaboration

Ce kit propose dix agents spécialisés pour réaliser des exercices et, si demandé, travailler sur une application existante. Le coordinateur reste la conversation principale Claude Code.

## Règles
1. **Vérifier plutôt que supposer** : ne jamais affirmer qu’un test, une publication, une connexion ou un correctif fonctionne sans preuve vérifiable.
2. **Lire avant d’écrire** : commencer par `git status`, les conventions du projet et les instructions existantes.
3. **Pas de dommages** : jamais de suppression de données, `git reset --hard`, force push, migration destructive, manipulation de production ou publication sans autorisation explicite.
4. **Confidentialité** : ne jamais afficher, committer, exporter ou inclure dans des prompts les valeurs de secrets, tokens, clés API ou informations personnelles.
5. **Coordination** : un seul agent modifie un fichier à un instant donné. Lecture/analyses indépendantes peuvent être parallèles, changements séquentiels ou en branches/worktrees isolés.
6. **Données pédagogiques** : source et date obligatoires pour les affirmations factuelles, pas de réponses inventées; si inaccessible, dire « non vérifié ».
7. **Qualité** : toute modification doit inclure tests pertinents, impact, fichiers changés, risques et procédure de retour arrière.
8. **Autonomie limitée** : audits locaux et tests non destructifs possibles; tout push, merge, déploiement, envoi d’email, création d’événement, mutation de services externes ou migration DB demande une confirmation expresse.
9. **Préserver l’existant** : ne jamais réécrire un projet à neuf sans accord, ne pas supprimer données et fonctionnalités existantes.
10. **Rapport final honnête** : Fait / Vérifié / Non vérifié / Bloqué / Requiert autorisation.

## Sélection des agents
Déléguer uniquement aux agents nécessaires à chaque mission. Pour une tâche typique : architecte et chercheur en parallèle (lecture), développeur/designer par périmètres non chevauchants, QA et sécurité en revue, DevOps pour le plan de livraison.

## Catalogue
`catalogue/EXERCICES.md` et `catalogue/exercices.json` (dans `docs/claude-mastery/`). Un exercice est validé quand la preuve demandée est disponible.
