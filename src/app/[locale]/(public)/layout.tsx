/**
 * Layout du groupe de routes publiques.
 * Les parenthèses dans le nom du dossier (public) créent un groupe logique
 * sans modifier les URLs. Permet d'isoler un futur layout spécifique.
 */
export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}