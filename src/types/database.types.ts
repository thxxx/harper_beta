export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5";
  };
  public: {
    Tables: {
      candid: {
        Row: {
          bio: string | null;
          created_at: string;
          educations: Json | null;
          email: string | null;
          experiences: Json | null;
          headline: string | null;
          id: string;
          last_updated_at: string | null;
          linkedin_url: string | null;
          links: string[] | null;
          location: string | null;
          name: string | null;
          profile_picture: string | null;
          publications: Json | null;
          search_text: string | null;
          total_exp_months: number | null;
        };
        Insert: {
          bio?: string | null;
          created_at?: string;
          educations?: Json | null;
          email?: string | null;
          experiences?: Json | null;
          headline?: string | null;
          id?: string;
          last_updated_at?: string | null;
          linkedin_url?: string | null;
          links?: string[] | null;
          location?: string | null;
          name?: string | null;
          profile_picture?: string | null;
          publications?: Json | null;
          search_text?: string | null;
          total_exp_months?: number | null;
        };
        Update: {
          bio?: string | null;
          created_at?: string;
          educations?: Json | null;
          email?: string | null;
          experiences?: Json | null;
          headline?: string | null;
          id?: string;
          last_updated_at?: string | null;
          linkedin_url?: string | null;
          links?: string[] | null;
          location?: string | null;
          name?: string | null;
          profile_picture?: string | null;
          publications?: Json | null;
          search_text?: string | null;
          total_exp_months?: number | null;
        };
        Relationships: [];
      };
      company_code: {
        Row: {
          code: string | null;
          company: string | null;
          created_at: string;
          domain: string | null;
          id: string;
        };
        Insert: {
          code?: string | null;
          company?: string | null;
          created_at?: string;
          domain?: string | null;
          id?: string;
        };
        Update: {
          code?: string | null;
          company?: string | null;
          created_at?: string;
          domain?: string | null;
          id?: string;
        };
        Relationships: [];
      };
      company_users: {
        Row: {
          created_at: string;
          email: string | null;
          is_authenticated: boolean;
          name: string | null;
          profile_picture: string | null;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          email?: string | null;
          is_authenticated?: boolean;
          name?: string | null;
          profile_picture?: string | null;
          user_id?: string;
        };
        Update: {
          created_at?: string;
          email?: string | null;
          is_authenticated?: boolean;
          name?: string | null;
          profile_picture?: string | null;
          user_id?: string;
        };
        Relationships: [];
      };
      connection: {
        Row: {
          candid_id: string | null;
          created_at: string;
          id: number;
          typed: number | null;
          user_id: string | null;
        };
        Insert: {
          candid_id?: string | null;
          created_at?: string;
          id?: number;
          typed?: number | null;
          user_id?: string | null;
        };
        Update: {
          candid_id?: string | null;
          created_at?: string;
          id?: number;
          typed?: number | null;
          user_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "connection_candid_id_fkey";
            columns: ["candid_id"];
            isOneToOne: false;
            referencedRelation: "candid";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "connection_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "company_users";
            referencedColumns: ["user_id"];
          }
        ];
      };
      harper_waitlist: {
        Row: {
          abtest: string | null;
          created_at: string;
          email: string | null;
          id: number;
          is_mobile: boolean | null;
          local_id: string | null;
          name: string | null;
          text: string | null;
          type: number | null;
          url: string | null;
        };
        Insert: {
          abtest?: string | null;
          created_at?: string;
          email?: string | null;
          id?: number;
          is_mobile?: boolean | null;
          local_id?: string | null;
          name?: string | null;
          text?: string | null;
          type?: number | null;
          url?: string | null;
        };
        Update: {
          abtest?: string | null;
          created_at?: string;
          email?: string | null;
          id?: number;
          is_mobile?: boolean | null;
          local_id?: string | null;
          name?: string | null;
          text?: string | null;
          type?: number | null;
          url?: string | null;
        };
        Relationships: [];
      };
      harper_waitlist_company: {
        Row: {
          additional: string | null;
          company: string | null;
          company_link: string | null;
          created_at: string;
          email: string;
          expect: string | null;
          is_mobile: boolean | null;
          name: string | null;
          needs: string[] | null;
          role: string | null;
          salary: string | null;
          size: string | null;
        };
        Insert: {
          additional?: string | null;
          company?: string | null;
          company_link?: string | null;
          created_at?: string;
          email: string;
          expect?: string | null;
          is_mobile?: boolean | null;
          name?: string | null;
          needs?: string[] | null;
          role?: string | null;
          salary?: string | null;
          size?: string | null;
        };
        Update: {
          additional?: string | null;
          company?: string | null;
          company_link?: string | null;
          created_at?: string;
          email?: string;
          expect?: string | null;
          is_mobile?: boolean | null;
          name?: string | null;
          needs?: string[] | null;
          role?: string | null;
          salary?: string | null;
          size?: string | null;
        };
        Relationships: [];
      };
      landing_logs: {
        Row: {
          action: string | null;
          created_at: string;
          id: number;
          is_mobile: boolean | null;
          local_id: string | null;
        };
        Insert: {
          action?: string | null;
          created_at?: string;
          id?: number;
          is_mobile?: boolean | null;
          local_id?: string | null;
        };
        Update: {
          action?: string | null;
          created_at?: string;
          id?: number;
          is_mobile?: boolean | null;
          local_id?: string | null;
        };
        Relationships: [];
      };
      queries: {
        Row: {
          created_at: string;
          query: string | null;
          query_id: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          query?: string | null;
          query_id?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          query?: string | null;
          query_id?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      query_pages: {
        Row: {
          candidate_ids: string[] | null;
          created_at: string;
          id: number;
          next_cursor: string | null;
          page_idx: number | null;
          query_id: string | null;
          synthesized_summary: Json | null;
        };
        Insert: {
          candidate_ids?: string[] | null;
          created_at?: string;
          id?: number;
          next_cursor?: string | null;
          page_idx?: number | null;
          query_id?: string | null;
          synthesized_summary?: Json | null;
        };
        Update: {
          candidate_ids?: string[] | null;
          created_at?: string;
          id?: number;
          next_cursor?: string | null;
          page_idx?: number | null;
          query_id?: string | null;
          synthesized_summary?: Json | null;
        };
        Relationships: [
          {
            foreignKeyName: "query_pages_query_id_fkey";
            columns: ["query_id"];
            isOneToOne: false;
            referencedRelation: "queries";
            referencedColumns: ["query_id"];
          }
        ];
      };
      request: {
        Row: {
          candid_id: string | null;
          created_at: string;
          id: number;
          text: string | null;
          user_id: string | null;
        };
        Insert: {
          candid_id?: string | null;
          created_at?: string;
          id?: number;
          text?: string | null;
          user_id?: string | null;
        };
        Update: {
          candid_id?: string | null;
          created_at?: string;
          id?: number;
          text?: string | null;
          user_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "request_candid_id_fkey";
            columns: ["candid_id"];
            isOneToOne: false;
            referencedRelation: "candid";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "request_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "company_users";
            referencedColumns: ["user_id"];
          }
        ];
      };
      synthesized_summary: {
        Row: {
          candid_id: string | null;
          created_at: string;
          id: number;
          query_id: string | null;
          text: string | null;
        };
        Insert: {
          candid_id?: string | null;
          created_at?: string;
          id?: number;
          query_id?: string | null;
          text?: string | null;
        };
        Update: {
          candid_id?: string | null;
          created_at?: string;
          id?: number;
          query_id?: string | null;
          text?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "synthesized_summary_candid_id_fkey";
            columns: ["candid_id"];
            isOneToOne: false;
            referencedRelation: "candid";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "synthesized_summary_query_id_fkey";
            columns: ["query_id"];
            isOneToOne: false;
            referencedRelation: "queries";
            referencedColumns: ["query_id"];
          }
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      search_candid_ids_v2: {
        Args: {
          lim?: number;
          must?: string[];
          must_not?: string[];
          off?: number;
          should?: string[];
        };
        Returns: {
          id: string;
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
    : never = never
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
    : never = never
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
    : never = never
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
    : never = never
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
    : never = never
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

export type CandidateType = Database["public"]["Tables"]["candid"]["Row"];
export type QueryType = Database["public"]["Tables"]["queries"]["Row"];
export type SynthesizedSummaryType =
  Database["public"]["Tables"]["synthesized_summary"]["Row"];
