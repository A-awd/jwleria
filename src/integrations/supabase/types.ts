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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      brands: {
        Row: {
          country: string | null
          created_at: string
          description_ar: string | null
          description_en: string | null
          description_es: string | null
          description_fr: string | null
          founded_year: number | null
          id: string
          is_active: boolean | null
          logo_url: string | null
          name_ar: string | null
          name_en: string
          name_es: string | null
          name_fr: string | null
          slug: string
          specialty: string | null
          updated_at: string
        }
        Insert: {
          country?: string | null
          created_at?: string
          description_ar?: string | null
          description_en?: string | null
          description_es?: string | null
          description_fr?: string | null
          founded_year?: number | null
          id?: string
          is_active?: boolean | null
          logo_url?: string | null
          name_ar?: string | null
          name_en: string
          name_es?: string | null
          name_fr?: string | null
          slug: string
          specialty?: string | null
          updated_at?: string
        }
        Update: {
          country?: string | null
          created_at?: string
          description_ar?: string | null
          description_en?: string | null
          description_es?: string | null
          description_fr?: string | null
          founded_year?: number | null
          id?: string
          is_active?: boolean | null
          logo_url?: string | null
          name_ar?: string | null
          name_en?: string
          name_es?: string | null
          name_fr?: string | null
          slug?: string
          specialty?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      categories: {
        Row: {
          created_at: string
          id: string
          image_url: string | null
          is_active: boolean | null
          name_ar: string | null
          name_en: string
          name_es: string | null
          name_fr: string | null
          slug: string
        }
        Insert: {
          created_at?: string
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          name_ar?: string | null
          name_en: string
          name_es?: string | null
          name_fr?: string | null
          slug: string
        }
        Update: {
          created_at?: string
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          name_ar?: string | null
          name_en?: string
          name_es?: string | null
          name_fr?: string | null
          slug?: string
        }
        Relationships: []
      }
      products: {
        Row: {
          brand_id: string | null
          category_id: string | null
          created_at: string
          created_by: string | null
          currency: string | null
          description_ar: string | null
          description_en: string | null
          description_es: string | null
          description_fr: string | null
          dimensions: string | null
          id: string
          images: Json | null
          is_active: boolean | null
          is_featured: boolean | null
          material_ar: string | null
          material_en: string | null
          material_es: string | null
          material_fr: string | null
          name_ar: string | null
          name_en: string
          name_es: string | null
          name_fr: string | null
          price: number
          sku: string | null
          slug: string
          tags: string[] | null
          updated_at: string
          weight_grams: number | null
        }
        Insert: {
          brand_id?: string | null
          category_id?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string | null
          description_ar?: string | null
          description_en?: string | null
          description_es?: string | null
          description_fr?: string | null
          dimensions?: string | null
          id?: string
          images?: Json | null
          is_active?: boolean | null
          is_featured?: boolean | null
          material_ar?: string | null
          material_en?: string | null
          material_es?: string | null
          material_fr?: string | null
          name_ar?: string | null
          name_en: string
          name_es?: string | null
          name_fr?: string | null
          price: number
          sku?: string | null
          slug: string
          tags?: string[] | null
          updated_at?: string
          weight_grams?: number | null
        }
        Update: {
          brand_id?: string | null
          category_id?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string | null
          description_ar?: string | null
          description_en?: string | null
          description_es?: string | null
          description_fr?: string | null
          dimensions?: string | null
          id?: string
          images?: Json | null
          is_active?: boolean | null
          is_featured?: boolean | null
          material_ar?: string | null
          material_en?: string | null
          material_es?: string | null
          material_fr?: string | null
          name_ar?: string | null
          name_en?: string
          name_es?: string | null
          name_fr?: string | null
          price?: number
          sku?: string | null
          slug?: string
          tags?: string[] | null
          updated_at?: string
          weight_grams?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "products_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          updated_at?: string
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
          role?: Database["public"]["Enums"]["app_role"]
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "editor" | "viewer"
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
      app_role: ["admin", "editor", "viewer"],
    },
  },
} as const
