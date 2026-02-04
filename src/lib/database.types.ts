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
      attendance_records: {
        Row: {
          clock_in: string | null
          clock_out: string | null
          created_at: string | null
          date: string
          edit_reason: string | null
          edited_by: string | null
          id: string
          is_manual_entry: boolean | null
          location_id: string | null
          organization_id: string
          shift_id: string | null
          staff_id: string
          status: Database["public"]["Enums"]["attendance_status"] | null
          total_hours: number | null
          updated_at: string | null
        }
        Insert: {
          clock_in?: string | null
          clock_out?: string | null
          created_at?: string | null
          date: string
          edit_reason?: string | null
          edited_by?: string | null
          id?: string
          is_manual_entry?: boolean | null
          location_id?: string | null
          organization_id: string
          shift_id?: string | null
          staff_id: string
          status?: Database["public"]["Enums"]["attendance_status"] | null
          total_hours?: number | null
          updated_at?: string | null
        }
        Update: {
          clock_in?: string | null
          clock_out?: string | null
          created_at?: string | null
          date?: string
          edit_reason?: string | null
          edited_by?: string | null
          id?: string
          is_manual_entry?: boolean | null
          location_id?: string | null
          organization_id?: string
          shift_id?: string | null
          staff_id?: string
          status?: Database["public"]["Enums"]["attendance_status"] | null
          total_hours?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "attendance_records_edited_by_fkey"
            columns: ["edited_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_records_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_records_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organization_stats"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "attendance_records_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_records_shift_id_fkey"
            columns: ["shift_id"]
            isOneToOne: false
            referencedRelation: "shifts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_records_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          created_at: string | null
          description: string
          event_type: Database["public"]["Enums"]["audit_event_type"]
          id: string
          ip_address: unknown
          metadata: Json | null
          organization_id: string | null
          target_id: string | null
          target_table: string | null
          user_agent: string | null
          user_email: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          description: string
          event_type: Database["public"]["Enums"]["audit_event_type"]
          id?: string
          ip_address?: unknown
          metadata?: Json | null
          organization_id?: string | null
          target_id?: string | null
          target_table?: string | null
          user_agent?: string | null
          user_email?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string
          event_type?: Database["public"]["Enums"]["audit_event_type"]
          id?: string
          ip_address?: unknown
          metadata?: Json | null
          organization_id?: string | null
          target_id?: string | null
          target_table?: string | null
          user_agent?: string | null
          user_email?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organization_stats"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "audit_logs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      custom_roles: {
        Row: {
          can_approve_leave: boolean | null
          can_manage_attendance: boolean | null
          can_manage_locations: boolean | null
          can_manage_payroll: boolean | null
          can_manage_roles: boolean | null
          can_manage_schedule: boolean | null
          can_manage_settings: boolean | null
          can_manage_staff: boolean | null
          can_view_attendance: boolean | null
          can_view_payroll: boolean | null
          can_view_schedule: boolean | null
          can_view_staff: boolean | null
          created_at: string | null
          description: string | null
          id: string
          name: string
          organization_id: string
          updated_at: string | null
        }
        Insert: {
          can_approve_leave?: boolean | null
          can_manage_attendance?: boolean | null
          can_manage_locations?: boolean | null
          can_manage_payroll?: boolean | null
          can_manage_roles?: boolean | null
          can_manage_schedule?: boolean | null
          can_manage_settings?: boolean | null
          can_manage_staff?: boolean | null
          can_view_attendance?: boolean | null
          can_view_payroll?: boolean | null
          can_view_schedule?: boolean | null
          can_view_staff?: boolean | null
          created_at?: string | null
          description?: string | null
          id?: string
          name: string
          organization_id: string
          updated_at?: string | null
        }
        Update: {
          can_approve_leave?: boolean | null
          can_manage_attendance?: boolean | null
          can_manage_locations?: boolean | null
          can_manage_payroll?: boolean | null
          can_manage_roles?: boolean | null
          can_manage_schedule?: boolean | null
          can_manage_settings?: boolean | null
          can_manage_staff?: boolean | null
          can_view_attendance?: boolean | null
          can_view_payroll?: boolean | null
          can_view_schedule?: boolean | null
          can_view_staff?: boolean | null
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string
          organization_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "custom_roles_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organization_stats"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "custom_roles_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      documents: {
        Row: {
          created_at: string | null
          file_size_bytes: number | null
          file_url: string
          id: string
          mime_type: string | null
          name: string
          organization_id: string
          staff_id: string | null
          type: string | null
          uploaded_by: string
        }
        Insert: {
          created_at?: string | null
          file_size_bytes?: number | null
          file_url: string
          id?: string
          mime_type?: string | null
          name: string
          organization_id: string
          staff_id?: string | null
          type?: string | null
          uploaded_by: string
        }
        Update: {
          created_at?: string | null
          file_size_bytes?: number | null
          file_url?: string
          id?: string
          mime_type?: string | null
          name?: string
          organization_id?: string
          staff_id?: string | null
          type?: string | null
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "documents_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organization_stats"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "documents_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      email_otp_verifications: {
        Row: {
          attempts: number | null
          created_at: string
          email: string
          expires_at: string
          id: string
          otp_code: string
          verified: boolean | null
        }
        Insert: {
          attempts?: number | null
          created_at?: string
          email: string
          expires_at?: string
          id?: string
          otp_code: string
          verified?: boolean | null
        }
        Update: {
          attempts?: number | null
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          otp_code?: string
          verified?: boolean | null
        }
        Relationships: []
      }
      leave_balances: {
        Row: {
          created_at: string | null
          id: string
          leave_type_id: string
          pending_days: number | null
          staff_id: string
          total_days: number
          updated_at: string | null
          used_days: number | null
          year: number
        }
        Insert: {
          created_at?: string | null
          id?: string
          leave_type_id: string
          pending_days?: number | null
          staff_id: string
          total_days?: number
          updated_at?: string | null
          used_days?: number | null
          year: number
        }
        Update: {
          created_at?: string | null
          id?: string
          leave_type_id?: string
          pending_days?: number | null
          staff_id?: string
          total_days?: number
          updated_at?: string | null
          used_days?: number | null
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "leave_balances_leave_type_id_fkey"
            columns: ["leave_type_id"]
            isOneToOne: false
            referencedRelation: "leave_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leave_balances_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      leave_requests: {
        Row: {
          created_at: string | null
          days_requested: number
          end_date: string
          id: string
          leave_type_id: string
          organization_id: string
          reason: string | null
          rejection_reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          staff_id: string
          start_date: string
          status: Database["public"]["Enums"]["leave_status"] | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          days_requested: number
          end_date: string
          id?: string
          leave_type_id: string
          organization_id: string
          reason?: string | null
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          staff_id: string
          start_date: string
          status?: Database["public"]["Enums"]["leave_status"] | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          days_requested?: number
          end_date?: string
          id?: string
          leave_type_id?: string
          organization_id?: string
          reason?: string | null
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          staff_id?: string
          start_date?: string
          status?: Database["public"]["Enums"]["leave_status"] | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "leave_requests_leave_type_id_fkey"
            columns: ["leave_type_id"]
            isOneToOne: false
            referencedRelation: "leave_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leave_requests_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organization_stats"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "leave_requests_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leave_requests_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leave_requests_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      leave_types: {
        Row: {
          created_at: string | null
          days_allowed: number
          id: string
          is_paid: boolean | null
          name: string
          organization_id: string
          requires_approval: boolean | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          days_allowed?: number
          id?: string
          is_paid?: boolean | null
          name: string
          organization_id: string
          requires_approval?: boolean | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          days_allowed?: number
          id?: string
          is_paid?: boolean | null
          name?: string
          organization_id?: string
          requires_approval?: boolean | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "leave_types_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organization_stats"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "leave_types_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      locations: {
        Row: {
          address: string | null
          city: string | null
          created_at: string | null
          id: string
          is_primary: boolean | null
          license_document_url: string | null
          license_expiry: string | null
          license_number: string | null
          licensing_body: string | null
          name: string
          organization_id: string
          phone: string | null
          status: Database["public"]["Enums"]["verification_status"] | null
          updated_at: string | null
        }
        Insert: {
          address?: string | null
          city?: string | null
          created_at?: string | null
          id?: string
          is_primary?: boolean | null
          license_document_url?: string | null
          license_expiry?: string | null
          license_number?: string | null
          licensing_body?: string | null
          name: string
          organization_id: string
          phone?: string | null
          status?: Database["public"]["Enums"]["verification_status"] | null
          updated_at?: string | null
        }
        Update: {
          address?: string | null
          city?: string | null
          created_at?: string | null
          id?: string
          is_primary?: boolean | null
          license_document_url?: string | null
          license_expiry?: string | null
          license_number?: string | null
          licensing_body?: string | null
          name?: string
          organization_id?: string
          phone?: string | null
          status?: Database["public"]["Enums"]["verification_status"] | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "locations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organization_stats"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "locations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          action_url: string | null
          created_at: string | null
          id: string
          is_read: boolean | null
          message: string | null
          read_at: string | null
          title: string
          type: string | null
          user_id: string
        }
        Insert: {
          action_url?: string | null
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          message?: string | null
          read_at?: string | null
          title: string
          type?: string | null
          user_id: string
        }
        Update: {
          action_url?: string | null
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          message?: string | null
          read_at?: string | null
          title?: string
          type?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          account_status: Database["public"]["Enums"]["account_status"] | null
          address: string | null
          business_registration_number: string | null
          city: string | null
          country: string | null
          created_at: string | null
          email: string
          id: string
          kra_pin: string | null
          logo_url: string | null
          max_admins: number | null
          max_locations: number | null
          max_staff: number | null
          name: string
          org_status: Database["public"]["Enums"]["verification_status"] | null
          phone: string | null
          plan: Database["public"]["Enums"]["subscription_plan"] | null
          updated_at: string | null
        }
        Insert: {
          account_status?: Database["public"]["Enums"]["account_status"] | null
          address?: string | null
          business_registration_number?: string | null
          city?: string | null
          country?: string | null
          created_at?: string | null
          email: string
          id?: string
          kra_pin?: string | null
          logo_url?: string | null
          max_admins?: number | null
          max_locations?: number | null
          max_staff?: number | null
          name: string
          org_status?: Database["public"]["Enums"]["verification_status"] | null
          phone?: string | null
          plan?: Database["public"]["Enums"]["subscription_plan"] | null
          updated_at?: string | null
        }
        Update: {
          account_status?: Database["public"]["Enums"]["account_status"] | null
          address?: string | null
          business_registration_number?: string | null
          city?: string | null
          country?: string | null
          created_at?: string | null
          email?: string
          id?: string
          kra_pin?: string | null
          logo_url?: string | null
          max_admins?: number | null
          max_locations?: number | null
          max_staff?: number | null
          name?: string
          org_status?: Database["public"]["Enums"]["verification_status"] | null
          phone?: string | null
          plan?: Database["public"]["Enums"]["subscription_plan"] | null
          updated_at?: string | null
        }
        Relationships: []
      }
      payroll_allowances: {
        Row: {
          amount_cents: number
          created_at: string | null
          id: string
          name: string
          notes: string | null
          payroll_entry_id: string
        }
        Insert: {
          amount_cents?: number
          created_at?: string | null
          id?: string
          name: string
          notes?: string | null
          payroll_entry_id: string
        }
        Update: {
          amount_cents?: number
          created_at?: string | null
          id?: string
          name?: string
          notes?: string | null
          payroll_entry_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payroll_allowances_payroll_entry_id_fkey"
            columns: ["payroll_entry_id"]
            isOneToOne: false
            referencedRelation: "payroll_entries"
            referencedColumns: ["id"]
          },
        ]
      }
      payroll_deductions: {
        Row: {
          amount_cents: number
          created_at: string | null
          id: string
          name: string
          notes: string | null
          payroll_entry_id: string
        }
        Insert: {
          amount_cents?: number
          created_at?: string | null
          id?: string
          name: string
          notes?: string | null
          payroll_entry_id: string
        }
        Update: {
          amount_cents?: number
          created_at?: string | null
          id?: string
          name?: string
          notes?: string | null
          payroll_entry_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payroll_deductions_payroll_entry_id_fkey"
            columns: ["payroll_entry_id"]
            isOneToOne: false
            referencedRelation: "payroll_entries"
            referencedColumns: ["id"]
          },
        ]
      }
      payroll_entries: {
        Row: {
          absent_units: number | null
          allowances_total_cents: number | null
          base_salary_cents: number | null
          created_at: string | null
          deductions_total_cents: number | null
          gross_pay_cents: number | null
          id: string
          is_paid: boolean | null
          net_pay_cents: number | null
          organization_id: string
          paid_at: string | null
          paid_by: string | null
          paid_leave_units: number | null
          pay_method: Database["public"]["Enums"]["pay_method"] | null
          payable_base_cents: number | null
          payment_reference: string | null
          payroll_period_id: string
          staff_id: string
          unpaid_leave_units: number | null
          updated_at: string | null
          worked_units: number | null
        }
        Insert: {
          absent_units?: number | null
          allowances_total_cents?: number | null
          base_salary_cents?: number | null
          created_at?: string | null
          deductions_total_cents?: number | null
          gross_pay_cents?: number | null
          id?: string
          is_paid?: boolean | null
          net_pay_cents?: number | null
          organization_id: string
          paid_at?: string | null
          paid_by?: string | null
          paid_leave_units?: number | null
          pay_method?: Database["public"]["Enums"]["pay_method"] | null
          payable_base_cents?: number | null
          payment_reference?: string | null
          payroll_period_id: string
          staff_id: string
          unpaid_leave_units?: number | null
          updated_at?: string | null
          worked_units?: number | null
        }
        Update: {
          absent_units?: number | null
          allowances_total_cents?: number | null
          base_salary_cents?: number | null
          created_at?: string | null
          deductions_total_cents?: number | null
          gross_pay_cents?: number | null
          id?: string
          is_paid?: boolean | null
          net_pay_cents?: number | null
          organization_id?: string
          paid_at?: string | null
          paid_by?: string | null
          paid_leave_units?: number | null
          pay_method?: Database["public"]["Enums"]["pay_method"] | null
          payable_base_cents?: number | null
          payment_reference?: string | null
          payroll_period_id?: string
          staff_id?: string
          unpaid_leave_units?: number | null
          updated_at?: string | null
          worked_units?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "payroll_entries_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organization_stats"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "payroll_entries_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payroll_entries_paid_by_fkey"
            columns: ["paid_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payroll_entries_payroll_period_id_fkey"
            columns: ["payroll_period_id"]
            isOneToOne: false
            referencedRelation: "payroll_periods"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payroll_entries_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      payroll_periods: {
        Row: {
          created_at: string | null
          end_date: string
          finalized_at: string | null
          finalized_by: string | null
          id: string
          is_finalized: boolean | null
          name: string
          organization_id: string
          start_date: string
          total_days: number
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          end_date: string
          finalized_at?: string | null
          finalized_by?: string | null
          id?: string
          is_finalized?: boolean | null
          name: string
          organization_id: string
          start_date: string
          total_days: number
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          end_date?: string
          finalized_at?: string | null
          finalized_by?: string | null
          id?: string
          is_finalized?: boolean | null
          name?: string
          organization_id?: string
          start_date?: string
          total_days?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payroll_periods_finalized_by_fkey"
            columns: ["finalized_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payroll_periods_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organization_stats"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "payroll_periods_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          department: string | null
          email: string
          emergency_contact_name: string | null
          emergency_contact_phone: string | null
          employment_type: Database["public"]["Enums"]["employment_type"] | null
          first_name: string | null
          full_name: string
          hire_date: string | null
          hourly_rate_cents: number | null
          id: string
          is_super_admin: boolean | null
          job_title: string | null
          last_name: string | null
          location_id: string | null
          monthly_salary_cents: number | null
          organization_id: string | null
          pay_method: Database["public"]["Enums"]["pay_method"] | null
          phone: string | null
          role: Database["public"]["Enums"]["user_role"] | null
          staff_status: Database["public"]["Enums"]["staff_status"] | null
          termination_date: string | null
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          department?: string | null
          email: string
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          employment_type?:
            | Database["public"]["Enums"]["employment_type"]
            | null
          first_name?: string | null
          full_name: string
          hire_date?: string | null
          hourly_rate_cents?: number | null
          id: string
          is_super_admin?: boolean | null
          job_title?: string | null
          last_name?: string | null
          location_id?: string | null
          monthly_salary_cents?: number | null
          organization_id?: string | null
          pay_method?: Database["public"]["Enums"]["pay_method"] | null
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role"] | null
          staff_status?: Database["public"]["Enums"]["staff_status"] | null
          termination_date?: string | null
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          department?: string | null
          email?: string
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          employment_type?:
            | Database["public"]["Enums"]["employment_type"]
            | null
          first_name?: string | null
          full_name?: string
          hire_date?: string | null
          hourly_rate_cents?: number | null
          id?: string
          is_super_admin?: boolean | null
          job_title?: string | null
          last_name?: string | null
          location_id?: string | null
          monthly_salary_cents?: number | null
          organization_id?: string | null
          pay_method?: Database["public"]["Enums"]["pay_method"] | null
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role"] | null
          staff_status?: Database["public"]["Enums"]["staff_status"] | null
          termination_date?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organization_stats"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "profiles_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      shift_assignments: {
        Row: {
          created_at: string | null
          id: string
          is_locum: boolean | null
          locum_phone: string | null
          locum_rate_cents: number | null
          notes: string | null
          shift_id: string
          staff_id: string
          supervisor_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_locum?: boolean | null
          locum_phone?: string | null
          locum_rate_cents?: number | null
          notes?: string | null
          shift_id: string
          staff_id: string
          supervisor_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_locum?: boolean | null
          locum_phone?: string | null
          locum_rate_cents?: number | null
          notes?: string | null
          shift_id?: string
          staff_id?: string
          supervisor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "shift_assignments_shift_id_fkey"
            columns: ["shift_id"]
            isOneToOne: false
            referencedRelation: "shifts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shift_assignments_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shift_assignments_supervisor_id_fkey"
            columns: ["supervisor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      shifts: {
        Row: {
          created_at: string | null
          created_by: string | null
          date: string
          end_time: string
          id: string
          location_id: string
          notes: string | null
          organization_id: string
          role_required: string | null
          staff_needed: number | null
          start_time: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          date: string
          end_time: string
          id?: string
          location_id: string
          notes?: string | null
          organization_id: string
          role_required?: string | null
          staff_needed?: number | null
          start_time: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          date?: string
          end_time?: string
          id?: string
          location_id?: string
          notes?: string | null
          organization_id?: string
          role_required?: string | null
          staff_needed?: number | null
          start_time?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "shifts_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shifts_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shifts_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organization_stats"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "shifts_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      staff_role_assignments: {
        Row: {
          created_at: string | null
          custom_role_id: string
          id: string
          staff_id: string
        }
        Insert: {
          created_at?: string | null
          custom_role_id: string
          id?: string
          staff_id: string
        }
        Update: {
          created_at?: string | null
          custom_role_id?: string
          id?: string
          staff_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "staff_role_assignments_custom_role_id_fkey"
            columns: ["custom_role_id"]
            isOneToOne: false
            referencedRelation: "custom_roles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_role_assignments_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          amount_cents: number
          billing_cycle: string | null
          cancelled_at: string | null
          created_at: string | null
          currency: string | null
          current_period_end: string | null
          current_period_start: string | null
          id: string
          next_billing_date: string | null
          organization_id: string
          plan: Database["public"]["Enums"]["subscription_plan"]
          status: Database["public"]["Enums"]["subscription_status"] | null
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          trial_ends_at: string | null
          updated_at: string | null
        }
        Insert: {
          amount_cents?: number
          billing_cycle?: string | null
          cancelled_at?: string | null
          created_at?: string | null
          currency?: string | null
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          next_billing_date?: string | null
          organization_id: string
          plan?: Database["public"]["Enums"]["subscription_plan"]
          status?: Database["public"]["Enums"]["subscription_status"] | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          trial_ends_at?: string | null
          updated_at?: string | null
        }
        Update: {
          amount_cents?: number
          billing_cycle?: string | null
          cancelled_at?: string | null
          created_at?: string | null
          currency?: string | null
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          next_billing_date?: string | null
          organization_id?: string
          plan?: Database["public"]["Enums"]["subscription_plan"]
          status?: Database["public"]["Enums"]["subscription_status"] | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          trial_ends_at?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organization_stats"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "subscriptions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      verification_requests: {
        Row: {
          authority: string | null
          created_at: string | null
          document_url: string | null
          id: string
          identifier: string | null
          location_id: string | null
          organization_id: string | null
          rejection_reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: Database["public"]["Enums"]["verification_status"] | null
          submitted_at: string | null
          type: Database["public"]["Enums"]["verification_type"]
          updated_at: string | null
        }
        Insert: {
          authority?: string | null
          created_at?: string | null
          document_url?: string | null
          id?: string
          identifier?: string | null
          location_id?: string | null
          organization_id?: string | null
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["verification_status"] | null
          submitted_at?: string | null
          type: Database["public"]["Enums"]["verification_type"]
          updated_at?: string | null
        }
        Update: {
          authority?: string | null
          created_at?: string | null
          document_url?: string | null
          id?: string
          identifier?: string | null
          location_id?: string | null
          organization_id?: string | null
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["verification_status"] | null
          submitted_at?: string | null
          type?: Database["public"]["Enums"]["verification_type"]
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "verification_requests_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "verification_requests_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organization_stats"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "verification_requests_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "verification_requests_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      organization_stats: {
        Row: {
          admins_count: number | null
          locations_count: number | null
          max_admins: number | null
          max_locations: number | null
          max_staff: number | null
          name: string | null
          organization_id: string | null
          plan: Database["public"]["Enums"]["subscription_plan"] | null
          staff_count: number | null
        }
        Relationships: []
      }
      pending_leave_counts: {
        Row: {
          organization_id: string | null
          pending_count: number | null
        }
        Relationships: [
          {
            foreignKeyName: "leave_requests_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organization_stats"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "leave_requests_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      today_attendance_summary: {
        Row: {
          absent_count: number | null
          on_leave_count: number | null
          organization_id: string | null
          partial_count: number | null
          present_count: number | null
          total_hours_worked: number | null
        }
        Relationships: [
          {
            foreignKeyName: "attendance_records_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organization_stats"
            referencedColumns: ["organization_id"]
          },
          {
            foreignKeyName: "attendance_records_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      cleanup_expired_otps: { Args: never; Returns: undefined }
      get_user_organization_id: { Args: never; Returns: string }
      get_user_role: {
        Args: never
        Returns: Database["public"]["Enums"]["user_role"]
      }
      is_super_admin: { Args: never; Returns: boolean }
      is_valid_email: { Args: { email: string }; Returns: boolean }
      log_audit_event: {
        Args: {
          p_description: string
          p_event_type: Database["public"]["Enums"]["audit_event_type"]
          p_metadata?: Json
          p_target_id?: string
          p_target_table?: string
        }
        Returns: string
      }
    }
    Enums: {
      account_status: "Active" | "Under Review" | "Suspended"
      attendance_status: "Present" | "Partial" | "Absent" | "On Leave"
      audit_event_type:
        | "Security"
        | "System"
        | "Payment"
        | "Verification"
        | "Staff"
        | "Schedule"
      employment_type:
        | "Full-Time"
        | "Part-Time"
        | "Contract"
        | "Casual"
        | "Locum"
      leave_status: "Pending" | "Approved" | "Rejected" | "Cancelled"
      pay_method: "Fixed" | "Prorated" | "Hourly" | "Per Shift"
      staff_status: "Active" | "Inactive" | "On Leave" | "Terminated"
      subscription_plan: "Essential" | "Professional" | "Enterprise"
      subscription_status: "Active" | "Suspended" | "Cancelled" | "Trial"
      user_role:
        | "Owner"
        | "Shift Manager"
        | "HR Manager"
        | "Payroll Officer"
        | "Staff"
        | "SuperAdmin"
      verification_status: "Verified" | "Pending" | "Unverified"
      verification_type: "ORG" | "FACILITY"
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
      account_status: ["Active", "Under Review", "Suspended"],
      attendance_status: ["Present", "Partial", "Absent", "On Leave"],
      audit_event_type: [
        "Security",
        "System",
        "Payment",
        "Verification",
        "Staff",
        "Schedule",
      ],
      employment_type: [
        "Full-Time",
        "Part-Time",
        "Contract",
        "Casual",
        "Locum",
      ],
      leave_status: ["Pending", "Approved", "Rejected", "Cancelled"],
      pay_method: ["Fixed", "Prorated", "Hourly", "Per Shift"],
      staff_status: ["Active", "Inactive", "On Leave", "Terminated"],
      subscription_plan: ["Essential", "Professional", "Enterprise"],
      subscription_status: ["Active", "Suspended", "Cancelled", "Trial"],
      user_role: [
        "Owner",
        "Shift Manager",
        "HR Manager",
        "Payroll Officer",
        "Staff",
        "SuperAdmin",
      ],
      verification_status: ["Verified", "Pending", "Unverified"],
      verification_type: ["ORG", "FACILITY"],
    },
  },
} as const
