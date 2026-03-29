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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      document_templates: {
        Row: {
          activo: boolean | null
          content: string
          created_at: string | null
          created_by: string | null
          fields: Json
          id: string
          servicio_id: number | null
          title: string
          updated_at: string | null
        }
        Insert: {
          activo?: boolean | null
          content: string
          created_at?: string | null
          created_by?: string | null
          fields?: Json
          id?: string
          servicio_id?: number | null
          title: string
          updated_at?: string | null
        }
        Update: {
          activo?: boolean | null
          content?: string
          created_at?: string | null
          created_by?: string | null
          fields?: Json
          id?: string
          servicio_id?: number | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "document_templates_servicio_id_fkey"
            columns: ["servicio_id"]
            isOneToOne: false
            referencedRelation: "servicios"
            referencedColumns: ["id"]
          },
        ]
      }
      documents: {
        Row: {
          created_at: string | null
          created_by: string | null
          field_values: Json
          generated_url: string | null
          id: string
          rejection_reason: string | null
          review_notes: string | null
          reviewed_by: string | null
          status: string | null
          template_id: string | null
          ticket_id: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          field_values?: Json
          generated_url?: string | null
          id?: string
          rejection_reason?: string | null
          review_notes?: string | null
          reviewed_by?: string | null
          status?: string | null
          template_id?: string | null
          ticket_id?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          field_values?: Json
          generated_url?: string | null
          id?: string
          rejection_reason?: string | null
          review_notes?: string | null
          reviewed_by?: string | null
          status?: string | null
          template_id?: string | null
          ticket_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "documents_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "document_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      instruments: {
        Row: {
          created_at: string | null
          id: number
          name: string
          owner_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: never
          name: string
          owner_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: never
          name?: string
          owner_id?: string | null
        }
        Relationships: []
      }
      notifications: {
        Row: {
          actor_user_id: string | null
          body: string
          created_at: string
          entity_id: string | null
          entity_type: string | null
          id: string
          link_path: string
          payload: Json
          read_at: string | null
          recipient_user_id: string
          ticket_id: string | null
          title: string
          type: string
        }
        Insert: {
          actor_user_id?: string | null
          body?: string
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          link_path: string
          payload?: Json
          read_at?: string | null
          recipient_user_id: string
          ticket_id?: string | null
          title: string
          type: string
        }
        Update: {
          actor_user_id?: string | null
          body?: string
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          link_path?: string
          payload?: Json
          read_at?: string | null
          recipient_user_id?: string
          ticket_id?: string | null
          title?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_preferences: {
        Row: {
          created_at: string
          enabled: boolean
          notification_type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          enabled?: boolean
          notification_type: string
          user_id: string
        }
        Update: {
          created_at?: string
          enabled?: boolean
          notification_type?: string
          user_id?: string
        }
        Relationships: []
      }
      padron_distritos: {
        Row: {
          canton: string
          canton_num: number
          codigo_electoral: string
          distrito: string
          distrito_num: number
          provincia: string
          provincia_num: number
          snapshot_date: string
          source_hash: string
          updated_at: string
        }
        Insert: {
          canton: string
          canton_num: number
          codigo_electoral: string
          distrito: string
          distrito_num: number
          provincia: string
          provincia_num: number
          snapshot_date: string
          source_hash: string
          updated_at?: string
        }
        Update: {
          canton?: string
          canton_num?: number
          codigo_electoral?: string
          distrito?: string
          distrito_num?: number
          provincia?: string
          provincia_num?: number
          snapshot_date?: string
          source_hash?: string
          updated_at?: string
        }
        Relationships: []
      }
      padron_distritos_staging: {
        Row: {
          canton: string
          canton_num: number
          codigo_electoral: string
          distrito: string
          distrito_num: number
          import_id: string
          provincia: string
          provincia_num: number
          snapshot_date: string
          source_hash: string
        }
        Insert: {
          canton: string
          canton_num: number
          codigo_electoral: string
          distrito: string
          distrito_num: number
          import_id: string
          provincia: string
          provincia_num: number
          snapshot_date: string
          source_hash: string
        }
        Update: {
          canton?: string
          canton_num?: number
          codigo_electoral?: string
          distrito?: string
          distrito_num?: number
          import_id?: string
          provincia?: string
          provincia_num?: number
          snapshot_date?: string
          source_hash?: string
        }
        Relationships: [
          {
            foreignKeyName: "padron_distritos_staging_import_id_fkey"
            columns: ["import_id"]
            isOneToOne: false
            referencedRelation: "padron_import_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      padron_electores: {
        Row: {
          apellido_1: string
          apellido_2: string | null
          canton: string | null
          cedula: string
          codigo_electoral: string
          distrito: string | null
          fecha_vencimiento: string | null
          import_id: string | null
          is_active: boolean
          junta_receptora: string | null
          nombre: string
          nombre_completo: string
          provincia: string | null
          sexo: number | null
          snapshot_date: string
          source_hash: string
          updated_at: string
        }
        Insert: {
          apellido_1: string
          apellido_2?: string | null
          canton?: string | null
          cedula: string
          codigo_electoral: string
          distrito?: string | null
          fecha_vencimiento?: string | null
          import_id?: string | null
          is_active?: boolean
          junta_receptora?: string | null
          nombre: string
          nombre_completo: string
          provincia?: string | null
          sexo?: number | null
          snapshot_date: string
          source_hash: string
          updated_at?: string
        }
        Update: {
          apellido_1?: string
          apellido_2?: string | null
          canton?: string | null
          cedula?: string
          codigo_electoral?: string
          distrito?: string | null
          fecha_vencimiento?: string | null
          import_id?: string | null
          is_active?: boolean
          junta_receptora?: string | null
          nombre?: string
          nombre_completo?: string
          provincia?: string | null
          sexo?: number | null
          snapshot_date?: string
          source_hash?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "padron_electores_codigo_electoral_fkey"
            columns: ["codigo_electoral"]
            isOneToOne: false
            referencedRelation: "padron_distritos"
            referencedColumns: ["codigo_electoral"]
          },
          {
            foreignKeyName: "padron_electores_import_id_fkey"
            columns: ["import_id"]
            isOneToOne: false
            referencedRelation: "padron_import_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      padron_electores_staging: {
        Row: {
          apellido_1: string
          apellido_2: string | null
          canton: string | null
          cedula: string
          codigo_electoral: string
          distrito: string | null
          fecha_vencimiento: string | null
          import_id: string
          is_active: boolean
          junta_receptora: string | null
          nombre: string
          nombre_completo: string
          provincia: string | null
          sexo: number | null
          snapshot_date: string
          source_hash: string
        }
        Insert: {
          apellido_1: string
          apellido_2?: string | null
          canton?: string | null
          cedula: string
          codigo_electoral: string
          distrito?: string | null
          fecha_vencimiento?: string | null
          import_id: string
          is_active?: boolean
          junta_receptora?: string | null
          nombre: string
          nombre_completo: string
          provincia?: string | null
          sexo?: number | null
          snapshot_date: string
          source_hash: string
        }
        Update: {
          apellido_1?: string
          apellido_2?: string | null
          canton?: string | null
          cedula?: string
          codigo_electoral?: string
          distrito?: string | null
          fecha_vencimiento?: string | null
          import_id?: string
          is_active?: boolean
          junta_receptora?: string | null
          nombre?: string
          nombre_completo?: string
          provincia?: string | null
          sexo?: number | null
          snapshot_date?: string
          source_hash?: string
        }
        Relationships: [
          {
            foreignKeyName: "padron_electores_staging_import_id_fkey"
            columns: ["import_id"]
            isOneToOne: false
            referencedRelation: "padron_import_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      padron_import_runs: {
        Row: {
          cancel_requested: boolean
          cancel_requested_at: string | null
          district_rows_processed: number
          error_message: string | null
          finished_at: string | null
          id: string
          phase: string | null
          phase_progress: number
          rows_processed: number
          snapshot_date: string
          source_hash: string
          source_url: string
          started_at: string
          status: string
          total_rows: number
        }
        Insert: {
          cancel_requested?: boolean
          cancel_requested_at?: string | null
          district_rows_processed?: number
          error_message?: string | null
          finished_at?: string | null
          id?: string
          phase?: string | null
          phase_progress?: number
          rows_processed?: number
          snapshot_date: string
          source_hash: string
          source_url: string
          started_at?: string
          status: string
          total_rows?: number
        }
        Update: {
          cancel_requested?: boolean
          cancel_requested_at?: string | null
          district_rows_processed?: number
          error_message?: string | null
          finished_at?: string | null
          id?: string
          phase?: string | null
          phase_progress?: number
          rows_processed?: number
          snapshot_date?: string
          source_hash?: string
          source_url?: string
          started_at?: string
          status?: string
          total_rows?: number
        }
        Relationships: []
      }
      profiles: {
        Row: {
          contact_email: string | null
          contact_phone: string | null
          created_at: string
          deactivated_at: string | null
          display_name: string | null
          first_name: string | null
          is_active: boolean
          last_name: string | null
          office_address: string | null
          personal_address: string | null
          role: string
          user_id: string
        }
        Insert: {
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          deactivated_at?: string | null
          display_name?: string | null
          first_name?: string | null
          is_active?: boolean
          last_name?: string | null
          office_address?: string | null
          personal_address?: string | null
          role: string
          user_id: string
        }
        Update: {
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          deactivated_at?: string | null
          display_name?: string | null
          first_name?: string | null
          is_active?: boolean
          last_name?: string | null
          office_address?: string | null
          personal_address?: string | null
          role?: string
          user_id?: string
        }
        Relationships: []
      }
      roles: {
        Row: {
          created_at: string | null
          descripcion: string | null
          id: number
          nombre: string
        }
        Insert: {
          created_at?: string | null
          descripcion?: string | null
          id?: number
          nombre: string
        }
        Update: {
          created_at?: string | null
          descripcion?: string | null
          id?: number
          nombre?: string
        }
        Relationships: []
      }
      servicios: {
        Row: {
          activo: boolean | null
          created_at: string | null
          descripcion: string | null
          id: number
          nombre: string
          updated_at: string | null
        }
        Insert: {
          activo?: boolean | null
          created_at?: string | null
          descripcion?: string | null
          id?: number
          nombre: string
          updated_at?: string | null
        }
        Update: {
          activo?: boolean | null
          created_at?: string | null
          descripcion?: string | null
          id?: number
          nombre?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      ticket_comments: {
        Row: {
          author_id: string
          content: string
          created_at: string | null
          id: string
          is_internal: boolean | null
          ticket_id: string
        }
        Insert: {
          author_id: string
          content: string
          created_at?: string | null
          id?: string
          is_internal?: boolean | null
          ticket_id: string
        }
        Update: {
          author_id?: string
          content?: string
          created_at?: string | null
          id?: string
          is_internal?: boolean | null
          ticket_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ticket_comments_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      ticket_files: {
        Row: {
          created_at: string
          file_name: string
          file_path: string
          file_size: number | null
          file_type: string | null
          id: string
          ticket_id: string
          uploaded_by: string
        }
        Insert: {
          created_at?: string
          file_name: string
          file_path: string
          file_size?: number | null
          file_type?: string | null
          id?: string
          ticket_id: string
          uploaded_by: string
        }
        Update: {
          created_at?: string
          file_name?: string
          file_path?: string
          file_size?: number | null
          file_type?: string | null
          id?: string
          ticket_id?: string
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "ticket_files_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticket_files_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      ticket_historial: {
        Row: {
          changed_by: string | null
          created_at: string | null
          id: string
          new_status: string
          notes: string | null
          old_status: string | null
          ticket_id: string | null
        }
        Insert: {
          changed_by?: string | null
          created_at?: string | null
          id?: string
          new_status: string
          notes?: string | null
          old_status?: string | null
          ticket_id?: string | null
        }
        Update: {
          changed_by?: string | null
          created_at?: string | null
          id?: string
          new_status?: string
          notes?: string | null
          old_status?: string | null
          ticket_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ticket_historial_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      ticket_notification_mutes: {
        Row: {
          created_at: string
          ticket_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          ticket_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          ticket_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ticket_notification_mutes_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      tickets: {
        Row: {
          assigned_to: string | null
          created_at: string
          created_by: string
          description: string | null
          id: string
          priority: string
          reopen_requested: boolean
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          priority?: string
          reopen_requested?: boolean
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          priority?: string
          reopen_requested?: boolean
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      vehicle_transfer_documents: {
        Row: {
          anio_fabricacion: number
          calidades_propietario: string
          categoria: string
          cedula_propietario: string
          color: string | null
          created_at: string
          estado_tributario: string
          id: string
          marca: string | null
          modelo: string | null
          nombre_propietario: string
          owner_profile_id: string | null
          placa: string | null
          ticket_id: string | null
          updated_at: string
          valor_hacienda: number
          vin: string
        }
        Insert: {
          anio_fabricacion: number
          calidades_propietario: string
          categoria?: string
          cedula_propietario: string
          color?: string | null
          created_at?: string
          estado_tributario: string
          id?: string
          marca?: string | null
          modelo?: string | null
          nombre_propietario: string
          owner_profile_id?: string | null
          placa?: string | null
          ticket_id?: string | null
          updated_at?: string
          valor_hacienda?: number
          vin: string
        }
        Update: {
          anio_fabricacion?: number
          calidades_propietario?: string
          categoria?: string
          cedula_propietario?: string
          color?: string | null
          created_at?: string
          estado_tributario?: string
          id?: string
          marca?: string | null
          modelo?: string | null
          nombre_propietario?: string
          owner_profile_id?: string | null
          placa?: string | null
          ticket_id?: string | null
          updated_at?: string
          valor_hacienda?: number
          vin?: string
        }
        Relationships: [
          {
            foreignKeyName: "vehicle_transfer_documents_cedula_propietario_fkey"
            columns: ["cedula_propietario"]
            isOneToOne: false
            referencedRelation: "padron_electores"
            referencedColumns: ["cedula"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      current_role: { Args: never; Returns: string }
      mark_all_notifications_read: { Args: never; Returns: undefined }
      mark_notification_read: {
        Args: { p_notification_id: string }
        Returns: undefined
      }
      notification_insert: {
        Args: {
          p_actor_user_id: string
          p_body: string
          p_entity_id?: string
          p_entity_type?: string
          p_link_path: string
          p_payload?: Json
          p_recipient_user_id: string
          p_ticket_id?: string
          p_title: string
          p_type: string
        }
        Returns: string
      }
      notification_ticket_is_muted: {
        Args: { p_ticket_id: string; p_user_id: string }
        Returns: boolean
      }
      notification_type_enabled: {
        Args: { p_type: string; p_user_id: string }
        Returns: boolean
      }
      notification_notify_admins: {
        Args: {
          p_actor_user_id: string
          p_body: string
          p_entity_id?: string
          p_entity_type?: string
          p_link_path: string
          p_payload?: Json
          p_ticket_id?: string
          p_title: string
          p_type: string
        }
        Returns: undefined
      }
      notification_notify_ticket_team: {
        Args: {
          p_actor_user_id: string
          p_body: string
          p_entity_id?: string
          p_entity_type?: string
          p_link_path: string
          p_payload?: Json
          p_ticket_id: string
          p_title: string
          p_type: string
        }
        Returns: undefined
      }
      padron_clear_distritos_staging: {
        Args: { p_import_id: string }
        Returns: undefined
      }
      padron_clear_electores_staging_batch: {
        Args: {
          p_after_cedula?: string
          p_batch_size?: number
          p_import_id: string
        }
        Returns: {
          done: boolean
          last_cedula: string
          processed_count: number
        }[]
      }
      padron_clear_staging: {
        Args: { p_import_id: string }
        Returns: undefined
      }
      padron_complete_import: {
        Args: {
          p_district_rows_processed: number
          p_import_id: string
          p_phase: string
          p_phase_progress: number
          p_rows_processed: number
          p_snapshot_date: string
          p_source_hash: string
          p_total_rows: number
        }
        Returns: undefined
      }
      padron_count_missing_electores:
        | {
            Args: { p_import_id: string }
            Returns: {
              total_missing: number
            }[]
          }
        | {
            Args: { p_source_hash: string }
            Returns: {
              total_missing: number
            }[]
          }
      padron_deactivate_missing_electores:
        | { Args: { p_import_id: string }; Returns: undefined }
        | {
            Args: {
              p_after_cedula?: string
              p_batch_size?: number
              p_import_id: string
            }
            Returns: {
              done: boolean
              last_cedula: string
              processed_count: number
            }[]
          }
        | {
            Args: {
              p_after_cedula?: string
              p_batch_size?: number
              p_source_hash: string
            }
            Returns: {
              done: boolean
              last_cedula: string
              processed_count: number
            }[]
          }
      padron_finalize_import:
        | {
            Args: {
              p_district_rows_processed: number
              p_import_id: string
              p_rows_processed: number
              p_snapshot_date: string
              p_source_hash: string
            }
            Returns: undefined
          }
        | {
            Args: {
              p_district_rows_processed: number
              p_import_id: string
              p_rows_processed: number
              p_snapshot_date: string
              p_source_hash: string
              p_total_rows: number
            }
            Returns: undefined
          }
      padron_merge_distritos: {
        Args: { p_import_id: string }
        Returns: undefined
      }
      padron_merge_electores:
        | { Args: { p_import_id: string }; Returns: undefined }
        | {
            Args: {
              p_after_cedula?: string
              p_batch_size?: number
              p_import_id: string
            }
            Returns: {
              done: boolean
              last_cedula: string
              processed_count: number
            }[]
          }
    }
    Enums: {
      [_ in never]: never
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
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
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
