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
      asaas_subscriptions: {
        Row: {
          asaas_customer_id: string | null
          asaas_payment_id: string | null
          asaas_subscription_id: string | null
          created_at: string
          email: string
          expires_at: string | null
          id: string
          plan: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          asaas_customer_id?: string | null
          asaas_payment_id?: string | null
          asaas_subscription_id?: string | null
          created_at?: string
          email: string
          expires_at?: string | null
          id?: string
          plan: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          asaas_customer_id?: string | null
          asaas_payment_id?: string | null
          asaas_subscription_id?: string | null
          created_at?: string
          email?: string
          expires_at?: string | null
          id?: string
          plan?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      bank_connections: {
        Row: {
          created_at: string
          id: string
          institution_name: string | null
          last_synced_at: string | null
          pluggy_item_id: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          institution_name?: string | null
          last_synced_at?: string | null
          pluggy_item_id: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          institution_name?: string | null
          last_synced_at?: string | null
          pluggy_item_id?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      bank_transactions_cache: {
        Row: {
          amount: number
          connection_id: string
          created_at: string
          date: string
          description: string
          id: string
          imported_subscription_id: string | null
          pluggy_transaction_id: string
          user_id: string
        }
        Insert: {
          amount: number
          connection_id: string
          created_at?: string
          date: string
          description: string
          id?: string
          imported_subscription_id?: string | null
          pluggy_transaction_id: string
          user_id: string
        }
        Update: {
          amount?: number
          connection_id?: string
          created_at?: string
          date?: string
          description?: string
          id?: string
          imported_subscription_id?: string | null
          pluggy_transaction_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bank_transactions_cache_connection_id_fkey"
            columns: ["connection_id"]
            isOneToOne: false
            referencedRelation: "bank_connections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bank_transactions_cache_imported_subscription_id_fkey"
            columns: ["imported_subscription_id"]
            isOneToOne: false
            referencedRelation: "subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      price_reports: {
        Row: {
          created_at: string
          id: string
          nome_plano: string
          servico: string
          user_id: string
          valor_reportado: number
        }
        Insert: {
          created_at?: string
          id?: string
          nome_plano: string
          servico: string
          user_id: string
          valor_reportado: number
        }
        Update: {
          created_at?: string
          id?: string
          nome_plano?: string
          servico?: string
          user_id?: string
          valor_reportado?: number
        }
        Relationships: []
      }
      price_suggestions: {
        Row: {
          applied: boolean
          created_at: string
          current_price: number
          dismissed: boolean
          id: string
          nome_plano: string
          servico: string
          subscription_id: string
          suggested_price: number
          user_id: string
        }
        Insert: {
          applied?: boolean
          created_at?: string
          current_price: number
          dismissed?: boolean
          id?: string
          nome_plano: string
          servico: string
          subscription_id: string
          suggested_price: number
          user_id: string
        }
        Update: {
          applied?: boolean
          created_at?: string
          current_price?: number
          dismissed?: boolean
          id?: string
          nome_plano?: string
          servico?: string
          subscription_id?: string
          suggested_price?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "price_suggestions_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string | null
          id: string
          last_onboarding_reminder_sent: string | null
          last_winback_email_sent: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id: string
          last_onboarding_reminder_sent?: string | null
          last_winback_email_sent?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          last_onboarding_reminder_sent?: string | null
          last_winback_email_sent?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      servicos_planos: {
        Row: {
          created_at: string
          id: string
          nome_plano: string
          servico: string
          updated_at: string
          valor: number
        }
        Insert: {
          created_at?: string
          id?: string
          nome_plano: string
          servico: string
          updated_at?: string
          valor: number
        }
        Update: {
          created_at?: string
          id?: string
          nome_plano?: string
          servico?: string
          updated_at?: string
          valor?: number
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          bank_connection_id: string | null
          billing_cycle: string
          category: Database["public"]["Enums"]["subscription_category"]
          created_at: string
          id: string
          last_reminder_sent: string | null
          name: string
          next_charge_date: string | null
          price: number
          servico: string | null
          source: string
          status: string
          subscription_status: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          bank_connection_id?: string | null
          billing_cycle?: string
          category?: Database["public"]["Enums"]["subscription_category"]
          created_at?: string
          id?: string
          last_reminder_sent?: string | null
          name: string
          next_charge_date?: string | null
          price?: number
          servico?: string | null
          source?: string
          status?: string
          subscription_status?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          bank_connection_id?: string | null
          billing_cycle?: string
          category?: Database["public"]["Enums"]["subscription_category"]
          created_at?: string
          id?: string
          last_reminder_sent?: string | null
          name?: string
          next_charge_date?: string | null
          price?: number
          servico?: string | null
          source?: string
          status?: string
          subscription_status?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_bank_connection_id_fkey"
            columns: ["bank_connection_id"]
            isOneToOne: false
            referencedRelation: "bank_connections"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      calcular_economia_assinaturas: {
        Args: { user_id_param: string }
        Returns: Json
      }
      get_price_consensus: {
        Args: { p_nome_plano: string; p_servico: string; p_threshold?: number }
        Returns: Json
      }
      send_onboarding_reminders: { Args: never; Returns: undefined }
      send_renewal_reminders: { Args: never; Returns: undefined }
    }
    Enums: {
      subscription_category: "alimentacao" | "musica" | "streaming" | "outros"
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
      subscription_category: ["alimentacao", "musica", "streaming", "outros"],
    },
  },
} as const
