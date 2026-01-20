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
      custom_roles: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          permissions: Json
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          permissions?: Json
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          permissions?: Json
          updated_at?: string
        }
        Relationships: []
      }
      ecde_centers: {
        Row: {
          capacity: number | null
          code: string
          contact_email: string | null
          contact_phone: string | null
          created_at: string
          established_date: string | null
          id: string
          is_active: boolean | null
          latitude: number | null
          location: string
          longitude: number | null
          name: string
          sub_county: string
          updated_at: string
          ward: string
          ward_id: string | null
        }
        Insert: {
          capacity?: number | null
          code: string
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          established_date?: string | null
          id?: string
          is_active?: boolean | null
          latitude?: number | null
          location: string
          longitude?: number | null
          name: string
          sub_county: string
          updated_at?: string
          ward: string
          ward_id?: string | null
        }
        Update: {
          capacity?: number | null
          code?: string
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          established_date?: string | null
          id?: string
          is_active?: boolean | null
          latitude?: number | null
          location?: string
          longitude?: number | null
          name?: string
          sub_county?: string
          updated_at?: string
          ward?: string
          ward_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ecde_centers_ward_id_fkey"
            columns: ["ward_id"]
            isOneToOne: false
            referencedRelation: "wards"
            referencedColumns: ["id"]
          },
        ]
      }
      permissions: {
        Row: {
          can_create: boolean | null
          can_delete: boolean | null
          can_read: boolean | null
          can_update: boolean | null
          created_at: string
          id: string
          resource: string
          role: Database["public"]["Enums"]["app_role"]
          updated_at: string
        }
        Insert: {
          can_create?: boolean | null
          can_delete?: boolean | null
          can_read?: boolean | null
          can_update?: boolean | null
          created_at?: string
          id?: string
          resource: string
          role: Database["public"]["Enums"]["app_role"]
          updated_at?: string
        }
        Update: {
          can_create?: boolean | null
          can_delete?: boolean | null
          can_read?: boolean | null
          can_update?: boolean | null
          created_at?: string
          id?: string
          resource?: string
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string
          full_name: string
          id: string
          is_active: boolean | null
          phone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email: string
          full_name: string
          id?: string
          is_active?: boolean | null
          phone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          is_active?: boolean | null
          phone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      students: {
        Row: {
          address: string | null
          admission_date: string | null
          admission_number: string
          approval_status: Database["public"]["Enums"]["approval_status"] | null
          approved_by_ministry: string | null
          approved_by_subcounty: string | null
          center_id: string | null
          created_at: string
          created_by: string | null
          date_of_birth: string
          full_name: string
          gender: Database["public"]["Enums"]["gender"]
          id: string
          is_active: boolean | null
          ministry_approval_date: string | null
          parent_email: string | null
          parent_name: string
          parent_phone: string
          rejection_reason: string | null
          special_needs: string | null
          subcounty_approval_date: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          admission_date?: string | null
          admission_number: string
          approval_status?:
            | Database["public"]["Enums"]["approval_status"]
            | null
          approved_by_ministry?: string | null
          approved_by_subcounty?: string | null
          center_id?: string | null
          created_at?: string
          created_by?: string | null
          date_of_birth: string
          full_name: string
          gender: Database["public"]["Enums"]["gender"]
          id?: string
          is_active?: boolean | null
          ministry_approval_date?: string | null
          parent_email?: string | null
          parent_name: string
          parent_phone: string
          rejection_reason?: string | null
          special_needs?: string | null
          subcounty_approval_date?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          admission_date?: string | null
          admission_number?: string
          approval_status?:
            | Database["public"]["Enums"]["approval_status"]
            | null
          approved_by_ministry?: string | null
          approved_by_subcounty?: string | null
          center_id?: string | null
          created_at?: string
          created_by?: string | null
          date_of_birth?: string
          full_name?: string
          gender?: Database["public"]["Enums"]["gender"]
          id?: string
          is_active?: boolean | null
          ministry_approval_date?: string | null
          parent_email?: string | null
          parent_name?: string
          parent_phone?: string
          rejection_reason?: string | null
          special_needs?: string | null
          subcounty_approval_date?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "students_center_id_fkey"
            columns: ["center_id"]
            isOneToOne: false
            referencedRelation: "ecde_centers"
            referencedColumns: ["id"]
          },
        ]
      }
      sub_counties: {
        Row: {
          code: string
          created_at: string
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      teachers: {
        Row: {
          center_id: string | null
          created_at: string
          date_of_birth: string | null
          email: string | null
          employee_number: string
          employment_date: string | null
          full_name: string
          gender: Database["public"]["Enums"]["gender"]
          id: string
          is_active: boolean | null
          national_id: string
          phone: string | null
          qualification: string | null
          specialization: string | null
          updated_at: string
        }
        Insert: {
          center_id?: string | null
          created_at?: string
          date_of_birth?: string | null
          email?: string | null
          employee_number: string
          employment_date?: string | null
          full_name: string
          gender: Database["public"]["Enums"]["gender"]
          id?: string
          is_active?: boolean | null
          national_id: string
          phone?: string | null
          qualification?: string | null
          specialization?: string | null
          updated_at?: string
        }
        Update: {
          center_id?: string | null
          created_at?: string
          date_of_birth?: string | null
          email?: string | null
          employee_number?: string
          employment_date?: string | null
          full_name?: string
          gender?: Database["public"]["Enums"]["gender"]
          id?: string
          is_active?: boolean | null
          national_id?: string
          phone?: string | null
          qualification?: string | null
          specialization?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "teachers_center_id_fkey"
            columns: ["center_id"]
            isOneToOne: false
            referencedRelation: "ecde_centers"
            referencedColumns: ["id"]
          },
        ]
      }
      user_center_assignments: {
        Row: {
          assigned_at: string
          assigned_by: string | null
          center_id: string
          id: string
          is_active: boolean | null
          user_id: string
        }
        Insert: {
          assigned_at?: string
          assigned_by?: string | null
          center_id: string
          id?: string
          is_active?: boolean | null
          user_id: string
        }
        Update: {
          assigned_at?: string
          assigned_by?: string | null
          center_id?: string
          id?: string
          is_active?: boolean | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_center_assignments_center_id_fkey"
            columns: ["center_id"]
            isOneToOne: false
            referencedRelation: "ecde_centers"
            referencedColumns: ["id"]
          },
        ]
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
      user_subcounty_assignments: {
        Row: {
          assigned_at: string
          assigned_by: string | null
          id: string
          is_active: boolean | null
          sub_county_id: string
          user_id: string
        }
        Insert: {
          assigned_at?: string
          assigned_by?: string | null
          id?: string
          is_active?: boolean | null
          sub_county_id: string
          user_id: string
        }
        Update: {
          assigned_at?: string
          assigned_by?: string | null
          id?: string
          is_active?: boolean | null
          sub_county_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_subcounty_assignments_sub_county_id_fkey"
            columns: ["sub_county_id"]
            isOneToOne: false
            referencedRelation: "sub_counties"
            referencedColumns: ["id"]
          },
        ]
      }
      wards: {
        Row: {
          code: string
          created_at: string
          id: string
          name: string
          sub_county_id: string
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          id?: string
          name: string
          sub_county_id: string
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          id?: string
          name?: string
          sub_county_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "wards_sub_county_id_fkey"
            columns: ["sub_county_id"]
            isOneToOne: false
            referencedRelation: "sub_counties"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_user_center_id: { Args: { _user_id: string }; Returns: string }
      get_user_permissions: {
        Args: { _user_id: string }
        Returns: {
          can_create: boolean
          can_delete: boolean
          can_read: boolean
          can_update: boolean
          resource: string
        }[]
      }
      get_user_subcounty_id: { Args: { _user_id: string }; Returns: string }
      has_any_role: { Args: { _user_id: string }; Returns: boolean }
      has_permission: {
        Args: { _action: string; _resource: string; _user_id: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: { _user_id: string }; Returns: boolean }
      is_subcounty_manager: { Args: { _user_id: string }; Returns: boolean }
      super_admin_exists: { Args: never; Returns: boolean }
    }
    Enums: {
      app_role:
        | "super_admin"
        | "admin"
        | "data_entry"
        | "viewer"
        | "center_admin"
        | "teacher"
        | "education_officer"
        | "governor"
      approval_status:
        | "pending"
        | "approved_subcounty"
        | "approved_ministry"
        | "rejected"
      gender: "male" | "female"
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
        "super_admin",
        "admin",
        "data_entry",
        "viewer",
        "center_admin",
        "teacher",
        "education_officer",
        "governor",
      ],
      approval_status: [
        "pending",
        "approved_subcounty",
        "approved_ministry",
        "rejected",
      ],
      gender: ["male", "female"],
    },
  },
} as const
