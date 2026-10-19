-- supabase/migrations/0021_drop_projects.sql
--
-- Retire les objets du concept de « projet » (abandonné en P6.1), créés par la première version
-- de 0019_projects.sql. Sans effet sur une base qui ne les a jamais eus (`if exists`).
--
-- `project_media` d'abord : sa clé étrangère référence `projects`. Les politiques RLS, les
-- déclencheurs et les index partent avec leur table. Les médias Cloudinary du dossier
-- `byb/projects/` ne sont pas touchés par ce script : à supprimer depuis la console Cloudinary.

drop function if exists public.reorder_projects(uuid[]);
drop function if exists public.reorder_project_media(uuid, uuid[]);
drop function if exists public.set_project_cover(uuid, uuid);

drop table if exists public.project_media;
drop table if exists public.projects;
