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
      asset_liquidation_settings: {
        Row: {
          asset_id: string
          created_at: string
          id: string
          liquidation_year: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          asset_id: string
          created_at?: string
          id?: string
          liquidation_year: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          asset_id?: string
          created_at?: string
          id?: string
          liquidation_year?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "asset_liquidation_settings_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: true
            referencedRelation: "assets"
            referencedColumns: ["id"]
          },
        ]
      }
      assets: {
        Row: {
          account_bank: string
          account_entity: string
          beneficiary: string
          class: string
          created_at: string
          factor: number | null
          id: string
          isin: string | null
          maturity_date: string | null
          name: string
          origin_currency: string
          pe_company_value: number | null
          pe_holding_percentage: number | null
          price: number
          quantity: number
          sub_class: string
          updated_at: string
          user_id: string | null
          ytw: number | null
        }
        Insert: {
          account_bank: string
          account_entity: string
          beneficiary?: string
          class: string
          created_at?: string
          factor?: number | null
          id?: string
          isin?: string | null
          maturity_date?: string | null
          name: string
          origin_currency: string
          pe_company_value?: number | null
          pe_holding_percentage?: number | null
          price: number
          quantity: number
          sub_class: string
          updated_at?: string
          user_id?: string | null
          ytw?: number | null
        }
        Update: {
          account_bank?: string
          account_entity?: string
          beneficiary?: string
          class?: string
          created_at?: string
          factor?: number | null
          id?: string
          isin?: string | null
          maturity_date?: string | null
          name?: string
          origin_currency?: string
          pe_company_value?: number | null
          pe_holding_percentage?: number | null
          price?: number
          quantity?: number
          sub_class?: string
          updated_at?: string
          user_id?: string | null
          ytw?: number | null
        }
        Relationships: []
      }
      fx_rates: {
        Row: {
          created_at: string
          currency: string
          id: string
          is_manual_override: boolean
          last_updated: string
          source: string
          to_ils_rate: number
          to_usd_rate: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          currency: string
          id?: string
          is_manual_override?: boolean
          last_updated?: string
          source?: string
          to_ils_rate?: number
          to_usd_rate?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          currency?: string
          id?: string
          is_manual_override?: boolean
          last_updated?: string
          source?: string
          to_ils_rate?: number
          to_usd_rate?: number
          updated_at?: string
        }
        Relationships: []
      }
      portfolio_snapshots: {
        Row: {
          assets: Json
          created_at: string
          description: string | null
          fixed_income_value_usd: number | null
          fx_rates: Json
          id: string
          name: string
          private_equity_value_usd: number | null
          public_equity_value_usd: number | null
          snapshot_date: string
          total_value_usd: number | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          assets?: Json
          created_at?: string
          description?: string | null
          fixed_income_value_usd?: number | null
          fx_rates?: Json
          id?: string
          name: string
          private_equity_value_usd?: number | null
          public_equity_value_usd?: number | null
          snapshot_date?: string
          total_value_usd?: number | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          assets?: Json
          created_at?: string
          description?: string | null
          fixed_income_value_usd?: number | null
          fx_rates?: Json
          id?: string
          name?: string
          private_equity_value_usd?: number | null
          public_equity_value_usd?: number | null
          snapshot_date?: string
          total_value_usd?: number | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
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
