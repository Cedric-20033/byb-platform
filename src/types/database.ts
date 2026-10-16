export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      appointments: {
        Row: {
          access_token: string
          anonymized_at: string | null
          client_email: string
          client_name: string
          client_phone: string
          created_at: string
          id: string
          locale: string
          notes: string | null
          service_id: string
          slot_id: string
          status: string
          sub_service_id: string | null
          updated_at: string
        }
        Insert: {
          access_token?: string
          anonymized_at?: string | null
          client_email: string
          client_name: string
          client_phone: string
          created_at?: string
          id?: string
          locale?: string
          notes?: string | null
          service_id: string
          slot_id: string
          status?: string
          sub_service_id?: string | null
          updated_at?: string
        }
        Update: {
          access_token?: string
          anonymized_at?: string | null
          client_email?: string
          client_name?: string
          client_phone?: string
          created_at?: string
          id?: string
          locale?: string
          notes?: string | null
          service_id?: string
          slot_id?: string
          status?: string
          sub_service_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "appointments_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_slot_id_fkey"
            columns: ["slot_id"]
            isOneToOne: false
            referencedRelation: "slots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_sub_service_id_fkey"
            columns: ["sub_service_id"]
            isOneToOne: false
            referencedRelation: "sub_services"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          actor_id: string | null
          actor_role: string
          created_at: string
          id: string
          ip_address: string | null
          metadata: Json
          target_id: string | null
          target_type: string
        }
        Insert: {
          action: string
          actor_id?: string | null
          actor_role: string
          created_at?: string
          id?: string
          ip_address?: string | null
          metadata?: Json
          target_id?: string | null
          target_type: string
        }
        Update: {
          action?: string
          actor_id?: string | null
          actor_role?: string
          created_at?: string
          id?: string
          ip_address?: string | null
          metadata?: Json
          target_id?: string | null
          target_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      data_retention_policy: {
        Row: {
          appointment_retention_months: number | null
          id: boolean
          updated_at: string
        }
        Insert: {
          appointment_retention_months?: number | null
          id?: boolean
          updated_at?: string
        }
        Update: {
          appointment_retention_months?: number | null
          id?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      holidays: {
        Row: {
          created_at: string
          date: string
          end_date: string
          id: string
          is_recurring: boolean
          label: string
        }
        Insert: {
          created_at?: string
          date: string
          end_date: string
          id?: string
          is_recurring?: boolean
          label: string
        }
        Update: {
          created_at?: string
          date?: string
          end_date?: string
          id?: string
          is_recurring?: boolean
          label?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          email: string
          full_name: string
          id: string
          is_active: boolean
          permissions: Json
          role: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          full_name: string
          id: string
          is_active?: boolean
          permissions?: Json
          role?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          is_active?: boolean
          permissions?: Json
          role?: string
          updated_at?: string
        }
        Relationships: []
      }
      rate_limit_events: {
        Row: {
          id: number
          key: string
          occurred_at: string
        }
        Insert: {
          id?: never
          key: string
          occurred_at?: string
        }
        Update: {
          id?: never
          key?: string
          occurred_at?: string
        }
        Relationships: []
      }
      service_media: {
        Row: {
          created_at: string
          id: string
          is_cover: boolean
          order: number
          public_id: string
          service_id: string
          type: Database["public"]["Enums"]["media_type"]
        }
        Insert: {
          created_at?: string
          id?: string
          is_cover?: boolean
          order?: number
          public_id: string
          service_id: string
          type?: Database["public"]["Enums"]["media_type"]
        }
        Update: {
          created_at?: string
          id?: string
          is_cover?: boolean
          order?: number
          public_id?: string
          service_id?: string
          type?: Database["public"]["Enums"]["media_type"]
        }
        Relationships: [
          {
            foreignKeyName: "service_media_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      services: {
        Row: {
          created_at: string
          full_description: Json
          icon: string
          id: string
          is_active: boolean
          name: Json
          order: number
          short_description: Json
          slug: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          full_description: Json
          icon: string
          id?: string
          is_active?: boolean
          name: Json
          order?: number
          short_description: Json
          slug: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          full_description?: Json
          icon?: string
          id?: string
          is_active?: boolean
          name?: Json
          order?: number
          short_description?: Json
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      slot_generation_rules: {
        Row: {
          created_at: string
          daily_end_time: string
          daily_start_time: string
          horizon_days: number
          id: string
          is_enabled: boolean
          service_id: string
          slot_minutes: number
          updated_at: string
          working_days: number[]
        }
        Insert: {
          created_at?: string
          daily_end_time?: string
          daily_start_time?: string
          horizon_days?: number
          id?: string
          is_enabled?: boolean
          service_id: string
          slot_minutes?: number
          updated_at?: string
          working_days?: number[]
        }
        Update: {
          created_at?: string
          daily_end_time?: string
          daily_start_time?: string
          horizon_days?: number
          id?: string
          is_enabled?: boolean
          service_id?: string
          slot_minutes?: number
          updated_at?: string
          working_days?: number[]
        }
        Relationships: [
          {
            foreignKeyName: "slot_generation_rules_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: true
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      slots: {
        Row: {
          created_at: string
          date: string
          end_time: string
          id: string
          service_id: string | null
          start_time: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          date: string
          end_time: string
          id?: string
          service_id?: string | null
          start_time: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          date?: string
          end_time?: string
          id?: string
          service_id?: string | null
          start_time?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "slots_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      sub_services: {
        Row: {
          created_at: string
          description: Json
          id: string
          name: Json
          order: number
          service_id: string
          slug: string
        }
        Insert: {
          created_at?: string
          description: Json
          id?: string
          name: Json
          order?: number
          service_id: string
          slug: string
        }
        Update: {
          created_at?: string
          description?: Json
          id?: string
          name?: Json
          order?: number
          service_id?: string
          slug?: string
        }
        Relationships: [
          {
            foreignKeyName: "sub_services_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_create_appointment: {
        Args: {
          p_client_email: string
          p_client_name: string
          p_client_phone: string
          p_date?: string
          p_end_time?: string
          p_notes?: string
          p_service_id: string
          p_slot_id?: string
          p_start_time?: string
          p_sub_service_id?: string
        }
        Returns: string
      }
      anonymize_appointments: { Args: { p_ids: string[] }; Returns: number }
      anonymize_expired_appointments: {
        Args: { p_today?: string }
        Returns: number
      }
      assert_client_data_permission: {
        Args: { p_action: string }
        Returns: undefined
      }
      can_do: { Args: { p_action: string; p_domain: string }; Returns: boolean }
      cancel_appointment_by_token: {
        Args: { p_token: string }
        Returns: undefined
      }
      current_role_name: { Args: never; Returns: string }
      default_admin_permissions: { Args: never; Returns: Json }
      delete_appointment: {
        Args: { p_appointment_id: string }
        Returns: undefined
      }
      erase_client_data: { Args: { p_email: string }; Returns: Json }
      export_client_data: { Args: { p_email: string }; Returns: Json }
      generate_rolling_slots: { Args: { p_today?: string }; Returns: number }
      get_appointment_by_token: {
        Args: { p_token: string }
        Returns: {
          client_name: string
          id: string
          service_id: string
          slot_date: string
          slot_start_time: string
          status: string
        }[]
      }
      has_permission: {
        Args: { p_action: string; p_domain: string }
        Returns: boolean
      }
      purge_rate_limit_events: { Args: never; Returns: number }
      reorder_service_media: {
        Args: { p_ordered_ids: string[]; p_service_id: string }
        Returns: undefined
      }
      reorder_services: {
        Args: { p_ordered_ids: string[] }
        Returns: undefined
      }
      reorder_sub_services: {
        Args: { p_ordered_ids: string[]; p_service_id: string }
        Returns: undefined
      }
      reschedule_appointment: {
        Args: { p_appointment_id: string; p_new_slot_id: string }
        Returns: undefined
      }
      set_service_cover: {
        Args: { p_media_id: string; p_service_id: string }
        Returns: undefined
      }
    }
    Enums: {
      media_type: "image" | "video"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      media_type: ["image", "video"],
    },
  },
} as const
