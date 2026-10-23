// scripts/migrate-services-to-supabase.ts
//
// ⚠ JEU DE SEED, PAS UN OUTIL D'EXPLOITATION (P3.6). `src/data/services.ts` n'est plus la source de
// vérité dès que le catalogue est géré depuis /dashboard/services : ce script sert à AMORCER une base
// vide (ou de test). Le relancer sur une base en production ÉCRASE les modifications faites au
// dashboard (sous-prestations et galerie sont remplacées). Après la première migration, éditez
// le catalogue uniquement via le dashboard.
//
// Migration complète du catalogue services : upload des médias locaux vers
// Cloudinary, puis écriture de src/data/services.ts (texte + réf. médias)
// dans les tables Supabase `services` / `sub_services` / `service_media`.
//
// Structure attendue du dossier d'upload : un sous-dossier par service, nommé
// d'après son slug (ex: "toiture", "panneaux-solaires"), contenant les fichiers
// images et vidéos à associer à ce service. Le nom du sous-dossier est comparé
// au slug de manière tolérante (slugify), donc "Toiture" ou "TOITURE" fonctionnent
// aussi.
//
// Idempotent : peut être relancé sans créer de doublons.
//   - Cloudinary : chaque fichier reçoit un public_id déterministe
//     (byb/services/<slug>/<nom-de-fichier-slugifié>), donc un nouvel upload
//     écrase l'existant au lieu d'en créer un second.
//   - Supabase   : chaque service est upserté par slug ; ses sous-services et
//     sa galerie média sont intégralement remplacés (delete + insert) à chaque
//     exécution, ce qui reflète toujours exactement l'état actuel de
//     src/data/services.ts + du dossier d'upload.
//
// Usage : npx tsx scripts/migrate-services-to-supabase.ts
//   (ou : npm run migrate:services)
//
// Variables requises dans .env.local : NEXT_PUBLIC_SUPABASE_URL,
// SUPABASE_SERVICE_ROLE_KEY, CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY,
// CLOUDINARY_API_SECRET.
//
// Variable optionnelle : SERVICES_UPLOADS_DIR (chemin absolu du dossier
// contenant les sous-dossiers par service). Par défaut : C:\Users\cedri\Desktop\upload

import { createClient } from '@supabase/supabase-js';
import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { extname, join, basename, resolve } from 'node:path';
import type { Database } from '../src/types/database';
import type { Service } from '../src/types';
import { services as allServices } from '../src/data/services';
import { slugify } from '../src/lib/utils';
import { CloudinaryMediaProvider } from '../src/infrastructure/cloudinary/CloudinaryMediaProvider';
import { SupabaseServiceRepository, type MediaToPersist } from '../src/infrastructure/supabase/repositories/SupabaseServiceRepository';
import { SupabaseAuditLogger } from '../src/infrastructure/audit/SupabaseAuditLogger';
import { ActorRole, AuditAction } from '../src/domain/shared/AuditLogger';

