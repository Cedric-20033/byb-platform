// src/lib/downloadTextFile.ts

/** Marque d'ordre des octets : sans elle, Excel lit un CSV UTF-8 en Windows-1252 et abîme les accents. */
const UTF8_BOM = '﻿';

/** Déclenche le téléchargement d'un fichier texte généré dans le navigateur (aucun aller-retour serveur). */
export function downloadTextFile(fileName: string, content: string, mimeType: string): void {
  const blob = new Blob([UTF8_BOM, content], { type: `${mimeType};charset=utf-8` });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();

  URL.revokeObjectURL(url);
}
