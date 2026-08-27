export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5";
  };
  public: {
    Tables: {
      anthropometric_measurements: {
        Row: {
          age: number | null;
          created_at: string;
          height_cm: number | null;
          id: string;
          measurement_date: string;
          p_abdominal: number | null;
          p_arm_contracted: number | null;
          p_arm_relaxed: number | null;
          p_calves: number | null;
          p_chest: number | null;
          p_hip: number | null;
          p_shoulders: number | null;
          p_thigh: number | null;
          p_waist: number | null;
          s_abdominal: number | null;
          s_axillary: number | null;
          s_biceps: number | null;
          s_calves: number | null;
          s_pectoral: number | null;
          s_quadriceps: number | null;
          s_subscapular: number | null;
          s_supraileac: number | null;
          s_suprailiac: number | null;
          s_supraspinal: number | null;
          s_triceps: number | null;
          sex: Database["public"]["Enums"]["sex_type"] | null;
          updated_at: string;
          user_id: string;
          weight_kg: number | null;
        };
        Insert: {
          age?: number | null;
          created_at?: string;
          height_cm?: number | null;
          id?: string;
          measurement_date?: string;
          p_abdominal?: number | null;
          p_arm_contracted?: number | null;
          p_arm_relaxed?: number | null;
          p_calves?: number | null;
          p_chest?: number | null;
          p_hip?: number | null;
          p_shoulders?: number | null;
          p_thigh?: number | null;
          p_waist?: number | null;
          s_abdominal?: number | null;
          s_axillary?: number | null;
          s_biceps?: number | null;
          s_calves?: number | null;
          s_pectoral?: number | null;
          s_quadriceps?: number | null;
          s_subscapular?: number | null;
          s_supraileac?: number | null;
          s_suprailiac?: number | null;
          s_supraspinal?: number | null;
          s_triceps?: number | null;
          sex?: Database["public"]["Enums"]["sex_type"] | null;
          updated_at?: string;
          user_id: string;
          weight_kg?: number | null;
        };
        Update: {
          age?: number | null;
          created_at?: string;
          height_cm?: number | null;
          id?: string;
          measurement_date?: string;
          p_abdominal?: number | null;
          p_arm_contracted?: number | null;
          p_arm_relaxed?: number | null;
          p_calves?: number | null;
          p_chest?: number | null;
          p_hip?: number | null;
          p_shoulders?: number | null;
          p_thigh?: number | null;
          p_waist?: number | null;
          s_abdominal?: number | null;
          s_axillary?: number | null;
          s_biceps?: number | null;
          s_calves?: number | null;
          s_pectoral?: number | null;
          s_quadriceps?: number | null;
          s_subscapular?: number | null;
          s_supraileac?: number | null;
          s_suprailiac?: number | null;
          s_supraspinal?: number | null;
          s_triceps?: number | null;
          sex?: Database["public"]["Enums"]["sex_type"] | null;
          updated_at?: string;
          user_id?: string;
          weight_kg?: number | null;
        };
        Relationships: [];
      };
      documents: {
        Row: {
          category: Database["public"]["Enums"]["document_category"];
          created_at: string;
          document_date: string;
          id: string;
          mime_type: string | null;
          nutritionist_comment: string | null;
          original_filename: string;
          patient_comment: string | null;
          size_bytes: number | null;
          storage_path: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          category: Database["public"]["Enums"]["document_category"];
          created_at?: string;
          document_date?: string;
          id?: string;
          mime_type?: string | null;
          nutritionist_comment?: string | null;
          original_filename: string;
          patient_comment?: string | null;
          size_bytes?: number | null;
          storage_path: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          category?: Database["public"]["Enums"]["document_category"];
          created_at?: string;
          document_date?: string;
          id?: string;
          mime_type?: string | null;
          nutritionist_comment?: string | null;
          original_filename?: string;
          patient_comment?: string | null;
          size_bytes?: number | null;
          storage_path?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      material_categories: {
        Row: {
          created_at: string;
          created_by: string;
          id: string;
          name: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          created_by: string;
          id?: string;
          name: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          created_by?: string;
          id?: string;
          name?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      measurement_references: {
        Row: {
          created_at: string;
          field_key: string;
          id: string;
          mime_type: string | null;
          original_filename: string;
          size_bytes: number | null;
          storage_path: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          field_key: string;
          id?: string;
          mime_type?: string | null;
          original_filename: string;
          size_bytes?: number | null;
          storage_path: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          field_key?: string;
          id?: string;
          mime_type?: string | null;
          original_filename?: string;
          size_bytes?: number | null;
          storage_path?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      module_labels: {
        Row: {
          created_at: string;
          description: string | null;
          module_id: string;
          title: string;
          updated_at: string;
          updated_by: string | null;
        };
        Insert: {
          created_at?: string;
          description?: string | null;
          module_id: string;
          title: string;
          updated_at?: string;
          updated_by?: string | null;
        };
        Update: {
          created_at?: string;
          description?: string | null;
          module_id?: string;
          title?: string;
          updated_at?: string;
          updated_by?: string | null;
        };
        Relationships: [];
      };
      monthly_surveys: {
        Row: {
          answers: Json;
          completed_at: string | null;
          created_at: string;
          id: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          answers?: Json;
          completed_at?: string | null;
          created_at?: string;
          id?: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          answers?: Json;
          completed_at?: string | null;
          created_at?: string;
          id?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      notifications: {
        Row: {
          body: string | null;
          created_at: string;
          id: string;
          link: string | null;
          read_at: string | null;
          title: string;
          type: string;
          user_id: string;
        };
        Insert: {
          body?: string | null;
          created_at?: string;
          id?: string;
          link?: string | null;
          read_at?: string | null;
          title: string;
          type: string;
          user_id: string;
        };
        Update: {
          body?: string | null;
          created_at?: string;
          id?: string;
          link?: string | null;
          read_at?: string | null;
          title?: string;
          type?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      nutri_photos: {
        Row: {
          caption: string | null;
          created_at: string;
          created_by: string | null;
          id: string;
          section: string;
          sort_order: number;
          storage_path: string;
          updated_at: string;
        };
        Insert: {
          caption?: string | null;
          created_at?: string;
          created_by?: string | null;
          id?: string;
          section?: string;
          sort_order?: number;
          storage_path: string;
          updated_at?: string;
        };
        Update: {
          caption?: string | null;
          created_at?: string;
          created_by?: string | null;
          id?: string;
          section?: string;
          sort_order?: number;
          storage_path?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      nutri_profile: {
        Row: {
          academic_items: Json;
          academic_title: string;
          athletes_items: Json;
          athletes_title: string;
          created_at: string;
          cta_label: string;
          id: string;
          is_visible: boolean;
          message_body: string | null;
          message_title: string;
          name: string;
          panel_title: string;
          personal_body: string | null;
          personal_items: Json;
          personal_title: string;
          photo_path: string | null;
          professional_items: Json;
          professional_title: string;
          role_title: string;
          section_order: Json;
          updated_at: string;
          updated_by: string | null;
          who_body: string | null;
          who_title: string;
          why_body: string | null;
          why_title: string;
        };
        Insert: {
          academic_items?: Json;
          academic_title?: string;
          athletes_items?: Json;
          athletes_title?: string;
          created_at?: string;
          cta_label?: string;
          id?: string;
          is_visible?: boolean;
          message_body?: string | null;
          message_title?: string;
          name?: string;
          panel_title?: string;
          personal_body?: string | null;
          personal_items?: Json;
          personal_title?: string;
          photo_path?: string | null;
          professional_items?: Json;
          professional_title?: string;
          role_title?: string;
          section_order?: Json;
          updated_at?: string;
          updated_by?: string | null;
          who_body?: string | null;
          who_title?: string;
          why_body?: string | null;
          why_title?: string;
        };
        Update: {
          academic_items?: Json;
          academic_title?: string;
          athletes_items?: Json;
          athletes_title?: string;
          created_at?: string;
          cta_label?: string;
          id?: string;
          is_visible?: boolean;
          message_body?: string | null;
          message_title?: string;
          name?: string;
          panel_title?: string;
          personal_body?: string | null;
          personal_items?: Json;
          personal_title?: string;
          photo_path?: string | null;
          professional_items?: Json;
          professional_title?: string;
          role_title?: string;
          section_order?: Json;
          updated_at?: string;
          updated_by?: string | null;
          who_body?: string | null;
          who_title?: string;
          why_body?: string | null;
          why_title?: string;
        };
        Relationships: [];
      };
      nutrition_plans: {
        Row: {
          created_at: string;
          id: string;
          original_filename: string;
          size_bytes: number | null;
          storage_path: string;
          updated_at: string;
          uploaded_by: string | null;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          original_filename: string;
          size_bytes?: number | null;
          storage_path: string;
          updated_at?: string;
          uploaded_by?: string | null;
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          original_filename?: string;
          size_bytes?: number | null;
          storage_path?: string;
          updated_at?: string;
          uploaded_by?: string | null;
          user_id?: string;
        };
        Relationships: [];
      };
      photo_reference: {
        Row: {
          created_at: string;
          id: string;
          mime_type: string | null;
          original_filename: string;
          size_bytes: number | null;
          storage_path: string;
          title: string | null;
          updated_at: string;
          updated_by: string | null;
        };
        Insert: {
          created_at?: string;
          id?: string;
          mime_type?: string | null;
          original_filename: string;
          size_bytes?: number | null;
          storage_path: string;
          title?: string | null;
          updated_at?: string;
          updated_by?: string | null;
        };
        Update: {
          created_at?: string;
          id?: string;
          mime_type?: string | null;
          original_filename?: string;
          size_bytes?: number | null;
          storage_path?: string;
          title?: string | null;
          updated_at?: string;
          updated_by?: string | null;
        };
        Relationships: [];
      };
      photo_sessions: {
        Row: {
          created_at: string;
          id: string;
          session_date: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          session_date?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          session_date?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      photos: {
        Row: {
          angle: Database["public"]["Enums"]["photo_angle"];
          created_at: string;
          id: string;
          nutritionist_comment: string | null;
          patient_comment: string | null;
          session_id: string;
          storage_path: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          angle: Database["public"]["Enums"]["photo_angle"];
          created_at?: string;
          id?: string;
          nutritionist_comment?: string | null;
          patient_comment?: string | null;
          session_id: string;
          storage_path: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          angle?: Database["public"]["Enums"]["photo_angle"];
          created_at?: string;
          id?: string;
          nutritionist_comment?: string | null;
          patient_comment?: string | null;
          session_id?: string;
          storage_path?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "photos_session_id_fkey";
            columns: ["session_id"];
            isOneToOne: false;
            referencedRelation: "photo_sessions";
            referencedColumns: ["id"];
          },
        ];
      };
      profiles: {
        Row: {
          avatar_url: string | null;
          birth_date: string | null;
          created_at: string;
          email: string | null;
          full_name: string | null;
          goal: string | null;
          height_cm: number | null;
          id: string;
          is_active: boolean;
          next_consultation_date: string | null;
          program_end_date: string | null;
          program_start_date: string | null;
          sport: string | null;
          updated_at: string;
          weight_kg: number | null;
        };
        Insert: {
          avatar_url?: string | null;
          birth_date?: string | null;
          created_at?: string;
          email?: string | null;
          full_name?: string | null;
          goal?: string | null;
          height_cm?: number | null;
          id: string;
          is_active?: boolean;
          next_consultation_date?: string | null;
          program_end_date?: string | null;
          program_start_date?: string | null;
          sport?: string | null;
          updated_at?: string;
          weight_kg?: number | null;
        };
        Update: {
          avatar_url?: string | null;
          birth_date?: string | null;
          created_at?: string;
          email?: string | null;
          full_name?: string | null;
          goal?: string | null;
          height_cm?: number | null;
          id?: string;
          is_active?: boolean;
          next_consultation_date?: string | null;
          program_end_date?: string | null;
          program_start_date?: string | null;
          sport?: string | null;
          updated_at?: string;
          weight_kg?: number | null;
        };
        Relationships: [];
      };
      program_resources: {
        Row: {
          category: string;
          created_at: string;
          description: string | null;
          external_url: string | null;
          id: string;
          material_category_id: string | null;
          mime_type: string | null;
          original_filename: string | null;
          resource_type: string;
          size_bytes: number | null;
          storage_path: string | null;
          title: string;
          updated_at: string;
          uploaded_by: string;
        };
        Insert: {
          category: string;
          created_at?: string;
          description?: string | null;
          external_url?: string | null;
          id?: string;
          material_category_id?: string | null;
          mime_type?: string | null;
          original_filename?: string | null;
          resource_type?: string;
          size_bytes?: number | null;
          storage_path?: string | null;
          title: string;
          updated_at?: string;
          uploaded_by: string;
        };
        Update: {
          category?: string;
          created_at?: string;
          description?: string | null;
          external_url?: string | null;
          id?: string;
          material_category_id?: string | null;
          mime_type?: string | null;
          original_filename?: string | null;
          resource_type?: string;
          size_bytes?: number | null;
          storage_path?: string | null;
          title?: string;
          updated_at?: string;
          uploaded_by?: string;
        };
        Relationships: [
          {
            foreignKeyName: "program_resources_material_category_id_fkey";
            columns: ["material_category_id"];
            isOneToOne: false;
            referencedRelation: "material_categories";
            referencedColumns: ["id"];
          },
        ];
      };
      social_video_categories: {
        Row: {
          created_at: string;
          created_by: string;
          id: string;
          name: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          created_by: string;
          id?: string;
          name: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          created_by?: string;
          id?: string;
          name?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      social_videos: {
        Row: {
          category_id: string;
          created_at: string;
          created_by: string;
          id: string;
          platform: string;
          title: string;
          updated_at: string;
          url: string;
        };
        Insert: {
          category_id: string;
          created_at?: string;
          created_by: string;
          id?: string;
          platform: string;
          title: string;
          updated_at?: string;
          url: string;
        };
        Update: {
          category_id?: string;
          created_at?: string;
          created_by?: string;
          id?: string;
          platform?: string;
          title?: string;
          updated_at?: string;
          url?: string;
        };
        Relationships: [
          {
            foreignKeyName: "social_videos_category_id_fkey";
            columns: ["category_id"];
            isOneToOne: false;
            referencedRelation: "social_video_categories";
            referencedColumns: ["id"];
          },
        ];
      };
      training_days: {
        Row: {
          created_at: string;
          day_number: number;
          day_type: Database["public"]["Enums"]["training_day_type"];
          id: string;
          plan_id: string;
          title: string | null;
          updated_at: string;
          week_number: number;
        };
        Insert: {
          created_at?: string;
          day_number: number;
          day_type?: Database["public"]["Enums"]["training_day_type"];
          id?: string;
          plan_id: string;
          title?: string | null;
          updated_at?: string;
          week_number: number;
        };
        Update: {
          created_at?: string;
          day_number?: number;
          day_type?: Database["public"]["Enums"]["training_day_type"];
          id?: string;
          plan_id?: string;
          title?: string | null;
          updated_at?: string;
          week_number?: number;
        };
        Relationships: [
          {
            foreignKeyName: "training_days_plan_id_fkey";
            columns: ["plan_id"];
            isOneToOne: false;
            referencedRelation: "training_plans";
            referencedColumns: ["id"];
          },
        ];
      };
      training_exercises: {
        Row: {
          comment: string | null;
          completed_at: string | null;
          created_at: string;
          day_id: string;
          exercise_name: string;
          id: string;
          muscle_group: string | null;
          order_num: number;
          patient_comment: string | null;
          programmed_reps: string | null;
          programmed_sets: number;
          rest_seconds: number | null;
          updated_at: string;
          video_url: string | null;
          warmup_sets: number;
        };
        Insert: {
          comment?: string | null;
          completed_at?: string | null;
          created_at?: string;
          day_id: string;
          exercise_name?: string;
          id?: string;
          muscle_group?: string | null;
          order_num?: number;
          patient_comment?: string | null;
          programmed_reps?: string | null;
          programmed_sets?: number;
          rest_seconds?: number | null;
          updated_at?: string;
          video_url?: string | null;
          warmup_sets?: number;
        };
        Update: {
          comment?: string | null;
          completed_at?: string | null;
          created_at?: string;
          day_id?: string;
          exercise_name?: string;
          id?: string;
          muscle_group?: string | null;
          order_num?: number;
          patient_comment?: string | null;
          programmed_reps?: string | null;
          programmed_sets?: number;
          rest_seconds?: number | null;
          updated_at?: string;
          video_url?: string | null;
          warmup_sets?: number;
        };
        Relationships: [
          {
            foreignKeyName: "training_exercises_day_id_fkey";
            columns: ["day_id"];
            isOneToOne: false;
            referencedRelation: "training_days";
            referencedColumns: ["id"];
          },
        ];
      };
      training_plans: {
        Row: {
          created_at: string;
          created_by: string | null;
          current_week: number;
          days_per_week: number;
          id: string;
          objective: string | null;
          start_date: string;
          title: string;
          updated_at: string;
          user_id: string;
          weeks_count: number;
        };
        Insert: {
          created_at?: string;
          created_by?: string | null;
          current_week?: number;
          days_per_week?: number;
          id?: string;
          objective?: string | null;
          start_date?: string;
          title?: string;
          updated_at?: string;
          user_id: string;
          weeks_count?: number;
        };
        Update: {
          created_at?: string;
          created_by?: string | null;
          current_week?: number;
          days_per_week?: number;
          id?: string;
          objective?: string | null;
          start_date?: string;
          title?: string;
          updated_at?: string;
          user_id?: string;
          weeks_count?: number;
        };
        Relationships: [];
      };
      training_session_history: {
        Row: {
          completed_at: string;
          created_at: string;
          day_id: string | null;
          day_number: number;
          day_type: string | null;
          exercises: Json;
          id: string;
          plan_id: string;
          total_load: number;
          user_id: string;
          week_number: number;
        };
        Insert: {
          completed_at?: string;
          created_at?: string;
          day_id?: string | null;
          day_number: number;
          day_type?: string | null;
          exercises?: Json;
          id?: string;
          plan_id: string;
          total_load?: number;
          user_id: string;
          week_number: number;
        };
        Update: {
          completed_at?: string;
          created_at?: string;
          day_id?: string | null;
          day_number?: number;
          day_type?: string | null;
          exercises?: Json;
          id?: string;
          plan_id?: string;
          total_load?: number;
          user_id?: string;
          week_number?: number;
        };
        Relationships: [
          {
            foreignKeyName: "training_session_history_day_id_fkey";
            columns: ["day_id"];
            isOneToOne: false;
            referencedRelation: "training_days";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "training_session_history_plan_id_fkey";
            columns: ["plan_id"];
            isOneToOne: false;
            referencedRelation: "training_plans";
            referencedColumns: ["id"];
          },
        ];
      };
      training_sets: {
        Row: {
          created_at: string;
          exercise_id: string;
          id: string;
          reps: number | null;
          rir: string | null;
          set_number: number;
          updated_at: string;
          weight: number | null;
        };
        Insert: {
          created_at?: string;
          exercise_id: string;
          id?: string;
          reps?: number | null;
          rir?: string | null;
          set_number: number;
          updated_at?: string;
          weight?: number | null;
        };
        Update: {
          created_at?: string;
          exercise_id?: string;
          id?: string;
          reps?: number | null;
          rir?: string | null;
          set_number?: number;
          updated_at?: string;
          weight?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "training_sets_exercise_id_fkey";
            columns: ["exercise_id"];
            isOneToOne: false;
            referencedRelation: "training_exercises";
            referencedColumns: ["id"];
          },
        ];
      };
      user_roles: {
        Row: {
          created_at: string;
          id: string;
          role: Database["public"]["Enums"]["app_role"];
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          role: Database["public"]["Enums"]["app_role"];
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          role?: Database["public"]["Enums"]["app_role"];
          user_id?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"];
          _user_id: string;
        };
        Returns: boolean;
      };
    };
    Enums: {
      app_role: "admin" | "patient";
      document_category:
        | "examenes_laboratorio"
        | "examen_bioimpedancia"
        | "ficha_nutricional"
        | "tratamiento_medico_actual";
      photo_angle: "frontal" | "posterior" | "perfil_izquierdo" | "perfil_derecho";
      sex_type: "hombre" | "mujer";
      training_day_type:
        "push_day" | "pull_day" | "full_leg" | "full_torso" | "full_gluteo" | "custom";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
    keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    keyof DefaultSchema["CompositeTypes"] | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "patient"],
      document_category: [
        "examenes_laboratorio",
        "examen_bioimpedancia",
        "ficha_nutricional",
        "tratamiento_medico_actual",
      ],
      photo_angle: ["frontal", "posterior", "perfil_izquierdo", "perfil_derecho"],
      sex_type: ["hombre", "mujer"],
      training_day_type: [
        "push_day",
        "pull_day",
        "full_leg",
        "full_torso",
        "full_gluteo",
        "custom",
      ],
    },
  },
} as const;
