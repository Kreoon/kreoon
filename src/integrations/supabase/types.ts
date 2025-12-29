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
      achievements: {
        Row: {
          category: string
          condition_type: string
          condition_value: number
          created_at: string
          description: string
          icon: string
          id: string
          key: string
          name: string
          points_required: number | null
          rarity: string
        }
        Insert: {
          category?: string
          condition_type: string
          condition_value?: number
          created_at?: string
          description: string
          icon?: string
          id?: string
          key: string
          name: string
          points_required?: number | null
          rarity?: string
        }
        Update: {
          category?: string
          condition_type?: string
          condition_value?: number
          created_at?: string
          description?: string
          icon?: string
          id?: string
          key?: string
          name?: string
          points_required?: number | null
          rarity?: string
        }
        Relationships: []
      }
      ai_assistant_config: {
        Row: {
          assistant_name: string
          created_at: string
          id: string
          is_enabled: boolean
          model: string
          organization_id: string
          provider: string
          system_prompt: string | null
          tone: string | null
          updated_at: string
        }
        Insert: {
          assistant_name?: string
          created_at?: string
          id?: string
          is_enabled?: boolean
          model?: string
          organization_id: string
          provider?: string
          system_prompt?: string | null
          tone?: string | null
          updated_at?: string
        }
        Update: {
          assistant_name?: string
          created_at?: string
          id?: string
          is_enabled?: boolean
          model?: string
          organization_id?: string
          provider?: string
          system_prompt?: string | null
          tone?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_assistant_config_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_assistant_knowledge: {
        Row: {
          content: string
          created_at: string
          id: string
          is_active: boolean
          knowledge_type: string
          metadata: Json | null
          organization_id: string
          title: string
          updated_at: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          is_active?: boolean
          knowledge_type: string
          metadata?: Json | null
          organization_id: string
          title: string
          updated_at?: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          is_active?: boolean
          knowledge_type?: string
          metadata?: Json | null
          organization_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_assistant_knowledge_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_assistant_logs: {
        Row: {
          assistant_response: string
          conversation_id: string | null
          created_at: string
          id: string
          organization_id: string
          tokens_used: number | null
          user_id: string
          user_message: string
        }
        Insert: {
          assistant_response: string
          conversation_id?: string | null
          created_at?: string
          id?: string
          organization_id: string
          tokens_used?: number | null
          user_id: string
          user_message: string
        }
        Update: {
          assistant_response?: string
          conversation_id?: string | null
          created_at?: string
          id?: string
          organization_id?: string
          tokens_used?: number | null
          user_id?: string
          user_message?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_assistant_logs_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "chat_conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_assistant_logs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_chat_feedback: {
        Row: {
          ai_response: string | null
          comment: string | null
          conversation_id: string | null
          created_at: string
          id: string
          message_id: string | null
          organization_id: string
          rating: string
          reviewed: boolean
          reviewed_at: string | null
          reviewed_by: string | null
          user_id: string
          user_question: string | null
        }
        Insert: {
          ai_response?: string | null
          comment?: string | null
          conversation_id?: string | null
          created_at?: string
          id?: string
          message_id?: string | null
          organization_id: string
          rating: string
          reviewed?: boolean
          reviewed_at?: string | null
          reviewed_by?: string | null
          user_id: string
          user_question?: string | null
        }
        Update: {
          ai_response?: string | null
          comment?: string | null
          conversation_id?: string | null
          created_at?: string
          id?: string
          message_id?: string | null
          organization_id?: string
          rating?: string
          reviewed?: boolean
          reviewed_at?: string | null
          reviewed_by?: string | null
          user_id?: string
          user_question?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_chat_feedback_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "chat_conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_chat_feedback_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_conversation_flows: {
        Row: {
          created_at: string
          description: string | null
          flow_steps: Json
          id: string
          is_active: boolean
          name: string
          organization_id: string
          priority: number
          trigger_intent: string | null
          trigger_keywords: string[] | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          flow_steps?: Json
          id?: string
          is_active?: boolean
          name: string
          organization_id: string
          priority?: number
          trigger_intent?: string | null
          trigger_keywords?: string[] | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          flow_steps?: Json
          id?: string
          is_active?: boolean
          name?: string
          organization_id?: string
          priority?: number
          trigger_intent?: string | null
          trigger_keywords?: string[] | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_conversation_flows_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_negative_rules: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          organization_id: string
          pattern: string
          reason: string | null
          rule_type: string
          severity: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          organization_id: string
          pattern: string
          reason?: string | null
          rule_type: string
          severity?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          organization_id?: string
          pattern?: string
          reason?: string | null
          rule_type?: string
          severity?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_negative_rules_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_positive_examples: {
        Row: {
          category: string
          context_notes: string | null
          created_at: string
          id: string
          ideal_response: string
          is_active: boolean
          organization_id: string
          updated_at: string
          user_question: string
        }
        Insert: {
          category?: string
          context_notes?: string | null
          created_at?: string
          id?: string
          ideal_response: string
          is_active?: boolean
          organization_id: string
          updated_at?: string
          user_question: string
        }
        Update: {
          category?: string
          context_notes?: string | null
          created_at?: string
          id?: string
          ideal_response?: string
          is_active?: boolean
          organization_id?: string
          updated_at?: string
          user_question?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_positive_examples_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_prompt_config: {
        Row: {
          assistant_role: string
          can_discuss_competitors: boolean
          can_discuss_pricing: boolean
          can_share_user_data: boolean
          created_at: string
          custom_instructions: string | null
          fallback_message: string | null
          greeting: string | null
          id: string
          language: string | null
          max_response_length: number | null
          organization_id: string
          personality: string | null
          tone: string | null
          updated_at: string
        }
        Insert: {
          assistant_role?: string
          can_discuss_competitors?: boolean
          can_discuss_pricing?: boolean
          can_share_user_data?: boolean
          created_at?: string
          custom_instructions?: string | null
          fallback_message?: string | null
          greeting?: string | null
          id?: string
          language?: string | null
          max_response_length?: number | null
          organization_id: string
          personality?: string | null
          tone?: string | null
          updated_at?: string
        }
        Update: {
          assistant_role?: string
          can_discuss_competitors?: boolean
          can_discuss_pricing?: boolean
          can_share_user_data?: boolean
          created_at?: string
          custom_instructions?: string | null
          fallback_message?: string | null
          greeting?: string | null
          id?: string
          language?: string | null
          max_response_length?: number | null
          organization_id?: string
          personality?: string | null
          tone?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_prompt_config_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_usage_logs: {
        Row: {
          action: string
          created_at: string
          error_message: string | null
          estimated_cost: number | null
          id: string
          model: string
          module: string
          organization_id: string
          provider: string
          success: boolean
          tokens_input: number | null
          tokens_output: number | null
          user_id: string
        }
        Insert: {
          action: string
          created_at?: string
          error_message?: string | null
          estimated_cost?: number | null
          id?: string
          model: string
          module: string
          organization_id: string
          provider: string
          success?: boolean
          tokens_input?: number | null
          tokens_output?: number | null
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string
          error_message?: string | null
          estimated_cost?: number | null
          id?: string
          model?: string
          module?: string
          organization_id?: string
          provider?: string
          success?: boolean
          tokens_input?: number | null
          tokens_output?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_usage_logs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      ambassador_ai_evaluations: {
        Row: {
          confidence: number
          current_level: string | null
          evaluated_at: string
          id: string
          justification: Json
          network_metrics: Json | null
          organization_id: string
          recommended_level: string
          risk_flags: Json
          suggested_actions: Json
          user_id: string
        }
        Insert: {
          confidence?: number
          current_level?: string | null
          evaluated_at?: string
          id?: string
          justification?: Json
          network_metrics?: Json | null
          organization_id: string
          recommended_level: string
          risk_flags?: Json
          suggested_actions?: Json
          user_id: string
        }
        Update: {
          confidence?: number
          current_level?: string | null
          evaluated_at?: string
          id?: string
          justification?: Json
          network_metrics?: Json | null
          organization_id?: string
          recommended_level?: string
          risk_flags?: Json
          suggested_actions?: Json
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ambassador_ai_evaluations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ambassador_ai_evaluations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      ambassador_commission_config: {
        Row: {
          ambassador_level: string
          commission_type: string
          commission_value: number
          created_at: string
          id: string
          is_active: boolean
          organization_id: string
          priority_assignment_boost: number
          up_bonus_multiplier: number
          updated_at: string
        }
        Insert: {
          ambassador_level: string
          commission_type?: string
          commission_value?: number
          created_at?: string
          id?: string
          is_active?: boolean
          organization_id: string
          priority_assignment_boost?: number
          up_bonus_multiplier?: number
          updated_at?: string
        }
        Update: {
          ambassador_level?: string
          commission_type?: string
          commission_value?: number
          created_at?: string
          id?: string
          is_active?: boolean
          organization_id?: string
          priority_assignment_boost?: number
          up_bonus_multiplier?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ambassador_commission_config_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      ambassador_network_stats: {
        Row: {
          active_referrals_count: number
          ambassador_id: string
          commission_earned: number
          content_by_network: number
          created_at: string
          id: string
          organization_id: string
          period_month: number
          period_year: number
          retention_rate: number
          revenue_by_network: number
          up_bonus_earned: number
          updated_at: string
        }
        Insert: {
          active_referrals_count?: number
          ambassador_id: string
          commission_earned?: number
          content_by_network?: number
          created_at?: string
          id?: string
          organization_id: string
          period_month: number
          period_year: number
          retention_rate?: number
          revenue_by_network?: number
          up_bonus_earned?: number
          updated_at?: string
        }
        Update: {
          active_referrals_count?: number
          ambassador_id?: string
          commission_earned?: number
          content_by_network?: number
          created_at?: string
          id?: string
          organization_id?: string
          period_month?: number
          period_year?: number
          retention_rate?: number
          revenue_by_network?: number
          up_bonus_earned?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ambassador_network_stats_ambassador_id_fkey"
            columns: ["ambassador_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ambassador_network_stats_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      ambassador_referrals: {
        Row: {
          activated_at: string | null
          ambassador_id: string
          created_at: string
          id: string
          organization_id: string
          referral_code: string
          referred_email: string
          referred_type: string
          referred_user_id: string | null
          registered_at: string | null
          status: string
          updated_at: string
        }
        Insert: {
          activated_at?: string | null
          ambassador_id: string
          created_at?: string
          id?: string
          organization_id: string
          referral_code: string
          referred_email: string
          referred_type?: string
          referred_user_id?: string | null
          registered_at?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          activated_at?: string | null
          ambassador_id?: string
          created_at?: string
          id?: string
          organization_id?: string
          referral_code?: string
          referred_email?: string
          referred_type?: string
          referred_user_id?: string | null
          registered_at?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ambassador_referrals_ambassador_id_fkey"
            columns: ["ambassador_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ambassador_referrals_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ambassador_referrals_referred_user_id_fkey"
            columns: ["referred_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      ambassador_up_config: {
        Row: {
          base_points: number
          conditions: Json | null
          created_at: string | null
          description: string | null
          event_key: string
          event_name: string
          id: string
          is_active: boolean | null
          multipliers: Json | null
          organization_id: string
          updated_at: string | null
        }
        Insert: {
          base_points?: number
          conditions?: Json | null
          created_at?: string | null
          description?: string | null
          event_key: string
          event_name: string
          id?: string
          is_active?: boolean | null
          multipliers?: Json | null
          organization_id: string
          updated_at?: string | null
        }
        Update: {
          base_points?: number
          conditions?: Json | null
          created_at?: string | null
          description?: string | null
          event_key?: string
          event_name?: string
          id?: string
          is_active?: boolean | null
          multipliers?: Json | null
          organization_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ambassador_up_config_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      app_settings: {
        Row: {
          description: string | null
          id: string
          key: string
          updated_at: string
          updated_by: string | null
          value: string
        }
        Insert: {
          description?: string | null
          id?: string
          key: string
          updated_at?: string
          updated_by?: string | null
          value: string
        }
        Update: {
          description?: string | null
          id?: string
          key?: string
          updated_at?: string
          updated_by?: string | null
          value?: string
        }
        Relationships: []
      }
      audit_logs: {
        Row: {
          action: string
          created_at: string
          details: Json | null
          entity_id: string | null
          entity_name: string | null
          entity_type: string
          id: string
          ip_address: string | null
          user_agent: string | null
          user_id: string
        }
        Insert: {
          action: string
          created_at?: string
          details?: Json | null
          entity_id?: string | null
          entity_name?: string | null
          entity_type: string
          id?: string
          ip_address?: string | null
          user_agent?: string | null
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string
          details?: Json | null
          entity_id?: string | null
          entity_name?: string | null
          entity_type?: string
          id?: string
          ip_address?: string | null
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      blocked_ips: {
        Row: {
          blocked_at: string
          blocked_by: string | null
          expires_at: string | null
          id: string
          ip_address: string
          is_active: boolean | null
          reason: string | null
        }
        Insert: {
          blocked_at?: string
          blocked_by?: string | null
          expires_at?: string | null
          id?: string
          ip_address: string
          is_active?: boolean | null
          reason?: string | null
        }
        Update: {
          blocked_at?: string
          blocked_by?: string | null
          expires_at?: string | null
          id?: string
          ip_address?: string
          is_active?: boolean | null
          reason?: string | null
        }
        Relationships: []
      }
      board_custom_fields: {
        Row: {
          created_at: string
          field_type: string
          id: string
          is_active: boolean
          is_required: boolean
          name: string
          options: Json | null
          organization_id: string
          show_in_card: boolean
          show_in_detail: boolean
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          field_type: string
          id?: string
          is_active?: boolean
          is_required?: boolean
          name: string
          options?: Json | null
          organization_id: string
          show_in_card?: boolean
          show_in_detail?: boolean
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          field_type?: string
          id?: string
          is_active?: boolean
          is_required?: boolean
          name?: string
          options?: Json | null
          organization_id?: string
          show_in_card?: boolean
          show_in_detail?: boolean
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "board_custom_fields_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      board_permissions: {
        Row: {
          allowed_statuses: string[] | null
          can_approve: boolean
          can_configure_board: boolean
          can_create_cards: boolean
          can_delete_cards: boolean
          can_edit_fields: boolean
          can_move_cards: boolean
          created_at: string
          id: string
          organization_id: string
          role: string
          updated_at: string
        }
        Insert: {
          allowed_statuses?: string[] | null
          can_approve?: boolean
          can_configure_board?: boolean
          can_create_cards?: boolean
          can_delete_cards?: boolean
          can_edit_fields?: boolean
          can_move_cards?: boolean
          created_at?: string
          id?: string
          organization_id: string
          role: string
          updated_at?: string
        }
        Update: {
          allowed_statuses?: string[] | null
          can_approve?: boolean
          can_configure_board?: boolean
          can_create_cards?: boolean
          can_delete_cards?: boolean
          can_edit_fields?: boolean
          can_move_cards?: boolean
          created_at?: string
          id?: string
          organization_id?: string
          role?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "board_permissions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      board_settings: {
        Row: {
          card_size: string
          created_at: string
          default_view: string
          id: string
          organization_id: string
          updated_at: string
          visible_fields: Json
          visible_sections: Json
        }
        Insert: {
          card_size?: string
          created_at?: string
          default_view?: string
          id?: string
          organization_id: string
          updated_at?: string
          visible_fields?: Json
          visible_sections?: Json
        }
        Update: {
          card_size?: string
          created_at?: string
          default_view?: string
          id?: string
          organization_id?: string
          updated_at?: string
          visible_fields?: Json
          visible_sections?: Json
        }
        Relationships: [
          {
            foreignKeyName: "board_settings_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      board_status_rules: {
        Row: {
          allowed_from_statuses: string[] | null
          allowed_roles: string[] | null
          allowed_to_statuses: string[] | null
          auto_actions: Json | null
          can_advance_roles: string[] | null
          can_retreat_roles: string[] | null
          can_view_roles: string[] | null
          created_at: string
          id: string
          organization_id: string
          required_fields: Json | null
          status_id: string
          updated_at: string
        }
        Insert: {
          allowed_from_statuses?: string[] | null
          allowed_roles?: string[] | null
          allowed_to_statuses?: string[] | null
          auto_actions?: Json | null
          can_advance_roles?: string[] | null
          can_retreat_roles?: string[] | null
          can_view_roles?: string[] | null
          created_at?: string
          id?: string
          organization_id: string
          required_fields?: Json | null
          status_id: string
          updated_at?: string
        }
        Update: {
          allowed_from_statuses?: string[] | null
          allowed_roles?: string[] | null
          allowed_to_statuses?: string[] | null
          auto_actions?: Json | null
          can_advance_roles?: string[] | null
          can_retreat_roles?: string[] | null
          can_view_roles?: string[] | null
          created_at?: string
          id?: string
          organization_id?: string
          required_fields?: Json | null
          status_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "board_status_rules_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "board_status_rules_status_id_fkey"
            columns: ["status_id"]
            isOneToOne: false
            referencedRelation: "organization_statuses"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_attachment_metadata: {
        Row: {
          expires_at: string
          file_size: number | null
          file_type: string | null
          id: string
          message_id: string | null
          storage_path: string
          uploaded_at: string
          uploaded_by: string
        }
        Insert: {
          expires_at?: string
          file_size?: number | null
          file_type?: string | null
          id?: string
          message_id?: string | null
          storage_path: string
          uploaded_at?: string
          uploaded_by: string
        }
        Update: {
          expires_at?: string
          file_size?: number | null
          file_type?: string | null
          id?: string
          message_id?: string | null
          storage_path?: string
          uploaded_at?: string
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_attachment_metadata_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "chat_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_conversations: {
        Row: {
          chat_type: Database["public"]["Enums"]["chat_type"] | null
          content_id: string | null
          created_at: string
          created_by: string | null
          id: string
          is_group: boolean
          name: string | null
          organization_id: string | null
          updated_at: string
        }
        Insert: {
          chat_type?: Database["public"]["Enums"]["chat_type"] | null
          content_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          is_group?: boolean
          name?: string | null
          organization_id?: string | null
          updated_at?: string
        }
        Update: {
          chat_type?: Database["public"]["Enums"]["chat_type"] | null
          content_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          is_group?: boolean
          name?: string | null
          organization_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_conversations_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "content"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_conversations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_message_reads: {
        Row: {
          id: string
          message_id: string
          read_at: string
          user_id: string
        }
        Insert: {
          id?: string
          message_id: string
          read_at?: string
          user_id: string
        }
        Update: {
          id?: string
          message_id?: string
          read_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_message_reads_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "chat_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_messages: {
        Row: {
          attachment_name: string | null
          attachment_size: number | null
          attachment_type: string | null
          attachment_url: string | null
          content: string
          conversation_id: string
          created_at: string
          delivered_at: string | null
          id: string
          read_at: string | null
          sender_id: string
        }
        Insert: {
          attachment_name?: string | null
          attachment_size?: number | null
          attachment_type?: string | null
          attachment_url?: string | null
          content: string
          conversation_id: string
          created_at?: string
          delivered_at?: string | null
          id?: string
          read_at?: string | null
          sender_id: string
        }
        Update: {
          attachment_name?: string | null
          attachment_size?: number | null
          attachment_type?: string | null
          attachment_url?: string | null
          content?: string
          conversation_id?: string
          created_at?: string
          delivered_at?: string | null
          id?: string
          read_at?: string | null
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "chat_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_participants: {
        Row: {
          conversation_id: string
          id: string
          joined_at: string
          last_read_at: string | null
          user_id: string
        }
        Insert: {
          conversation_id: string
          id?: string
          joined_at?: string
          last_read_at?: string | null
          user_id: string
        }
        Update: {
          conversation_id?: string
          id?: string
          joined_at?: string
          last_read_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_participants_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "chat_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_rbac_rules: {
        Row: {
          can_add_to_group: boolean
          can_chat: boolean
          can_see_in_list: boolean
          created_at: string
          id: string
          organization_id: string
          source_role: string
          target_role: string
          updated_at: string
        }
        Insert: {
          can_add_to_group?: boolean
          can_chat?: boolean
          can_see_in_list?: boolean
          created_at?: string
          id?: string
          organization_id: string
          source_role: string
          target_role: string
          updated_at?: string
        }
        Update: {
          can_add_to_group?: boolean
          can_chat?: boolean
          can_see_in_list?: boolean
          created_at?: string
          id?: string
          organization_id?: string
          source_role?: string
          target_role?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_rbac_rules_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_typing_indicators: {
        Row: {
          conversation_id: string
          id: string
          started_at: string
          user_id: string
        }
        Insert: {
          conversation_id: string
          id?: string
          started_at?: string
          user_id: string
        }
        Update: {
          conversation_id?: string
          id?: string
          started_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_typing_indicators_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "chat_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      client_packages: {
        Row: {
          client_id: string
          content_quantity: number
          created_at: string
          creators_count: number | null
          currency: Database["public"]["Enums"]["currency_type"]
          description: string | null
          hooks_per_video: number | null
          id: string
          is_active: boolean
          name: string
          notes: string | null
          paid_amount: number
          paid_at: string | null
          payment_status: string
          product_ids: string[] | null
          products_count: number | null
          total_value: number
          updated_at: string
        }
        Insert: {
          client_id: string
          content_quantity?: number
          created_at?: string
          creators_count?: number | null
          currency?: Database["public"]["Enums"]["currency_type"]
          description?: string | null
          hooks_per_video?: number | null
          id?: string
          is_active?: boolean
          name: string
          notes?: string | null
          paid_amount?: number
          paid_at?: string | null
          payment_status?: string
          product_ids?: string[] | null
          products_count?: number | null
          total_value?: number
          updated_at?: string
        }
        Update: {
          client_id?: string
          content_quantity?: number
          created_at?: string
          creators_count?: number | null
          currency?: Database["public"]["Enums"]["currency_type"]
          description?: string | null
          hooks_per_video?: number | null
          id?: string
          is_active?: boolean
          name?: string
          notes?: string | null
          paid_amount?: number
          paid_at?: string | null
          payment_status?: string
          product_ids?: string[] | null
          products_count?: number | null
          total_value?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_packages_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      client_users: {
        Row: {
          client_id: string
          created_at: string | null
          created_by: string | null
          id: string
          role: string | null
          user_id: string
        }
        Insert: {
          client_id: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          role?: string | null
          user_id: string
        }
        Update: {
          client_id?: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          role?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_users_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_users_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          address: string | null
          bio: string | null
          category: string | null
          city: string | null
          contact_email: string | null
          contact_phone: string | null
          country: string | null
          created_at: string | null
          created_by: string | null
          document_number: string | null
          document_type: string | null
          facebook: string | null
          id: string
          instagram: string | null
          is_internal_brand: boolean | null
          is_public: boolean | null
          is_vip: boolean | null
          linkedin: string | null
          logo_url: string | null
          main_contact: string | null
          name: string
          notes: string | null
          organization_id: string | null
          portfolio_url: string | null
          profile_completed: boolean | null
          tiktok: string | null
          updated_at: string | null
          user_id: string | null
          username: string | null
          website: string | null
        }
        Insert: {
          address?: string | null
          bio?: string | null
          category?: string | null
          city?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          country?: string | null
          created_at?: string | null
          created_by?: string | null
          document_number?: string | null
          document_type?: string | null
          facebook?: string | null
          id?: string
          instagram?: string | null
          is_internal_brand?: boolean | null
          is_public?: boolean | null
          is_vip?: boolean | null
          linkedin?: string | null
          logo_url?: string | null
          main_contact?: string | null
          name: string
          notes?: string | null
          organization_id?: string | null
          portfolio_url?: string | null
          profile_completed?: boolean | null
          tiktok?: string | null
          updated_at?: string | null
          user_id?: string | null
          username?: string | null
          website?: string | null
        }
        Update: {
          address?: string | null
          bio?: string | null
          category?: string | null
          city?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          country?: string | null
          created_at?: string | null
          created_by?: string | null
          document_number?: string | null
          document_type?: string | null
          facebook?: string | null
          id?: string
          instagram?: string | null
          is_internal_brand?: boolean | null
          is_public?: boolean | null
          is_vip?: boolean | null
          linkedin?: string | null
          logo_url?: string | null
          main_contact?: string | null
          name?: string
          notes?: string | null
          organization_id?: string | null
          portfolio_url?: string | null
          profile_completed?: boolean | null
          tiktok?: string | null
          updated_at?: string | null
          user_id?: string | null
          username?: string | null
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clients_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      company_followers: {
        Row: {
          company_id: string
          created_at: string
          follower_id: string
          id: string
        }
        Insert: {
          company_id: string
          created_at?: string
          follower_id: string
          id?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          follower_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_followers_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      content: {
        Row: {
          admin_guidelines: string | null
          ai_assignment_reason: string | null
          ai_delay_risk: string | null
          ai_quality_score: number | null
          approved_at: string | null
          approved_at_v2: string | null
          approved_by: string | null
          assigned_at: string | null
          bunny_embed_url: string | null
          campaign_week: string | null
          caption: string | null
          change_request_status: string | null
          change_requests: Json | null
          client_id: string | null
          content_type: string | null
          created_at: string | null
          creator_assigned_at: string | null
          creator_id: string | null
          creator_paid: boolean | null
          creator_payment: number | null
          creator_payment_currency: Database["public"]["Enums"]["currency_type"]
          custom_status_id: string | null
          deadline: string | null
          delivered_at: string | null
          description: string | null
          designer_guidelines: string | null
          draft_at: string | null
          drive_url: string | null
          editing_at: string | null
          editor_assigned_at: string | null
          editor_guidelines: string | null
          editor_id: string | null
          editor_paid: boolean | null
          editor_payment: number | null
          editor_payment_currency: Database["public"]["Enums"]["currency_type"]
          hooks_count: number | null
          id: string
          invoiced: boolean | null
          is_ambassador_content: boolean | null
          is_paid: boolean | null
          is_portfolio_public: boolean | null
          is_published: boolean | null
          issue_at: string | null
          likes_count: number | null
          notes: string | null
          organization_id: string | null
          paid_at: string | null
          paid_at_v2: string | null
          product: string | null
          product_id: string | null
          published_at: string | null
          raw_video_urls: string[] | null
          recorded_at: string | null
          recording_at: string | null
          reference_url: string | null
          review_at: string | null
          reward_type: string | null
          sales_angle: string | null
          script: string | null
          script_approved_at: string | null
          script_approved_at_v2: string | null
          script_approved_by: string | null
          script_pending_at: string | null
          script_version: number | null
          sequence_number: string | null
          start_date: string | null
          status: Database["public"]["Enums"]["content_status"] | null
          strategist_guidelines: string | null
          strategist_id: string | null
          thumbnail_url: string | null
          title: string
          trafficker_guidelines: string | null
          updated_at: string | null
          video_processing_started_at: string | null
          video_processing_status: string | null
          video_url: string | null
          video_urls: string[] | null
          views_count: number | null
        }
        Insert: {
          admin_guidelines?: string | null
          ai_assignment_reason?: string | null
          ai_delay_risk?: string | null
          ai_quality_score?: number | null
          approved_at?: string | null
          approved_at_v2?: string | null
          approved_by?: string | null
          assigned_at?: string | null
          bunny_embed_url?: string | null
          campaign_week?: string | null
          caption?: string | null
          change_request_status?: string | null
          change_requests?: Json | null
          client_id?: string | null
          content_type?: string | null
          created_at?: string | null
          creator_assigned_at?: string | null
          creator_id?: string | null
          creator_paid?: boolean | null
          creator_payment?: number | null
          creator_payment_currency?: Database["public"]["Enums"]["currency_type"]
          custom_status_id?: string | null
          deadline?: string | null
          delivered_at?: string | null
          description?: string | null
          designer_guidelines?: string | null
          draft_at?: string | null
          drive_url?: string | null
          editing_at?: string | null
          editor_assigned_at?: string | null
          editor_guidelines?: string | null
          editor_id?: string | null
          editor_paid?: boolean | null
          editor_payment?: number | null
          editor_payment_currency?: Database["public"]["Enums"]["currency_type"]
          hooks_count?: number | null
          id?: string
          invoiced?: boolean | null
          is_ambassador_content?: boolean | null
          is_paid?: boolean | null
          is_portfolio_public?: boolean | null
          is_published?: boolean | null
          issue_at?: string | null
          likes_count?: number | null
          notes?: string | null
          organization_id?: string | null
          paid_at?: string | null
          paid_at_v2?: string | null
          product?: string | null
          product_id?: string | null
          published_at?: string | null
          raw_video_urls?: string[] | null
          recorded_at?: string | null
          recording_at?: string | null
          reference_url?: string | null
          review_at?: string | null
          reward_type?: string | null
          sales_angle?: string | null
          script?: string | null
          script_approved_at?: string | null
          script_approved_at_v2?: string | null
          script_approved_by?: string | null
          script_pending_at?: string | null
          script_version?: number | null
          sequence_number?: string | null
          start_date?: string | null
          status?: Database["public"]["Enums"]["content_status"] | null
          strategist_guidelines?: string | null
          strategist_id?: string | null
          thumbnail_url?: string | null
          title: string
          trafficker_guidelines?: string | null
          updated_at?: string | null
          video_processing_started_at?: string | null
          video_processing_status?: string | null
          video_url?: string | null
          video_urls?: string[] | null
          views_count?: number | null
        }
        Update: {
          admin_guidelines?: string | null
          ai_assignment_reason?: string | null
          ai_delay_risk?: string | null
          ai_quality_score?: number | null
          approved_at?: string | null
          approved_at_v2?: string | null
          approved_by?: string | null
          assigned_at?: string | null
          bunny_embed_url?: string | null
          campaign_week?: string | null
          caption?: string | null
          change_request_status?: string | null
          change_requests?: Json | null
          client_id?: string | null
          content_type?: string | null
          created_at?: string | null
          creator_assigned_at?: string | null
          creator_id?: string | null
          creator_paid?: boolean | null
          creator_payment?: number | null
          creator_payment_currency?: Database["public"]["Enums"]["currency_type"]
          custom_status_id?: string | null
          deadline?: string | null
          delivered_at?: string | null
          description?: string | null
          designer_guidelines?: string | null
          draft_at?: string | null
          drive_url?: string | null
          editing_at?: string | null
          editor_assigned_at?: string | null
          editor_guidelines?: string | null
          editor_id?: string | null
          editor_paid?: boolean | null
          editor_payment?: number | null
          editor_payment_currency?: Database["public"]["Enums"]["currency_type"]
          hooks_count?: number | null
          id?: string
          invoiced?: boolean | null
          is_ambassador_content?: boolean | null
          is_paid?: boolean | null
          is_portfolio_public?: boolean | null
          is_published?: boolean | null
          issue_at?: string | null
          likes_count?: number | null
          notes?: string | null
          organization_id?: string | null
          paid_at?: string | null
          paid_at_v2?: string | null
          product?: string | null
          product_id?: string | null
          published_at?: string | null
          raw_video_urls?: string[] | null
          recorded_at?: string | null
          recording_at?: string | null
          reference_url?: string | null
          review_at?: string | null
          reward_type?: string | null
          sales_angle?: string | null
          script?: string | null
          script_approved_at?: string | null
          script_approved_at_v2?: string | null
          script_approved_by?: string | null
          script_pending_at?: string | null
          script_version?: number | null
          sequence_number?: string | null
          start_date?: string | null
          status?: Database["public"]["Enums"]["content_status"] | null
          strategist_guidelines?: string | null
          strategist_id?: string | null
          thumbnail_url?: string | null
          title?: string
          trafficker_guidelines?: string | null
          updated_at?: string | null
          video_processing_started_at?: string | null
          video_processing_status?: string | null
          video_url?: string | null
          video_urls?: string[] | null
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
            foreignKeyName: "content_custom_status_id_fkey"
            columns: ["custom_status_id"]
            isOneToOne: false
            referencedRelation: "organization_statuses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
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
      content_advanced_config: {
        Row: {
          client_read_only_mode: boolean
          content_types: Json | null
          created_at: string
          enable_comments: boolean
          enable_custom_fields: boolean
          id: string
          organization_id: string
          require_approval_before_advance: boolean
          text_editor_features: Json | null
          updated_at: string
        }
        Insert: {
          client_read_only_mode?: boolean
          content_types?: Json | null
          created_at?: string
          enable_comments?: boolean
          enable_custom_fields?: boolean
          id?: string
          organization_id: string
          require_approval_before_advance?: boolean
          text_editor_features?: Json | null
          updated_at?: string
        }
        Update: {
          client_read_only_mode?: boolean
          content_types?: Json | null
          created_at?: string
          enable_comments?: boolean
          enable_custom_fields?: boolean
          id?: string
          organization_id?: string
          require_approval_before_advance?: boolean
          text_editor_features?: Json | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "content_advanced_config_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      content_block_config: {
        Row: {
          block_key: string
          created_at: string
          id: string
          is_visible: boolean
          layout_type: string
          organization_id: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          block_key: string
          created_at?: string
          id?: string
          is_visible?: boolean
          layout_type?: string
          organization_id: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          block_key?: string
          created_at?: string
          id?: string
          is_visible?: boolean
          layout_type?: string
          organization_id?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "content_block_config_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      content_block_permissions: {
        Row: {
          block_key: string
          can_approve: boolean
          can_create: boolean
          can_edit: boolean
          can_lock: boolean
          can_view: boolean
          created_at: string
          id: string
          organization_id: string
          role: string
          updated_at: string
        }
        Insert: {
          block_key: string
          can_approve?: boolean
          can_create?: boolean
          can_edit?: boolean
          can_lock?: boolean
          can_view?: boolean
          created_at?: string
          id?: string
          organization_id: string
          role: string
          updated_at?: string
        }
        Update: {
          block_key?: string
          can_approve?: boolean
          can_create?: boolean
          can_edit?: boolean
          can_lock?: boolean
          can_view?: boolean
          created_at?: string
          id?: string
          organization_id?: string
          role?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "content_block_permissions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      content_block_state_rules: {
        Row: {
          block_key: string
          created_at: string
          editable_roles: string[] | null
          id: string
          is_hidden: boolean
          is_locked: boolean
          organization_id: string
          status_id: string | null
          updated_at: string
        }
        Insert: {
          block_key: string
          created_at?: string
          editable_roles?: string[] | null
          id?: string
          is_hidden?: boolean
          is_locked?: boolean
          organization_id: string
          status_id?: string | null
          updated_at?: string
        }
        Update: {
          block_key?: string
          created_at?: string
          editable_roles?: string[] | null
          id?: string
          is_hidden?: boolean
          is_locked?: boolean
          organization_id?: string
          status_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "content_block_state_rules_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_block_state_rules_status_id_fkey"
            columns: ["status_id"]
            isOneToOne: false
            referencedRelation: "organization_statuses"
            referencedColumns: ["id"]
          },
        ]
      }
      content_collaborators: {
        Row: {
          content_id: string
          created_at: string
          id: string
          role: string | null
          user_id: string
        }
        Insert: {
          content_id: string
          created_at?: string
          id?: string
          role?: string | null
          user_id: string
        }
        Update: {
          content_id?: string
          created_at?: string
          id?: string
          role?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "content_collaborators_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "content"
            referencedColumns: ["id"]
          },
        ]
      }
      content_comments: {
        Row: {
          comment: string
          comment_type: string | null
          content_id: string
          created_at: string | null
          id: string
          section: string | null
          section_index: number | null
          user_id: string
        }
        Insert: {
          comment: string
          comment_type?: string | null
          content_id: string
          created_at?: string | null
          id?: string
          section?: string | null
          section_index?: number | null
          user_id: string
        }
        Update: {
          comment?: string
          comment_type?: string | null
          content_id?: string
          created_at?: string | null
          id?: string
          section?: string | null
          section_index?: number | null
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
      content_custom_field_values: {
        Row: {
          content_id: string
          created_at: string
          field_id: string
          id: string
          updated_at: string
          value: Json
        }
        Insert: {
          content_id: string
          created_at?: string
          field_id: string
          id?: string
          updated_at?: string
          value: Json
        }
        Update: {
          content_id?: string
          created_at?: string
          field_id?: string
          id?: string
          updated_at?: string
          value?: Json
        }
        Relationships: [
          {
            foreignKeyName: "content_custom_field_values_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "content"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_custom_field_values_field_id_fkey"
            columns: ["field_id"]
            isOneToOne: false
            referencedRelation: "board_custom_fields"
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
      content_status_logs: {
        Row: {
          content_id: string
          from_custom_status_id: string | null
          from_status: string | null
          id: string
          moved_at: string
          notes: string | null
          organization_id: string | null
          to_custom_status_id: string | null
          to_status: string
          user_id: string
          user_role: string | null
        }
        Insert: {
          content_id: string
          from_custom_status_id?: string | null
          from_status?: string | null
          id?: string
          moved_at?: string
          notes?: string | null
          organization_id?: string | null
          to_custom_status_id?: string | null
          to_status: string
          user_id: string
          user_role?: string | null
        }
        Update: {
          content_id?: string
          from_custom_status_id?: string | null
          from_status?: string | null
          id?: string
          moved_at?: string
          notes?: string | null
          organization_id?: string | null
          to_custom_status_id?: string | null
          to_status?: string
          user_id?: string
          user_role?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "content_status_logs_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "content"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_status_logs_from_custom_status_id_fkey"
            columns: ["from_custom_status_id"]
            isOneToOne: false
            referencedRelation: "organization_statuses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_status_logs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_status_logs_to_custom_status_id_fkey"
            columns: ["to_custom_status_id"]
            isOneToOne: false
            referencedRelation: "organization_statuses"
            referencedColumns: ["id"]
          },
        ]
      }
      currency_balances: {
        Row: {
          balance: number
          currency: Database["public"]["Enums"]["currency_type"]
          id: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          balance?: number
          currency: Database["public"]["Enums"]["currency_type"]
          id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          balance?: number
          currency?: Database["public"]["Enums"]["currency_type"]
          id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      currency_transfers: {
        Row: {
          created_at: string
          created_by: string | null
          exchange_rate: number
          from_amount: number
          from_currency: Database["public"]["Enums"]["currency_type"]
          id: string
          notes: string | null
          to_amount: number
          to_currency: Database["public"]["Enums"]["currency_type"]
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          exchange_rate: number
          from_amount: number
          from_currency: Database["public"]["Enums"]["currency_type"]
          id?: string
          notes?: string | null
          to_amount: number
          to_currency: Database["public"]["Enums"]["currency_type"]
        }
        Update: {
          created_at?: string
          created_by?: string | null
          exchange_rate?: number
          from_amount?: number
          from_currency?: Database["public"]["Enums"]["currency_type"]
          id?: string
          notes?: string | null
          to_amount?: number
          to_currency?: Database["public"]["Enums"]["currency_type"]
        }
        Relationships: []
      }
      exchange_rates: {
        Row: {
          created_at: string
          from_currency: Database["public"]["Enums"]["currency_type"]
          id: string
          is_active: boolean
          rate: number
          set_by: string | null
          to_currency: Database["public"]["Enums"]["currency_type"]
        }
        Insert: {
          created_at?: string
          from_currency: Database["public"]["Enums"]["currency_type"]
          id?: string
          is_active?: boolean
          rate: number
          set_by?: string | null
          to_currency: Database["public"]["Enums"]["currency_type"]
        }
        Update: {
          created_at?: string
          from_currency?: Database["public"]["Enums"]["currency_type"]
          id?: string
          is_active?: boolean
          rate?: number
          set_by?: string | null
          to_currency?: Database["public"]["Enums"]["currency_type"]
        }
        Relationships: []
      }
      followers: {
        Row: {
          created_at: string
          follower_id: string
          following_id: string
          id: string
        }
        Insert: {
          created_at?: string
          follower_id: string
          following_id: string
          id?: string
        }
        Update: {
          created_at?: string
          follower_id?: string
          following_id?: string
          id?: string
        }
        Relationships: []
      }
      goals: {
        Row: {
          content_goal: number | null
          created_at: string
          created_by: string | null
          id: string
          new_clients_goal: number | null
          notes: string | null
          organization_id: string
          period_type: string
          period_value: number
          revenue_goal: number | null
          revenue_goal_usd: number | null
          updated_at: string
          year: number
        }
        Insert: {
          content_goal?: number | null
          created_at?: string
          created_by?: string | null
          id?: string
          new_clients_goal?: number | null
          notes?: string | null
          organization_id: string
          period_type: string
          period_value: number
          revenue_goal?: number | null
          revenue_goal_usd?: number | null
          updated_at?: string
          year: number
        }
        Update: {
          content_goal?: number | null
          created_at?: string
          created_by?: string | null
          id?: string
          new_clients_goal?: number | null
          notes?: string | null
          organization_id?: string
          period_type?: string
          period_value?: number
          revenue_goal?: number | null
          revenue_goal_usd?: number | null
          updated_at?: string
          year?: number
        }
        Relationships: []
      }
      known_devices: {
        Row: {
          browser: string | null
          created_at: string
          device_fingerprint: string
          device_name: string | null
          id: string
          is_trusted: boolean | null
          last_country: string | null
          last_ip: string | null
          last_used_at: string | null
          os: string | null
          user_id: string
        }
        Insert: {
          browser?: string | null
          created_at?: string
          device_fingerprint: string
          device_name?: string | null
          id?: string
          is_trusted?: boolean | null
          last_country?: string | null
          last_ip?: string | null
          last_used_at?: string | null
          os?: string | null
          user_id: string
        }
        Update: {
          browser?: string | null
          created_at?: string
          device_fingerprint?: string
          device_name?: string | null
          id?: string
          is_trusted?: boolean | null
          last_country?: string | null
          last_ip?: string | null
          last_used_at?: string | null
          os?: string | null
          user_id?: string
        }
        Relationships: []
      }
      link_previews: {
        Row: {
          description: string | null
          expires_at: string
          fetched_at: string
          id: string
          image_url: string | null
          site_name: string | null
          title: string | null
          url: string
        }
        Insert: {
          description?: string | null
          expires_at?: string
          fetched_at?: string
          id?: string
          image_url?: string | null
          site_name?: string | null
          title?: string | null
          url: string
        }
        Update: {
          description?: string | null
          expires_at?: string
          fetched_at?: string
          id?: string
          image_url?: string | null
          site_name?: string | null
          title?: string | null
          url?: string
        }
        Relationships: []
      }
      login_history: {
        Row: {
          device_type: string | null
          id: string
          ip_address: string | null
          is_suspicious: boolean | null
          location: string | null
          login_at: string
          logout_at: string | null
          session_id: string | null
          user_agent: string | null
          user_id: string
        }
        Insert: {
          device_type?: string | null
          id?: string
          ip_address?: string | null
          is_suspicious?: boolean | null
          location?: string | null
          login_at?: string
          logout_at?: string | null
          session_id?: string | null
          user_agent?: string | null
          user_id: string
        }
        Update: {
          device_type?: string | null
          id?: string
          ip_address?: string | null
          is_suspicious?: boolean | null
          location?: string | null
          login_at?: string
          logout_at?: string | null
          session_id?: string | null
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      message_reactions: {
        Row: {
          created_at: string
          id: string
          message_id: string
          reaction: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          message_id: string
          reaction: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          message_id?: string
          reaction?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "message_reactions_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "chat_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_preferences: {
        Row: {
          channel_email: boolean
          channel_in_app: boolean
          channel_push: boolean
          created_at: string
          event_type: string
          id: string
          organization_id: string
          updated_at: string
        }
        Insert: {
          channel_email?: boolean
          channel_in_app?: boolean
          channel_push?: boolean
          created_at?: string
          event_type: string
          id?: string
          organization_id: string
          updated_at?: string
        }
        Update: {
          channel_email?: boolean
          channel_in_app?: boolean
          channel_push?: boolean
          created_at?: string
          event_type?: string
          id?: string
          organization_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_preferences_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          is_read: boolean
          link: string | null
          message: string
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean
          link?: string | null
          message: string
          title: string
          type: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean
          link?: string | null
          message?: string
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      organization_ai_defaults: {
        Row: {
          created_at: string
          default_model: string
          default_provider: string
          id: string
          live_assistant_model: string | null
          live_assistant_provider: string | null
          organization_id: string
          scripts_model: string | null
          scripts_provider: string | null
          sistema_up_model: string | null
          sistema_up_provider: string | null
          tablero_model: string | null
          tablero_provider: string | null
          thumbnails_model: string | null
          thumbnails_provider: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          default_model?: string
          default_provider?: string
          id?: string
          live_assistant_model?: string | null
          live_assistant_provider?: string | null
          organization_id: string
          scripts_model?: string | null
          scripts_provider?: string | null
          sistema_up_model?: string | null
          sistema_up_provider?: string | null
          tablero_model?: string | null
          tablero_provider?: string | null
          thumbnails_model?: string | null
          thumbnails_provider?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          default_model?: string
          default_provider?: string
          id?: string
          live_assistant_model?: string | null
          live_assistant_provider?: string | null
          organization_id?: string
          scripts_model?: string | null
          scripts_provider?: string | null
          sistema_up_model?: string | null
          sistema_up_provider?: string | null
          tablero_model?: string | null
          tablero_provider?: string | null
          thumbnails_model?: string | null
          thumbnails_provider?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_ai_defaults_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_ai_modules: {
        Row: {
          category: string | null
          created_at: string | null
          description: string | null
          execution_count: number | null
          id: string
          is_active: boolean | null
          last_execution_at: string | null
          model: string | null
          module_key: string
          module_name: string
          monthly_limit: number | null
          organization_id: string
          permission_level: string | null
          provider: string | null
          required_role: string | null
          updated_at: string | null
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          description?: string | null
          execution_count?: number | null
          id?: string
          is_active?: boolean | null
          last_execution_at?: string | null
          model?: string | null
          module_key: string
          module_name: string
          monthly_limit?: number | null
          organization_id: string
          permission_level?: string | null
          provider?: string | null
          required_role?: string | null
          updated_at?: string | null
        }
        Update: {
          category?: string | null
          created_at?: string | null
          description?: string | null
          execution_count?: number | null
          id?: string
          is_active?: boolean | null
          last_execution_at?: string | null
          model?: string | null
          module_key?: string
          module_name?: string
          monthly_limit?: number | null
          organization_id?: string
          permission_level?: string | null
          provider?: string | null
          required_role?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "organization_ai_modules_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_ai_prompts: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          is_active: boolean
          module_key: string
          organization_id: string
          prompt_config: Json
          updated_at: string
          version: number
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          module_key: string
          organization_id: string
          prompt_config?: Json
          updated_at?: string
          version?: number
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          module_key?: string
          organization_id?: string
          prompt_config?: Json
          updated_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "organization_ai_prompts_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_ai_providers: {
        Row: {
          api_key_encrypted: string | null
          available_models: string[] | null
          configured_by: string | null
          created_at: string
          default_model: string | null
          id: string
          is_enabled: boolean
          organization_id: string
          provider_key: string
          updated_at: string
        }
        Insert: {
          api_key_encrypted?: string | null
          available_models?: string[] | null
          configured_by?: string | null
          created_at?: string
          default_model?: string | null
          id?: string
          is_enabled?: boolean
          organization_id: string
          provider_key: string
          updated_at?: string
        }
        Update: {
          api_key_encrypted?: string | null
          available_models?: string[] | null
          configured_by?: string | null
          created_at?: string
          default_model?: string | null
          id?: string
          is_enabled?: boolean
          organization_id?: string
          provider_key?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_ai_providers_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_editor_pool: {
        Row: {
          created_at: string
          created_by: string | null
          editor_user_id: string
          id: string
          is_active: boolean
          organization_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          editor_user_id: string
          id?: string
          is_active?: boolean
          organization_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          editor_user_id?: string
          id?: string
          is_active?: boolean
          organization_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_editor_pool_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_invitations: {
        Row: {
          accepted_at: string | null
          created_at: string | null
          email: string
          expires_at: string
          id: string
          invited_by: string | null
          organization_id: string
          role: Database["public"]["Enums"]["app_role"]
          token: string
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string | null
          email: string
          expires_at?: string
          id?: string
          invited_by?: string | null
          organization_id: string
          role?: Database["public"]["Enums"]["app_role"]
          token?: string
        }
        Update: {
          accepted_at?: string | null
          created_at?: string | null
          email?: string
          expires_at?: string
          id?: string
          invited_by?: string | null
          organization_id?: string
          role?: Database["public"]["Enums"]["app_role"]
          token?: string
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
      organization_member_badges: {
        Row: {
          badge: string
          created_at: string | null
          granted_at: string | null
          granted_by: string | null
          id: string
          is_active: boolean | null
          level: string | null
          organization_id: string
          revoked_at: string | null
          revoked_by: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          badge?: string
          created_at?: string | null
          granted_at?: string | null
          granted_by?: string | null
          id?: string
          is_active?: boolean | null
          level?: string | null
          organization_id: string
          revoked_at?: string | null
          revoked_by?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          badge?: string
          created_at?: string | null
          granted_at?: string | null
          granted_by?: string | null
          id?: string
          is_active?: boolean | null
          level?: string | null
          organization_id?: string
          revoked_at?: string | null
          revoked_by?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_member_badges_granted_by_fkey"
            columns: ["granted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_member_badges_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_member_badges_revoked_by_fkey"
            columns: ["revoked_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_member_badges_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_member_roles: {
        Row: {
          assigned_at: string
          assigned_by: string | null
          id: string
          organization_id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          assigned_at?: string
          assigned_by?: string | null
          id?: string
          organization_id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          assigned_at?: string
          assigned_by?: string | null
          id?: string
          organization_id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_member_roles_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_members: {
        Row: {
          ambassador_active_referrals: number | null
          ambassador_level: string | null
          ambassador_network_revenue: number | null
          ambassador_referral_code: string | null
          ambassador_since: string | null
          ambassador_total_referrals: number | null
          id: string
          invited_by: string | null
          is_owner: boolean | null
          joined_at: string | null
          organization_id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
          visibility_scope: string | null
        }
        Insert: {
          ambassador_active_referrals?: number | null
          ambassador_level?: string | null
          ambassador_network_revenue?: number | null
          ambassador_referral_code?: string | null
          ambassador_since?: string | null
          ambassador_total_referrals?: number | null
          id?: string
          invited_by?: string | null
          is_owner?: boolean | null
          joined_at?: string | null
          organization_id: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
          visibility_scope?: string | null
        }
        Update: {
          ambassador_active_referrals?: number | null
          ambassador_level?: string | null
          ambassador_network_revenue?: number | null
          ambassador_referral_code?: string | null
          ambassador_since?: string | null
          ambassador_total_referrals?: number | null
          id?: string
          invited_by?: string | null
          is_owner?: boolean | null
          joined_at?: string | null
          organization_id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
          visibility_scope?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "organization_members_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_statuses: {
        Row: {
          color: string
          created_at: string | null
          id: string
          is_active: boolean | null
          label: string
          organization_id: string
          sort_order: number
          status_key: string
        }
        Insert: {
          color?: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          label: string
          organization_id: string
          sort_order?: number
          status_key: string
        }
        Update: {
          color?: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          label?: string
          organization_id?: string
          sort_order?: number
          status_key?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_statuses_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          address: string | null
          admin_email: string | null
          admin_name: string | null
          admin_phone: string | null
          billing_email: string | null
          blocked_at: string | null
          blocked_by: string | null
          blocked_reason: string | null
          city: string | null
          country: string | null
          created_at: string | null
          created_by: string | null
          default_role: Database["public"]["Enums"]["app_role"] | null
          description: string | null
          facebook: string | null
          id: string
          instagram: string | null
          is_blocked: boolean | null
          is_registration_open: boolean | null
          linkedin: string | null
          logo_url: string | null
          max_members: number | null
          name: string
          organization_type: string | null
          primary_color: string | null
          registration_link: string | null
          selected_plan: string | null
          settings: Json | null
          slug: string
          subscription_status: string | null
          tiktok: string | null
          timezone: string | null
          trial_active: boolean | null
          trial_end_date: string | null
          trial_started_at: string | null
          updated_at: string | null
          website: string | null
        }
        Insert: {
          address?: string | null
          admin_email?: string | null
          admin_name?: string | null
          admin_phone?: string | null
          billing_email?: string | null
          blocked_at?: string | null
          blocked_by?: string | null
          blocked_reason?: string | null
          city?: string | null
          country?: string | null
          created_at?: string | null
          created_by?: string | null
          default_role?: Database["public"]["Enums"]["app_role"] | null
          description?: string | null
          facebook?: string | null
          id?: string
          instagram?: string | null
          is_blocked?: boolean | null
          is_registration_open?: boolean | null
          linkedin?: string | null
          logo_url?: string | null
          max_members?: number | null
          name: string
          organization_type?: string | null
          primary_color?: string | null
          registration_link?: string | null
          selected_plan?: string | null
          settings?: Json | null
          slug: string
          subscription_status?: string | null
          tiktok?: string | null
          timezone?: string | null
          trial_active?: boolean | null
          trial_end_date?: string | null
          trial_started_at?: string | null
          updated_at?: string | null
          website?: string | null
        }
        Update: {
          address?: string | null
          admin_email?: string | null
          admin_name?: string | null
          admin_phone?: string | null
          billing_email?: string | null
          blocked_at?: string | null
          blocked_by?: string | null
          blocked_reason?: string | null
          city?: string | null
          country?: string | null
          created_at?: string | null
          created_by?: string | null
          default_role?: Database["public"]["Enums"]["app_role"] | null
          description?: string | null
          facebook?: string | null
          id?: string
          instagram?: string | null
          is_blocked?: boolean | null
          is_registration_open?: boolean | null
          linkedin?: string | null
          logo_url?: string | null
          max_members?: number | null
          name?: string
          organization_type?: string | null
          primary_color?: string | null
          registration_link?: string | null
          selected_plan?: string | null
          settings?: Json | null
          slug?: string
          subscription_status?: string | null
          tiktok?: string | null
          timezone?: string | null
          trial_active?: boolean | null
          trial_end_date?: string | null
          trial_started_at?: string | null
          updated_at?: string | null
          website?: string | null
        }
        Relationships: []
      }
      payments: {
        Row: {
          amount: number
          content_id: string | null
          created_at: string | null
          currency: Database["public"]["Enums"]["currency_type"]
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
          currency?: Database["public"]["Enums"]["currency_type"]
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
          currency?: Database["public"]["Enums"]["currency_type"]
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
      point_transactions: {
        Row: {
          content_id: string | null
          created_at: string
          description: string | null
          id: string
          points: number
          secondary_points: number | null
          transaction_type: Database["public"]["Enums"]["point_transaction_type"]
          user_id: string
        }
        Insert: {
          content_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          points: number
          secondary_points?: number | null
          transaction_type: Database["public"]["Enums"]["point_transaction_type"]
          user_id: string
        }
        Update: {
          content_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          points?: number
          secondary_points?: number | null
          transaction_type?: Database["public"]["Enums"]["point_transaction_type"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "point_transactions_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "content"
            referencedColumns: ["id"]
          },
        ]
      }
      portfolio_moderation_flags: {
        Row: {
          ai_confidence: number | null
          created_at: string
          id: string
          item_id: string
          item_type: string
          notes: string | null
          organization_id: string | null
          reasons: Json
          reviewed_at: string | null
          reviewed_by: string | null
          severity: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          ai_confidence?: number | null
          created_at?: string
          id?: string
          item_id: string
          item_type: string
          notes?: string | null
          organization_id?: string | null
          reasons?: Json
          reviewed_at?: string | null
          reviewed_by?: string | null
          severity?: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          ai_confidence?: number | null
          created_at?: string
          id?: string
          item_id?: string
          item_type?: string
          notes?: string | null
          organization_id?: string | null
          reasons?: Json
          reviewed_at?: string | null
          reviewed_by?: string | null
          severity?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "portfolio_moderation_flags_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      portfolio_permissions: {
        Row: {
          created_at: string
          id: string
          organization_id: string
          permissions: Json
          role: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          organization_id: string
          permissions?: Json
          role: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          organization_id?: string
          permissions?: Json
          role?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "portfolio_permissions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      portfolio_post_comments: {
        Row: {
          comment: string
          created_at: string | null
          id: string
          post_id: string
          user_id: string
        }
        Insert: {
          comment: string
          created_at?: string | null
          id?: string
          post_id: string
          user_id: string
        }
        Update: {
          comment?: string
          created_at?: string | null
          id?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "portfolio_post_comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "portfolio_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      portfolio_post_likes: {
        Row: {
          created_at: string | null
          id: string
          post_id: string
          viewer_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          post_id: string
          viewer_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          post_id?: string
          viewer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "portfolio_post_likes_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "portfolio_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      portfolio_posts: {
        Row: {
          caption: string | null
          comments_count: number | null
          created_at: string
          id: string
          is_pinned: boolean | null
          likes_count: number | null
          media_type: string
          media_url: string
          pinned_at: string | null
          post_type: string | null
          thumbnail_url: string | null
          updated_at: string
          user_id: string
          views_count: number | null
        }
        Insert: {
          caption?: string | null
          comments_count?: number | null
          created_at?: string
          id?: string
          is_pinned?: boolean | null
          likes_count?: number | null
          media_type?: string
          media_url: string
          pinned_at?: string | null
          post_type?: string | null
          thumbnail_url?: string | null
          updated_at?: string
          user_id: string
          views_count?: number | null
        }
        Update: {
          caption?: string | null
          comments_count?: number | null
          created_at?: string
          id?: string
          is_pinned?: boolean | null
          likes_count?: number | null
          media_type?: string
          media_url?: string
          pinned_at?: string | null
          post_type?: string | null
          thumbnail_url?: string | null
          updated_at?: string
          user_id?: string
          views_count?: number | null
        }
        Relationships: []
      }
      portfolio_stories: {
        Row: {
          created_at: string
          expires_at: string
          id: string
          media_type: string
          media_url: string
          music_name: string | null
          music_url: string | null
          music_volume: number | null
          mute_video_audio: boolean | null
          user_id: string
          video_volume: number | null
          views_count: number | null
        }
        Insert: {
          created_at?: string
          expires_at?: string
          id?: string
          media_type?: string
          media_url: string
          music_name?: string | null
          music_url?: string | null
          music_volume?: number | null
          mute_video_audio?: boolean | null
          user_id: string
          video_volume?: number | null
          views_count?: number | null
        }
        Update: {
          created_at?: string
          expires_at?: string
          id?: string
          media_type?: string
          media_url?: string
          music_name?: string | null
          music_url?: string | null
          music_volume?: number | null
          mute_video_audio?: boolean | null
          user_id?: string
          video_volume?: number | null
          views_count?: number | null
        }
        Relationships: []
      }
      products: {
        Row: {
          brief_file_url: string | null
          brief_url: string | null
          client_id: string
          created_at: string
          description: string | null
          id: string
          ideal_avatar: string | null
          market_research: string | null
          name: string
          onboarding_file_url: string | null
          onboarding_url: string | null
          research_file_url: string | null
          research_url: string | null
          sales_angles: string[] | null
          strategy: string | null
          updated_at: string
        }
        Insert: {
          brief_file_url?: string | null
          brief_url?: string | null
          client_id: string
          created_at?: string
          description?: string | null
          id?: string
          ideal_avatar?: string | null
          market_research?: string | null
          name: string
          onboarding_file_url?: string | null
          onboarding_url?: string | null
          research_file_url?: string | null
          research_url?: string | null
          sales_angles?: string[] | null
          strategy?: string | null
          updated_at?: string
        }
        Update: {
          brief_file_url?: string | null
          brief_url?: string | null
          client_id?: string
          created_at?: string
          description?: string | null
          id?: string
          ideal_avatar?: string | null
          market_research?: string | null
          name?: string
          onboarding_file_url?: string | null
          onboarding_url?: string | null
          research_file_url?: string | null
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
      profile_ai_config: {
        Row: {
          created_at: string
          enabled: boolean
          features: Json
          id: string
          model: string
          organization_id: string
          provider: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          enabled?: boolean
          features?: Json
          id?: string
          model?: string
          organization_id: string
          provider?: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          enabled?: boolean
          features?: Json
          id?: string
          model?: string
          organization_id?: string
          provider?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profile_ai_config_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      profile_blocks_config: {
        Row: {
          blocks: Json
          created_at: string
          id: string
          organization_id: string
          profile_type: string
          updated_at: string
          updated_by: string | null
          user_id: string | null
        }
        Insert: {
          blocks?: Json
          created_at?: string
          id?: string
          organization_id: string
          profile_type?: string
          updated_at?: string
          updated_by?: string | null
          user_id?: string | null
        }
        Update: {
          blocks?: Json
          created_at?: string
          id?: string
          organization_id?: string
          profile_type?: string
          updated_at?: string
          updated_by?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profile_blocks_config_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profile_blocks_config_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          address: string | null
          ai_recommended_level: string | null
          ai_risk_flag: string | null
          ambassador_celebration_pending: boolean | null
          availability_status: string | null
          avatar_url: string | null
          best_at: string | null
          bio: string | null
          city: string | null
          content_categories: string[]
          country: string | null
          cover_url: string | null
          created_at: string | null
          current_organization_id: string | null
          document_number: string | null
          document_type: string | null
          editor_completed_count: number | null
          editor_on_time_count: number | null
          editor_rating: number | null
          email: string
          experience_level: string | null
          facebook: string | null
          full_name: string
          has_seen_tour: boolean | null
          id: string
          industries: string[]
          instagram: string | null
          interests: string[]
          is_active: boolean | null
          is_ambassador: boolean | null
          is_public: boolean | null
          languages: string[]
          organization_status: string
          phone: string | null
          portfolio_url: string | null
          quality_score_avg: number | null
          rate_currency: string | null
          rate_per_content: number | null
          reliability_score: number | null
          social_linkedin: string | null
          social_twitter: string | null
          social_youtube: string | null
          specialties_tags: string[]
          style_keywords: string[]
          tagline: string | null
          tiktok: string | null
          updated_at: string | null
          username: string | null
          velocity_score: number | null
        }
        Insert: {
          address?: string | null
          ai_recommended_level?: string | null
          ai_risk_flag?: string | null
          ambassador_celebration_pending?: boolean | null
          availability_status?: string | null
          avatar_url?: string | null
          best_at?: string | null
          bio?: string | null
          city?: string | null
          content_categories?: string[]
          country?: string | null
          cover_url?: string | null
          created_at?: string | null
          current_organization_id?: string | null
          document_number?: string | null
          document_type?: string | null
          editor_completed_count?: number | null
          editor_on_time_count?: number | null
          editor_rating?: number | null
          email: string
          experience_level?: string | null
          facebook?: string | null
          full_name: string
          has_seen_tour?: boolean | null
          id: string
          industries?: string[]
          instagram?: string | null
          interests?: string[]
          is_active?: boolean | null
          is_ambassador?: boolean | null
          is_public?: boolean | null
          languages?: string[]
          organization_status?: string
          phone?: string | null
          portfolio_url?: string | null
          quality_score_avg?: number | null
          rate_currency?: string | null
          rate_per_content?: number | null
          reliability_score?: number | null
          social_linkedin?: string | null
          social_twitter?: string | null
          social_youtube?: string | null
          specialties_tags?: string[]
          style_keywords?: string[]
          tagline?: string | null
          tiktok?: string | null
          updated_at?: string | null
          username?: string | null
          velocity_score?: number | null
        }
        Update: {
          address?: string | null
          ai_recommended_level?: string | null
          ai_risk_flag?: string | null
          ambassador_celebration_pending?: boolean | null
          availability_status?: string | null
          avatar_url?: string | null
          best_at?: string | null
          bio?: string | null
          city?: string | null
          content_categories?: string[]
          country?: string | null
          cover_url?: string | null
          created_at?: string | null
          current_organization_id?: string | null
          document_number?: string | null
          document_type?: string | null
          editor_completed_count?: number | null
          editor_on_time_count?: number | null
          editor_rating?: number | null
          email?: string
          experience_level?: string | null
          facebook?: string | null
          full_name?: string
          has_seen_tour?: boolean | null
          id?: string
          industries?: string[]
          instagram?: string | null
          interests?: string[]
          is_active?: boolean | null
          is_ambassador?: boolean | null
          is_public?: boolean | null
          languages?: string[]
          organization_status?: string
          phone?: string | null
          portfolio_url?: string | null
          quality_score_avg?: number | null
          rate_currency?: string | null
          rate_per_content?: number | null
          reliability_score?: number | null
          social_linkedin?: string | null
          social_twitter?: string | null
          social_youtube?: string | null
          specialties_tags?: string[]
          style_keywords?: string[]
          tagline?: string | null
          tiktok?: string | null
          updated_at?: string | null
          username?: string | null
          velocity_score?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_current_organization_id_fkey"
            columns: ["current_organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      project_raw_assets: {
        Row: {
          created_at: string
          custom_filename: string
          file_size: number
          file_type: string
          id: string
          organization_id: string
          original_filename: string
          project_id: string
          storage_path: string
          updated_at: string
          uploaded_by: string
        }
        Insert: {
          created_at?: string
          custom_filename: string
          file_size?: number
          file_type: string
          id?: string
          organization_id: string
          original_filename: string
          project_id: string
          storage_path: string
          updated_at?: string
          uploaded_by: string
        }
        Update: {
          created_at?: string
          custom_filename?: string
          file_size?: number
          file_type?: string
          id?: string
          organization_id?: string
          original_filename?: string
          project_id?: string
          storage_path?: string
          updated_at?: string
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_raw_assets_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_raw_assets_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "content"
            referencedColumns: ["id"]
          },
        ]
      }
      rate_limits: {
        Row: {
          action_type: string
          attempts: number | null
          blocked_until: string | null
          first_attempt_at: string | null
          id: string
          identifier: string
          identifier_type: string
          last_attempt_at: string | null
        }
        Insert: {
          action_type: string
          attempts?: number | null
          blocked_until?: string | null
          first_attempt_at?: string | null
          id?: string
          identifier: string
          identifier_type: string
          last_attempt_at?: string | null
        }
        Update: {
          action_type?: string
          attempts?: number | null
          blocked_until?: string | null
          first_attempt_at?: string | null
          id?: string
          identifier?: string
          identifier_type?: string
          last_attempt_at?: string | null
        }
        Relationships: []
      }
      referral_commissions: {
        Row: {
          amount: number
          commission_percentage: number
          created_at: string
          currency: Database["public"]["Enums"]["currency_type"]
          description: string | null
          id: string
          paid_at: string | null
          referral_id: string
          referrer_id: string
          source_amount: number
          status: string
        }
        Insert: {
          amount: number
          commission_percentage: number
          created_at?: string
          currency?: Database["public"]["Enums"]["currency_type"]
          description?: string | null
          id?: string
          paid_at?: string | null
          referral_id: string
          referrer_id: string
          source_amount: number
          status?: string
        }
        Update: {
          amount?: number
          commission_percentage?: number
          created_at?: string
          currency?: Database["public"]["Enums"]["currency_type"]
          description?: string | null
          id?: string
          paid_at?: string | null
          referral_id?: string
          referrer_id?: string
          source_amount?: number
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "referral_commissions_referral_id_fkey"
            columns: ["referral_id"]
            isOneToOne: false
            referencedRelation: "referrals"
            referencedColumns: ["id"]
          },
        ]
      }
      referrals: {
        Row: {
          commission_percentage: number
          created_at: string
          id: string
          referral_code: string
          referred_email: string
          referred_user_id: string | null
          referrer_id: string
          registered_at: string | null
          status: string
          updated_at: string
        }
        Insert: {
          commission_percentage?: number
          created_at?: string
          id?: string
          referral_code: string
          referred_email: string
          referred_user_id?: string | null
          referrer_id: string
          registered_at?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          commission_percentage?: number
          created_at?: string
          id?: string
          referral_code?: string
          referred_email?: string
          referred_user_id?: string | null
          referrer_id?: string
          registered_at?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      role_permissions: {
        Row: {
          can_create: boolean
          can_modify: boolean
          can_view: boolean
          created_at: string
          id: string
          module: string
          role: Database["public"]["Enums"]["app_role"]
          updated_at: string
        }
        Insert: {
          can_create?: boolean
          can_modify?: boolean
          can_view?: boolean
          created_at?: string
          id?: string
          module: string
          role: Database["public"]["Enums"]["app_role"]
          updated_at?: string
        }
        Update: {
          can_create?: boolean
          can_modify?: boolean
          can_view?: boolean
          created_at?: string
          id?: string
          module?: string
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
        }
        Relationships: []
      }
      saved_collections: {
        Row: {
          cover_url: string | null
          created_at: string
          id: string
          is_private: boolean
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          cover_url?: string | null
          created_at?: string
          id?: string
          is_private?: boolean
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          cover_url?: string | null
          created_at?: string
          id?: string
          is_private?: boolean
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      saved_content: {
        Row: {
          content_id: string | null
          content_type: string
          created_at: string
          id: string
          post_id: string | null
          user_id: string
        }
        Insert: {
          content_id?: string | null
          content_type?: string
          created_at?: string
          id?: string
          post_id?: string | null
          user_id: string
        }
        Update: {
          content_id?: string | null
          content_type?: string
          created_at?: string
          id?: string
          post_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "saved_content_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "content"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "saved_content_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "portfolio_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      saved_items: {
        Row: {
          collection_id: string | null
          created_at: string
          id: string
          item_id: string
          item_type: string
          user_id: string
        }
        Insert: {
          collection_id?: string | null
          created_at?: string
          id?: string
          item_id: string
          item_type: string
          user_id: string
        }
        Update: {
          collection_id?: string | null
          created_at?: string
          id?: string
          item_id?: string
          item_type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "saved_items_collection_id_fkey"
            columns: ["collection_id"]
            isOneToOne: false
            referencedRelation: "saved_collections"
            referencedColumns: ["id"]
          },
        ]
      }
      script_permissions: {
        Row: {
          admin_edit: boolean
          admin_lock: boolean
          admin_view: boolean
          created_at: string
          designer_edit: boolean
          designer_view: boolean
          editor_edit: boolean
          editor_view: boolean
          ia_edit: boolean
          ia_generate: boolean
          ia_view: boolean
          id: string
          organization_id: string
          role: string
          script_approve: boolean
          script_edit: boolean
          script_view: boolean
          status_overrides: Json | null
          strategist_edit: boolean
          strategist_view: boolean
          trafficker_edit: boolean
          trafficker_view: boolean
          updated_at: string
        }
        Insert: {
          admin_edit?: boolean
          admin_lock?: boolean
          admin_view?: boolean
          created_at?: string
          designer_edit?: boolean
          designer_view?: boolean
          editor_edit?: boolean
          editor_view?: boolean
          ia_edit?: boolean
          ia_generate?: boolean
          ia_view?: boolean
          id?: string
          organization_id: string
          role: string
          script_approve?: boolean
          script_edit?: boolean
          script_view?: boolean
          status_overrides?: Json | null
          strategist_edit?: boolean
          strategist_view?: boolean
          trafficker_edit?: boolean
          trafficker_view?: boolean
          updated_at?: string
        }
        Update: {
          admin_edit?: boolean
          admin_lock?: boolean
          admin_view?: boolean
          created_at?: string
          designer_edit?: boolean
          designer_view?: boolean
          editor_edit?: boolean
          editor_view?: boolean
          ia_edit?: boolean
          ia_generate?: boolean
          ia_view?: boolean
          id?: string
          organization_id?: string
          role?: string
          script_approve?: boolean
          script_edit?: boolean
          script_view?: boolean
          status_overrides?: Json | null
          strategist_edit?: boolean
          strategist_view?: boolean
          trafficker_edit?: boolean
          trafficker_view?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "script_permissions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      security_events: {
        Row: {
          action_taken: string | null
          city: string | null
          country_code: string | null
          country_name: string | null
          created_at: string
          details: Json | null
          device_fingerprint: string | null
          event_type: string
          id: string
          ip_address: string | null
          is_bot: boolean | null
          is_proxy: boolean | null
          is_tor: boolean | null
          is_vpn: boolean | null
          region: string | null
          risk_score: number | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action_taken?: string | null
          city?: string | null
          country_code?: string | null
          country_name?: string | null
          created_at?: string
          details?: Json | null
          device_fingerprint?: string | null
          event_type: string
          id?: string
          ip_address?: string | null
          is_bot?: boolean | null
          is_proxy?: boolean | null
          is_tor?: boolean | null
          is_vpn?: boolean | null
          region?: string | null
          risk_score?: number | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action_taken?: string | null
          city?: string | null
          country_code?: string | null
          country_name?: string | null
          created_at?: string
          details?: Json | null
          device_fingerprint?: string | null
          event_type?: string
          id?: string
          ip_address?: string | null
          is_bot?: boolean | null
          is_proxy?: boolean | null
          is_tor?: boolean | null
          is_vpn?: boolean | null
          region?: string | null
          risk_score?: number | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      security_settings: {
        Row: {
          description: string | null
          id: string
          setting_key: string
          setting_value: Json
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          description?: string | null
          id?: string
          setting_key: string
          setting_value?: Json
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          description?: string | null
          id?: string
          setting_key?: string
          setting_value?: Json
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      story_views: {
        Row: {
          id: string
          story_id: string
          viewed_at: string
          viewer_id: string
        }
        Insert: {
          id?: string
          story_id: string
          viewed_at?: string
          viewer_id: string
        }
        Update: {
          id?: string
          story_id?: string
          viewed_at?: string
          viewer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "story_views_story_id_fkey"
            columns: ["story_id"]
            isOneToOne: false
            referencedRelation: "portfolio_stories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "story_views_viewer_id_fkey"
            columns: ["viewer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      suggested_profiles_cache: {
        Row: {
          created_at: string
          expires_at: string
          id: string
          reason: string | null
          score: number | null
          suggested_user_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          expires_at?: string
          id?: string
          reason?: string | null
          score?: number | null
          suggested_user_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string
          id?: string
          reason?: string | null
          score?: number | null
          suggested_user_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "suggested_profiles_cache_suggested_user_id_fkey"
            columns: ["suggested_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "suggested_profiles_cache_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      talent_ai_recommendations: {
        Row: {
          actioned_at: string | null
          actioned_by: string | null
          ai_model: string | null
          confidence: number | null
          created_at: string | null
          expires_at: string | null
          id: string
          is_actioned: boolean | null
          organization_id: string
          reason: string
          recommendation_type: string
          user_id: string
        }
        Insert: {
          actioned_at?: string | null
          actioned_by?: string | null
          ai_model?: string | null
          confidence?: number | null
          created_at?: string | null
          expires_at?: string | null
          id?: string
          is_actioned?: boolean | null
          organization_id: string
          reason: string
          recommendation_type: string
          user_id: string
        }
        Update: {
          actioned_at?: string | null
          actioned_by?: string | null
          ai_model?: string | null
          confidence?: number | null
          created_at?: string | null
          expires_at?: string | null
          id?: string
          is_actioned?: boolean | null
          organization_id?: string
          reason?: string
          recommendation_type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "talent_ai_recommendations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      talent_performance_history: {
        Row: {
          active_tasks_count: number | null
          ai_level: string | null
          ai_risk_flag: string | null
          completed_tasks_count: number | null
          created_at: string | null
          id: string
          notes: string | null
          on_time_count: number | null
          organization_id: string
          quality_score: number | null
          recorded_at: string
          reliability_score: number | null
          user_id: string
          velocity_score: number | null
        }
        Insert: {
          active_tasks_count?: number | null
          ai_level?: string | null
          ai_risk_flag?: string | null
          completed_tasks_count?: number | null
          created_at?: string | null
          id?: string
          notes?: string | null
          on_time_count?: number | null
          organization_id: string
          quality_score?: number | null
          recorded_at?: string
          reliability_score?: number | null
          user_id: string
          velocity_score?: number | null
        }
        Update: {
          active_tasks_count?: number | null
          ai_level?: string | null
          ai_risk_flag?: string | null
          completed_tasks_count?: number | null
          created_at?: string | null
          id?: string
          notes?: string | null
          on_time_count?: number | null
          organization_id?: string
          quality_score?: number | null
          recorded_at?: string
          reliability_score?: number | null
          user_id?: string
          velocity_score?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "talent_performance_history_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      up_ai_config: {
        Row: {
          anti_fraud_enabled: boolean | null
          auto_approve_quality_threshold: number | null
          created_at: string | null
          event_detection_enabled: boolean | null
          id: string
          min_quality_for_approval: number | null
          organization_id: string
          quality_score_enabled: boolean | null
          quest_generation_enabled: boolean | null
          rule_recommendations_enabled: boolean | null
          updated_at: string | null
        }
        Insert: {
          anti_fraud_enabled?: boolean | null
          auto_approve_quality_threshold?: number | null
          created_at?: string | null
          event_detection_enabled?: boolean | null
          id?: string
          min_quality_for_approval?: number | null
          organization_id: string
          quality_score_enabled?: boolean | null
          quest_generation_enabled?: boolean | null
          rule_recommendations_enabled?: boolean | null
          updated_at?: string | null
        }
        Update: {
          anti_fraud_enabled?: boolean | null
          auto_approve_quality_threshold?: number | null
          created_at?: string | null
          event_detection_enabled?: boolean | null
          id?: string
          min_quality_for_approval?: number | null
          organization_id?: string
          quality_score_enabled?: boolean | null
          quest_generation_enabled?: boolean | null
          rule_recommendations_enabled?: boolean | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "up_ai_config_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      up_currency_conversions: {
        Row: {
          conversion_rate: number
          created_at: string | null
          from_amount: number
          from_currency: string
          id: string
          organization_id: string
          to_amount: number
          to_currency: string
          user_id: string
        }
        Insert: {
          conversion_rate?: number
          created_at?: string | null
          from_amount: number
          from_currency: string
          id?: string
          organization_id: string
          to_amount: number
          to_currency: string
          user_id: string
        }
        Update: {
          conversion_rate?: number
          created_at?: string | null
          from_amount?: number
          from_currency?: string
          id?: string
          organization_id?: string
          to_amount?: number
          to_currency?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "up_currency_conversions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      up_event_types: {
        Row: {
          color: string | null
          created_at: string | null
          description: string | null
          event_key: string
          icon: string | null
          id: string
          is_active: boolean | null
          is_system: boolean | null
          label: string
          organization_id: string
          updated_at: string | null
        }
        Insert: {
          color?: string | null
          created_at?: string | null
          description?: string | null
          event_key: string
          icon?: string | null
          id?: string
          is_active?: boolean | null
          is_system?: boolean | null
          label: string
          organization_id: string
          updated_at?: string | null
        }
        Update: {
          color?: string | null
          created_at?: string | null
          description?: string | null
          event_key?: string
          icon?: string | null
          id?: string
          is_active?: boolean | null
          is_system?: boolean | null
          label?: string
          organization_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "up_event_types_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      up_events: {
        Row: {
          ai_confidence: number | null
          ai_evidence: Json | null
          ai_inferred: boolean | null
          content_id: string | null
          created_at: string | null
          event_data: Json | null
          event_type_key: string
          id: string
          organization_id: string
          points_awarded: number | null
          processed_at: string | null
          rule_id: string | null
          secondary_points_awarded: number | null
          user_id: string
        }
        Insert: {
          ai_confidence?: number | null
          ai_evidence?: Json | null
          ai_inferred?: boolean | null
          content_id?: string | null
          created_at?: string | null
          event_data?: Json | null
          event_type_key: string
          id?: string
          organization_id: string
          points_awarded?: number | null
          processed_at?: string | null
          rule_id?: string | null
          secondary_points_awarded?: number | null
          user_id: string
        }
        Update: {
          ai_confidence?: number | null
          ai_evidence?: Json | null
          ai_inferred?: boolean | null
          content_id?: string | null
          created_at?: string | null
          event_data?: Json | null
          event_type_key?: string
          id?: string
          organization_id?: string
          points_awarded?: number | null
          processed_at?: string | null
          rule_id?: string | null
          secondary_points_awarded?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "up_events_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "content"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "up_events_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "up_events_rule_id_fkey"
            columns: ["rule_id"]
            isOneToOne: false
            referencedRelation: "up_rules"
            referencedColumns: ["id"]
          },
        ]
      }
      up_fraud_alerts: {
        Row: {
          alert_type: string
          created_at: string | null
          evidence: Json | null
          id: string
          is_resolved: boolean | null
          organization_id: string
          reason: string
          resolution_notes: string | null
          resolved_at: string | null
          resolved_by: string | null
          severity: string
          user_id: string | null
        }
        Insert: {
          alert_type: string
          created_at?: string | null
          evidence?: Json | null
          id?: string
          is_resolved?: boolean | null
          organization_id: string
          reason: string
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity: string
          user_id?: string | null
        }
        Update: {
          alert_type?: string
          created_at?: string | null
          evidence?: Json | null
          id?: string
          is_resolved?: boolean | null
          organization_id?: string
          reason?: string
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "up_fraud_alerts_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      up_permissions: {
        Row: {
          can_approve_ai_events: boolean | null
          can_create_rules: boolean | null
          can_edit_rules: boolean | null
          can_manage_quests: boolean | null
          can_manage_seasons: boolean | null
          can_manual_adjust: boolean | null
          can_toggle_ai: boolean | null
          can_view_fraud_alerts: boolean | null
          can_view_others_up: boolean | null
          can_view_own_up: boolean | null
          can_view_quality_scores: boolean | null
          can_view_ranking: boolean | null
          created_at: string | null
          id: string
          organization_id: string
          role: string
          updated_at: string | null
        }
        Insert: {
          can_approve_ai_events?: boolean | null
          can_create_rules?: boolean | null
          can_edit_rules?: boolean | null
          can_manage_quests?: boolean | null
          can_manage_seasons?: boolean | null
          can_manual_adjust?: boolean | null
          can_toggle_ai?: boolean | null
          can_view_fraud_alerts?: boolean | null
          can_view_others_up?: boolean | null
          can_view_own_up?: boolean | null
          can_view_quality_scores?: boolean | null
          can_view_ranking?: boolean | null
          created_at?: string | null
          id?: string
          organization_id: string
          role: string
          updated_at?: string | null
        }
        Update: {
          can_approve_ai_events?: boolean | null
          can_create_rules?: boolean | null
          can_edit_rules?: boolean | null
          can_manage_quests?: boolean | null
          can_manage_seasons?: boolean | null
          can_manual_adjust?: boolean | null
          can_toggle_ai?: boolean | null
          can_view_fraud_alerts?: boolean | null
          can_view_others_up?: boolean | null
          can_view_own_up?: boolean | null
          can_view_quality_scores?: boolean | null
          can_view_ranking?: boolean | null
          created_at?: string | null
          id?: string
          organization_id?: string
          role?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "up_permissions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      up_quality_scores: {
        Row: {
          ai_model: string | null
          breakdown: Json | null
          content_id: string
          evaluated_at: string | null
          id: string
          organization_id: string
          reasons: string[] | null
          score: number
          suggestions: string[] | null
        }
        Insert: {
          ai_model?: string | null
          breakdown?: Json | null
          content_id: string
          evaluated_at?: string | null
          id?: string
          organization_id: string
          reasons?: string[] | null
          score: number
          suggestions?: string[] | null
        }
        Update: {
          ai_model?: string | null
          breakdown?: Json | null
          content_id?: string
          evaluated_at?: string | null
          id?: string
          organization_id?: string
          reasons?: string[] | null
          score?: number
          suggestions?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "up_quality_scores_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: true
            referencedRelation: "content"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "up_quality_scores_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      up_quest_progress: {
        Row: {
          completed_at: string | null
          created_at: string | null
          current_value: number | null
          id: string
          quest_id: string
          reward_claimed: boolean | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          current_value?: number | null
          id?: string
          quest_id: string
          reward_claimed?: boolean | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          current_value?: number | null
          id?: string
          quest_id?: string
          reward_claimed?: boolean | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "up_quest_progress_quest_id_fkey"
            columns: ["quest_id"]
            isOneToOne: false
            referencedRelation: "up_quests"
            referencedColumns: ["id"]
          },
        ]
      }
      up_quests: {
        Row: {
          ai_reasoning: string | null
          applies_to_roles: string[] | null
          created_at: string | null
          created_by: string | null
          description: string | null
          ends_at: string | null
          goal_metric: string
          goal_value: number
          id: string
          is_active: boolean | null
          is_ai_generated: boolean | null
          organization_id: string
          reward_badge_id: string | null
          reward_points: number
          reward_secondary_points: number | null
          starts_at: string | null
          title: string
        }
        Insert: {
          ai_reasoning?: string | null
          applies_to_roles?: string[] | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          ends_at?: string | null
          goal_metric: string
          goal_value?: number
          id?: string
          is_active?: boolean | null
          is_ai_generated?: boolean | null
          organization_id: string
          reward_badge_id?: string | null
          reward_points?: number
          reward_secondary_points?: number | null
          starts_at?: string | null
          title: string
        }
        Update: {
          ai_reasoning?: string | null
          applies_to_roles?: string[] | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          ends_at?: string | null
          goal_metric?: string
          goal_value?: number
          id?: string
          is_active?: boolean | null
          is_ai_generated?: boolean | null
          organization_id?: string
          reward_badge_id?: string | null
          reward_points?: number
          reward_secondary_points?: number | null
          starts_at?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "up_quests_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "up_quests_reward_badge_id_fkey"
            columns: ["reward_badge_id"]
            isOneToOne: false
            referencedRelation: "achievements"
            referencedColumns: ["id"]
          },
        ]
      }
      up_rules: {
        Row: {
          applies_to_roles: string[] | null
          conditions: Json | null
          cooldown_minutes: number | null
          created_at: string | null
          created_by: string | null
          description: string | null
          event_type_key: string
          id: string
          is_active: boolean | null
          is_bonus: boolean | null
          is_penalty: boolean | null
          max_per_content: number | null
          max_per_day: number | null
          max_per_week: number | null
          name: string
          organization_id: string
          points: number
          priority: number | null
          secondary_points: number | null
          updated_at: string | null
        }
        Insert: {
          applies_to_roles?: string[] | null
          conditions?: Json | null
          cooldown_minutes?: number | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          event_type_key: string
          id?: string
          is_active?: boolean | null
          is_bonus?: boolean | null
          is_penalty?: boolean | null
          max_per_content?: number | null
          max_per_day?: number | null
          max_per_week?: number | null
          name: string
          organization_id: string
          points?: number
          priority?: number | null
          secondary_points?: number | null
          updated_at?: string | null
        }
        Update: {
          applies_to_roles?: string[] | null
          conditions?: Json | null
          cooldown_minutes?: number | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          event_type_key?: string
          id?: string
          is_active?: boolean | null
          is_bonus?: boolean | null
          is_penalty?: boolean | null
          max_per_content?: number | null
          max_per_day?: number | null
          max_per_week?: number | null
          name?: string
          organization_id?: string
          points?: number
          priority?: number | null
          secondary_points?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "up_rules_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      up_season_snapshots: {
        Row: {
          achievements_unlocked: number | null
          created_at: string | null
          final_level: string | null
          final_points: number | null
          final_rank: number | null
          id: string
          season_id: string
          total_events: number | null
          user_id: string
        }
        Insert: {
          achievements_unlocked?: number | null
          created_at?: string | null
          final_level?: string | null
          final_points?: number | null
          final_rank?: number | null
          id?: string
          season_id: string
          total_events?: number | null
          user_id: string
        }
        Update: {
          achievements_unlocked?: number | null
          created_at?: string | null
          final_level?: string | null
          final_points?: number | null
          final_rank?: number | null
          id?: string
          season_id?: string
          total_events?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "up_season_snapshots_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "up_seasons"
            referencedColumns: ["id"]
          },
        ]
      }
      up_seasons: {
        Row: {
          created_at: string | null
          ends_at: string | null
          id: string
          is_active: boolean | null
          mode: Database["public"]["Enums"]["up_season_mode"]
          name: string
          organization_id: string
          reset_points: boolean | null
          reset_ranking: boolean | null
          reset_streaks: boolean | null
          starts_at: string
        }
        Insert: {
          created_at?: string | null
          ends_at?: string | null
          id?: string
          is_active?: boolean | null
          mode?: Database["public"]["Enums"]["up_season_mode"]
          name: string
          organization_id: string
          reset_points?: boolean | null
          reset_ranking?: boolean | null
          reset_streaks?: boolean | null
          starts_at?: string
        }
        Update: {
          created_at?: string | null
          ends_at?: string | null
          id?: string
          is_active?: boolean | null
          mode?: Database["public"]["Enums"]["up_season_mode"]
          name?: string
          organization_id?: string
          reset_points?: boolean | null
          reset_ranking?: boolean | null
          reset_streaks?: boolean | null
          starts_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "up_seasons_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      up_settings: {
        Row: {
          category: string
          description: string | null
          id: string
          key: string
          label: string
          secondary_currency_enabled: boolean | null
          secondary_currency_icon: string | null
          secondary_currency_name: string | null
          updated_at: string
          updated_by: string | null
          value: Json
        }
        Insert: {
          category?: string
          description?: string | null
          id?: string
          key: string
          label: string
          secondary_currency_enabled?: boolean | null
          secondary_currency_icon?: string | null
          secondary_currency_name?: string | null
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Update: {
          category?: string
          description?: string | null
          id?: string
          key?: string
          label?: string
          secondary_currency_enabled?: boolean | null
          secondary_currency_icon?: string | null
          secondary_currency_name?: string | null
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Relationships: []
      }
      user_achievements: {
        Row: {
          achievement_id: string
          id: string
          unlocked_at: string
          user_id: string
        }
        Insert: {
          achievement_id: string
          id?: string
          unlocked_at?: string
          user_id: string
        }
        Update: {
          achievement_id?: string
          id?: string
          unlocked_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_achievements_achievement_id_fkey"
            columns: ["achievement_id"]
            isOneToOne: false
            referencedRelation: "achievements"
            referencedColumns: ["id"]
          },
        ]
      }
      user_feed_events: {
        Row: {
          created_at: string
          duration_ms: number | null
          event_type: string
          id: string
          item_id: string
          item_type: string
          metadata: Json | null
          user_id: string | null
          viewer_id: string | null
        }
        Insert: {
          created_at?: string
          duration_ms?: number | null
          event_type: string
          id?: string
          item_id: string
          item_type: string
          metadata?: Json | null
          user_id?: string | null
          viewer_id?: string | null
        }
        Update: {
          created_at?: string
          duration_ms?: number | null
          event_type?: string
          id?: string
          item_id?: string
          item_type?: string
          metadata?: Json | null
          user_id?: string | null
          viewer_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_feed_events_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_interest_profile: {
        Row: {
          engagement_stats: Json | null
          id: string
          top_categories: Json | null
          top_creators: Json | null
          top_tags: Json | null
          updated_at: string
          user_id: string | null
          viewer_id: string | null
        }
        Insert: {
          engagement_stats?: Json | null
          id?: string
          top_categories?: Json | null
          top_creators?: Json | null
          top_tags?: Json | null
          updated_at?: string
          user_id?: string | null
          viewer_id?: string | null
        }
        Update: {
          engagement_stats?: Json | null
          id?: string
          top_categories?: Json | null
          top_creators?: Json | null
          top_tags?: Json | null
          updated_at?: string
          user_id?: string | null
          viewer_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_interest_profile_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_notification_settings: {
        Row: {
          channel_email: boolean | null
          channel_in_app: boolean | null
          channel_push: boolean | null
          created_at: string
          event_type: string
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          channel_email?: boolean | null
          channel_in_app?: boolean | null
          channel_push?: boolean | null
          created_at?: string
          event_type: string
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          channel_email?: boolean | null
          channel_in_app?: boolean | null
          channel_push?: boolean | null
          created_at?: string
          event_type?: string
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_notifications: {
        Row: {
          created_at: string
          entity_id: string | null
          entity_type: string | null
          id: string
          is_read: boolean | null
          message: string | null
          organization_id: string
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          is_read?: boolean | null
          message?: string | null
          organization_id: string
          title: string
          type: string
          user_id: string
        }
        Update: {
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          is_read?: boolean | null
          message?: string | null
          organization_id?: string
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_notifications_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      user_points: {
        Row: {
          consecutive_on_time: number
          created_at: string
          current_level: Database["public"]["Enums"]["up_level"]
          id: string
          secondary_points: number | null
          total_completions: number
          total_corrections: number
          total_late: number
          total_on_time: number
          total_points: number
          updated_at: string
          user_id: string
        }
        Insert: {
          consecutive_on_time?: number
          created_at?: string
          current_level?: Database["public"]["Enums"]["up_level"]
          id?: string
          secondary_points?: number | null
          total_completions?: number
          total_corrections?: number
          total_late?: number
          total_on_time?: number
          total_points?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          consecutive_on_time?: number
          created_at?: string
          current_level?: Database["public"]["Enums"]["up_level"]
          id?: string
          secondary_points?: number | null
          total_completions?: number
          total_corrections?: number
          total_late?: number
          total_on_time?: number
          total_points?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_presence: {
        Row: {
          created_at: string
          current_activity: string | null
          current_page: string | null
          id: string
          is_online: boolean
          last_activity: string | null
          last_seen: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          current_activity?: string | null
          current_page?: string | null
          id?: string
          is_online?: boolean
          last_activity?: string | null
          last_seen?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          current_activity?: string | null
          current_page?: string | null
          id?: string
          is_online?: boolean
          last_activity?: string | null
          last_seen?: string | null
          user_id?: string
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
      user_security_status: {
        Row: {
          account_locked: boolean | null
          failed_login_attempts: number | null
          force_password_reset: boolean | null
          id: string
          last_failed_login: string | null
          last_password_change: string | null
          last_security_review: string | null
          locked_until: string | null
          mfa_enabled: boolean | null
          security_score: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          account_locked?: boolean | null
          failed_login_attempts?: number | null
          force_password_reset?: boolean | null
          id?: string
          last_failed_login?: string | null
          last_password_change?: string | null
          last_security_review?: string | null
          locked_until?: string | null
          mfa_enabled?: boolean | null
          security_score?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          account_locked?: boolean | null
          failed_login_attempts?: number | null
          force_password_reset?: boolean | null
          id?: string
          last_failed_login?: string | null
          last_password_change?: string | null
          last_security_review?: string | null
          locked_until?: string | null
          mfa_enabled?: boolean | null
          security_score?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_subscriptions: {
        Row: {
          assigned_by: string | null
          created_at: string
          expires_at: string | null
          id: string
          notes: string | null
          plan: Database["public"]["Enums"]["subscription_plan"]
          price: number
          started_at: string
          status: Database["public"]["Enums"]["subscription_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          assigned_by?: string | null
          created_at?: string
          expires_at?: string | null
          id?: string
          notes?: string | null
          plan?: Database["public"]["Enums"]["subscription_plan"]
          price?: number
          started_at?: string
          status?: Database["public"]["Enums"]["subscription_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          assigned_by?: string | null
          created_at?: string
          expires_at?: string | null
          id?: string
          notes?: string | null
          plan?: Database["public"]["Enums"]["subscription_plan"]
          price?: number
          started_at?: string
          status?: Database["public"]["Enums"]["subscription_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      add_user_points: {
        Args: {
          _content_id: string
          _description?: string
          _points: number
          _transaction_type: Database["public"]["Enums"]["point_transaction_type"]
          _user_id: string
        }
        Returns: undefined
      }
      append_raw_video_url: {
        Args: { _content_id: string; _url: string }
        Returns: string[]
      }
      calculate_security_score: { Args: { _user_id: string }; Returns: number }
      calculate_up_level: {
        Args: { points: number }
        Returns: Database["public"]["Enums"]["up_level"]
      }
      can_chat_with_user: {
        Args: {
          _org_id: string
          _source_user_id: string
          _target_user_id: string
        }
        Returns: boolean
      }
      can_move_content_status: {
        Args: {
          _content_id: string
          _target_status_id: string
          _user_id: string
        }
        Returns: boolean
      }
      can_move_to_status: {
        Args: {
          _content_id: string
          _target_status_id: string
          _user_id: string
        }
        Returns: boolean
      }
      can_users_chat: {
        Args: { _user1_id: string; _user2_id: string }
        Returns: boolean
      }
      check_and_award_achievements: {
        Args: { _user_id: string }
        Returns: undefined
      }
      check_perfect_streak: { Args: { _user_id: string }; Returns: boolean }
      check_rate_limit: {
        Args: {
          _action_type: string
          _block_minutes?: number
          _identifier: string
          _identifier_type: string
          _max_attempts?: number
          _window_minutes?: number
        }
        Returns: Json
      }
      check_status_requirements: {
        Args: { _content_id: string; _target_status_id: string }
        Returns: Json
      }
      cleanup_expired_stories: { Args: never; Returns: undefined }
      cleanup_old_audit_logs: { Args: never; Returns: undefined }
      create_chat_conversation: {
        Args: { _is_group?: boolean; _name?: string; participant_ids: string[] }
        Returns: string
      }
      create_default_chat_rbac_rules: {
        Args: { _org_id: string }
        Returns: undefined
      }
      create_default_script_permissions: {
        Args: { org_id: string }
        Returns: undefined
      }
      create_default_up_config: {
        Args: { _org_id: string }
        Returns: undefined
      }
      create_default_up_event_types: {
        Args: { _org_id: string }
        Returns: undefined
      }
      create_default_up_rules: { Args: { _org_id: string }; Returns: undefined }
      emit_up_event:
        | {
            Args: {
              _content_id?: string
              _event_data?: Json
              _event_type_key: string
              _user_id: string
            }
            Returns: string
          }
        | {
            Args: {
              _ai_confidence?: number
              _ai_evidence?: Json
              _ai_inferred?: boolean
              _content_id?: string
              _event_data?: Json
              _event_type_key: string
              _org_id: string
              _user_id: string
            }
            Returns: string
          }
      generate_ambassador_referral_code: {
        Args: { org_id: string; p_user_id: string }
        Returns: string
      }
      generate_org_slug: { Args: { org_name: string }; Returns: string }
      generate_referral_code: { Args: never; Returns: string }
      generate_registration_link: { Args: { _org_id: string }; Returns: string }
      generate_username_from_name: {
        Args: { full_name: string }
        Returns: string
      }
      get_ai_module_config: {
        Args: { _module_key: string; _org_id: string }
        Returns: {
          is_active: boolean
          model: string
          provider: string
        }[]
      }
      get_ai_module_prompt: {
        Args: { _module_key: string; _org_id: string }
        Returns: Json
      }
      get_badge_level: {
        Args: { p_badge?: string; p_organization_id: string; p_user_id: string }
        Returns: string
      }
      get_best_available_editor: { Args: never; Returns: string }
      get_best_available_editor_v2: {
        Args: {
          p_content_type?: string
          p_deadline?: string
          p_organization_id: string
          p_priority?: string
        }
        Returns: {
          active_tasks: number
          editor_id: string
          full_name: string
          quality_score: number
          recommendation_score: number
          reliability_score: number
        }[]
      }
      get_chat_visible_users: {
        Args: { _org_id: string; _user_id: string }
        Returns: {
          can_add_to_group: boolean
          can_chat: boolean
          user_id: string
        }[]
      }
      get_company_followers_count: {
        Args: { _company_id: string }
        Returns: number
      }
      get_current_organization_id: {
        Args: { _user_id: string }
        Returns: string
      }
      get_default_profile_blocks: { Args: never; Returns: Json }
      get_exchange_rate: {
        Args: {
          _from: Database["public"]["Enums"]["currency_type"]
          _to: Database["public"]["Enums"]["currency_type"]
        }
        Returns: number
      }
      get_follow_counts: {
        Args: { _user_id: string }
        Returns: {
          followers_count: number
          following_count: number
        }[]
      }
      get_random_editor_from_pool: { Args: { org_id: string }; Returns: string }
      get_up_setting: { Args: { setting_key: string }; Returns: Json }
      get_user_organizations: {
        Args: { _user_id: string }
        Returns: {
          is_owner: boolean
          organization_id: string
          organization_name: string
          organization_slug: string
          user_role: Database["public"]["Enums"]["app_role"]
        }[]
      }
      get_user_referral_code: { Args: { _user_id: string }; Returns: string }
      get_user_roles: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"][]
      }
      grant_badge: {
        Args: {
          p_badge: string
          p_granted_by?: string
          p_level?: string
          p_organization_id: string
          p_user_id: string
        }
        Returns: string
      }
      has_badge: {
        Args: { p_badge?: string; p_organization_id: string; p_user_id: string }
        Returns: boolean
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
      increment_portfolio_post_views: {
        Args: { post_uuid: string }
        Returns: undefined
      }
      init_ai_prompts_for_org: { Args: { _org_id: string }; Returns: undefined }
      initialize_board_settings: {
        Args: { _org_id: string }
        Returns: undefined
      }
      is_ai_module_active: {
        Args: { _module_key: string; _org_id: string }
        Returns: boolean
      }
      is_client_owner: {
        Args: { _client_id: string; _user_id: string }
        Returns: boolean
      }
      is_content_saved: {
        Args: { _content_id?: string; _post_id?: string }
        Returns: boolean
      }
      is_conversation_participant: {
        Args: { _conversation_id: string; _user_id: string }
        Returns: boolean
      }
      is_following: { Args: { _following_id: string }; Returns: boolean }
      is_following_company: { Args: { _company_id: string }; Returns: boolean }
      is_org_member: {
        Args: { _org_id: string; _user_id: string }
        Returns: boolean
      }
      is_org_owner: {
        Args: { _org_id: string; _user_id: string }
        Returns: boolean
      }
      is_platform_root: { Args: { _user_id: string }; Returns: boolean }
      is_user_assigned_to_content: {
        Args: { p_content_id: string; p_user_id: string }
        Returns: boolean
      }
      log_activity: {
        Args: {
          _action: string
          _details?: Json
          _entity_id?: string
          _entity_name?: string
          _entity_type: string
          _user_id: string
        }
        Returns: string
      }
      log_ai_module_execution: {
        Args: { _module_key: string; _org_id: string }
        Returns: undefined
      }
      log_security_event: {
        Args: {
          _action_taken?: string
          _city?: string
          _country_code?: string
          _country_name?: string
          _details?: Json
          _event_type: string
          _ip_address?: string
          _is_bot?: boolean
          _is_vpn?: boolean
          _risk_score?: number
          _user_agent?: string
          _user_id: string
        }
        Returns: string
      }
      log_user_login: {
        Args: {
          _device_type?: string
          _ip_address?: string
          _user_agent?: string
          _user_id: string
        }
        Returns: string
      }
      mark_message_delivered: {
        Args: { _message_id: string }
        Returns: undefined
      }
      mark_messages_read: {
        Args: { _conversation_id: string; _user_id: string }
        Returns: undefined
      }
      register_ai_module: {
        Args: {
          _description?: string
          _module_key: string
          _module_name: string
          _org_id: string
        }
        Returns: string
      }
      revoke_badge: {
        Args: {
          p_badge: string
          p_organization_id: string
          p_revoked_by?: string
          p_user_id: string
        }
        Returns: boolean
      }
      toggle_company_follow: { Args: { _company_id: string }; Returns: boolean }
      toggle_content_like: {
        Args: { content_uuid: string; viewer: string }
        Returns: boolean
      }
      toggle_content_pin: { Args: { content_id: string }; Returns: boolean }
      toggle_follow: { Args: { _following_id: string }; Returns: boolean }
      toggle_portfolio_post_like: {
        Args: { post_uuid: string; viewer: string }
        Returns: boolean
      }
      toggle_post_pin: { Args: { post_id: string }; Returns: boolean }
      toggle_save_content: {
        Args: { _content_id?: string; _post_id?: string }
        Returns: boolean
      }
      transfer_currency: {
        Args: {
          _from_amount: number
          _from_currency: Database["public"]["Enums"]["currency_type"]
          _notes?: string
          _to_currency: Database["public"]["Enums"]["currency_type"]
        }
        Returns: string
      }
      update_talent_performance_scores: {
        Args: { p_organization_id: string; p_user_id: string }
        Returns: undefined
      }
    }
    Enums: {
      app_role:
        | "admin"
        | "creator"
        | "editor"
        | "client"
        | "ambassador"
        | "strategist"
      chat_type: "direct" | "group" | "ai_assistant"
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
        | "corrected"
      currency_type: "COP" | "USD"
      point_transaction_type:
        | "base_completion"
        | "early_delivery"
        | "late_delivery"
        | "correction_needed"
        | "perfect_streak"
        | "five_star_rating"
        | "viral_hook"
        | "manual_adjustment"
      subscription_plan: "free" | "basic" | "pro"
      subscription_status: "active" | "cancelled" | "expired" | "pending"
      up_event_type:
        | "status_change"
        | "deadline_met"
        | "deadline_missed"
        | "content_approved"
        | "content_delivered"
        | "correction_requested"
        | "assignment_received"
        | "script_submitted"
        | "script_approved"
        | "video_uploaded"
        | "thumbnail_uploaded"
        | "client_feedback_positive"
        | "client_feedback_negative"
        | "streak_milestone"
        | "quest_completed"
        | "manual_adjustment"
        | "ai_quality_bonus"
        | "ai_quality_penalty"
      up_level: "bronze" | "silver" | "gold" | "diamond"
      up_rule_operator:
        | "equals"
        | "not_equals"
        | "greater_than"
        | "less_than"
        | "contains"
        | "in_list"
      up_season_mode: "permanent" | "monthly" | "quarterly" | "custom"
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
      app_role: [
        "admin",
        "creator",
        "editor",
        "client",
        "ambassador",
        "strategist",
      ],
      chat_type: ["direct", "group", "ai_assistant"],
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
        "corrected",
      ],
      currency_type: ["COP", "USD"],
      point_transaction_type: [
        "base_completion",
        "early_delivery",
        "late_delivery",
        "correction_needed",
        "perfect_streak",
        "five_star_rating",
        "viral_hook",
        "manual_adjustment",
      ],
      subscription_plan: ["free", "basic", "pro"],
      subscription_status: ["active", "cancelled", "expired", "pending"],
      up_event_type: [
        "status_change",
        "deadline_met",
        "deadline_missed",
        "content_approved",
        "content_delivered",
        "correction_requested",
        "assignment_received",
        "script_submitted",
        "script_approved",
        "video_uploaded",
        "thumbnail_uploaded",
        "client_feedback_positive",
        "client_feedback_negative",
        "streak_milestone",
        "quest_completed",
        "manual_adjustment",
        "ai_quality_bonus",
        "ai_quality_penalty",
      ],
      up_level: ["bronze", "silver", "gold", "diamond"],
      up_rule_operator: [
        "equals",
        "not_equals",
        "greater_than",
        "less_than",
        "contains",
        "in_list",
      ],
      up_season_mode: ["permanent", "monthly", "quarterly", "custom"],
    },
  },
} as const
