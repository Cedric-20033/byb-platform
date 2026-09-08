// src/data/projects.ts
//
// DÉPRÉCIÉ — ce fichier n'est plus utilisé.
//
// Les "réalisations" sont désormais dérivées directement des médias déjà
// présents dans la table Supabase `service_media` (photos + vidéos réelles
// du client), et non plus d'une liste de projets saisis à la main avec
// titre/description/date — voir :
//   - src/application/catalog/GetHomeRealisationMedia.ts (page d'accueil)
//   - src/application/catalog/GetRealisationsByService.ts (page /realisations)
//
// Le serveur MCP filesystem utilisé pour ce projet ne permet pas de
// supprimer un fichier — celui-ci est donc vidé plutôt que retiré du disque.
// Ken : ce fichier peut être supprimé manuellement (clic droit > Delete)
// sans impact, plus aucun import ne le référence.
export {};
