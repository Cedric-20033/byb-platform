-- supabase/migrations/0019_projects.sql
--
-- ANNULÉE (P6.1) : le concept de « projet » a été abandonné. Les Réalisations restent les médias
-- des services (`service_media`) ; aucune table `projects` ni `project_media` n'est nécessaire.
--
-- Ce fichier est conservé vide de toute instruction : une migration déjà appliquée ne se supprime
-- pas (voir 0004). Les objets éventuellement créés par sa première version sont retirés par
-- 0021_drop_projects.sql.

select 1;
