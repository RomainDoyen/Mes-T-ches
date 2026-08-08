📋 Todo List Avancée - Extension Navigateur

Descriptif du Projet
Une extension de navigateur moderne construite avec WXT (framework nouvelle génération pour extensions), utilisant Neon (PostgreSQL serverless) comme base de données pour la synchronisation cloud des tâches. L'extension propose une expérience popup ultra-fluide avec un design glassmorphique/neumorphique moderne.

🏗️ Stack Technique

Framework: WXT (Web Extension Toolkit)
Frontend: React + TypeScript
Base de données: Neon (PostgreSQL serverless)
ORM: Drizzle ORM (recommandé avec Neon)
Styling: SCSS
Animations: Framer Motion
State Management: Zustand
Auth: Neon Auth ou Clerk/Supabase Auth
API: tRPC ou API Routes


✨ Features Complètes
Core Features

✅ CRUD complet des tâches (créer, lire, modifier, supprimer)
📁 Catégories/Projets personnalisables avec couleurs
🏷️ Tags multiples par tâche
📅 Dates d'échéance avec rappels
⏰ Sous-tâches (checklist imbriquée)
🎯 Priorités (Basse, Moyenne, Haute, Urgente)
🔄 Tâches récurrentes (quotidien, hebdo, mensuel)
📌 Épingler des tâches importantes

Plusieurs profiles

Features Avancées

🔍 Recherche instantanée avec filtres
📊 Vue Kanban / Liste / Calendrier
🌙 Mode sombre/clair automatique
☁️ Synchronisation cloud multi-appareils (Neon)
📈 Statistiques de productivité (graphiques)
🔔 Notifications navigateur natives
🎨 Thèmes personnalisables
🗣️ Commandes rapides (Cmd+K style)
📱 Widget mini flottant sur les pages web
🔗 Import/Export (JSON, CSV)
🧩 Intégration URL de la page active (créer tâche depuis onglet)
🎮 Drag & drop pour réorganiser
⌨️ Raccourcis clavier globaux
🗄️ Archivage automatique des tâches terminées
👥 Partage de listes (collaboratif futur)
🔥 Streak/Gamification (jours consécutifs productifs)


🎨 PROMPT DESIGN COMPLET
Crée un design system complet pour une extension de navigateur "Todo List Avancée" 
au format POPUP (dimensions fixes 400px width x 600px height), PAS une page web classique.

