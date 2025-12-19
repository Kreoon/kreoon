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
      clients: {
        Row: {
          contact_email: string | null
          contact_phone: string | null
          created_at: string | null
          created_by: string | null
          id: string
          logo_url: string | null
          name: string
          notes: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          logo_url?: string | null
          name: string
          notes?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          logo_url?: string | null
          name?: string
          notes?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      content: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          bunny_embed_url: string | null
          campaign_week: string | null
          client_id: string | null
          created_at: string | null
          creator_assigned_at: string | null
          creator_id: string | null
          creator_paid: boolean | null
          creator_payment: number | null
          deadline: string | null
          delivered_at: string | null
          description: string | null
          drive_url: string | null
          editor_assigned_at: string | null
          editor_id: string | null
          editor_paid: boolean | null
          editor_payment: number | null
          id: string
          invoiced: boolean | null
          is_ambassador_content: boolean | null
          is_published: boolean | null
          likes_count: number | null
          notes: string | null
          paid_at: string | null
          product: string | null
          product_id: string | null
          recorded_at: string | null
          reference_url: string | null
          sales_angle: string | null
          script: string | null
          script_approved_at: string | null
          script_approved_by: string | null
          start_date: string | null
          status: Database["public"]["Enums"]["content_status"] | null
          strategist_id: string | null
          thumbnail_url: string | null
          title: string
          updated_at: string | null
          video_processing_started_at: string | null
          video_processing_status: string | null
          video_url: string | null
          views_count: number | null
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          bunny_embed_url?: string | null
          campaign_week?: string | null
          client_id?: string | null
          created_at?: string | null
          creator_assigned_at?: string | null
          creator_id?: string | null
          creator_paid?: boolean | null
          creator_payment?: number | null
          deadline?: string | null
          delivered_at?: string | null
          description?: string | null
          drive_url?: string | null
          editor_assigned_at?: string | null
          editor_id?: string | null
          editor_paid?: boolean | null
          editor_payment?: number | null
          id?: string
          invoiced?: boolean | null
          is_ambassador_content?: boolean | null
          is_published?: boolean | null
          likes_count?: number | null
          notes?: string | null
          paid_at?: string | null
          product?: string | null
          product_id?: string | null
          recorded_at?: string | null
          reference_url?: string | null
          sales_angle?: string | null
          script?: string | null
          script_approved_at?: string | null
          script_approved_by?: string | null
          start_date?: string | null
          status?: Database["public"]["Enums"]["content_status"] | null
          strategist_id?: string | null
          thumbnail_url?: string | null
          title: string
          updated_at?: string | null
          video_processing_started_at?: string | null
          video_processing_status?: string | null
          video_url?: string | null
          views_count?: number | null
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          bunny_embed_url?: string | null
          campaign_week?: string | null
          client_id?: string | null
          created_at?: string | null
          creator_assigned_at?: string | null
          creator_id?: string | null
          creator_paid?: boolean | null
          creator_payment?: number | null
          deadline?: string | null
          delivered_at?: string | null
          description?: string | null
          drive_url?: string | null
          editor_assigned_at?: string | null
          editor_id?: string | null
          editor_paid?: boolean | null
          editor_payment?: number | null
          id?: string
          invoiced?: boolean | null
          is_ambassador_content?: boolean | null
          is_published?: boolean | null
          likes_count?: number | null
          notes?: string | null
          paid_at?: string | null
          product?: string | null
          product_id?: string | null
          recorded_at?: string | null
          reference_url?: string | null
          sales_angle?: string | null
          script?: string | null
          script_approved_at?: string | null
          script_approved_by?: string | null
          start_date?: string | null
          status?: Database["public"]["Enums"]["content_status"] | null
          strategist_id?: string | null
          thumbnail_url?: string | null
          title?: string
          updated_at?: string | null
          video_processing_started_at?: string | null
          video_processing_status?: string | null
          video_url?: string | null
          views_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "content_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_strategist_id_fkey"
            columns: ["strategist_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      content_comments: {
        Row: {
          comment: string
          content_id: string
          created_at: string | null
          id: string
          user_id: string
        }
        Insert: {
          comment: string
          content_id: string
          created_at?: string | null
          id?: string
          user_id: string
        }
        Update: {
          comment?: string
          content_id?: string
          created_at?: string | null
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "content_comments_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "content"
            referencedColumns: ["id"]
          },
        ]
      }
      content_history: {
        Row: {
          content_id: string
          created_at: string | null
          id: string
          new_status: Database["public"]["Enums"]["content_status"]
          notes: string | null
          old_status: Database["public"]["Enums"]["content_status"] | null
          user_id: string | null
        }
        Insert: {
          content_id: string
          created_at?: string | null
          id?: string
          new_status: Database["public"]["Enums"]["content_status"]
          notes?: string | null
          old_status?: Database["public"]["Enums"]["content_status"] | null
          user_id?: string | null
        }
        Update: {
          content_id?: string
          created_at?: string | null
          id?: string
          new_status?: Database["public"]["Enums"]["content_status"]
          notes?: string | null
          old_status?: Database["public"]["Enums"]["content_status"] | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "content_history_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "content"
            referencedColumns: ["id"]
          },
        ]
      }
      content_likes: {
        Row: {
          content_id: string
          created_at: string | null
          id: string
          viewer_id: string
        }
        Insert: {
          content_id: string
          created_at?: string | null
          id?: string
          viewer_id: string
        }
        Update: {
          content_id?: string
          created_at?: string | null
          id?: string
          viewer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "content_likes_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "content"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          content_id: string | null
          created_at: string | null
          id: string
          notes: string | null
          paid_at: string | null
          payment_type: string
          status: string | null
          user_id: string
        }
        Insert: {
          amount: number
          content_id?: string | null
          created_at?: string | null
          id?: string
          notes?: string | null
          paid_at?: string | null
          payment_type: string
          status?: string | null
          user_id: string
        }
        Update: {
          amount?: number
          content_id?: string | null
          created_at?: string | null
          id?: string
          notes?: string | null
          paid_at?: string | null
          payment_type?: string
          status?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "content"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          brief_url: string | null
          client_id: string
          created_at: string
          description: string | null
          id: string
          ideal_avatar: string | null
          market_research: string | null
          name: string
          onboarding_url: string | null
          research_url: string | null
          sales_angles: string[] | null
          strategy: string | null
          updated_at: string
        }
        Insert: {
          brief_url?: string | null
          client_id: string
          created_at?: string
          description?: string | null
          id?: string
          ideal_avatar?: string | null
          market_research?: string | null
          name: string
          onboarding_url?: string | null
          research_url?: string | null
          sales_angles?: string[] | null
          strategy?: string | null
          updated_at?: string
        }
        Update: {
          brief_url?: string | null
          client_id?: string
          created_at?: string
          description?: string | null
          id?: string
          ideal_avatar?: string | null
          market_research?: string | null
          name?: string
          onboarding_url?: string | null
          research_url?: string | null
          sales_angles?: string[] | null
          strategy?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "products_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          address: string | null
          avatar_url: string | null
          bio: string | null
          city: string | null
          created_at: string | null
          document_number: string | null
          document_type: string | null
          email: string
          facebook: string | null
          full_name: string
          id: string
          instagram: string | null
          is_ambassador: boolean | null
          phone: string | null
          portfolio_url: string | null
          tiktok: string | null
          updated_at: string | null
        }
        Insert: {
          address?: string | null
          avatar_url?: string | null
          bio?: string | null
          city?: string | null
          created_at?: string | null
          document_number?: string | null
          document_type?: string | null
          email: string
          facebook?: string | null
          full_name: string
          id: string
          instagram?: string | null
          is_ambassador?: boolean | null
          phone?: string | null
          portfolio_url?: string | null
          tiktok?: string | null
          updated_at?: string | null
        }
        Update: {
          address?: string | null
          avatar_url?: string | null
          bio?: string | null
          city?: string | null
          created_at?: string | null
          document_number?: string | null
          document_type?: string | null
          email?: string
          facebook?: string | null
          full_name?: string
          id?: string
          instagram?: string | null
          is_ambassador?: boolean | null
          phone?: string | null
          portfolio_url?: string | null
          tiktok?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_user_roles: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"][]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      increment_content_views: {
        Args: { content_uuid: string }
        Returns: undefined
      }
      toggle_content_like: {
        Args: { content_uuid: string; viewer: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "creator" | "editor" | "client"
      content_status:
        | "draft"
        | "script_pending"
        | "script_approved"
        | "recording"
        | "editing"
        | "review"
        | "approved"
        | "rejected"
        | "paid"
        | "assigned"
        | "recorded"
        | "delivered"
        | "issue"
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
      app_role: ["admin", "creator", "editor", "client"],
      content_status: [
        "draft",
        "script_pending",
        "script_approved",
        "recording",
        "editing",
        "review",
        "approved",
        "rejected",
        "paid",
        "assigned",
        "recorded",
        "delivered",
        "issue",
      ],
    },
  },
} as const
