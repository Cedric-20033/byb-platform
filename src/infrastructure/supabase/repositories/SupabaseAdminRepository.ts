// src/infrastructure/supabase/repositories/SupabaseAdminRepository.ts
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';
import { AdminProfile } from '@/domain/user/AdminProfile';
import type { AdminRepository } from '@/domain/user/AdminRepository';
import { PermissionSet } from '@/domain/user/PermissionSet';
import { isUserRole, type UserRole } from '@/domain/user/UserRole';
import { DomainError } from '@/domain/shared/DomainError';

type ProfileRow = Database['public']['Tables']['profiles']['Row'];

const COLUMNS = 'id, email, full_name, role, permissions, is_active, created_at';

/**
 * Le client injecté porte la session de l'appelant : le RLS (profiles,
 * écriture réservée au superadmin) reste la seconde barrière après les
 * vérifications de permission applicatives.
 */
export class SupabaseAdminRepository implements AdminRepository {
  constructor(private readonly supabase: SupabaseClient<Database>) {}

  async findAll(): Promise<AdminProfile[]> {
    const { data, error } = await this.supabase.from('profiles').select(COLUMNS).order('created_at');
    if (error) throw new Error(error.message);
    return data.map(toDomain);
  }

  async findById(id: string): Promise<AdminProfile | null> {
    const { data, error } = await this.supabase.from('profiles').select(COLUMNS).eq('id', id).maybeSingle();
    if (error) throw new Error(error.message);
    return data ? toDomain(data) : null;
  }

  async findByEmail(email: string): Promise<AdminProfile | null> {
    // `ilike` sans joker : comparaison insensible à la casse. On échappe `%` et `_` pour éviter les motifs.
    const escaped = email.replace(/[\\%_]/g, (char) => `\\${char}`);
    const { data, error } = await this.supabase.from('profiles').select(COLUMNS).ilike('email', escaped).maybeSingle();
    if (error) throw new Error(error.message);
    return data ? toDomain(data) : null;
  }

  updateRole(id: string, role: UserRole): Promise<AdminProfile> {
    return this.update(id, { role });
  }

  updatePermissions(id: string, permissions: PermissionSet): Promise<AdminProfile> {
    return this.update(id, { permissions: permissions.toJSON() });
  }

  setActive(id: string, isActive: boolean): Promise<AdminProfile> {
    return this.update(id, { is_active: isActive });
  }

  /**
   * Un UPDATE refusé par le RLS ne renvoie aucune ligne au lieu de lever une
   * erreur : l'absence de ligne signifie donc « introuvable ou non autorisé ».
   */
  private async update(id: string, changes: Database['public']['Tables']['profiles']['Update']): Promise<AdminProfile> {
    const { data, error } = await this.supabase
      .from('profiles')
      .update(changes)
      .eq('id', id)
      .select(COLUMNS)
      .maybeSingle();

    if (error) throw new Error(error.message);
    if (!data) throw new DomainError(`Compte administrateur introuvable : ${id}`, 'ADMIN_NOT_FOUND');
    return toDomain(data);
  }
}

/**
 * `profiles.role` est une colonne `text` (contrainte CHECK en base, mais typée
 * `string` par Supabase). On valide plutôt que de caster : une valeur corrompue
 * échoue explicitement au lieu de se propager dans les contrôles RBAC.
 */
function toDomain(row: Pick<ProfileRow, 'id' | 'email' | 'full_name' | 'role' | 'permissions' | 'is_active' | 'created_at'>): AdminProfile {
  if (!isUserRole(row.role)) {
    throw new Error(`Rôle administrateur invalide en base : "${row.role}"`);
  }
  return new AdminProfile(
    row.id,
    row.email,
    row.full_name,
    PermissionSet.from(row.role, row.permissions),
    row.is_active,
    new Date(row.created_at),
  );
}
