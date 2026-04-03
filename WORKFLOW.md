# 🚀 Workflow Projet IA Optimisé (Antigravity)

Ce document décrit la méthode la plus rapide et fiable pour transformer une idée ou un bloc de code en une application déployée sur GitHub et Vercel.

---

## 1. Initialisation (Le "Set-up")
La règle d'or pour éviter les erreurs de permissions est de **créer le dossier d'abord** :

1.  **Dossier local** : Créez un dossier vide sur votre Mac (ex: `mon-nouveau-projet`).
2.  **Ouverture** : Ouvrez ce dossier directement dans votre éditeur (Cursor / VS Code).
3.  **Appel à l'IA** : Donnez-moi l'idée ou le code et dites : 
    > "Initialise un projet Next.js propre ici pour ce code."

---

## 2. Développement (Le "Clean Code")
Pendant que je génère le projet, je vais suivre cette structure modulaire (inspirée de `swarm-simulation`) :

*   **Framework** : Next.js (App Router) + TypeScript + Tailwind CSS.
*   **Modularité** : 
    *   `src/lib/` : Logique pure, classes mathématiques, helpers.
    *   `src/components/` : Composants UI isolés.
    *   `src/app/` : Pages et routing.
*   **Styling** : Design "Premium" par défaut (Dark mode, animations Framer Motion).

---

## 3. Mise en ligne (GitHub)
Une fois que le projet tourne localement (`npm run dev`), voici la séquence pour GitHub :

1.  **Création** : Créez un dépôt **vide** sur [github.com/new](https://github.com/new).
2.  **Configuration** : Tapez ces commandes (je vous donnerai l'URL exacte) :
    ```bash
    git init
    git add .
    git commit -m "Initial commit"
    git remote add origin https://github.com/VOTRE_USER/VOTRE_REPO.git
    git branch -M main
    git push -u origin main
    ```

---

## 4. Déploiement (Vercel)
La méthode la plus simple ("Zero Config") :

1.  Allez sur [Vercel.com](https://vercel.com).
2.  Cliquez sur **"Add New"** > **"Project"**.
3.  Importez votre dépôt GitHub.
4.  C'est fini ! Chaque `git push` déclenchera un nouveau déploiement automatique.

---

## 💡 Astuces "Pro"
*   **Pas de dossiers racine redondants** : Toujours vérifier que `components/` et `lib/` sont **dans** `src/` pour éviter les erreurs de build Vercel.
*   **Version de Node** : Assurez-vous d'utiliser Node 18+ ou 20+ en local.
*   **Secrets** : Si vous avez des clés API, demandez-moi de créer un fichier `.env.local` et ajoutez-les dans les "Environment Variables" sur Vercel.
