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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      app_settings: {
        Row: {
          key: string
          updated_at: string
          value: Json
        }
        Insert: {
          key: string
          updated_at?: string
          value: Json
        }
        Update: {
          key?: string
          updated_at?: string
          value?: Json
        }
        Relationships: []
      }
      coaching_plans: {
        Row: {
          actions: Json
          baseline_date: string | null
          baseline_streak: number
          category: string
          created_at: string
          created_by: string
          id: string
          status: string
          summary: string
          tutor_id: string
          updated_at: string
        }
        Insert: {
          actions?: Json
          baseline_date?: string | null
          baseline_streak?: number
          category: string
          created_at?: string
          created_by: string
          id?: string
          status?: string
          summary?: string
          tutor_id: string
          updated_at?: string
        }
        Update: {
          actions?: Json
          baseline_date?: string | null
          baseline_streak?: number
          category?: string
          created_at?: string
          created_by?: string
          id?: string
          status?: string
          summary?: string
          tutor_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      comment_library: {
        Row: {
          active: boolean
          category: string
          comment: string
          created_at: string
          id: string
          score_impact: number
          type: Database["public"]["Enums"]["feedback_type"]
        }
        Insert: {
          active?: boolean
          category: string
          comment: string
          created_at?: string
          id?: string
          score_impact?: number
          type: Database["public"]["Enums"]["feedback_type"]
        }
        Update: {
          active?: boolean
          category?: string
          comment?: string
          created_at?: string
          id?: string
          score_impact?: number
          type?: Database["public"]["Enums"]["feedback_type"]
        }
        Relationships: []
      }
      feedback: {
        Row: {
          category_scores: Json
          created_at: string
          id: string
          mentor_id: string
          negative_count: number
          notes: string | null
          overall_score: number
          positive_count: number
          recommended_action: string | null
          report_link: string | null
          report_markdown: string | null
          session_date: string
          session_id: string | null
          session_link: string | null
          slot: string
          tutor_id: string
          uniform_status: string | null
        }
        Insert: {
          category_scores?: Json
          created_at?: string
          id?: string
          mentor_id: string
          negative_count?: number
          notes?: string | null
          overall_score?: number
          positive_count?: number
          recommended_action?: string | null
          report_link?: string | null
          report_markdown?: string | null
          session_date: string
          session_id?: string | null
          session_link?: string | null
          slot: string
          tutor_id: string
          uniform_status?: string | null
        }
        Update: {
          category_scores?: Json
          created_at?: string
          id?: string
          mentor_id?: string
          negative_count?: number
          notes?: string | null
          overall_score?: number
          positive_count?: number
          recommended_action?: string | null
          report_link?: string | null
          report_markdown?: string | null
          session_date?: string
          session_id?: string | null
          session_link?: string | null
          slot?: string
          tutor_id?: string
          uniform_status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "feedback_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      feedback_comments: {
        Row: {
          category: string
          comment_text: string
          feedback_id: string
          id: string
          library_comment_id: string | null
          score_impact: number
          type: Database["public"]["Enums"]["feedback_type"]
        }
        Insert: {
          category: string
          comment_text: string
          feedback_id: string
          id?: string
          library_comment_id?: string | null
          score_impact?: number
          type: Database["public"]["Enums"]["feedback_type"]
        }
        Update: {
          category?: string
          comment_text?: string
          feedback_id?: string
          id?: string
          library_comment_id?: string | null
          score_impact?: number
          type?: Database["public"]["Enums"]["feedback_type"]
        }
        Relationships: [
          {
            foreignKeyName: "feedback_comments_feedback_id_fkey"
            columns: ["feedback_id"]
            isOneToOne: false
            referencedRelation: "feedback"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feedback_comments_library_comment_id_fkey"
            columns: ["library_comment_id"]
            isOneToOne: false
            referencedRelation: "comment_library"
            referencedColumns: ["id"]
          },
        ]
      }
      mentor_assignments: {
        Row: {
          created_at: string
          end_date: string | null
          id: string
          mentor_id: string
          start_date: string
          status: string
          team_leader_id: string | null
          tutor_id: string
        }
        Insert: {
          created_at?: string
          end_date?: string | null
          id?: string
          mentor_id: string
          start_date?: string
          status?: string
          team_leader_id?: string | null
          tutor_id: string
        }
        Update: {
          created_at?: string
          end_date?: string | null
          id?: string
          mentor_id?: string
          start_date?: string
          status?: string
          team_leader_id?: string | null
          tutor_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          email: string | null
          full_name: string
          id: string
          status: string
          tutor_code: string | null
        }
        Insert: {
          created_at?: string
          email?: string | null
          full_name?: string
          id: string
          status?: string
          tutor_code?: string | null
        }
        Update: {
          created_at?: string
          email?: string | null
          full_name?: string
          id?: string
          status?: string
          tutor_code?: string | null
        }
        Relationships: []
      }
      sessions: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          session_date: string
          session_link: string | null
          slot: string
          status: string
          tutor_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          session_date: string
          session_link?: string | null
          slot: string
          status?: string
          tutor_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          session_date?: string
          session_link?: string | null
          slot?: string
          status?: string
          tutor_id?: string
        }
        Relationships: []
      }
      tutor_assignment_history: {
        Row: {
          changed_at: string
          changed_by: string | null
          id: string
          new_mentor_email: string | null
          new_mentor_name: string | null
          previous_mentor_email: string | null
          previous_mentor_name: string | null
          roster_id: string
          tutor_name: string
        }
        Insert: {
          changed_at?: string
          changed_by?: string | null
          id?: string
          new_mentor_email?: string | null
          new_mentor_name?: string | null
          previous_mentor_email?: string | null
          previous_mentor_name?: string | null
          roster_id: string
          tutor_name: string
        }
        Update: {
          changed_at?: string
          changed_by?: string | null
          id?: string
          new_mentor_email?: string | null
          new_mentor_name?: string | null
          previous_mentor_email?: string | null
          previous_mentor_name?: string | null
          roster_id?: string
          tutor_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "tutor_assignment_history_roster_id_fkey"
            columns: ["roster_id"]
            isOneToOne: false
            referencedRelation: "tutor_roster"
            referencedColumns: ["id"]
          },
        ]
      }
      tutor_roster: {
        Row: {
          created_at: string
          created_by: string | null
          email: string | null
          full_name: string
          id: string
          mentor_email: string | null
          mentor_name: string | null
          notes: string | null
          tutor_code: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          email?: string | null
          full_name: string
          id?: string
          mentor_email?: string | null
          mentor_name?: string | null
          notes?: string | null
          tutor_code?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          email?: string | null
          full_name?: string
          id?: string
          mentor_email?: string | null
          mentor_name?: string | null
          notes?: string | null
          tutor_code?: string | null
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
      is_mentor_of: {
        Args: { _mentor_id: string; _tutor_id: string }
        Returns: boolean
      }
      is_staff: { Args: { _user_id: string }; Returns: boolean }
      my_email: { Args: never; Returns: string }
    }
    Enums: {
      app_role: "admin" | "team_leader" | "mentor" | "tutor"
      feedback_type: "positive" | "negative"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      app_role: ["admin", "team_leader", "mentor", "tutor"],
      feedback_type: ["positive", "negative"],
    },
  },
} as const
