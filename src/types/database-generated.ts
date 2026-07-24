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
      audit_logs: {
        Row: {
          action: string;
          actor_user_id: string | null;
          after_data: Json | null;
          before_data: Json | null;
          created_at: string;
          entity_id: string | null;
          entity_type: string;
          id: string;
          metadata: Json;
          organization_id: string;
          request_id: string | null;
        };
        Insert: {
          action: string;
          actor_user_id?: string | null;
          after_data?: Json | null;
          before_data?: Json | null;
          created_at?: string;
          entity_id?: string | null;
          entity_type: string;
          id?: string;
          metadata?: Json;
          organization_id: string;
          request_id?: string | null;
        };
        Update: {
          action?: string;
          actor_user_id?: string | null;
          after_data?: Json | null;
          before_data?: Json | null;
          created_at?: string;
          entity_id?: string | null;
          entity_type?: string;
          id?: string;
          metadata?: Json;
          organization_id?: string;
          request_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "audit_logs_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      organization_invitations: {
        Row: {
          accepted_at: string | null;
          accepted_by: string | null;
          created_at: string;
          email: string;
          expires_at: string;
          id: string;
          invited_by: string;
          last_sent_at: string;
          organization_id: string;
          revoked_at: string | null;
          revoked_by: string | null;
          role: string;
          status: string;
          token_hash: string;
          updated_at: string;
        };
        Insert: {
          accepted_at?: string | null;
          accepted_by?: string | null;
          created_at?: string;
          email: string;
          expires_at: string;
          id?: string;
          invited_by: string;
          last_sent_at?: string;
          organization_id: string;
          revoked_at?: string | null;
          revoked_by?: string | null;
          role: string;
          status?: string;
          token_hash: string;
          updated_at?: string;
        };
        Update: {
          accepted_at?: string | null;
          accepted_by?: string | null;
          created_at?: string;
          email?: string;
          expires_at?: string;
          id?: string;
          invited_by?: string;
          last_sent_at?: string;
          organization_id?: string;
          revoked_at?: string | null;
          revoked_by?: string | null;
          role?: string;
          status?: string;
          token_hash?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "organization_invitations_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      organization_memberships: {
        Row: {
          created_at: string;
          id: string;
          joined_at: string;
          organization_id: string;
          role: string;
          status: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          joined_at?: string;
          organization_id: string;
          role: string;
          status?: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          joined_at?: string;
          organization_id?: string;
          role?: string;
          status?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "organization_memberships_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      organizations: {
        Row: {
          business_type: string;
          created_at: string;
          currency_code: string;
          id: string;
          name: string;
          settings: Json;
          slug: string;
          status: string;
          timezone: string;
          updated_at: string;
        };
        Insert: {
          business_type?: string;
          created_at?: string;
          currency_code?: string;
          id?: string;
          name: string;
          settings?: Json;
          slug: string;
          status?: string;
          timezone?: string;
          updated_at?: string;
        };
        Update: {
          business_type?: string;
          created_at?: string;
          currency_code?: string;
          id?: string;
          name?: string;
          settings?: Json;
          slug?: string;
          status?: string;
          timezone?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      accept_organization_invitation: {
        Args: { invitation_token_hash: string };
        Returns: {
          reactivated: boolean;
          status: string;
          role: string;
          organization_id: string;
          membership_id: string;
        }[];
      };
      citext: {
        Args: { "": boolean } | { "": string } | { "": unknown };
        Returns: string;
      };
      citext_hash: {
        Args: { "": string };
        Returns: number;
      };
      citextin: {
        Args: { "": unknown };
        Returns: string;
      };
      citextout: {
        Args: { "": string };
        Returns: unknown;
      };
      citextrecv: {
        Args: { "": unknown };
        Returns: string;
      };
      citextsend: {
        Args: { "": string };
        Returns: string;
      };
      create_organization: {
        Args: {
          organization_business_type?: string;
          organization_currency_code?: string;
          organization_name: string;
          organization_settings?: Json;
          organization_slug: string;
          organization_timezone?: string;
        };
        Returns: {
          business_type: string;
          created_at: string;
          currency_code: string;
          id: string;
          name: string;
          settings: Json;
          slug: string;
          status: string;
          timezone: string;
          updated_at: string;
        };
      };
      create_organization_invitation: {
        Args: {
          assigned_role: string;
          invitation_expires_at: string;
          invitation_token_hash: string;
          invited_email: string;
          target_organization_id: string;
        };
        Returns: {
          was_resent: boolean;
          invitation_id: string;
          organization_id: string;
          email: string;
          role: string;
          status: string;
          expires_at: string;
        }[];
      };
      current_user_can_assign_invitation_role: {
        Args: { assigned_role: string; checked_organization_id: string };
        Returns: boolean;
      };
      current_user_can_invite_member: {
        Args: { checked_organization_id: string };
        Returns: boolean;
      };
      current_user_has_active_membership: {
        Args: { checked_organization_id: string };
        Returns: boolean;
      };
      current_user_has_organization_role: {
        Args: { allowed_roles: string[]; checked_organization_id: string };
        Returns: boolean;
      };
      current_user_is_organization_owner: {
        Args: { checked_organization_id: string };
        Returns: boolean;
      };
      get_organization_invitation_preview: {
        Args: { invitation_token_hash: string };
        Returns: {
          invitation_status: string;
          organization_name: string;
          invited_email: string;
          assigned_role: string;
          expires_at: string;
        }[];
      };
      get_organization_team_members: {
        Args: { target_organization_id: string };
        Returns: {
          membership_id: string;
          user_id: string;
          email: string;
          role: string;
          status: string;
          joined_at: string;
        }[];
      };
      record_organization_audit_event: {
        Args: {
          actor_id: string;
          audit_action: string;
          audit_after_data?: Json;
          audit_before_data?: Json;
          audit_entity_id: string;
          audit_entity_type: string;
          audit_metadata?: Json;
          target_organization_id: string;
        };
        Returns: undefined;
      };
      revoke_organization_invitation: {
        Args: { invitation_id: string };
        Returns: {
          revoked_invitation_id: string;
          organization_id: string;
          email: string;
          role: string;
          status: string;
        }[];
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

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<
  keyof Database,
  "public"
>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {},
  },
} as const;
