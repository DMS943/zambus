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
    PostgrestVersion: "13.0.4"
  }
  public: {
    Tables: {
      bookings: {
        Row: {
          baggage_weight_kg: number | null
          booking_date: string
          booking_reference: string
          contact_email: string | null
          contact_phone: string
          created_at: string | null
          extra_luggage_count: number | null
          id: string
          payment_method: string | null
          payment_reference: string | null
          schedule_id: string
          status: Database["public"]["Enums"]["booking_status"] | null
          total_passengers: number
          total_price_zmw: number
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          baggage_weight_kg?: number | null
          booking_date: string
          booking_reference: string
          contact_email?: string | null
          contact_phone: string
          created_at?: string | null
          extra_luggage_count?: number | null
          id?: string
          payment_method?: string | null
          payment_reference?: string | null
          schedule_id: string
          status?: Database["public"]["Enums"]["booking_status"] | null
          total_passengers: number
          total_price_zmw: number
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          baggage_weight_kg?: number | null
          booking_date?: string
          booking_reference?: string
          contact_email?: string | null
          contact_phone?: string
          created_at?: string | null
          extra_luggage_count?: number | null
          id?: string
          payment_method?: string | null
          payment_reference?: string | null
          schedule_id?: string
          status?: Database["public"]["Enums"]["booking_status"] | null
          total_passengers?: number
          total_price_zmw?: number
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bookings_schedule_id_fkey"
            columns: ["schedule_id"]
            isOneToOne: false
            referencedRelation: "schedules"
            referencedColumns: ["id"]
          },
        ]
      }
      bus_operators: {
        Row: {
          contact_email: string | null
          contact_phone: string | null
          created_at: string | null
          id: string
          is_active: boolean | null
          name: string
        }
        Insert: {
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name: string
        }
        Update: {
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
        }
        Relationships: []
      }
      buses: {
        Row: {
          amenities: string[] | null
          bus_class: Database["public"]["Enums"]["bus_class"]
          created_at: string | null
          id: string
          is_active: boolean | null
          license_plate: string
          operator_id: string
          total_seats: number
        }
        Insert: {
          amenities?: string[] | null
          bus_class: Database["public"]["Enums"]["bus_class"]
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          license_plate: string
          operator_id: string
          total_seats: number
        }
        Update: {
          amenities?: string[] | null
          bus_class?: Database["public"]["Enums"]["bus_class"]
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          license_plate?: string
          operator_id?: string
          total_seats?: number
        }
        Relationships: [
          {
            foreignKeyName: "buses_operator_id_fkey"
            columns: ["operator_id"]
            isOneToOne: false
            referencedRelation: "bus_operators"
            referencedColumns: ["id"]
          },
        ]
      }
      passengers: {
        Row: {
          booking_id: string
          created_at: string | null
          email: string | null
          first_name: string
          id: string
          last_name: string
          phone: string | null
          seat_number: string
        }
        Insert: {
          booking_id: string
          created_at?: string | null
          email?: string | null
          first_name: string
          id?: string
          last_name: string
          phone?: string | null
          seat_number: string
        }
        Update: {
          booking_id?: string
          created_at?: string | null
          email?: string | null
          first_name?: string
          id?: string
          last_name?: string
          phone?: string | null
          seat_number?: string
        }
        Relationships: [
          {
            foreignKeyName: "passengers_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string | null
          email: string | null
          first_name: string
          id: string
          last_name: string
          phone: string | null
          preferred_language:
            | Database["public"]["Enums"]["language_preference"]
            | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          email?: string | null
          first_name: string
          id: string
          last_name: string
          phone?: string | null
          preferred_language?:
            | Database["public"]["Enums"]["language_preference"]
            | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string | null
          first_name?: string
          id?: string
          last_name?: string
          phone?: string | null
          preferred_language?:
            | Database["public"]["Enums"]["language_preference"]
            | null
          updated_at?: string | null
        }
        Relationships: []
      }
      routes: {
        Row: {
          created_at: string | null
          destination: string
          distance_km: number | null
          estimated_duration_hours: number | null
          id: string
          is_active: boolean | null
          origin: string
        }
        Insert: {
          created_at?: string | null
          destination: string
          distance_km?: number | null
          estimated_duration_hours?: number | null
          id?: string
          is_active?: boolean | null
          origin: string
        }
        Update: {
          created_at?: string | null
          destination?: string
          distance_km?: number | null
          estimated_duration_hours?: number | null
          id?: string
          is_active?: boolean | null
          origin?: string
        }
        Relationships: []
      }
      schedules: {
        Row: {
          arrival_time: string | null
          available_dates: string[] | null
          bus_id: string
          created_at: string | null
          departure_time: string
          id: string
          is_active: boolean | null
          price_zmw: number
          route_id: string
        }
        Insert: {
          arrival_time?: string | null
          available_dates?: string[] | null
          bus_id: string
          created_at?: string | null
          departure_time: string
          id?: string
          is_active?: boolean | null
          price_zmw: number
          route_id: string
        }
        Update: {
          arrival_time?: string | null
          available_dates?: string[] | null
          bus_id?: string
          created_at?: string | null
          departure_time?: string
          id?: string
          is_active?: boolean | null
          price_zmw?: number
          route_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "schedules_bus_id_fkey"
            columns: ["bus_id"]
            isOneToOne: false
            referencedRelation: "buses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "schedules_route_id_fkey"
            columns: ["route_id"]
            isOneToOne: false
            referencedRelation: "routes"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string | null
          created_by: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      seat_reservations: {
        Row: {
          id: string
          schedule_id: string
          booking_date: string
          seat_number: string
          reserved_by: string | null
          session_id: string
          reserved_at: string
          expires_at: string
          booking_id: string | null
          status: string
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          schedule_id: string
          booking_date: string
          seat_number: string
          reserved_by?: string | null
          session_id: string
          reserved_at?: string
          expires_at?: string
          booking_id?: string | null
          status?: string
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          schedule_id?: string
          booking_date?: string
          seat_number?: string
          reserved_by?: string | null
          session_id?: string
          reserved_at?: string
          expires_at?: string
          booking_id?: string | null
          status?: string
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "seat_reservations_schedule_id_fkey"
            columns: ["schedule_id"]
            isOneToOne: false
            referencedRelation: "schedules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "seat_reservations_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      rate_limits: {
        Row: {
          id: string
          user_id: string | null
          ip_address: string | null
          action: string
          attempt_count: number
          window_start: string
          blocked_until: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          user_id?: string | null
          ip_address?: string | null
          action: string
          attempt_count?: number
          window_start?: string
          blocked_until?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string | null
          ip_address?: string | null
          action?: string
          attempt_count?: number
          window_start?: string
          blocked_until?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      audit_logs: {
        Row: {
          id: string
          user_id: string | null
          action: string
          resource_type: string
          resource_id: string | null
          old_values: Json | null
          new_values: Json | null
          ip_address: string | null
          user_agent: string | null
          metadata: Json | null
          created_at: string | null
        }
        Insert: {
          id?: string
          user_id?: string | null
          action: string
          resource_type: string
          resource_id?: string | null
          old_values?: Json | null
          new_values?: Json | null
          ip_address?: string | null
          user_agent?: string | null
          metadata?: Json | null
          created_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string | null
          action?: string
          resource_type?: string
          resource_id?: string | null
          old_values?: Json | null
          new_values?: Json | null
          ip_address?: string | null
          user_agent?: string | null
          metadata?: Json | null
          created_at?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      assign_role: {
        Args: {
          _target_user_id: string
          _role: Database["public"]["Enums"]["app_role"]
          _created_by?: string | null
        }
        Returns: void
      }
      get_user_roles: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"][]
      }
      reserve_seats: {
        Args: {
          p_schedule_id: string
          p_booking_date: string
          p_seat_numbers: string[]
          p_session_id: string
          p_user_id?: string | null
        }
        Returns: {
          success: boolean
          message: string
          reserved_seats: string[]
        }[]
      }
      confirm_seat_reservations: {
        Args: {
          p_session_id: string
          p_booking_id: string
        }
        Returns: boolean
      }
      release_seat_reservations: {
        Args: {
          p_session_id: string
        }
        Returns: boolean
      }
      get_available_seats: {
        Args: {
          p_schedule_id: string
          p_booking_date: string
        }
        Returns: {
          seat_number: string
          is_available: boolean
        }[]
      }
      create_booking_with_passengers: {
        Args: {
          p_user_id: string
          p_schedule_id: string
          p_booking_date: string
          p_total_passengers: number
          p_total_price_zmw: number
          p_contact_phone: string
          p_contact_email: string | null
          p_baggage_weight_kg: number
          p_extra_luggage_count: number
          p_payment_method: string
          p_passengers: Json
          p_session_id: string
        }
        Returns: {
          success: boolean
          message: string
          booking_id: string | null
          booking_reference: string | null
        }[]
      }
      update_booking_payment: {
        Args: {
          p_booking_id: string
          p_payment_reference: string
          p_payment_method: string
          p_user_id: string
        }
        Returns: {
          success: boolean
          message: string
        }[]
      }
      cancel_booking: {
        Args: {
          p_booking_id: string
          p_user_id: string
          p_reason?: string | null
        }
        Returns: {
          success: boolean
          message: string
        }[]
      }
      check_rate_limit: {
        Args: {
          p_user_id: string | null
          p_ip_address: string | null
          p_action: string
          p_max_attempts?: number
          p_window_minutes?: number
        }
        Returns: {
          allowed: boolean
          message: string
          retry_after: number
        }[]
      }
      log_audit: {
        Args: {
          p_user_id: string | null
          p_action: string
          p_resource_type: string
          p_resource_id: string | null
          p_old_values?: Json | null
          p_new_values?: Json | null
          p_metadata?: Json | null
        }
        Returns: string
      }
      cleanup_expired_reservations: {
        Args: Record<string, never>
        Returns: void
      }
      cleanup_old_rate_limits: {
        Args: Record<string, never>
        Returns: void
      }
      sanitize_text: {
        Args: { input_text: string }
        Returns: string
      }
      search_users_for_admin: {
        Args: { search_term: string }
        Returns: {
          id: string
          email: string
          first_name: string
          last_name: string
          phone: string
        }[]
      }
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin_or_moderator: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "moderator" | "operator" | "user"
      booking_status: "pending" | "confirmed" | "cancelled" | "completed"
      bus_class: "economy" | "luxury" | "vip"
      language_preference: "english" | "bemba" | "nyanja"
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
    Enums: {
      app_role: ["admin", "moderator", "user"],
      booking_status: ["pending", "confirmed", "cancelled", "completed"],
      bus_class: ["economy", "luxury", "vip"],
      language_preference: ["english", "bemba", "nyanja"],
    },
  },
} as const
