// src/types/database.ts
//
// Ce fichier sera REMPLACÉ par les types générés automatiquement via :
//   npx supabase gen types typescript --project-id <id> > src/types/database.ts
//
// Mis à jour manuellement pour refléter supabase/migrations/0001_appointments_module.sql.
// NE PAS modifier à la main une fois la commande gen types exécutée.

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string;
          full_name: string;
          role: 'superadmin' | 'admin';
          permissions: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['profiles']['Row'], 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['profiles']['Insert']>;
        // FK réelle vers auth.users(id) — schéma `auth` non modélisé ici.
        Relationships: [];
      };

      services: {
        Row: {
          id: string;
          slug: string;
          name: Json;
          short_description: Json;
          full_description: Json;
          icon: string;
          cover_image: string;
          gallery_images: string[];
          is_active: boolean;
          order: number;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['services']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['services']['Insert']>;
        Relationships: [];
      };

      projects: {
        Row: {
          id: string;
          title: Json;
          description: Json;
          image: string;
          category: string;
          date: string;
          is_highlighted: boolean;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['projects']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['projects']['Insert']>;
        // `category` est un slug texte, pas une vraie FK vers `services`
        // (services n'est pas encore migré vers Supabase).
        Relationships: [];
      };

      slots: {
        Row: {
          id: string;
          date: string;
          start_time: string;
          end_time: string;
          status: 'available' | 'booked' | 'blocked';
          service_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['slots']['Row'], 'id' | 'created_at' | 'updated_at'> & {
          status?: 'available' | 'booked' | 'blocked';
        };
        Update: Partial<Database['public']['Tables']['slots']['Insert']>;
        // `service_id` référence le slug de src/data/services.ts, pas une FK SQL.
        Relationships: [];
      };

      appointments: {
        Row: {
          id: string;
          slot_id: string;
          service_id: string;
          sub_service_id: string | null;
          client_name: string;
          client_email: string;
          client_phone: string;
          notes: string | null;
          status: 'pending' | 'confirmed' | 'cancelled';
          access_token: string;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<
          Database['public']['Tables']['appointments']['Row'],
          'id' | 'created_at' | 'updated_at' | 'access_token'
        > & {
          status?: 'pending' | 'confirmed' | 'cancelled';
        };
        Update: Partial<Database['public']['Tables']['appointments']['Insert']>;
        // Décrit la FK slot_id -> slots(id), nécessaire pour que l'embed
        // `.select('*, slots!inner(date)')` (SupabaseAppointmentRepository.search)
        // soit correctement typé.
        Relationships: [
          {
            foreignKeyName: 'appointments_slot_id_fkey';
            columns: ['slot_id'];
            isOneToOne: false;
            referencedRelation: 'slots';
            referencedColumns: ['id'];
          },
        ];
      };

      audit_logs: {
        Row: {
          id: string;
          actor_id: string | null;
          actor_role: 'superadmin' | 'admin' | 'system' | 'client';
          action: string;
          target_type: string;
          target_id: string | null;
          metadata: Json;
          ip_address: string | null;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['audit_logs']['Row'], 'id' | 'created_at'>;
        Update: never;
        Relationships: [
          {
            foreignKeyName: 'audit_logs_actor_id_fkey';
            columns: ['actor_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };

      holidays: {
        Row: {
          id: string;
          date: string;
          label: string;
          is_recurring: boolean;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['holidays']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['holidays']['Insert']>;
        Relationships: [];
      };
    };

    // Aucune vue SQL pour l'instant — clé requise par le générique de supabase-js.
    Views: {
      [_ in never]: never;
    };

    // Fonctions RPC définies dans 0001_appointments_module.sql.
    Functions: {
      current_role_name: {
        Args: Record<string, never>;
        Returns: string;
      };
      has_permission: {
        Args: { p_domain: string; p_action: string };
        Returns: boolean;
      };
      get_appointment_by_token: {
        Args: { p_token: string };
        Returns: {
          id: string;
          status: string;
          client_name: string;
          service_id: string;
          slot_date: string;
          slot_start_time: string;
        }[];
      };
      cancel_appointment_by_token: {
        Args: { p_token: string };
        Returns: undefined;
      };
    };

    Enums: {
      [_ in never]: never;
    };

    CompositeTypes: {
      [_ in never]: never;
    };
  };
};
