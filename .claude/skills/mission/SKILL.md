---
name: mission
description: Exécuter de manière contrôlée un exercice numéroté du programme Claude Mastery 2.0 avec les sous-agents spécialisés.
argument-hint: "[ID ex. 04-12 ou numéro 95]"
---

# Exercice demandé : $ARGUMENTS

1. Lis `docs/claude-mastery/catalogue/exercices.json` et retrouve **exactement** l'exercice par `id` ou `number`. Si introuvable, présente les identifiants disponibles sans deviner.
2. Vérifie le projet courant, l'environnement, `git status` et les permissions pertinentes. Ne suppose aucune connexion externe.
3. Reformule l'objectif, le critère de preuve et les risques. Sélectionne un seul agent responsable et jusqu'à deux agents relecteurs réellement utiles.
4. Réalise les étapes non destructives permises; demande l'accord avant toute publication, envoi, migration, suppression, push ou changement de production.
5. Pour chaque résultat, indique si la preuve a été observée. Ne coche pas un exercice sur une simple intention.
6. Rends : ID, résultat, fichiers changés, commandes et tests exécutés, preuve, limites et prochain exercice recommandé.
