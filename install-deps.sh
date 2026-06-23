#!/bin/bash
# ============================================================
# BYB — Script d'installation des dépendances
# À exécuter une seule fois à la racine du projet
# ============================================================

echo "📦 Installation des dépendances BYB..."

# --- UI & Styling ---
npm install class-variance-authority clsx tailwind-merge lucide-react

# --- shadcn/ui (initialisation — à exécuter après ce script)
# npx shadcn@latest init

# --- Animations ---
npm install framer-motion

# --- État global & serveur ---
npm install zustand @tanstack/react-query

# --- i18n ---
npm install next-intl

# --- Supabase ---
npm install @supabase/supabase-js @supabase/ssr

# --- Validation ---
npm install zod

# --- Emails ---
npm install resend @react-email/components

# --- Export ---
npm install xlsx

# --- Calendrier (dashboard) ---
npm install react-big-calendar
npm install --save-dev @types/react-big-calendar

# --- Formulaires ---
npm install react-hook-form @hookform/resolvers

echo ""
echo "✅ Installation terminée."
echo ""
echo "Prochaine étape :"
echo "  npx shadcn@latest init"
echo "  (choisir : TypeScript, style Default, base color Slate, CSS variables: yes)"