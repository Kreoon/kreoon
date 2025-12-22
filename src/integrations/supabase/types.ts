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
      chat_conversations: {
        Row: {
          content_id: string | null
          created_at: string
          created_by: string | null
          id: string
          is_group: boolean
          name: string | null
          updated_at: string
        }
        Insert: {
          content_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          is_group?: boolean
          name?: string | null
          updated_at?: string
        }
        Update: {
          content_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          is_group?: boolean
          name?: string | null
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
        ]
      }
      chat_messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          id: string
          read_at: string | null
          sender_id: string
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string
          id?: string
          read_at?: string | null
          sender_id: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
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
          bio: string | null
          contact_email: string | null
          contact_phone: string | null
          created_at: string | null
          created_by: string | null
          facebook: string | null
          id: string
          instagram: string | null
          is_public: boolean | null
          logo_url: string | null
          name: string
          notes: string | null
          portfolio_url: string | null
          tiktok: string | null
          updated_at: string | null
          user_id: string | null
          username: string | null
        }
        Insert: {
          bio?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string | null
          created_by?: string | null
          facebook?: string | null
          id?: string
          instagram?: string | null
          is_public?: boolean | null
          logo_url?: string | null
          name: string
          notes?: string | null
          portfolio_url?: string | null
          tiktok?: string | null
          updated_at?: string | null
          user_id?: string | null
          username?: string | null
        }
        Update: {
          bio?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string | null
          created_by?: string | null
          facebook?: string | null
          id?: string
          instagram?: string | null
          is_public?: boolean | null
          logo_url?: string | null
          name?: string
          notes?: string | null
          portfolio_url?: string | null
          tiktok?: string | null
          updated_at?: string | null
          user_id?: string | null
          username?: string | null
        }
        Relationships: []
      }
      content: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          bunny_embed_url: string | null
          campaign_week: string | null
          caption: string | null
          client_id: string | null
          created_at: string | null
          creator_assigned_at: string | null
          creator_id: string | null
          creator_paid: boolean | null
          creator_payment: number | null
          creator_payment_currency: Database["public"]["Enums"]["currency_type"]
          deadline: string | null
          delivered_at: string | null
          description: string | null
          drive_url: string | null
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
          is_published: boolean | null
          likes_count: number | null
          notes: string | null
          paid_at: string | null
          product: string | null
          product_id: string | null
          raw_video_urls: string[] | null
          recorded_at: string | null
          reference_url: string | null
          sales_angle: string | null
          script: string | null
          script_approved_at: string | null
          script_approved_by: string | null
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
          approved_at?: string | null
          approved_by?: string | null
          bunny_embed_url?: string | null
          campaign_week?: string | null
          caption?: string | null
          client_id?: string | null
          created_at?: string | null
          creator_assigned_at?: string | null
          creator_id?: string | null
          creator_paid?: boolean | null
          creator_payment?: number | null
          creator_payment_currency?: Database["public"]["Enums"]["currency_type"]
          deadline?: string | null
          delivered_at?: string | null
          description?: string | null
          drive_url?: string | null
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
          is_published?: boolean | null
          likes_count?: number | null
          notes?: string | null
          paid_at?: string | null
          product?: string | null
          product_id?: string | null
          raw_video_urls?: string[] | null
          recorded_at?: string | null
          reference_url?: string | null
          sales_angle?: string | null
          script?: string | null
          script_approved_at?: string | null
          script_approved_by?: string | null
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
          approved_at?: string | null
          approved_by?: string | null
          bunny_embed_url?: string | null
          campaign_week?: string | null
          caption?: string | null
          client_id?: string | null
          created_at?: string | null
          creator_assigned_at?: string | null
          creator_id?: string | null
          creator_paid?: boolean | null
          creator_payment?: number | null
          creator_payment_currency?: Database["public"]["Enums"]["currency_type"]
          deadline?: string | null
          delivered_at?: string | null
          description?: string | null
          drive_url?: string | null
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
          is_published?: boolean | null
          likes_count?: number | null
          notes?: string | null
          paid_at?: string | null
          product?: string | null
          product_id?: string | null
          raw_video_urls?: string[] | null
          recorded_at?: string | null
          reference_url?: string | null
          sales_angle?: string | null
          script?: string | null
          script_approved_at?: string | null
          script_approved_by?: string | null
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
          period_type: string
          period_value: number
          revenue_goal: number | null
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
          period_type: string
          period_value: number
          revenue_goal?: number | null
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
          period_type?: string
          period_value?: number
          revenue_goal?: number | null
          updated_at?: string
          year?: number
        }
        Relationships: []
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
          transaction_type: Database["public"]["Enums"]["point_transaction_type"]
          user_id: string
        }
        Insert: {
          content_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          points: number
          transaction_type: Database["public"]["Enums"]["point_transaction_type"]
          user_id: string
        }
        Update: {
          content_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          points?: number
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
      portfolio_posts: {
        Row: {
          caption: string | null
          created_at: string
          id: string
          is_pinned: boolean | null
          likes_count: number | null
          media_type: string
          media_url: string
          pinned_at: string | null
          thumbnail_url: string | null
          updated_at: string
          user_id: string
          views_count: number | null
        }
        Insert: {
          caption?: string | null
          created_at?: string
          id?: string
          is_pinned?: boolean | null
          likes_count?: number | null
          media_type?: string
          media_url: string
          pinned_at?: string | null
          thumbnail_url?: string | null
          updated_at?: string
          user_id: string
          views_count?: number | null
        }
        Update: {
          caption?: string | null
          created_at?: string
          id?: string
          is_pinned?: boolean | null
          likes_count?: number | null
          media_type?: string
          media_url?: string
          pinned_at?: string | null
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
          ambassador_celebration_pending: boolean | null
          avatar_url: string | null
          bio: string | null
          city: string | null
          created_at: string | null
          document_number: string | null
          document_type: string | null
          editor_completed_count: number | null
          editor_on_time_count: number | null
          editor_rating: number | null
          email: string
          facebook: string | null
          full_name: string
          has_seen_tour: boolean | null
          id: string
          instagram: string | null
          is_ambassador: boolean | null
          is_public: boolean | null
          phone: string | null
          portfolio_url: string | null
          tiktok: string | null
          updated_at: string | null
          username: string | null
        }
        Insert: {
          address?: string | null
          ambassador_celebration_pending?: boolean | null
          avatar_url?: string | null
          bio?: string | null
          city?: string | null
          created_at?: string | null
          document_number?: string | null
          document_type?: string | null
          editor_completed_count?: number | null
          editor_on_time_count?: number | null
          editor_rating?: number | null
          email: string
          facebook?: string | null
          full_name: string
          has_seen_tour?: boolean | null
          id: string
          instagram?: string | null
          is_ambassador?: boolean | null
          is_public?: boolean | null
          phone?: string | null
          portfolio_url?: string | null
          tiktok?: string | null
          updated_at?: string | null
          username?: string | null
        }
        Update: {
          address?: string | null
          ambassador_celebration_pending?: boolean | null
          avatar_url?: string | null
          bio?: string | null
          city?: string | null
          created_at?: string | null
          document_number?: string | null
          document_type?: string | null
          editor_completed_count?: number | null
          editor_on_time_count?: number | null
          editor_rating?: number | null
          email?: string
          facebook?: string | null
          full_name?: string
          has_seen_tour?: boolean | null
          id?: string
          instagram?: string | null
          is_ambassador?: boolean | null
          is_public?: boolean | null
          phone?: string | null
          portfolio_url?: string | null
          tiktok?: string | null
          updated_at?: string | null
          username?: string | null
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
      user_points: {
        Row: {
          consecutive_on_time: number
          created_at: string
          current_level: Database["public"]["Enums"]["up_level"]
          id: string
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
          current_page: string | null
          id: string
          is_online: boolean
          last_activity: string | null
          last_seen: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          current_page?: string | null
          id?: string
          is_online?: boolean
          last_activity?: string | null
          last_seen?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
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
      calculate_up_level: {
        Args: { points: number }
        Returns: Database["public"]["Enums"]["up_level"]
      }
      can_users_chat: {
        Args: { _user1_id: string; _user2_id: string }
        Returns: boolean
      }
      check_perfect_streak: { Args: { _user_id: string }; Returns: boolean }
      cleanup_expired_stories: { Args: never; Returns: undefined }
      cleanup_old_audit_logs: { Args: never; Returns: undefined }
      create_chat_conversation: {
        Args: { _is_group?: boolean; _name?: string; participant_ids: string[] }
        Returns: string
      }
      generate_referral_code: { Args: never; Returns: string }
      generate_username_from_name: {
        Args: { full_name: string }
        Returns: string
      }
      get_best_available_editor: { Args: never; Returns: string }
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
      get_user_referral_code: { Args: { _user_id: string }; Returns: string }
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
      is_client_owner: {
        Args: { _client_id: string; _user_id: string }
        Returns: boolean
      }
      is_conversation_participant: {
        Args: { _conversation_id: string; _user_id: string }
        Returns: boolean
      }
      is_following: { Args: { _following_id: string }; Returns: boolean }
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
      toggle_content_like: {
        Args: { content_uuid: string; viewer: string }
        Returns: boolean
      }
      toggle_content_pin: { Args: { content_id: string }; Returns: boolean }
      toggle_follow: { Args: { _following_id: string }; Returns: boolean }
      toggle_post_pin: { Args: { post_id: string }; Returns: boolean }
      transfer_currency: {
        Args: {
          _from_amount: number
          _from_currency: Database["public"]["Enums"]["currency_type"]
          _notes?: string
          _to_currency: Database["public"]["Enums"]["currency_type"]
        }
        Returns: string
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
      up_level: "bronze" | "silver" | "gold" | "diamond"
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
      up_level: ["bronze", "silver", "gold", "diamond"],
    },
  },
} as const