STYLE GLOBAL:
- Design néomorphique glassmorphique moderne 2026
- Coins ultra arrondis partout: popup container 24px border-radius
- Cards de tâches: 16px border-radius
- Boutons: 12-20px border-radius (pill-shape pour boutons principaux)
- Inputs: 14px border-radius
- Glassmorphism: backdrop-blur(20px), background rgba avec transparence
- Ombres douces multicouches (soft shadows layering)
- Micro-interactions et animations fluides (spring physics)
- Palette de couleurs:
  * Mode clair: Fond #F8F9FC, cards blanches #FFFFFF avec ombre douce
  * Mode sombre: Fond #0F0F1A, cards #1A1B2E semi-transparentes
  * Accent primaire: Gradient violet-bleu (#6366F1 →rgb(92, 164, 246) →rgb(55, 142, 214))
  * Accent secondaire: Gradient corail-rose (#FF6B6B → #FF8E8E) pour urgent
  * Success: Gradient vert menthe (#10B981 → #34D399)
  * Warning: Gradient orange (#F59E0B → #FBBF24)
- Typographie: Inter ou Plus Jakarta Sans, weights 400-700
- Espacements généreux (padding 16-20px), respiration visuelle

---

ÉCRAN 1 - HEADER POPUP (fixe en haut, 70px hauteur):
- Fond glassmorphique avec blur, bordure arrondie top 24px
- Logo/icône app à gauche (32px, gradient violet arrondi)
- Titre "Mes Tâches" en bold 18px
- Compteur de tâches actives (badge pill arrondi coloré)
- Icône profil/avatar circulaire à droite (36px)
- Icône paramètres (engrenage) à côté, hover effect glow
- Barre de progression fine en dessous (gradient animé) montrant % complétion du jour

---

ÉCRAN 2 - BARRE DE RECHERCHE & FILTRES (60px hauteur):
- Input recherche pill-shape (border-radius 20px), fond gris clair translucide
- Icône loupe à gauche, animée au focus (scale + glow)
- Placeholder "Rechercher une tâche..."
- Bouton filtre (icône entonnoir) circulaire à droite avec badge nombre de filtres actifs
- Scroll horizontal de chips filtres rapides: "Toutes", "Aujourd'hui", "Urgent", "Cette semaine"
  chaque chip: pill-shape, background translucide, active state avec gradient violet

---

ÉCRAN 3 - VUE LISTE PRINCIPALE (zone scrollable, 380px hauteur):
Pour chaque tâche (card):
- Container arrondi 16px, fond blanc/dark translucide avec ombre douce
- Checkbox circulaire personnalisée à gauche (24px), animation checkmark spring quand cochée
- Quand cochée: strikethrough animé + opacity 0.5 + fond légèrement vert
- Titre tâche en medium 15px
- Ligne 2: Tags colorés en petites pills (border-radius 8px, background pastel)
- Date échéance à droite avec icône calendrier (rouge si en retard, orange si aujourd'hui)
- Barre priorité verticale à gauche de la card (4px width, couleur selon priorité, arrondie)
- Sous-tâches: mini progress bar circulaire (donut chart) 3/5 par exemple
- Swipe gauche pour révéler actions rapides (éditer, supprimer, épingler) - boutons circulaires colorés
- Drag handle (6 points) visible au hover à droite
- Animation d'entrée: slide + fade stagger pour chaque item
- Séparation entre groupes de dates ("Aujourd'hui", "Demain", "Cette semaine") avec label sticky

---

ÉCRAN 4 - BOUTON FLOTTANT AJOUT (FAB):
- Position fixe bas droite, 56px diameter
- Gradient violet-bleu, ombre glow prononcée (box-shadow colorée)
- Icône "+" blanche centrée
- Animation hover: scale 1.1 + rotation légère
- Animation click: ripple effect + morph vers formulaire

---

ÉCRAN 5 - MODAL/DRAWER AJOUT TÂCHE (slide up depuis le bas, overlay blur):
- Container: 90% largeur popup, border-radius 24px top uniquement (drawer style)
- Poignée de fermeture (petite barre grise arrondie) en haut centrée
- Input titre tâche: grande taille, borderless, focus underline gradient animé
- Zone description: textarea arrondie 14px, fond translucide
- Sélecteur priorité: 4 boutons pill horizontaux avec couleurs distinctes, sélection avec scale+glow
- Date picker: calendrier custom arrondi, jours en cercles, sélection avec gradient fill
- Sélecteur catégorie: chips colorés horizontaux scrollables avec émojis
- Zone tags: input avec chips ajoutées dynamiquement, bouton "+" pour ajouter
- Toggle récurrence: switch moderne arrondi avec sous-options qui slide down
- Bouton "Créer la tâche": pill-shape full width, gradient violet, texte blanc bold, 
  shadow glow, animation press (scale down léger)

---

ÉCRAN 6 - VUE KANBAN (alternative, swipe horizontal entre colonnes):
- 3 colonnes: "À faire", "En cours", "Terminé"
- Chaque colonne: header avec titre + compteur badge, fond légèrement teinté
- Cards identiques à liste mais compactes, drag & drop fluide entre colonnes
- Ombre portée dynamique pendant le drag (élévation visuelle)
- Zone de drop highlighted avec bordure pointillée gradient au survol

---

ÉCRAN 7 - PANNEAU STATISTIQUES (accessible via icône graph):
- Cards stats en grid 2x2: "Tâches complétées", "Streak", "Taux complétion", "Temps moyen"
  chaque card: gros chiffre en gradient text, icône, mini sparkline chart
- Graphique donut central: répartition par catégorie, couleurs vives, légende arrondie
- Graphique bar chart hebdomadaire: barres arrondies en haut, gradient vertical
- Badge de streak avec flamme animée si streak actif

---

ÉCRAN 8 - PARAMÈTRES (drawer latéral ou fullscreen popup):
- Liste de sections avec icônes dans containers arrondis colorés
- Toggle dark/light mode: switch avec icône soleil/lune animée transition
- Sélecteur de thème couleur: palette de cercles colorés cliquables
- Section compte: avatar + email + bouton déconnexion (pill rouge outline)
- Section sync: statut connexion Neon avec indicateur pulsant vert/rouge
- Bouton export données: pill avec icône download
- Version app en bas, texte discret gris

---

ÉCRAN 9 - ÉTAT VIDE (empty state):
- Illustration centrale moderne (style 3D flat ou line art coloré) 200px
- Texte encourageant "Aucune tâche pour le moment !"
- Sous-texte "Créez votre première tâche pour commencer"
- Bouton CTA pill gradient "Créer une tâche" avec icône +

---

ÉCRAN 10 - COMMAND PALETTE (Cmd+K):
- Overlay blur fond, modal centré 350px width
- Container arrondi 20px, ombre importante, fond glassmorphique fort
- Input recherche en haut, borderless, grande taille, focus auto
- Liste résultats/actions avec icônes, hover highlight gradient subtil
- Raccourcis clavier affichés à droite de chaque action (petits badges arrondis)
- Catégories groupées: "Actions rapides", "Tâches récentes", "Navigation"

---

MICRO-INTERACTIONS GLOBALES:
- Tous les boutons: hover = légère élévation + brightness, active = scale 0.95
- Transitions: cubic-bezier(0.34, 1.56, 0.64, 1) pour effet spring/bounce
- Loading states: skeleton screens avec shimmer effect arrondi
- Toast notifications: slide depuis le haut, pill-shape, auto-dismiss avec progress bar
- Checkbox check: animation morph SVG path avec bounce
- Confetti animation subtile quand toutes les tâches du jour sont complétées

CONTRAINTES TECHNIQUES POPUP:
- Toujours prévoir que c'est un popup fixe (pas de responsive web classique)
- Scroll interne uniquement dans zones dédiées, header/footer toujours fixes
- Éviter les éléments qui dépassent width 400px
- Performance: animations légères, pas de blur excessif qui ralentit le rendu popup