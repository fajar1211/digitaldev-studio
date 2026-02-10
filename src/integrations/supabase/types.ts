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
      assist_ai_tools: {
        Row: {
          code_content: string | null
          code_language: string | null
          color: string
          created_at: string
          created_by: string
          description: string
          icon: string
          id: string
          iframe_url: string | null
          is_active: boolean
          json_config: Json
          sort_order: number | null
          title: string
          updated_at: string
        }
        Insert: {
          code_content?: string | null
          code_language?: string | null
          color?: string
          created_at?: string
          created_by: string
          description?: string
          icon?: string
          id?: string
          iframe_url?: string | null
          is_active?: boolean
          json_config?: Json
          sort_order?: number | null
          title: string
          updated_at?: string
        }
        Update: {
          code_content?: string | null
          code_language?: string | null
          color?: string
          created_at?: string
          created_by?: string
          description?: string
          icon?: string
          id?: string
          iframe_url?: string | null
          is_active?: boolean
          json_config?: Json
          sort_order?: number | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      auth_email_blacklist: {
        Row: {
          created_at: string
          email: string
          reason: string | null
        }
        Insert: {
          created_at?: string
          email: string
          reason?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          reason?: string | null
        }
        Relationships: []
      }
      blog_authors: {
        Row: {
          created_at: string
          email: string | null
          id: string
          is_locked: boolean
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          id?: string
          is_locked?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
          is_locked?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      blog_categories: {
        Row: {
          created_at: string
          id: string
          is_locked: boolean
          name: string
          parent_id: string | null
          slug: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_locked?: boolean
          name: string
          parent_id?: string | null
          slug: string
        }
        Update: {
          created_at?: string
          id?: string
          is_locked?: boolean
          name?: string
          parent_id?: string | null
          slug?: string
        }
        Relationships: [
          {
            foreignKeyName: "blog_categories_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "blog_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      blog_post_categories: {
        Row: {
          category_id: string
          created_at: string
          post_id: string
        }
        Insert: {
          category_id: string
          created_at?: string
          post_id: string
        }
        Update: {
          category_id?: string
          created_at?: string
          post_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "blog_post_categories_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "blog_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "blog_post_categories_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "blog_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      blog_post_tags: {
        Row: {
          created_at: string
          post_id: string
          tag_id: string
        }
        Insert: {
          created_at?: string
          post_id: string
          tag_id: string
        }
        Update: {
          created_at?: string
          post_id?: string
          tag_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "blog_post_tags_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "blog_posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "blog_post_tags_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "blog_tags"
            referencedColumns: ["id"]
          },
        ]
      }
      blog_posts: {
        Row: {
          allow_comments: boolean
          author_id: string
          blog_author_id: string | null
          canonical_url: string | null
          content_html: string
          content_type: Database["public"]["Enums"]["blog_content_type"]
          created_at: string
          deleted_at: string | null
          excerpt: string | null
          featured: boolean
          featured_image_alt: string | null
          featured_image_url: string | null
          focus_keyword: string | null
          id: string
          language: string | null
          meta_description: string | null
          meta_title: string | null
          no_index: boolean
          publish_at: string | null
          reading_time_minutes: number | null
          slug: string
          status: Database["public"]["Enums"]["blog_post_status"]
          title: string
          updated_at: string
          visibility: Database["public"]["Enums"]["blog_visibility"]
        }
        Insert: {
          allow_comments?: boolean
          author_id: string
          blog_author_id?: string | null
          canonical_url?: string | null
          content_html: string
          content_type?: Database["public"]["Enums"]["blog_content_type"]
          created_at?: string
          deleted_at?: string | null
          excerpt?: string | null
          featured?: boolean
          featured_image_alt?: string | null
          featured_image_url?: string | null
          focus_keyword?: string | null
          id?: string
          language?: string | null
          meta_description?: string | null
          meta_title?: string | null
          no_index?: boolean
          publish_at?: string | null
          reading_time_minutes?: number | null
          slug: string
          status?: Database["public"]["Enums"]["blog_post_status"]
          title: string
          updated_at?: string
          visibility?: Database["public"]["Enums"]["blog_visibility"]
        }
        Update: {
          allow_comments?: boolean
          author_id?: string
          blog_author_id?: string | null
          canonical_url?: string | null
          content_html?: string
          content_type?: Database["public"]["Enums"]["blog_content_type"]
          created_at?: string
          deleted_at?: string | null
          excerpt?: string | null
          featured?: boolean
          featured_image_alt?: string | null
          featured_image_url?: string | null
          focus_keyword?: string | null
          id?: string
          language?: string | null
          meta_description?: string | null
          meta_title?: string | null
          no_index?: boolean
          publish_at?: string | null
          reading_time_minutes?: number | null
          slug?: string
          status?: Database["public"]["Enums"]["blog_post_status"]
          title?: string
          updated_at?: string
          visibility?: Database["public"]["Enums"]["blog_visibility"]
        }
        Relationships: [
          {
            foreignKeyName: "blog_posts_blog_author_id_fkey"
            columns: ["blog_author_id"]
            isOneToOne: false
            referencedRelation: "blog_authors"
            referencedColumns: ["id"]
          },
        ]
      }
      blog_tags: {
        Row: {
          created_at: string
          id: string
          name: string
          slug: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          slug: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          slug?: string
        }
        Relationships: []
      }
      business_report_links: {
        Row: {
          business_id: string
          created_at: string
          created_by: string | null
          id: string
          kind: string
          updated_at: string
          url: string
        }
        Insert: {
          business_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          kind: string
          updated_at?: string
          url: string
        }
        Update: {
          business_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          kind?: string
          updated_at?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "business_report_links_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      business_type_categories: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          name: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      business_types: {
        Row: {
          category: string
          created_at: string
          id: string
          is_active: boolean
          sort_order: number
          type: string
          updated_at: string
        }
        Insert: {
          category: string
          created_at?: string
          id?: string
          is_active?: boolean
          sort_order?: number
          type: string
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          id?: string
          is_active?: boolean
          sort_order?: number
          type?: string
          updated_at?: string
        }
        Relationships: []
      }
      businesses: {
        Row: {
          bkb_content: string | null
          brand_expert_content: string | null
          business_address: string | null
          business_name: string | null
          business_number: number | null
          business_type: string | null
          city: string | null
          country: string | null
          created_at: string
          creator_links: Json | null
          email: string | null
          email_secondary: string | null
          first_name: string | null
          gmb_link: string | null
          hours: Json | null
          id: string
          last_name: string | null
          marketing_goal_text: string | null
          marketing_goal_type: string | null
          onboarding_completed: boolean | null
          persona1_content: string | null
          persona1_title: string | null
          persona2_content: string | null
          persona2_title: string | null
          persona3_content: string | null
          persona3_title: string | null
          phone_number: string | null
          primary_service: string | null
          secondary_services: Json
          service_area: string | null
          service_short_description: string | null
          social_links: Json | null
          stage: string | null
          state: string | null
          updated_at: string
          user_id: string
          website_url: string | null
          zip_code: string | null
        }
        Insert: {
          bkb_content?: string | null
          brand_expert_content?: string | null
          business_address?: string | null
          business_name?: string | null
          business_number?: number | null
          business_type?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          creator_links?: Json | null
          email?: string | null
          email_secondary?: string | null
          first_name?: string | null
          gmb_link?: string | null
          hours?: Json | null
          id?: string
          last_name?: string | null
          marketing_goal_text?: string | null
          marketing_goal_type?: string | null
          onboarding_completed?: boolean | null
          persona1_content?: string | null
          persona1_title?: string | null
          persona2_content?: string | null
          persona2_title?: string | null
          persona3_content?: string | null
          persona3_title?: string | null
          phone_number?: string | null
          primary_service?: string | null
          secondary_services?: Json
          service_area?: string | null
          service_short_description?: string | null
          social_links?: Json | null
          stage?: string | null
          state?: string | null
          updated_at?: string
          user_id: string
          website_url?: string | null
          zip_code?: string | null
        }
        Update: {
          bkb_content?: string | null
          brand_expert_content?: string | null
          business_address?: string | null
          business_name?: string | null
          business_number?: number | null
          business_type?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          creator_links?: Json | null
          email?: string | null
          email_secondary?: string | null
          first_name?: string | null
          gmb_link?: string | null
          hours?: Json | null
          id?: string
          last_name?: string | null
          marketing_goal_text?: string | null
          marketing_goal_type?: string | null
          onboarding_completed?: boolean | null
          persona1_content?: string | null
          persona1_title?: string | null
          persona2_content?: string | null
          persona2_title?: string | null
          persona3_content?: string | null
          persona3_title?: string | null
          phone_number?: string | null
          primary_service?: string | null
          secondary_services?: Json
          service_area?: string | null
          service_short_description?: string | null
          social_links?: Json | null
          stage?: string | null
          state?: string | null
          updated_at?: string
          user_id?: string
          website_url?: string | null
          zip_code?: string | null
        }
        Relationships: []
      }
      chat_clears: {
        Row: {
          cleared_at: string
          created_at: string
          id: string
          peer_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          cleared_at?: string
          created_at?: string
          id?: string
          peer_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          cleared_at?: string
          created_at?: string
          id?: string
          peer_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      content_categories: {
        Row: {
          created_at: string
          id: string
          is_locked: boolean
          name: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_locked?: boolean
          name: string
        }
        Update: {
          created_at?: string
          id?: string
          is_locked?: boolean
          name?: string
        }
        Relationships: []
      }
      content_items: {
        Row: {
          business_id: string
          category_id: string
          content_type_id: string
          created_at: string
          created_by: string
          deleted_at: string | null
          description: string | null
          id: string
          image_primary_url: string | null
          image_second_url: string | null
          image_third_url: string | null
          platform: string | null
          scheduled_at: string | null
          title: string
          updated_at: string
        }
        Insert: {
          business_id: string
          category_id: string
          content_type_id: string
          created_at?: string
          created_by: string
          deleted_at?: string | null
          description?: string | null
          id?: string
          image_primary_url?: string | null
          image_second_url?: string | null
          image_third_url?: string | null
          platform?: string | null
          scheduled_at?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          business_id?: string
          category_id?: string
          content_type_id?: string
          created_at?: string
          created_by?: string
          deleted_at?: string | null
          description?: string | null
          id?: string
          image_primary_url?: string | null
          image_second_url?: string | null
          image_third_url?: string | null
          platform?: string | null
          scheduled_at?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "content_items_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_items_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "content_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_items_content_type_id_fkey"
            columns: ["content_type_id"]
            isOneToOne: false
            referencedRelation: "content_types"
            referencedColumns: ["id"]
          },
        ]
      }
      content_types: {
        Row: {
          created_at: string
          id: string
          is_locked: boolean
          name: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_locked?: boolean
          name: string
        }
        Update: {
          created_at?: string
          id?: string
          is_locked?: boolean
          name?: string
        }
        Relationships: []
      }
      domain_pricing_settings: {
        Row: {
          created_at: string
          default_package_id: string | null
          id: boolean
          updated_at: string
        }
        Insert: {
          created_at?: string
          default_package_id?: string | null
          id?: boolean
          updated_at?: string
        }
        Update: {
          created_at?: string
          default_package_id?: string | null
          id?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      domain_tld_prices: {
        Row: {
          created_at: string
          id: string
          package_id: string
          price_usd: number
          tld: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          package_id: string
          price_usd?: number
          tld: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          package_id?: string
          price_usd?: number
          tld?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "domain_tld_prices_package_id_fkey"
            columns: ["package_id"]
            isOneToOne: false
            referencedRelation: "packages"
            referencedColumns: ["id"]
          },
        ]
      }
      domainduck_api_usage: {
        Row: {
          created_at: string
          key_hash: string
          updated_at: string
          usage_limit: number
          used_count: number
        }
        Insert: {
          created_at?: string
          key_hash: string
          updated_at?: string
          usage_limit?: number
          used_count?: number
        }
        Update: {
          created_at?: string
          key_hash?: string
          updated_at?: string
          usage_limit?: number
          used_count?: number
        }
        Relationships: []
      }
      downloadable_reports: {
        Row: {
          business_id: string
          created_at: string
          created_by: string | null
          description: string | null
          file_name: string
          file_url: string
          id: string
        }
        Insert: {
          business_id: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          file_name: string
          file_url: string
          id?: string
        }
        Update: {
          business_id?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          file_name?: string
          file_url?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "downloadable_reports_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      integration_secrets: {
        Row: {
          ciphertext: string
          created_at: string
          id: string
          iv: string
          name: string
          provider: string
          updated_at: string
        }
        Insert: {
          ciphertext: string
          created_at?: string
          id?: string
          iv: string
          name: string
          provider: string
          updated_at?: string
        }
        Update: {
          ciphertext?: string
          created_at?: string
          id?: string
          iv?: string
          name?: string
          provider?: string
          updated_at?: string
        }
        Relationships: []
      }
      invoices: {
        Row: {
          amount: number
          created_at: string
          id: string
          package_id: string | null
          paid_at: string | null
          status: string | null
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          package_id?: string | null
          paid_at?: string | null
          status?: string | null
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          package_id?: string | null
          paid_at?: string | null
          status?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoices_package_id_fkey"
            columns: ["package_id"]
            isOneToOne: false
            referencedRelation: "packages"
            referencedColumns: ["id"]
          },
        ]
      }
      media_categories: {
        Row: {
          created_at: string
          id: string
          is_locked: boolean
          name: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_locked?: boolean
          name: string
        }
        Update: {
          created_at?: string
          id?: string
          is_locked?: boolean
          name?: string
        }
        Relationships: []
      }
      media_types: {
        Row: {
          created_at: string
          id: string
          is_locked: boolean
          name: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_locked?: boolean
          name: string
        }
        Update: {
          created_at?: string
          id?: string
          is_locked?: boolean
          name?: string
        }
        Relationships: []
      }
      messages: {
        Row: {
          content: string
          created_at: string
          file_url: string | null
          id: string
          is_read: boolean | null
          receiver_id: string
          sender_id: string
        }
        Insert: {
          content: string
          created_at?: string
          file_url?: string | null
          id?: string
          is_read?: boolean | null
          receiver_id: string
          sender_id: string
        }
        Update: {
          content?: string
          created_at?: string
          file_url?: string | null
          id?: string
          is_read?: boolean | null
          receiver_id?: string
          sender_id?: string
        }
        Relationships: []
      }
      onboarding_add_on_selections: {
        Row: {
          add_on_id: string
          created_at: string
          id: string
          quantity: number
          updated_at: string
          user_id: string
        }
        Insert: {
          add_on_id: string
          created_at?: string
          id?: string
          quantity?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          add_on_id?: string
          created_at?: string
          id?: string
          quantity?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "onboarding_add_on_selections_add_on_id_fkey"
            columns: ["add_on_id"]
            isOneToOne: false
            referencedRelation: "package_add_ons"
            referencedColumns: ["id"]
          },
        ]
      }
      order_promos: {
        Row: {
          code: string
          created_at: string
          description: string
          discount_type: string
          discount_value: number
          ends_at: string | null
          event_name: string
          id: string
          promo_name: string
          starts_at: string | null
          status: string
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          description?: string
          discount_type?: string
          discount_value?: number
          ends_at?: string | null
          event_name?: string
          id?: string
          promo_name: string
          starts_at?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          description?: string
          discount_type?: string
          discount_value?: number
          ends_at?: string | null
          event_name?: string
          id?: string
          promo_name?: string
          starts_at?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      orders: {
        Row: {
          amount: number | null
          amount_idr: number | null
          amount_usd: number | null
          billing_cycle: string | null
          created_at: string
          customer_email: string | null
          customer_name: string | null
          design: string | null
          domain: string
          id: string
          midtrans_fraud_status: string | null
          midtrans_order_id: string | null
          midtrans_payment_type: string | null
          midtrans_redirect_url: string | null
          midtrans_transaction_id: string | null
          midtrans_transaction_status: string | null
          payment_env: string | null
          payment_provider: string | null
          promo_code: string | null
          status: string | null
          subscription_years: number | null
          user_id: string | null
        }
        Insert: {
          amount?: number | null
          amount_idr?: number | null
          amount_usd?: number | null
          billing_cycle?: string | null
          created_at?: string
          customer_email?: string | null
          customer_name?: string | null
          design?: string | null
          domain: string
          id?: string
          midtrans_fraud_status?: string | null
          midtrans_order_id?: string | null
          midtrans_payment_type?: string | null
          midtrans_redirect_url?: string | null
          midtrans_transaction_id?: string | null
          midtrans_transaction_status?: string | null
          payment_env?: string | null
          payment_provider?: string | null
          promo_code?: string | null
          status?: string | null
          subscription_years?: number | null
          user_id?: string | null
        }
        Update: {
          amount?: number | null
          amount_idr?: number | null
          amount_usd?: number | null
          billing_cycle?: string | null
          created_at?: string
          customer_email?: string | null
          customer_name?: string | null
          design?: string | null
          domain?: string
          id?: string
          midtrans_fraud_status?: string | null
          midtrans_order_id?: string | null
          midtrans_payment_type?: string | null
          midtrans_redirect_url?: string | null
          midtrans_transaction_id?: string | null
          midtrans_transaction_status?: string | null
          payment_env?: string | null
          payment_provider?: string | null
          promo_code?: string | null
          status?: string | null
          subscription_years?: number | null
          user_id?: string | null
        }
        Relationships: []
      }
      package_add_ons: {
        Row: {
          add_on_key: string
          created_at: string
          id: string
          is_active: boolean
          label: string
          max_quantity: number | null
          package_id: string
          price_per_unit: number
          sort_order: number
          unit: string
          unit_step: number
          updated_at: string
        }
        Insert: {
          add_on_key: string
          created_at?: string
          id?: string
          is_active?: boolean
          label: string
          max_quantity?: number | null
          package_id: string
          price_per_unit?: number
          sort_order?: number
          unit?: string
          unit_step?: number
          updated_at?: string
        }
        Update: {
          add_on_key?: string
          created_at?: string
          id?: string
          is_active?: boolean
          label?: string
          max_quantity?: number | null
          package_id?: string
          price_per_unit?: number
          sort_order?: number
          unit?: string
          unit_step?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "package_add_ons_package_id_fkey"
            columns: ["package_id"]
            isOneToOne: false
            referencedRelation: "packages"
            referencedColumns: ["id"]
          },
        ]
      }
      package_ai_tool_rules: {
        Row: {
          created_at: string
          is_enabled: boolean
          package_id: string
          tool_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          is_enabled?: boolean
          package_id: string
          tool_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          is_enabled?: boolean
          package_id?: string
          tool_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "package_ai_tool_rules_package_id_fkey"
            columns: ["package_id"]
            isOneToOne: false
            referencedRelation: "packages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "package_ai_tool_rules_tool_id_fkey"
            columns: ["tool_id"]
            isOneToOne: false
            referencedRelation: "assist_ai_tools"
            referencedColumns: ["id"]
          },
        ]
      }
      package_durations: {
        Row: {
          created_at: string
          discount_percent: number
          duration_months: number
          id: string
          is_active: boolean
          package_id: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          discount_percent?: number
          duration_months: number
          id?: string
          is_active?: boolean
          package_id: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          discount_percent?: number
          duration_months?: number
          id?: string
          is_active?: boolean
          package_id?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "package_durations_package_id_fkey"
            columns: ["package_id"]
            isOneToOne: false
            referencedRelation: "packages"
            referencedColumns: ["id"]
          },
        ]
      }
      package_menu_rules: {
        Row: {
          created_at: string
          id: string
          is_enabled: boolean
          menu_key: string
          package_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_enabled?: boolean
          menu_key: string
          package_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_enabled?: boolean
          menu_key?: string
          package_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "package_menu_rules_package_id_fkey"
            columns: ["package_id"]
            isOneToOne: false
            referencedRelation: "packages"
            referencedColumns: ["id"]
          },
        ]
      }
      packages: {
        Row: {
          created_at: string
          description: string | null
          features: Json | null
          id: string
          is_active: boolean | null
          is_best_seller: boolean
          is_recommended: boolean
          is_vip: boolean
          name: string
          price: number | null
          show_on_public: boolean
          type: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          features?: Json | null
          id?: string
          is_active?: boolean | null
          is_best_seller?: boolean
          is_recommended?: boolean
          is_vip?: boolean
          name: string
          price?: number | null
          show_on_public?: boolean
          type: string
        }
        Update: {
          created_at?: string
          description?: string | null
          features?: Json | null
          id?: string
          is_active?: boolean | null
          is_best_seller?: boolean
          is_recommended?: boolean
          is_vip?: boolean
          name?: string
          price?: number | null
          show_on_public?: boolean
          type?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          account_status: Database["public"]["Enums"]["account_status"]
          age: number | null
          avatar_url: string | null
          bio: string | null
          business_address: string | null
          business_name: string | null
          city: string | null
          country: string | null
          created_at: string | null
          email: string
          experience: string | null
          hours: Json | null
          id: string
          linkedin_url: string | null
          name: string
          onboarding_completed: boolean | null
          payment_active: boolean
          phone: string | null
          phone_secondary: string | null
          portfolio_url: string | null
          skills: string[] | null
          social_links: Json | null
          state: string | null
          twitter_url: string | null
          updated_at: string | null
        }
        Insert: {
          account_status?: Database["public"]["Enums"]["account_status"]
          age?: number | null
          avatar_url?: string | null
          bio?: string | null
          business_address?: string | null
          business_name?: string | null
          city?: string | null
          country?: string | null
          created_at?: string | null
          email: string
          experience?: string | null
          hours?: Json | null
          id: string
          linkedin_url?: string | null
          name: string
          onboarding_completed?: boolean | null
          payment_active?: boolean
          phone?: string | null
          phone_secondary?: string | null
          portfolio_url?: string | null
          skills?: string[] | null
          social_links?: Json | null
          state?: string | null
          twitter_url?: string | null
          updated_at?: string | null
        }
        Update: {
          account_status?: Database["public"]["Enums"]["account_status"]
          age?: number | null
          avatar_url?: string | null
          bio?: string | null
          business_address?: string | null
          business_name?: string | null
          city?: string | null
          country?: string | null
          created_at?: string | null
          email?: string
          experience?: string | null
          hours?: Json | null
          id?: string
          linkedin_url?: string | null
          name?: string
          onboarding_completed?: boolean | null
          payment_active?: boolean
          phone?: string | null
          phone_secondary?: string | null
          portfolio_url?: string | null
          skills?: string[] | null
          social_links?: Json | null
          state?: string | null
          twitter_url?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      subscription_add_ons: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          label: string
          package_id: string | null
          price_idr: number
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          label: string
          package_id?: string | null
          price_idr?: number
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          label?: string
          package_id?: string | null
          price_idr?: number
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscription_add_ons_package_id_fkey"
            columns: ["package_id"]
            isOneToOne: false
            referencedRelation: "packages"
            referencedColumns: ["id"]
          },
        ]
      }
      super_admin_audit_logs: {
        Row: {
          action: string
          actor_user_id: string
          created_at: string
          id: string
          metadata: Json
          provider: string
        }
        Insert: {
          action: string
          actor_user_id: string
          created_at?: string
          id?: string
          metadata?: Json
          provider: string
        }
        Update: {
          action?: string
          actor_user_id?: string
          created_at?: string
          id?: string
          metadata?: Json
          provider?: string
        }
        Relationships: []
      }
      task_recurring_rules: {
        Row: {
          assigned_to: string | null
          created_at: string
          created_by: string
          deadline_day: number
          description: string | null
          file_url: string | null
          id: string
          is_active: boolean
          platform: Database["public"]["Enums"]["social_media_platform"] | null
          title: string
          type: Database["public"]["Enums"]["task_type"] | null
          updated_at: string
          user_id: string
        }
        Insert: {
          assigned_to?: string | null
          created_at?: string
          created_by: string
          deadline_day: number
          description?: string | null
          file_url?: string | null
          id?: string
          is_active?: boolean
          platform?: Database["public"]["Enums"]["social_media_platform"] | null
          title: string
          type?: Database["public"]["Enums"]["task_type"] | null
          updated_at?: string
          user_id: string
        }
        Update: {
          assigned_to?: string | null
          created_at?: string
          created_by?: string
          deadline_day?: number
          description?: string | null
          file_url?: string | null
          id?: string
          is_active?: boolean
          platform?: Database["public"]["Enums"]["social_media_platform"] | null
          title?: string
          type?: Database["public"]["Enums"]["task_type"] | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      task_work_logs: {
        Row: {
          created_at: string
          file_url: string | null
          id: string
          screenshot_url: string | null
          shared_url: string | null
          status: string | null
          task_id: string
          time_spent: number | null
          user_id: string
          work_description: string | null
        }
        Insert: {
          created_at?: string
          file_url?: string | null
          id?: string
          screenshot_url?: string | null
          shared_url?: string | null
          status?: string | null
          task_id: string
          time_spent?: number | null
          user_id: string
          work_description?: string | null
        }
        Update: {
          created_at?: string
          file_url?: string | null
          id?: string
          screenshot_url?: string | null
          shared_url?: string | null
          status?: string | null
          task_id?: string
          time_spent?: number | null
          user_id?: string
          work_description?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "task_work_logs_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          assigned_to: string | null
          created_at: string
          deadline: string | null
          description: string | null
          file_url: string | null
          id: string
          notes: string | null
          platform: Database["public"]["Enums"]["social_media_platform"] | null
          recurring_rule_id: string | null
          status: Database["public"]["Enums"]["task_status"] | null
          task_number: number | null
          title: string
          type: Database["public"]["Enums"]["task_type"] | null
          updated_at: string
          user_id: string
        }
        Insert: {
          assigned_to?: string | null
          created_at?: string
          deadline?: string | null
          description?: string | null
          file_url?: string | null
          id?: string
          notes?: string | null
          platform?: Database["public"]["Enums"]["social_media_platform"] | null
          recurring_rule_id?: string | null
          status?: Database["public"]["Enums"]["task_status"] | null
          task_number?: number | null
          title: string
          type?: Database["public"]["Enums"]["task_type"] | null
          updated_at?: string
          user_id: string
        }
        Update: {
          assigned_to?: string | null
          created_at?: string
          deadline?: string | null
          description?: string | null
          file_url?: string | null
          id?: string
          notes?: string | null
          platform?: Database["public"]["Enums"]["social_media_platform"] | null
          recurring_rule_id?: string | null
          status?: Database["public"]["Enums"]["task_status"] | null
          task_number?: number | null
          title?: string
          type?: Database["public"]["Enums"]["task_type"] | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_content: {
        Row: {
          content_type: Database["public"]["Enums"]["content_type"]
          created_at: string
          description: string | null
          id: string
          idea: string | null
          platform: Database["public"]["Enums"]["social_media_platform"] | null
          status: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          content_type: Database["public"]["Enums"]["content_type"]
          created_at?: string
          description?: string | null
          id?: string
          idea?: string | null
          platform?: Database["public"]["Enums"]["social_media_platform"] | null
          status?: string | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          content_type?: Database["public"]["Enums"]["content_type"]
          created_at?: string
          description?: string | null
          id?: string
          idea?: string | null
          platform?: Database["public"]["Enums"]["social_media_platform"] | null
          status?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_gallery: {
        Row: {
          created_at: string
          id: string
          media_category_id: string | null
          media_type_id: string | null
          name: string
          size: number | null
          type: string
          url: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          media_category_id?: string | null
          media_type_id?: string | null
          name: string
          size?: number | null
          type: string
          url: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          media_category_id?: string | null
          media_type_id?: string | null
          name?: string
          size?: number | null
          type?: string
          url?: string
          user_id?: string
        }
        Relationships: []
      }
      user_packages: {
        Row: {
          activated_at: string | null
          created_at: string
          duration_months: number
          expires_at: string | null
          id: string
          package_id: string
          started_at: string
          status: string | null
          user_id: string
        }
        Insert: {
          activated_at?: string | null
          created_at?: string
          duration_months?: number
          expires_at?: string | null
          id?: string
          package_id: string
          started_at?: string
          status?: string | null
          user_id: string
        }
        Update: {
          activated_at?: string | null
          created_at?: string
          duration_months?: number
          expires_at?: string | null
          id?: string
          package_id?: string
          started_at?: string
          status?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_packages_package_id_fkey"
            columns: ["package_id"]
            isOneToOne: false
            referencedRelation: "packages"
            referencedColumns: ["id"]
          },
        ]
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
      website_faqs: {
        Row: {
          answer: string
          created_at: string
          id: string
          is_published: boolean
          page: string
          question: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          answer: string
          created_at?: string
          id?: string
          is_published?: boolean
          page: string
          question: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          answer?: string
          created_at?: string
          id?: string
          is_published?: boolean
          page?: string
          question?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      website_inquiries: {
        Row: {
          attachment_mime: string | null
          attachment_name: string | null
          attachment_size: number | null
          attachment_url: string | null
          created_at: string
          email: string
          id: string
          ip: unknown
          message: string
          name: string
          source: string
          status: string
          subject: string
          user_agent: string | null
        }
        Insert: {
          attachment_mime?: string | null
          attachment_name?: string | null
          attachment_size?: number | null
          attachment_url?: string | null
          created_at?: string
          email: string
          id?: string
          ip?: unknown
          message: string
          name: string
          source?: string
          status?: string
          subject: string
          user_agent?: string | null
        }
        Update: {
          attachment_mime?: string | null
          attachment_name?: string | null
          attachment_size?: number | null
          attachment_url?: string | null
          created_at?: string
          email?: string
          id?: string
          ip?: unknown
          message?: string
          name?: string
          source?: string
          status?: string
          subject?: string
          user_agent?: string | null
        }
        Relationships: []
      }
      website_media_items: {
        Row: {
          alt_text: string | null
          created_at: string
          created_by: string
          id: string
          is_published: boolean
          media_type: string
          mime_type: string
          name: string
          size: number | null
          sort_order: number | null
          storage_path: string
          updated_at: string
          url: string
        }
        Insert: {
          alt_text?: string | null
          created_at?: string
          created_by: string
          id?: string
          is_published?: boolean
          media_type: string
          mime_type: string
          name: string
          size?: number | null
          sort_order?: number | null
          storage_path: string
          updated_at?: string
          url: string
        }
        Update: {
          alt_text?: string | null
          created_at?: string
          created_by?: string
          id?: string
          is_published?: boolean
          media_type?: string
          mime_type?: string
          name?: string
          size?: number | null
          sort_order?: number | null
          storage_path?: string
          updated_at?: string
          url?: string
        }
        Relationships: []
      }
      website_settings: {
        Row: {
          created_at: string
          id: string
          key: string
          updated_at: string
          value: Json
        }
        Insert: {
          created_at?: string
          id?: string
          key: string
          updated_at?: string
          value?: Json
        }
        Update: {
          created_at?: string
          id?: string
          key?: string
          updated_at?: string
          value?: Json
        }
        Relationships: []
      }
      work_log_delete_requests: {
        Row: {
          created_at: string
          decided_at: string | null
          decided_by: string | null
          id: string
          owner_id: string
          reason: string
          requester_id: string
          status: string
          task_id: string
          updated_at: string
          work_log_id: string
        }
        Insert: {
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          id?: string
          owner_id: string
          reason: string
          requester_id: string
          status?: string
          task_id: string
          updated_at?: string
          work_log_id: string
        }
        Update: {
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          id?: string
          owner_id?: string
          reason?: string
          requester_id?: string
          status?: string
          task_id?: string
          updated_at?: string
          work_log_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      generate_recurring_tasks: { Args: never; Returns: number }
      get_active_assist_accounts: {
        Args: never
        Returns: {
          id: string
          name: string
        }[]
      }
      get_assist_accounts: {
        Args: never
        Returns: {
          id: string
          name: string
        }[]
      }
      get_assist_contacts: {
        Args: never
        Returns: {
          avatar_url: string
          email: string
          id: string
          name: string
          status: string
        }[]
      }
      get_user_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      increment_domainduck_usage: {
        Args: { p_key_hash: string }
        Returns: {
          exhausted: boolean
          usage_limit: number
          used_count: number
        }[]
      }
      is_account_active: { Args: { _user_id: string }; Returns: boolean }
      is_blacklisted_email: { Args: { _email: string }; Returns: boolean }
    }
    Enums: {
      account_status:
        | "active"
        | "nonactive"
        | "blacklisted"
        | "pending"
        | "approved"
        | "suspended"
        | "expired"
      app_role: "user" | "assist" | "admin" | "super_admin"
      blog_content_type: "article" | "news" | "update"
      blog_post_status:
        | "draft"
        | "pending_review"
        | "private"
        | "scheduled"
        | "published"
      blog_visibility: "public" | "private"
      business_stage: "new" | "growing"
      content_type: "blog" | "social_media" | "email_marketing" | "others"
      package_type: "starter" | "growth" | "website" | "monthly" | "pro"
      social_media_platform:
        | "facebook"
        | "instagram"
        | "x"
        | "threads"
        | "linkedin"
      task_status:
        | "pending"
        | "assigned"
        | "in_progress"
        | "ready_for_review"
        | "completed"
        | "cancelled"
      task_type: "blog" | "social_media" | "email_marketing" | "ads" | "others"
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
      account_status: [
        "active",
        "nonactive",
        "blacklisted",
        "pending",
        "approved",
        "suspended",
        "expired",
      ],
      app_role: ["user", "assist", "admin", "super_admin"],
      blog_content_type: ["article", "news", "update"],
      blog_post_status: [
        "draft",
        "pending_review",
        "private",
        "scheduled",
        "published",
      ],
      blog_visibility: ["public", "private"],
      business_stage: ["new", "growing"],
      content_type: ["blog", "social_media", "email_marketing", "others"],
      package_type: ["starter", "growth", "website", "monthly", "pro"],
      social_media_platform: [
        "facebook",
        "instagram",
        "x",
        "threads",
        "linkedin",
      ],
      task_status: [
        "pending",
        "assigned",
        "in_progress",
        "ready_for_review",
        "completed",
        "cancelled",
      ],
      task_type: ["blog", "social_media", "email_marketing", "ads", "others"],
    },
  },
} as const
