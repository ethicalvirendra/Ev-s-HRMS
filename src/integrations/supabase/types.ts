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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      applications: {
        Row: {
          applied_at: string
          candidate_id: string
          id: string
          job_id: string
          notes: string | null
          rating: number | null
          stage: Database["public"]["Enums"]["application_stage"]
          updated_at: string
        }
        Insert: {
          applied_at?: string
          candidate_id: string
          id?: string
          job_id: string
          notes?: string | null
          rating?: number | null
          stage?: Database["public"]["Enums"]["application_stage"]
          updated_at?: string
        }
        Update: {
          applied_at?: string
          candidate_id?: string
          id?: string
          job_id?: string
          notes?: string | null
          rating?: number | null
          stage?: Database["public"]["Enums"]["application_stage"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "applications_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "candidates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "applications_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      attendance_logs: {
        Row: {
          clock_in: string
          clock_out: string | null
          created_at: string
          employee_id: string
          id: string
          notes: string | null
          updated_at: string
        }
        Insert: {
          clock_in?: string
          clock_out?: string | null
          created_at?: string
          employee_id: string
          id?: string
          notes?: string | null
          updated_at?: string
        }
        Update: {
          clock_in?: string
          clock_out?: string | null
          created_at?: string
          employee_id?: string
          id?: string
          notes?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "attendance_logs_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      candidates: {
        Row: {
          created_at: string
          email: string
          full_name: string
          id: string
          linkedin_url: string | null
          location: string | null
          notes: string | null
          phone: string | null
          resume_url: string | null
          source: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          full_name: string
          id?: string
          linkedin_url?: string | null
          location?: string | null
          notes?: string | null
          phone?: string | null
          resume_url?: string | null
          source?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          linkedin_url?: string | null
          location?: string | null
          notes?: string | null
          phone?: string | null
          resume_url?: string | null
          source?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      departments: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      employees: {
        Row: {
          avatar_url: string | null
          created_at: string
          department_id: string | null
          email: string
          employee_code: string
          employment_type: string
          full_name: string
          hire_date: string | null
          id: string
          job_title: string | null
          location: string | null
          manager_id: string | null
          phone: string | null
          status: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          department_id?: string | null
          email: string
          employee_code: string
          employment_type?: string
          full_name: string
          hire_date?: string | null
          id?: string
          job_title?: string | null
          location?: string | null
          manager_id?: string | null
          phone?: string | null
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          department_id?: string | null
          email?: string
          employee_code?: string
          employment_type?: string
          full_name?: string
          hire_date?: string | null
          id?: string
          job_title?: string | null
          location?: string | null
          manager_id?: string | null
          phone?: string | null
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "employees_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employees_manager_id_fkey"
            columns: ["manager_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      goals: {
        Row: {
          created_at: string
          description: string | null
          due_date: string | null
          employee_id: string
          id: string
          progress: number
          status: Database["public"]["Enums"]["goal_status"]
          title: string
          updated_at: string
          weight: number
        }
        Insert: {
          created_at?: string
          description?: string | null
          due_date?: string | null
          employee_id: string
          id?: string
          progress?: number
          status?: Database["public"]["Enums"]["goal_status"]
          title: string
          updated_at?: string
          weight?: number
        }
        Update: {
          created_at?: string
          description?: string | null
          due_date?: string | null
          employee_id?: string
          id?: string
          progress?: number
          status?: Database["public"]["Enums"]["goal_status"]
          title?: string
          updated_at?: string
          weight?: number
        }
        Relationships: [
          {
            foreignKeyName: "goals_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      jobs: {
        Row: {
          closes_at: string | null
          created_at: string
          created_by: string | null
          department_id: string | null
          description: string | null
          employment_type: Database["public"]["Enums"]["employment_type"]
          hiring_manager_id: string | null
          id: string
          location: string | null
          openings: number
          posted_at: string | null
          salary_max: number | null
          salary_min: number | null
          status: Database["public"]["Enums"]["job_status"]
          title: string
          updated_at: string
        }
        Insert: {
          closes_at?: string | null
          created_at?: string
          created_by?: string | null
          department_id?: string | null
          description?: string | null
          employment_type?: Database["public"]["Enums"]["employment_type"]
          hiring_manager_id?: string | null
          id?: string
          location?: string | null
          openings?: number
          posted_at?: string | null
          salary_max?: number | null
          salary_min?: number | null
          status?: Database["public"]["Enums"]["job_status"]
          title: string
          updated_at?: string
        }
        Update: {
          closes_at?: string | null
          created_at?: string
          created_by?: string | null
          department_id?: string | null
          description?: string | null
          employment_type?: Database["public"]["Enums"]["employment_type"]
          hiring_manager_id?: string | null
          id?: string
          location?: string | null
          openings?: number
          posted_at?: string | null
          salary_max?: number | null
          salary_min?: number | null
          status?: Database["public"]["Enums"]["job_status"]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "jobs_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jobs_hiring_manager_id_fkey"
            columns: ["hiring_manager_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      leave_balances: {
        Row: {
          allocated: number
          created_at: string
          employee_id: string
          id: string
          leave_type_id: string
          updated_at: string
          used: number
          year: number
        }
        Insert: {
          allocated?: number
          created_at?: string
          employee_id: string
          id?: string
          leave_type_id: string
          updated_at?: string
          used?: number
          year: number
        }
        Update: {
          allocated?: number
          created_at?: string
          employee_id?: string
          id?: string
          leave_type_id?: string
          updated_at?: string
          used?: number
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "leave_balances_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leave_balances_leave_type_id_fkey"
            columns: ["leave_type_id"]
            isOneToOne: false
            referencedRelation: "leave_types"
            referencedColumns: ["id"]
          },
        ]
      }
      leave_requests: {
        Row: {
          approver_id: string | null
          created_at: string
          days: number
          decided_at: string | null
          decision_note: string | null
          employee_id: string
          end_date: string
          id: string
          leave_type_id: string
          reason: string | null
          start_date: string
          status: Database["public"]["Enums"]["leave_status"]
          updated_at: string
        }
        Insert: {
          approver_id?: string | null
          created_at?: string
          days: number
          decided_at?: string | null
          decision_note?: string | null
          employee_id: string
          end_date: string
          id?: string
          leave_type_id: string
          reason?: string | null
          start_date: string
          status?: Database["public"]["Enums"]["leave_status"]
          updated_at?: string
        }
        Update: {
          approver_id?: string | null
          created_at?: string
          days?: number
          decided_at?: string | null
          decision_note?: string | null
          employee_id?: string
          end_date?: string
          id?: string
          leave_type_id?: string
          reason?: string | null
          start_date?: string
          status?: Database["public"]["Enums"]["leave_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "leave_requests_approver_id_fkey"
            columns: ["approver_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leave_requests_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leave_requests_leave_type_id_fkey"
            columns: ["leave_type_id"]
            isOneToOne: false
            referencedRelation: "leave_types"
            referencedColumns: ["id"]
          },
        ]
      }
      leave_types: {
        Row: {
          color: string
          created_at: string
          default_days: number
          id: string
          is_paid: boolean
          name: string
        }
        Insert: {
          color?: string
          created_at?: string
          default_days?: number
          id?: string
          is_paid?: boolean
          name: string
        }
        Update: {
          color?: string
          created_at?: string
          default_days?: number
          id?: string
          is_paid?: boolean
          name?: string
        }
        Relationships: []
      }
      peer_feedback: {
        Row: {
          created_at: string
          from_employee_id: string
          id: string
          message: string
          to_employee_id: string
          type: Database["public"]["Enums"]["feedback_type"]
          visibility: Database["public"]["Enums"]["feedback_visibility"]
        }
        Insert: {
          created_at?: string
          from_employee_id: string
          id?: string
          message: string
          to_employee_id: string
          type?: Database["public"]["Enums"]["feedback_type"]
          visibility?: Database["public"]["Enums"]["feedback_visibility"]
        }
        Update: {
          created_at?: string
          from_employee_id?: string
          id?: string
          message?: string
          to_employee_id?: string
          type?: Database["public"]["Enums"]["feedback_type"]
          visibility?: Database["public"]["Enums"]["feedback_visibility"]
        }
        Relationships: [
          {
            foreignKeyName: "peer_feedback_from_employee_id_fkey"
            columns: ["from_employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "peer_feedback_to_employee_id_fkey"
            columns: ["to_employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      performance_reviews: {
        Row: {
          acknowledged_at: string | null
          created_at: string
          cycle_name: string
          employee_id: string
          id: string
          improvements: string | null
          overall_rating: number | null
          period_end: string
          period_start: string
          reviewer_id: string | null
          status: Database["public"]["Enums"]["review_status"]
          strengths: string | null
          submitted_at: string | null
          updated_at: string
        }
        Insert: {
          acknowledged_at?: string | null
          created_at?: string
          cycle_name: string
          employee_id: string
          id?: string
          improvements?: string | null
          overall_rating?: number | null
          period_end: string
          period_start: string
          reviewer_id?: string | null
          status?: Database["public"]["Enums"]["review_status"]
          strengths?: string | null
          submitted_at?: string | null
          updated_at?: string
        }
        Update: {
          acknowledged_at?: string | null
          created_at?: string
          cycle_name?: string
          employee_id?: string
          id?: string
          improvements?: string | null
          overall_rating?: number | null
          period_end?: string
          period_start?: string
          reviewer_id?: string | null
          status?: Database["public"]["Enums"]["review_status"]
          strengths?: string | null
          submitted_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "performance_reviews_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "performance_reviews_reviewer_id_fkey"
            columns: ["reviewer_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          full_name: string | null
          id: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      payslips: {
        Row: {
          id: string
          employee_id: string
          month: string
          year: number
          base_salary: number
          bonus: number
          deductions: number
          net_salary: number
          pdf_url: string | null
          status: string
          created_at: string
        }
        Insert: {
          id?: string
          employee_id: string
          month: string
          year: number
          base_salary?: number
          bonus?: number
          deductions?: number
          net_salary?: number
          pdf_url?: string | null
          status?: string
          created_at?: string
        }
        Update: {
          id?: string
          employee_id?: string
          month?: string
          year?: number
          base_salary?: number
          bonus?: number
          deductions?: number
          net_salary?: number
          pdf_url?: string | null
          status?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payslips_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          }
        ]
      }
      expense_claims: {
        Row: {
          id: string
          employee_id: string
          claim_id: string
          date: string
          category: string
          description: string | null
          amount: number
          status: Database["public"]["Enums"]["expense_status"]
          receipt_url: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          employee_id: string
          claim_id: string
          date?: string
          category: string
          description?: string | null
          amount?: number
          status?: Database["public"]["Enums"]["expense_status"]
          receipt_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          employee_id?: string
          claim_id?: string
          date?: string
          category?: string
          description?: string | null
          amount?: number
          status?: Database["public"]["Enums"]["expense_status"]
          receipt_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "expense_claims_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          }
        ]
      }
      courses: {
        Row: {
          id: string
          title: string
          description: string | null
          category: string
          thumbnail_url: string | null
          duration: string | null
          is_mandatory: boolean
          due_date: string | null
          created_at: string
        }
        Insert: {
          id?: string
          title: string
          description?: string | null
          category?: string
          thumbnail_url?: string | null
          duration?: string | null
          is_mandatory?: boolean
          due_date?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          title?: string
          description?: string | null
          category?: string
          thumbnail_url?: string | null
          duration?: string | null
          is_mandatory?: boolean
          due_date?: string | null
          created_at?: string
        }
        Relationships: []
      }
      enrollments: {
        Row: {
          id: string
          employee_id: string
          course_id: string
          progress: number
          status: Database["public"]["Enums"]["enrollment_status"]
          enrolled_at: string
          completed_at: string | null
        }
        Insert: {
          id?: string
          employee_id: string
          course_id: string
          progress?: number
          status?: Database["public"]["Enums"]["enrollment_status"]
          enrolled_at?: string
          completed_at?: string | null
        }
        Update: {
          id?: string
          employee_id?: string
          course_id?: string
          progress?: number
          status?: Database["public"]["Enums"]["enrollment_status"]
          enrolled_at?: string
          completed_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "enrollments_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "enrollments_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          }
        ]
      }
      tickets: {
        Row: {
          id: string
          employee_id: string
          title: string
          description: string | null
          category: string
          status: Database["public"]["Enums"]["ticket_status"]
          priority: Database["public"]["Enums"]["ticket_priority"]
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          employee_id: string
          title: string
          description?: string | null
          category: string
          status?: Database["public"]["Enums"]["ticket_status"]
          priority?: Database["public"]["Enums"]["ticket_priority"]
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          employee_id?: string
          title?: string
          description?: string | null
          category?: string
          status?: Database["public"]["Enums"]["ticket_status"]
          priority?: Database["public"]["Enums"]["ticket_priority"]
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tickets_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          }
        ]
      }
      channels: {
        Row: {
          id: string
          name: string
          description: string | null
          is_private: boolean
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          is_private?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          is_private?: boolean
          created_at?: string
        }
        Relationships: []
      }
      messages: {
        Row: {
          id: string
          channel_id: string | null
          employee_id: string
          recipient_id: string | null
          message_text: string
          created_at: string
        }
        Insert: {
          id?: string
          channel_id?: string | null
          employee_id: string
          recipient_id?: string | null
          message_text: string
          created_at?: string
        }
        Update: {
          id?: string
          channel_id?: string | null
          employee_id?: string
          recipient_id?: string | null
          message_text?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "channels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_recipient_id_fkey"
            columns: ["recipient_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          }
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      current_employee_id: { Args: never; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "manager" | "employee"
      application_stage:
        | "applied"
        | "screening"
        | "interview"
        | "offer"
        | "hired"
        | "rejected"
        | "withdrawn"
      employment_type: "full_time" | "part_time" | "contract" | "intern"
      feedback_type: "praise" | "suggestion"
      feedback_visibility: "private" | "manager" | "public"
      goal_status: "not_started" | "in_progress" | "completed" | "cancelled"
      job_status: "draft" | "open" | "on_hold" | "closed"
      leave_status: "pending" | "approved" | "rejected" | "cancelled"
      review_status: "draft" | "submitted" | "acknowledged"
      ticket_status: "open" | "in_progress" | "resolved" | "closed"
      ticket_priority: "low" | "medium" | "high"
      expense_status: "pending" | "approved" | "rejected" | "reimbursed"
      enrollment_status: "not_started" | "in_progress" | "completed"
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
      app_role: ["admin", "manager", "employee"],
      application_stage: [
        "applied",
        "screening",
        "interview",
        "offer",
        "hired",
        "rejected",
        "withdrawn",
      ],
      employment_type: ["full_time", "part_time", "contract", "intern"],
      feedback_type: ["praise", "suggestion"],
      feedback_visibility: ["private", "manager", "public"],
      goal_status: ["not_started", "in_progress", "completed", "cancelled"],
      job_status: ["draft", "open", "on_hold", "closed"],
      leave_status: ["pending", "approved", "rejected", "cancelled"],
      review_status: ["draft", "submitted", "acknowledged"],
      ticket_status: ["open", "in_progress", "resolved", "closed"],
      ticket_priority: ["low", "medium", "high"],
      expense_status: ["pending", "approved", "rejected", "reimbursed"],
      enrollment_status: ["not_started", "in_progress", "completed"],
    },
  },
} as const
