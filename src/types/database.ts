// src/types/database.ts
//
// Ce fichier sera REMPLACÉ par les types générés automatiquement via :
//   npx supabase gen types typescript --project-id <id> > src/types/database.ts
//
// Pour l'instant il définit manuellement la structure prévue.
// NE PAS modifier manuellement une fois Supabase configuré.

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
      /**
       * Profils utilisateurs étendus (complète Supabase Auth).
       */
      profiles: {
        Row: {
          id: string;
          email: string;
          full_name: string;
          role: 'superadmin' | 'admin';
          permissions: Json; // PermissionsMap
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['profiles']['Row'], 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['profiles']['Insert']>;
      };

      /**
       * Services proposés par l'entreprise.
       * Colonnes i18n stockées en JSONB : name, short_description, full_description.
       */
      services: {
        Row: {
          id: string;
          slug: string;
          name: Json;               // { fr: string, en?: string, de?: string }
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
      };

      /**
       * Réalisations / chantiers.
       */
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
      };

      /**
       * [PRÉVU — phase 2] Créneaux horaires.
       */
      slots: {
        Row: {
          id: string;
          date: string;
          start_time: string;
          end_time: string;
          status: 'available' | 'booked' | 'blocked';
          service_id: string | null;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['slots']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['slots']['Insert']>;
      };

      /**
       * [PRÉVU — phase 2] Rendez-vous.
       */
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
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['appointments']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['appointments']['Insert']>;
      };

      /**
       * Journal des actions (audit log).
       */
      audit_logs: {
        Row: {
          id: string;
          actor_id: string | null;
          actor_role: 'superadmin' | 'admin' | 'system' | 'client';
          action: string;           // ex: 'APPOINTMENT_CREATED'
          target_type: string;      // ex: 'appointment'
          target_id: string | null;
          metadata: Json;
          ip_address: string | null;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['audit_logs']['Row'], 'id' | 'created_at'>;
        Update: never; // Les logs sont immuables
      };

      /**
       * [PRÉVU — phase 2] Jours fériés et congés.
       */
      holidays: {
        Row: {
          id: string;
          date: string;
          label: string;
          is_recurring: boolean;    // récurrent chaque année (fête nationale, etc.)
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['holidays']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['holidays']['Insert']>;
      };
    };
  };
};