// tsx n'exécute pas le chargement automatique de .env.local propre à Next.js —
// on le lit nous-mêmes s'il existe (même utilitaire que scripts/seed-slots.ts).
function loadEnvLocal(): void {
  const envPath = resolve(process.cwd(), '.env.local');
  if (!existsSync(envPath)) return;

  for (const line of readFileSync(envPath, 'utf-8').split('\n')) {
    const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
    if (!match) continue;
    const [, key, rawValue = ''] = match;
    if (!(key in process.env)) {
      process.env[key] = rawValue.replace(/^["']|["']$/g, '');
    }
  }
}

const CONFIG = {
  uploadsDir: process.env.SERVICES_UPLOADS_DIR ?? 'C:\\Users\\cedri\\Desktop\\upload',
  cloudinaryFolder: 'byb/services',
  imageExtensions: new Set(['.jpg', '.jpeg', '.png', '.webp', '.avif', '.gif']),
  videoExtensions: new Set(['.mp4', '.mov', '.webm', '.m4v']),
};

type LocalMediaFile = { path: string; nameWithoutExt: string; kind: 'image' | 'video' };

/** Liste les fichiers médias directement dans un dossier (pas de récursion), triés par nom. */
function listMediaFiles(folderPath: string): LocalMediaFile[] {
  const entries = readdirSync(folderPath)
    .filter((name) => statSync(join(folderPath, name)).isFile())
    .sort((a, b) => a.localeCompare(b));

  const files: LocalMediaFile[] = [];
  for (const name of entries) {
    const ext = extname(name).toLowerCase();
    const nameWithoutExt = basename(name, extname(name));
    if (CONFIG.imageExtensions.has(ext)) {
      files.push({ path: join(folderPath, name), nameWithoutExt, kind: 'image' });
    } else if (CONFIG.videoExtensions.has(ext)) {
      files.push({ path: join(folderPath, name), nameWithoutExt, kind: 'video' });
    }
    // Les autres extensions (.DS_Store, .txt...) sont ignorées silencieusement.
  }
  return files;
}

/** Retrouve le sous-dossier d'upload correspondant à un service, par slug tolérant à la casse/accents. */
function findServiceFolder(uploadsDir: string, service: Service): string | null {
  const subfolders = readdirSync(uploadsDir).filter((name) => statSync(join(uploadsDir, name)).isDirectory());
  const match = subfolders.find((name) => slugify(name) === service.slug);
  return match ? join(uploadsDir, match) : null;
}

/** Upload tous les fichiers d'un service vers Cloudinary et retourne les médias prêts à persister. */
async function uploadServiceMedia(
  mediaProvider: CloudinaryMediaProvider,
  service: Service,
  files: LocalMediaFile[],
): Promise<MediaToPersist[]> {
  const media: MediaToPersist[] = [];
  let coverAssigned = false;

  // La couverture est le premier fichier dont le nom contient "cover" ;
  // à défaut, la première image du dossier (ordre alphabétique).
  const coverIndex = files.findIndex((f) => f.kind === 'image' && f.nameWithoutExt.toLowerCase().includes('cover'));

  for (const [index, file] of files.entries()) {
    const publicId = `${CONFIG.cloudinaryFolder}/${service.slug}/${slugify(file.nameWithoutExt)}`;
    const buffer = readFileSync(file.path);

    const uploadedId = await mediaProvider.upload(buffer, `${CONFIG.cloudinaryFolder}/${service.slug}`, file.kind, {
      publicId,
    });

    const isCover =
      file.kind === 'image' && !coverAssigned && (coverIndex === -1 ? media.every((m) => m.type !== 'image') : index === coverIndex);
    if (isCover) coverAssigned = true;

    media.push({ type: file.kind, publicId: uploadedId, order: index, isCover });
    console.log(`    ↳ ${file.kind === 'video' ? '🎬' : '🖼'}  ${basename(file.path)} → ${uploadedId}${isCover ? ' (cover)' : ''}`);
  }

  return media;
}

async function main() {
  loadEnvLocal();

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY doivent être définis dans .env.local');
  }
  if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
    throw new Error('CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY et CLOUDINARY_API_SECRET doivent être définis dans .env.local');
  }
  if (!existsSync(CONFIG.uploadsDir)) {
    throw new Error(
      `Dossier d'upload introuvable : ${CONFIG.uploadsDir}\n` +
        `Ajustez SERVICES_UPLOADS_DIR dans .env.local si vos images sont ailleurs.`,
    );
  }

  const supabase = createClient<Database>(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const repository = new SupabaseServiceRepository(supabase);
  const mediaProvider = new CloudinaryMediaProvider();
  const auditLogger = new SupabaseAuditLogger();

  console.log(`Dossier d'upload : ${CONFIG.uploadsDir}\n`);

  for (const service of allServices) {
    console.log(`▶ ${service.slug}`);

    // 1. Texte du service + sous-services — toujours source de vérité : data/services.ts
    const serviceId = await repository.upsertService(service);
    await repository.replaceSubServices(serviceId, service.subServices);

    // 2. Médias — dossier local optionnel : un service peut ne pas avoir encore
    //    de dossier d'upload (galerie vide en attendant les photos du client).
    const folder = findServiceFolder(CONFIG.uploadsDir, service);
    if (!folder) {
      console.log('  (aucun dossier d\'upload trouvé — galerie laissée vide)\n');
      continue;
    }

    const files = listMediaFiles(folder);
    if (files.length === 0) {
      console.log('  (dossier vide — galerie laissée vide)\n');
      continue;
    }

    const media = await uploadServiceMedia(mediaProvider, service, files);
    await repository.replaceMedia(serviceId, media);

    console.log(`  ${media.length} média(s) synchronisé(s)\n`);
  }

  await auditLogger.log({
    actorId: null,
    actorRole: ActorRole.SYSTEM,
    action: AuditAction.SERVICE_UPDATED,
    targetType: 'service',
    targetId: null,
    metadata: { source: 'migrate-services-to-supabase.ts', serviceCount: allServices.length },
  });
}

main()
  .then(() => {
    console.log('Migration du catalogue services terminée.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Échec de la migration :', error);
    process.exit(1);
  });
