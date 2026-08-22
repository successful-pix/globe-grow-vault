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
    PostgrestVersion: "14.15"
  }
  public: {
    Tables: {
      balances: {
        Row: {
          amount: number
          symbol: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount?: number
          symbol: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          symbol?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      investment_plans: {
        Row: {
          active: boolean
          created_at: string
          duration_days: number
          id: string
          max_amount: number
          min_amount: number
          name: string
          profit_percent: number
        }
        Insert: {
          active?: boolean
          created_at?: string
          duration_days: number
          id?: string
          max_amount?: number
          min_amount?: number
          name: string
          profit_percent: number
        }
        Update: {
          active?: boolean
          created_at?: string
          duration_days?: number
          id?: string
          max_amount?: number
          min_amount?: number
          name?: string
          profit_percent?: number
        }
        Relationships: []
      }
      investments: {
        Row: {
          amount: number
          created_at: string
          duration_days: number
          end_at: string
          id: string
          plan_id: string | null
          plan_name: string
          profit_amount: number
          profit_percent: number
          start_at: string
          status: string
          symbol: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          duration_days: number
          end_at: string
          id?: string
          plan_id?: string | null
          plan_name: string
          profit_amount: number
          profit_percent: number
          start_at?: string
          status?: string
          symbol?: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          duration_days?: number
          end_at?: string
          id?: string
          plan_id?: string | null
          plan_name?: string
          profit_amount?: number
          profit_percent?: number
          start_at?: string
          status?: string
          symbol?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "investments_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "investment_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      kyc_submissions: {
        Row: {
          admin_note: string | null
          created_at: string
          document_path: string | null
          full_name: string
          id: string
          reviewed_at: string | null
          selfie_path: string | null
          status: Database["public"]["Enums"]["review_status"]
          user_id: string
        }
        Insert: {
          admin_note?: string | null
          created_at?: string
          document_path?: string | null
          full_name: string
          id?: string
          reviewed_at?: string | null
          selfie_path?: string | null
          status?: Database["public"]["Enums"]["review_status"]
          user_id: string
        }
        Update: {
          admin_note?: string | null
          created_at?: string
          document_path?: string | null
          full_name?: string
          id?: string
          reviewed_at?: string | null
          selfie_path?: string | null
          status?: Database["public"]["Enums"]["review_status"]
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          kyc_status: Database["public"]["Enums"]["kyc_status"]
          referral_code: string
          referral_earnings: number
          referred_by: string | null
        }
        Insert: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          kyc_status?: Database["public"]["Enums"]["kyc_status"]
          referral_code: string
          referral_earnings?: number
          referred_by?: string | null
        }
        Update: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          kyc_status?: Database["public"]["Enums"]["kyc_status"]
          referral_code?: string
          referral_earnings?: number
          referred_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_referred_by_fkey"
            columns: ["referred_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      support_messages: {
        Row: {
          created_at: string
          id: string
          is_admin: boolean
          message: string
          sender_id: string
          ticket_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_admin?: boolean
          message: string
          sender_id: string
          ticket_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_admin?: boolean
          message?: string
          sender_id?: string
          ticket_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_messages_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "support_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      support_tickets: {
        Row: {
          category: string
          created_at: string
          id: string
          priority: Database["public"]["Enums"]["ticket_priority"]
          status: Database["public"]["Enums"]["ticket_status"]
          subject: string
          updated_at: string
          user_id: string
        }
        Insert: {
          category?: string
          created_at?: string
          id?: string
          priority?: Database["public"]["Enums"]["ticket_priority"]
          status?: Database["public"]["Enums"]["ticket_status"]
          subject: string
          updated_at?: string
          user_id: string
        }
        Update: {
          category?: string
          created_at?: string
          id?: string
          priority?: Database["public"]["Enums"]["ticket_priority"]
          status?: Database["public"]["Enums"]["ticket_status"]
          subject?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      swaps: {
        Row: {
          created_at: string
          from_amount: number
          from_symbol: string
          id: string
          network_fee_usd: number
          rate: number
          status: string
          to_amount: number
          to_symbol: string
          user_id: string
        }
        Insert: {
          created_at?: string
          from_amount: number
          from_symbol: string
          id?: string
          network_fee_usd?: number
          rate: number
          status?: string
          to_amount: number
          to_symbol: string
          user_id: string
        }
        Update: {
          created_at?: string
          from_amount?: number
          from_symbol?: string
          id?: string
          network_fee_usd?: number
          rate?: number
          status?: string
          to_amount?: number
          to_symbol?: string
          user_id?: string
        }
        Relationships: []
      }
      transactions: {
        Row: {
          amount: number
          created_at: string
          id: string
          note: string | null
          status: string
          symbol: string
          type: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          note?: string | null
          status?: string
          symbol: string
          type: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          note?: string | null
          status?: string
          symbol?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      wallet_address_audit: {
        Row: {
          changed_by: string
          created_at: string
          id: string
          network: string
          new_address: string
          previous_address: string | null
          symbol: string
          target_user_id: string
        }
        Insert: {
          changed_by: string
          created_at?: string
          id?: string
          network: string
          new_address: string
          previous_address?: string | null
          symbol: string
          target_user_id: string
        }
        Update: {
          changed_by?: string
          created_at?: string
          id?: string
          network?: string
          new_address?: string
          previous_address?: string | null
          symbol?: string
          target_user_id?: string
        }
        Relationships: []
      }
      wallet_addresses: {
        Row: {
          address: string
          created_at: string
          id: string
          network: string
          symbol: string
          user_id: string | null
        }
        Insert: {
          address: string
          created_at?: string
          id?: string
          network: string
          symbol: string
          user_id?: string | null
        }
        Update: {
          address?: string
          created_at?: string
          id?: string
          network?: string
          symbol?: string
          user_id?: string | null
        }
        Relationships: []
      }
      withdrawals: {
        Row: {
          address: string
          admin_note: string | null
          amount: number
          created_at: string
          id: string
          reviewed_at: string | null
          source: string
          status: Database["public"]["Enums"]["review_status"]
          symbol: string
          user_id: string
        }
        Insert: {
          address: string
          admin_note?: string | null
          amount: number
          created_at?: string
          id?: string
          reviewed_at?: string | null
          source?: string
          status?: Database["public"]["Enums"]["review_status"]
          symbol: string
          user_id: string
        }
        Update: {
          address?: string
          admin_note?: string | null
          amount?: number
          created_at?: string
          id?: string
          reviewed_at?: string | null
          source?: string
          status?: Database["public"]["Enums"]["review_status"]
          symbol?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      adjust_balance: {
        Args: { _delta: number; _symbol: string; _user_id: string }
        Returns: number
      }
      admin_adjust_balance: {
        Args: {
          _delta: number
          _note?: string
          _symbol: string
          _user_id: string
        }
        Returns: number
      }
      admin_review_kyc: {
        Args: { _approve: boolean; _id: string; _note?: string }
        Returns: undefined
      }
      admin_review_withdrawal: {
        Args: { _approve: boolean; _id: string; _note?: string }
        Returns: undefined
      }
      admin_set_user_wallet: {
        Args: {
          _address: string
          _network: string
          _symbol: string
          _user_id: string
        }
        Returns: string
      }
      admin_stats: { Args: never; Returns: Json }
      admin_users: {
        Args: never
        Returns: {
          created_at: string
          email: string
          full_name: string
          id: string
          kyc_status: Database["public"]["Enums"]["kyc_status"]
          referral_code: string
          referral_earnings: number
          referred_count: number
          usdt_balance: number
        }[]
      }
      app_claim_investment: {
        Args: { _investment_id: string }
        Returns: number
      }
      app_invest: {
        Args: { _amount: number; _plan_id: string }
        Returns: string
      }
      app_request_withdrawal: {
        Args: {
          _address: string
          _amount: number
          _source?: string
          _symbol: string
        }
        Returns: string
      }
      app_submit_kyc: {
        Args: {
          _document_path: string
          _full_name: string
          _selfie_path: string
        }
        Returns: string
      }
      app_swap: {
        Args: {
          _fee: number
          _from: string
          _from_amount: number
          _rate: number
          _to: string
          _to_amount: number
        }
        Returns: string
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: never; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "user"
      kyc_status: "none" | "pending" | "approved" | "rejected"
      review_status: "pending" | "approved" | "rejected"
      ticket_priority: "low" | "normal" | "high" | "urgent"
      ticket_status: "open" | "pending" | "resolved" | "closed"
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
      app_role: ["admin", "user"],
      kyc_status: ["none", "pending", "approved", "rejected"],
      review_status: ["pending", "approved", "rejected"],
      ticket_priority: ["low", "normal", "high", "urgent"],
      ticket_status: ["open", "pending", "resolved", "closed"],
    },
  },
} as const
