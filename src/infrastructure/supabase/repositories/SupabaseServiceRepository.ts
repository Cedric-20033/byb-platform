import { createClient } from '../server'
import type { Service } from '@/types'

export class SupabaseServiceRepository {

  async findAll(): Promise<Service[]> {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('services')
      .select('*')
      .eq('is_active', true)
      .order('order')

    if (error) throw new Error(error.message)
    return data.map(this.mapToService)
  }

  // Transforme la ligne Supabase en type Service de l'application
  private mapToService(row: Database['public']['Tables']['services']['Row']): Service {
    return {
      id: row.id,
      slug: row.slug,
      name: row.name as I18nField,
      // ...
    }
  }
}