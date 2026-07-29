export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      audit_logs: {
        Row: {
          action: string
          actor_user_id: string | null
          after_data: Json | null
          before_data: Json | null
          created_at: string
          entity_id: string | null
          entity_type: string
          id: string
          metadata: Json
          organization_id: string
          request_id: string | null
        }
        Insert: {
          action: string
          actor_user_id?: string | null
          after_data?: Json | null
          before_data?: Json | null
          created_at?: string
          entity_id?: string | null
          entity_type: string
          id?: string
          metadata?: Json
          organization_id: string
          request_id?: string | null
        }
        Update: {
          action?: string
          actor_user_id?: string | null
          after_data?: Json | null
          before_data?: Json | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string
          id?: string
          metadata?: Json
          organization_id?: string
          request_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_addresses: {
        Row: {
          address_line_1: string
          address_line_2: string | null
          city: string | null
          country_code: string
          created_at: string
          customer_id: string
          id: string
          is_primary: boolean
          label: string
          latitude: number | null
          longitude: number | null
          organization_id: string
          postal_code: string | null
          province: string | null
          updated_at: string
        }
        Insert: {
          address_line_1: string
          address_line_2?: string | null
          city?: string | null
          country_code: string
          created_at?: string
          customer_id: string
          id?: string
          is_primary?: boolean
          label: string
          latitude?: number | null
          longitude?: number | null
          organization_id: string
          postal_code?: string | null
          province?: string | null
          updated_at?: string
        }
        Update: {
          address_line_1?: string
          address_line_2?: string | null
          city?: string | null
          country_code?: string
          created_at?: string
          customer_id?: string
          id?: string
          is_primary?: boolean
          label?: string
          latitude?: number | null
          longitude?: number | null
          organization_id?: string
          postal_code?: string | null
          province?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_addresses_customer_org_fkey"
            columns: ["organization_id", "customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["organization_id", "id"]
          },
          {
            foreignKeyName: "customer_addresses_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_tags: {
        Row: {
          created_at: string
          customer_id: string
          organization_id: string
          tag_id: string
        }
        Insert: {
          created_at?: string
          customer_id: string
          organization_id: string
          tag_id: string
        }
        Update: {
          created_at?: string
          customer_id?: string
          organization_id?: string
          tag_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_tags_customer_org_fkey"
            columns: ["organization_id", "customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["organization_id", "id"]
          },
          {
            foreignKeyName: "customer_tags_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_tags_tag_org_fkey"
            columns: ["organization_id", "tag_id"]
            isOneToOne: false
            referencedRelation: "tags"
            referencedColumns: ["organization_id", "id"]
          },
        ]
      }
      customers: {
        Row: {
          archived_at: string | null
          company_name: string | null
          created_at: string
          created_by: string
          customer_type: string
          display_name: string
          email: string | null
          id: string
          notes: string | null
          organization_id: string
          phone: string | null
          status: string
          updated_at: string
        }
        Insert: {
          archived_at?: string | null
          company_name?: string | null
          created_at?: string
          created_by: string
          customer_type: string
          display_name: string
          email?: string | null
          id?: string
          notes?: string | null
          organization_id: string
          phone?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          archived_at?: string | null
          company_name?: string | null
          created_at?: string
          created_by?: string
          customer_type?: string
          display_name?: string
          email?: string | null
          id?: string
          notes?: string | null
          organization_id?: string
          phone?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "customers_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_balances: {
        Row: {
          organization_id: string
          product_id: string
          quantity: number
          updated_at: string
          version: number
          warehouse_id: string
        }
        Insert: {
          organization_id: string
          product_id: string
          quantity?: number
          updated_at?: string
          version?: number
          warehouse_id: string
        }
        Update: {
          organization_id?: string
          product_id?: string
          quantity?: number
          updated_at?: string
          version?: number
          warehouse_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_balances_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_balances_product_org_fkey"
            columns: ["organization_id", "product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["organization_id", "id"]
          },
          {
            foreignKeyName: "inventory_balances_warehouse_org_fkey"
            columns: ["organization_id", "warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["organization_id", "id"]
          },
        ]
      }
      inventory_transactions: {
        Row: {
          created_at: string
          created_by: string
          id: string
          idempotency_key: string | null
          organization_id: string
          product_id: string
          quantity_after: number
          quantity_before: number
          quantity_delta: number
          reason: string | null
          reference_id: string | null
          reference_type: string | null
          transaction_type: string
          warehouse_id: string
        }
        Insert: {
          created_at?: string
          created_by: string
          id?: string
          idempotency_key?: string | null
          organization_id: string
          product_id: string
          quantity_after: number
          quantity_before: number
          quantity_delta: number
          reason?: string | null
          reference_id?: string | null
          reference_type?: string | null
          transaction_type: string
          warehouse_id: string
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: string
          idempotency_key?: string | null
          organization_id?: string
          product_id?: string
          quantity_after?: number
          quantity_before?: number
          quantity_delta?: number
          reason?: string | null
          reference_id?: string | null
          reference_type?: string | null
          transaction_type?: string
          warehouse_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_transactions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_transactions_product_org_fkey"
            columns: ["organization_id", "product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["organization_id", "id"]
          },
          {
            foreignKeyName: "inventory_transactions_warehouse_org_fkey"
            columns: ["organization_id", "warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["organization_id", "id"]
          },
        ]
      }
      organization_invitations: {
        Row: {
          accepted_at: string | null
          accepted_by: string | null
          created_at: string
          email: string
          expires_at: string
          id: string
          invited_by: string
          last_sent_at: string
          organization_id: string
          revoked_at: string | null
          revoked_by: string | null
          role: string
          status: string
          token_hash: string
          updated_at: string
        }
        Insert: {
          accepted_at?: string | null
          accepted_by?: string | null
          created_at?: string
          email: string
          expires_at: string
          id?: string
          invited_by: string
          last_sent_at?: string
          organization_id: string
          revoked_at?: string | null
          revoked_by?: string | null
          role: string
          status?: string
          token_hash: string
          updated_at?: string
        }
        Update: {
          accepted_at?: string | null
          accepted_by?: string | null
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          invited_by?: string
          last_sent_at?: string
          organization_id?: string
          revoked_at?: string | null
          revoked_by?: string | null
          role?: string
          status?: string
          token_hash?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_invitations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_memberships: {
        Row: {
          created_at: string
          id: string
          joined_at: string
          organization_id: string
          role: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          joined_at?: string
          organization_id: string
          role: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          joined_at?: string
          organization_id?: string
          role?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_memberships_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          business_type: string
          created_at: string
          currency_code: string
          id: string
          name: string
          settings: Json
          slug: string
          status: string
          timezone: string
          updated_at: string
        }
        Insert: {
          business_type?: string
          created_at?: string
          currency_code?: string
          id?: string
          name: string
          settings?: Json
          slug: string
          status?: string
          timezone?: string
          updated_at?: string
        }
        Update: {
          business_type?: string
          created_at?: string
          currency_code?: string
          id?: string
          name?: string
          settings?: Json
          slug?: string
          status?: string
          timezone?: string
          updated_at?: string
        }
        Relationships: []
      }
      product_categories: {
        Row: {
          created_at: string
          id: string
          name: string
          organization_id: string
          parent_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          organization_id: string
          parent_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          organization_id?: string
          parent_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_categories_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_categories_parent_org_fkey"
            columns: ["organization_id", "parent_id"]
            isOneToOne: false
            referencedRelation: "product_categories"
            referencedColumns: ["organization_id", "id"]
          },
        ]
      }
      products: {
        Row: {
          archived_at: string | null
          category_id: string | null
          cost_price: number
          created_at: string
          created_by: string
          description: string | null
          id: string
          image_path: string | null
          is_active: boolean
          minimum_stock: number | null
          name: string
          organization_id: string
          product_type: string
          selling_price: number
          sku: string | null
          track_inventory: boolean
          unit: string
          updated_at: string
        }
        Insert: {
          archived_at?: string | null
          category_id?: string | null
          cost_price?: number
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          image_path?: string | null
          is_active?: boolean
          minimum_stock?: number | null
          name: string
          organization_id: string
          product_type: string
          selling_price?: number
          sku?: string | null
          track_inventory?: boolean
          unit: string
          updated_at?: string
        }
        Update: {
          archived_at?: string | null
          category_id?: string | null
          cost_price?: number
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          image_path?: string | null
          is_active?: boolean
          minimum_stock?: number | null
          name?: string
          organization_id?: string
          product_type?: string
          selling_price?: number
          sku?: string | null
          track_inventory?: boolean
          unit?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "products_category_org_fkey"
            columns: ["organization_id", "category_id"]
            isOneToOne: false
            referencedRelation: "product_categories"
            referencedColumns: ["organization_id", "id"]
          },
          {
            foreignKeyName: "products_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      tags: {
        Row: {
          color_token: string | null
          created_at: string
          id: string
          name: string
          organization_id: string
          updated_at: string
        }
        Insert: {
          color_token?: string | null
          created_at?: string
          id?: string
          name: string
          organization_id: string
          updated_at?: string
        }
        Update: {
          color_token?: string | null
          created_at?: string
          id?: string
          name?: string
          organization_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tags_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      warehouses: {
        Row: {
          address: string | null
          code: string
          created_at: string
          id: string
          is_active: boolean
          name: string
          organization_id: string
          updated_at: string
        }
        Insert: {
          address?: string | null
          code: string
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          organization_id: string
          updated_at?: string
        }
        Update: {
          address?: string | null
          code?: string
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          organization_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "warehouses_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      accept_organization_invitation: {
        Args: { invitation_token_hash: string }
        Returns: {
          membership_id: string
          organization_id: string
          role: string
          status: string
          reactivated: boolean
        }[]
      }
      archive_customer: {
        Args: { target_customer_id: string }
        Returns: {
          customer_id: string
          organization_id: string
          status: string
          archived_at: string
        }[]
      }
      archive_product: {
        Args: { target_product_id: string }
        Returns: {
          product_id: string
          organization_id: string
          is_active: boolean
          archived_at: string
        }[]
      }
      citext: {
        Args: { "": boolean } | { "": string } | { "": unknown }
        Returns: string
      }
      citext_hash: {
        Args: { "": string }
        Returns: number
      }
      citextin: {
        Args: { "": unknown }
        Returns: string
      }
      citextout: {
        Args: { "": string }
        Returns: unknown
      }
      citextrecv: {
        Args: { "": unknown }
        Returns: string
      }
      citextsend: {
        Args: { "": string }
        Returns: string
      }
      create_organization: {
        Args: {
          organization_business_type?: string
          organization_currency_code?: string
          organization_name: string
          organization_settings?: Json
          organization_slug: string
          organization_timezone?: string
        }
        Returns: {
          business_type: string
          created_at: string
          currency_code: string
          id: string
          name: string
          settings: Json
          slug: string
          status: string
          timezone: string
          updated_at: string
        }
      }
      create_organization_invitation: {
        Args: {
          assigned_role: string
          invitation_expires_at: string
          invitation_token_hash: string
          invited_email: string
          target_organization_id: string
        }
        Returns: {
          invitation_id: string
          organization_id: string
          email: string
          role: string
          status: string
          expires_at: string
          was_resent: boolean
        }[]
      }
      current_user_can_archive_customers: {
        Args: { checked_organization_id: string }
        Returns: boolean
      }
      current_user_can_archive_products: {
        Args: { checked_organization_id: string }
        Returns: boolean
      }
      current_user_can_assign_invitation_role: {
        Args: { assigned_role: string; checked_organization_id: string }
        Returns: boolean
      }
      current_user_can_create_customers: {
        Args: { checked_organization_id: string }
        Returns: boolean
      }
      current_user_can_invite_member: {
        Args: { checked_organization_id: string }
        Returns: boolean
      }
      current_user_can_manage_inventory: {
        Args: { checked_organization_id: string }
        Returns: boolean
      }
      current_user_can_manage_products: {
        Args: { checked_organization_id: string }
        Returns: boolean
      }
      current_user_can_read_customers: {
        Args: { checked_organization_id: string }
        Returns: boolean
      }
      current_user_can_read_inventory: {
        Args: { checked_organization_id: string }
        Returns: boolean
      }
      current_user_can_read_products: {
        Args: { checked_organization_id: string }
        Returns: boolean
      }
      current_user_can_update_customers: {
        Args: { checked_organization_id: string }
        Returns: boolean
      }
      current_user_has_active_membership: {
        Args: { checked_organization_id: string }
        Returns: boolean
      }
      current_user_has_organization_role: {
        Args: { allowed_roles: string[]; checked_organization_id: string }
        Returns: boolean
      }
      current_user_is_organization_owner: {
        Args: { checked_organization_id: string }
        Returns: boolean
      }
      customer_is_active_in_organization: {
        Args: { checked_customer_id: string; checked_organization_id: string }
        Returns: boolean
      }
      get_organization_invitation_preview: {
        Args: { invitation_token_hash: string }
        Returns: {
          invitation_status: string
          organization_name: string
          invited_email: string
          assigned_role: string
          expires_at: string
        }[]
      }
      get_organization_team_members: {
        Args: { target_organization_id: string }
        Returns: {
          membership_id: string
          user_id: string
          email: string
          role: string
          status: string
          joined_at: string
        }[]
      }
      perform_stock_adjustment: {
        Args: {
          p_adjustment_type: string
          p_idempotency_key?: string
          p_product_id: string
          p_quantity: number
          p_reason?: string
          p_warehouse_id: string
        }
        Returns: {
          transaction_id: string
          organization_id: string
          warehouse_id: string
          product_id: string
          created_at: string
          transaction_type: string
          quantity_delta: number
          quantity_before: number
          quantity_after: number
        }[]
      }
      record_organization_audit_event: {
        Args: {
          actor_id: string
          audit_action: string
          audit_after_data?: Json
          audit_before_data?: Json
          audit_entity_id: string
          audit_entity_type: string
          audit_metadata?: Json
          target_organization_id: string
        }
        Returns: undefined
      }
      revoke_organization_invitation: {
        Args: { invitation_id: string }
        Returns: {
          revoked_invitation_id: string
          organization_id: string
          email: string
          role: string
          status: string
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

