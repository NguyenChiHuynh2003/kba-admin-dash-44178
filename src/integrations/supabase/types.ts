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
      accounting_transactions: {
        Row: {
          amount: number
          category: string
          created_at: string
          created_by: string
          description: string | null
          id: string
          project_id: string | null
          transaction_date: string
          transaction_type: string
          updated_at: string
        }
        Insert: {
          amount: number
          category: string
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          project_id?: string | null
          transaction_date?: string
          transaction_type: string
          updated_at?: string
        }
        Update: {
          amount?: number
          category?: string
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          project_id?: string | null
          transaction_date?: string
          transaction_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "accounting_transactions_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      asset_allocations: {
        Row: {
          actual_return_date: string | null
          allocated_by: string
          allocated_to: string
          allocation_date: string
          asset_master_id: string
          created_at: string
          expected_return_date: string | null
          id: string
          project_id: string | null
          purpose: string
          quantity: number
          return_condition: string | null
          reusability_percentage: number | null
          status: Database["public"]["Enums"]["handover_status"]
          updated_at: string
        }
        Insert: {
          actual_return_date?: string | null
          allocated_by: string
          allocated_to: string
          allocation_date?: string
          asset_master_id: string
          created_at?: string
          expected_return_date?: string | null
          id?: string
          project_id?: string | null
          purpose: string
          quantity?: number
          return_condition?: string | null
          reusability_percentage?: number | null
          status?: Database["public"]["Enums"]["handover_status"]
          updated_at?: string
        }
        Update: {
          actual_return_date?: string | null
          allocated_by?: string
          allocated_to?: string
          allocation_date?: string
          asset_master_id?: string
          created_at?: string
          expected_return_date?: string | null
          id?: string
          project_id?: string | null
          purpose?: string
          quantity?: number
          return_condition?: string | null
          reusability_percentage?: number | null
          status?: Database["public"]["Enums"]["handover_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "asset_allocations_allocated_by_fkey"
            columns: ["allocated_by"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asset_allocations_allocated_to_fkey"
            columns: ["allocated_to"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asset_allocations_asset_master_id_fkey"
            columns: ["asset_master_id"]
            isOneToOne: false
            referencedRelation: "asset_master_data"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asset_allocations_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      asset_disposals: {
        Row: {
          approved_by: string | null
          asset_master_id: string
          created_at: string
          disposal_date: string
          disposal_reason: string
          gain_loss: number | null
          id: string
          nbv_at_disposal: number
          notes: string | null
          sale_price: number | null
          updated_at: string
        }
        Insert: {
          approved_by?: string | null
          asset_master_id: string
          created_at?: string
          disposal_date?: string
          disposal_reason: string
          gain_loss?: number | null
          id?: string
          nbv_at_disposal?: number
          notes?: string | null
          sale_price?: number | null
          updated_at?: string
        }
        Update: {
          approved_by?: string | null
          asset_master_id?: string
          created_at?: string
          disposal_date?: string
          disposal_reason?: string
          gain_loss?: number | null
          id?: string
          nbv_at_disposal?: number
          notes?: string | null
          sale_price?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "asset_disposals_asset_master_id_fkey"
            columns: ["asset_master_id"]
            isOneToOne: false
            referencedRelation: "asset_master_data"
            referencedColumns: ["id"]
          },
        ]
      }
      asset_location_history: {
        Row: {
          asset_master_id: string
          id: string
          location: string
          moved_by: string | null
          notes: string | null
          timestamp: string
        }
        Insert: {
          asset_master_id: string
          id?: string
          location: string
          moved_by?: string | null
          notes?: string | null
          timestamp?: string
        }
        Update: {
          asset_master_id?: string
          id?: string
          location?: string
          moved_by?: string | null
          notes?: string | null
          timestamp?: string
        }
        Relationships: [
          {
            foreignKeyName: "asset_location_history_asset_master_id_fkey"
            columns: ["asset_master_id"]
            isOneToOne: false
            referencedRelation: "asset_master_data"
            referencedColumns: ["id"]
          },
        ]
      }
      asset_master_data: {
        Row: {
          accumulated_depreciation: number | null
          activation_date: string | null
          allocated_quantity: number
          amortization_period_months: number | null
          asset_id: string
          asset_name: string
          asset_type: Database["public"]["Enums"]["asset_type"]
          brand: string | null
          cost_basis: number
          cost_center: string
          created_at: string
          created_by: string
          current_status: Database["public"]["Enums"]["asset_status"]
          depreciation_method:
            | Database["public"]["Enums"]["depreciation_method"]
            | null
          id: string
          installation_scope: string | null
          inventory_item_id: string | null
          nbv: number | null
          notes: string | null
          quantity_per_contract: number | null
          quantity_requested: number | null
          quantity_supplied_previous: number | null
          sku: string
          stock_quantity: number
          total_maintenance_cost: number | null
          unit: string | null
          updated_at: string
          useful_life_months: number | null
        }
        Insert: {
          accumulated_depreciation?: number | null
          activation_date?: string | null
          allocated_quantity?: number
          amortization_period_months?: number | null
          asset_id: string
          asset_name: string
          asset_type: Database["public"]["Enums"]["asset_type"]
          brand?: string | null
          cost_basis?: number
          cost_center: string
          created_at?: string
          created_by: string
          current_status?: Database["public"]["Enums"]["asset_status"]
          depreciation_method?:
            | Database["public"]["Enums"]["depreciation_method"]
            | null
          id?: string
          installation_scope?: string | null
          inventory_item_id?: string | null
          nbv?: number | null
          notes?: string | null
          quantity_per_contract?: number | null
          quantity_requested?: number | null
          quantity_supplied_previous?: number | null
          sku: string
          stock_quantity?: number
          total_maintenance_cost?: number | null
          unit?: string | null
          updated_at?: string
          useful_life_months?: number | null
        }
        Update: {
          accumulated_depreciation?: number | null
          activation_date?: string | null
          allocated_quantity?: number
          amortization_period_months?: number | null
          asset_id?: string
          asset_name?: string
          asset_type?: Database["public"]["Enums"]["asset_type"]
          brand?: string | null
          cost_basis?: number
          cost_center?: string
          created_at?: string
          created_by?: string
          current_status?: Database["public"]["Enums"]["asset_status"]
          depreciation_method?:
            | Database["public"]["Enums"]["depreciation_method"]
            | null
          id?: string
          installation_scope?: string | null
          inventory_item_id?: string | null
          nbv?: number | null
          notes?: string | null
          quantity_per_contract?: number | null
          quantity_requested?: number | null
          quantity_supplied_previous?: number | null
          sku?: string
          stock_quantity?: number
          total_maintenance_cost?: number | null
          unit?: string | null
          updated_at?: string
          useful_life_months?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "asset_master_data_inventory_item_id_fkey"
            columns: ["inventory_item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
        ]
      }
      brands: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      client_requirements: {
        Row: {
          assigned_to: string | null
          completion_percentage: number | null
          created_at: string
          created_by: string
          due_date: string | null
          id: string
          priority: string
          project_id: string
          requirement_description: string | null
          requirement_title: string
          status: string
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          completion_percentage?: number | null
          created_at?: string
          created_by: string
          due_date?: string | null
          id?: string
          priority?: string
          project_id: string
          requirement_description?: string | null
          requirement_title: string
          status?: string
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          completion_percentage?: number | null
          created_at?: string
          created_by?: string
          due_date?: string | null
          id?: string
          priority?: string
          project_id?: string
          requirement_description?: string | null
          requirement_title?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      contract_guarantees: {
        Row: {
          contract_id: string
          created_at: string
          expiry_date: string | null
          guarantee_number: string | null
          guarantee_type: string
          guarantee_value: number
          id: string
          issue_date: string | null
          issuing_bank: string | null
          notes: string | null
          updated_at: string
        }
        Insert: {
          contract_id: string
          created_at?: string
          expiry_date?: string | null
          guarantee_number?: string | null
          guarantee_type: string
          guarantee_value?: number
          id?: string
          issue_date?: string | null
          issuing_bank?: string | null
          notes?: string | null
          updated_at?: string
        }
        Update: {
          contract_id?: string
          created_at?: string
          expiry_date?: string | null
          guarantee_number?: string | null
          guarantee_type?: string
          guarantee_value?: number
          id?: string
          issue_date?: string | null
          issuing_bank?: string | null
          notes?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "contract_guarantees_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
        ]
      }
      contracts: {
        Row: {
          client_name: string
          contract_number: string
          contract_type: string
          contract_value: number
          created_at: string
          created_by: string
          effective_date: string | null
          expiry_date: string | null
          id: string
          is_appendix: boolean
          parent_contract_id: string | null
          payment_value: number
          project_id: string | null
          status: string
          updated_at: string
        }
        Insert: {
          client_name: string
          contract_number: string
          contract_type?: string
          contract_value?: number
          created_at?: string
          created_by: string
          effective_date?: string | null
          expiry_date?: string | null
          id?: string
          is_appendix?: boolean
          parent_contract_id?: string | null
          payment_value?: number
          project_id?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          client_name?: string
          contract_number?: string
          contract_type?: string
          contract_value?: number
          created_at?: string
          created_by?: string
          effective_date?: string | null
          expiry_date?: string | null
          id?: string
          is_appendix?: boolean
          parent_contract_id?: string | null
          payment_value?: number
          project_id?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "contracts_parent_contract_id_fkey"
            columns: ["parent_contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contracts_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      depreciation_schedules: {
        Row: {
          accumulated_depreciation: number
          asset_master_id: string
          created_at: string
          depreciation_amount: number
          id: string
          is_processed: boolean | null
          nbv: number
          period_date: string
        }
        Insert: {
          accumulated_depreciation?: number
          asset_master_id: string
          created_at?: string
          depreciation_amount?: number
          id?: string
          is_processed?: boolean | null
          nbv?: number
          period_date: string
        }
        Update: {
          accumulated_depreciation?: number
          asset_master_id?: string
          created_at?: string
          depreciation_amount?: number
          id?: string
          is_processed?: boolean | null
          nbv?: number
          period_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "depreciation_schedules_asset_master_id_fkey"
            columns: ["asset_master_id"]
            isOneToOne: false
            referencedRelation: "asset_master_data"
            referencedColumns: ["id"]
          },
        ]
      }
      employees: {
        Row: {
          certificate_expiry_date: string | null
          created_at: string
          date_joined: string
          date_of_birth: string | null
          department: string | null
          employee_card_photo_url: string | null
          full_name: string
          id: string
          id_card_photo_url: string | null
          phone: string | null
          position: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          certificate_expiry_date?: string | null
          created_at?: string
          date_joined?: string
          date_of_birth?: string | null
          department?: string | null
          employee_card_photo_url?: string | null
          full_name: string
          id?: string
          id_card_photo_url?: string | null
          phone?: string | null
          position?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          certificate_expiry_date?: string | null
          created_at?: string
          date_joined?: string
          date_of_birth?: string | null
          department?: string | null
          employee_card_photo_url?: string | null
          full_name?: string
          id?: string
          id_card_photo_url?: string | null
          phone?: string | null
          position?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      goods_receipt_notes: {
        Row: {
          created_at: string
          created_by: string
          grn_number: string
          id: string
          notes: string | null
          receipt_date: string
          supplier: string | null
          total_value: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          grn_number: string
          id?: string
          notes?: string | null
          receipt_date?: string
          supplier?: string | null
          total_value?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          grn_number?: string
          id?: string
          notes?: string | null
          receipt_date?: string
          supplier?: string | null
          total_value?: number
          updated_at?: string
        }
        Relationships: []
      }
      grn_items: {
        Row: {
          asset_master_id: string
          created_at: string
          grn_id: string
          id: string
          quantity: number
          total_cost: number
          unit_cost: number
        }
        Insert: {
          asset_master_id: string
          created_at?: string
          grn_id: string
          id?: string
          quantity?: number
          total_cost?: number
          unit_cost?: number
        }
        Update: {
          asset_master_id?: string
          created_at?: string
          grn_id?: string
          id?: string
          quantity?: number
          total_cost?: number
          unit_cost?: number
        }
        Relationships: [
          {
            foreignKeyName: "grn_items_asset_master_id_fkey"
            columns: ["asset_master_id"]
            isOneToOne: false
            referencedRelation: "asset_master_data"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "grn_items_grn_id_fkey"
            columns: ["grn_id"]
            isOneToOne: false
            referencedRelation: "goods_receipt_notes"
            referencedColumns: ["id"]
          },
        ]
      }
      handover_slips: {
        Row: {
          allocation_id: string
          created_at: string
          handover_timestamp: string
          id: string
          location: string | null
          notes: string | null
          slip_number: string
        }
        Insert: {
          allocation_id: string
          created_at?: string
          handover_timestamp?: string
          id?: string
          location?: string | null
          notes?: string | null
          slip_number: string
        }
        Update: {
          allocation_id?: string
          created_at?: string
          handover_timestamp?: string
          id?: string
          location?: string | null
          notes?: string | null
          slip_number?: string
        }
        Relationships: [
          {
            foreignKeyName: "handover_slips_allocation_id_fkey"
            columns: ["allocation_id"]
            isOneToOne: false
            referencedRelation: "asset_allocations"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_items: {
        Row: {
          brand_id: string | null
          business_type: Database["public"]["Enums"]["business_type"] | null
          category_id: string | null
          created_at: string
          id: string
          min_stock_level: number | null
          product_code: string
          product_group_id: string | null
          product_name: string
          retail_price: number | null
          stock_quantity: number | null
          unit: string
          updated_at: string
          wholesale_price: number | null
        }
        Insert: {
          brand_id?: string | null
          business_type?: Database["public"]["Enums"]["business_type"] | null
          category_id?: string | null
          created_at?: string
          id?: string
          min_stock_level?: number | null
          product_code: string
          product_group_id?: string | null
          product_name: string
          retail_price?: number | null
          stock_quantity?: number | null
          unit: string
          updated_at?: string
          wholesale_price?: number | null
        }
        Update: {
          brand_id?: string | null
          business_type?: Database["public"]["Enums"]["business_type"] | null
          category_id?: string | null
          created_at?: string
          id?: string
          min_stock_level?: number | null
          product_code?: string
          product_group_id?: string | null
          product_name?: string
          retail_price?: number | null
          stock_quantity?: number | null
          unit?: string
          updated_at?: string
          wholesale_price?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_items_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_items_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "product_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_items_product_group_id_fkey"
            columns: ["product_group_id"]
            isOneToOne: false
            referencedRelation: "product_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      maintenance_records: {
        Row: {
          asset_master_id: string
          cost: number
          created_at: string
          description: string | null
          id: string
          maintenance_date: string
          maintenance_type: string
          performed_by: string | null
          reported_by: string | null
          updated_at: string
          vendor: string | null
        }
        Insert: {
          asset_master_id: string
          cost?: number
          created_at?: string
          description?: string | null
          id?: string
          maintenance_date?: string
          maintenance_type: string
          performed_by?: string | null
          reported_by?: string | null
          updated_at?: string
          vendor?: string | null
        }
        Update: {
          asset_master_id?: string
          cost?: number
          created_at?: string
          description?: string | null
          id?: string
          maintenance_date?: string
          maintenance_type?: string
          performed_by?: string | null
          reported_by?: string | null
          updated_at?: string
          vendor?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "maintenance_records_asset_master_id_fkey"
            columns: ["asset_master_id"]
            isOneToOne: false
            referencedRelation: "asset_master_data"
            referencedColumns: ["id"]
          },
        ]
      }
      materials: {
        Row: {
          created_at: string
          id: string
          name: string
          project_id: string
          quantity: number
          supplier: string | null
          unit: string
          unit_price: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          project_id: string
          quantity: number
          supplier?: string | null
          unit: string
          unit_price?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          project_id?: string
          quantity?: number
          supplier?: string | null
          unit?: string
          unit_price?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "materials_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          is_read: boolean
          message: string
          reference_id: string | null
          title: string
          type: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean
          message: string
          reference_id?: string | null
          title: string
          type: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean
          message?: string
          reference_id?: string | null
          title?: string
          type?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      product_categories: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      product_groups: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          full_name: string
          id: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          full_name: string
          id: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      project_items: {
        Row: {
          completion_percentage: number
          created_at: string
          created_by: string | null
          description: string | null
          end_date: string | null
          id: string
          item_name: string
          project_id: string
          quantity: number
          start_date: string | null
          status: string
          total_price: number
          unit: string
          unit_price: number
          updated_at: string
        }
        Insert: {
          completion_percentage?: number
          created_at?: string
          created_by?: string | null
          description?: string | null
          end_date?: string | null
          id?: string
          item_name: string
          project_id: string
          quantity?: number
          start_date?: string | null
          status?: string
          total_price?: number
          unit?: string
          unit_price?: number
          updated_at?: string
        }
        Update: {
          completion_percentage?: number
          created_at?: string
          created_by?: string | null
          description?: string | null
          end_date?: string | null
          id?: string
          item_name?: string
          project_id?: string
          quantity?: number
          start_date?: string | null
          status?: string
          total_price?: number
          unit?: string
          unit_price?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_items_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_kpis: {
        Row: {
          created_at: string
          created_by: string | null
          current_value: number
          description: string | null
          due_date: string | null
          id: string
          kpi_name: string
          project_id: string
          status: string
          target_value: number
          unit: string
          updated_at: string
          weight: number
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          current_value?: number
          description?: string | null
          due_date?: string | null
          id?: string
          kpi_name: string
          project_id: string
          status?: string
          target_value?: number
          unit?: string
          updated_at?: string
          weight?: number
        }
        Update: {
          created_at?: string
          created_by?: string | null
          current_value?: number
          description?: string | null
          due_date?: string | null
          id?: string
          kpi_name?: string
          project_id?: string
          status?: string
          target_value?: number
          unit?: string
          updated_at?: string
          weight?: number
        }
        Relationships: [
          {
            foreignKeyName: "project_kpis_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          budget: number | null
          created_at: string
          created_by: string
          description: string | null
          end_date: string | null
          id: string
          location: string | null
          name: string
          priority: string | null
          start_date: string | null
          status: Database["public"]["Enums"]["project_status"]
          updated_at: string
        }
        Insert: {
          budget?: number | null
          created_at?: string
          created_by: string
          description?: string | null
          end_date?: string | null
          id?: string
          location?: string | null
          name: string
          priority?: string | null
          start_date?: string | null
          status?: Database["public"]["Enums"]["project_status"]
          updated_at?: string
        }
        Update: {
          budget?: number | null
          created_at?: string
          created_by?: string
          description?: string | null
          end_date?: string | null
          id?: string
          location?: string | null
          name?: string
          priority?: string | null
          start_date?: string | null
          status?: Database["public"]["Enums"]["project_status"]
          updated_at?: string
        }
        Relationships: []
      }
      tasks: {
        Row: {
          assigned_to: string | null
          created_at: string
          created_by: string
          description: string | null
          due_date: string | null
          id: string
          priority: string | null
          project_id: string
          status: Database["public"]["Enums"]["task_status"]
          title: string
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          created_at?: string
          created_by: string
          description?: string | null
          due_date?: string | null
          id?: string
          priority?: string | null
          project_id: string
          status?: Database["public"]["Enums"]["task_status"]
          title: string
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          due_date?: string | null
          id?: string
          priority?: string | null
          project_id?: string
          status?: Database["public"]["Enums"]["task_status"]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      team_members: {
        Row: {
          id: string
          joined_at: string
          project_id: string
          role: string
          user_id: string
        }
        Insert: {
          id?: string
          joined_at?: string
          project_id: string
          role: string
          user_id: string
        }
        Update: {
          id?: string
          joined_at?: string
          project_id?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_members_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      user_permissions: {
        Row: {
          allowed_modules: string[] | null
          created_at: string
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          allowed_modules?: string[] | null
          created_at?: string
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          allowed_modules?: string[] | null
          created_at?: string
          id?: string
          updated_at?: string
          user_id?: string
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
      is_project_owner: {
        Args: { _project_id: string; _user_id: string }
        Returns: boolean
      }
      is_team_member: {
        Args: { _project_id: string; _user_id: string }
        Returns: boolean
      }
      user_can_access_project: {
        Args: { _project_id: string; _user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "user" | "accountant" | "hr_admin" | "project_manager"
      asset_status:
        | "in_stock"
        | "active"
        | "allocated"
        | "under_maintenance"
        | "ready_for_reallocation"
        | "disposed"
      asset_type: "equipment" | "tools" | "materials"
      business_type: "wholesale" | "retail" | "both"
      depreciation_method:
        | "straight_line"
        | "declining_balance"
        | "units_of_production"
      handover_status: "active" | "returned" | "overdue"
      project_status: "planning" | "in_progress" | "completed" | "on_hold"
      task_status: "pending" | "in_progress" | "completed" | "overdue"
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
      app_role: ["admin", "user", "accountant", "hr_admin", "project_manager"],
      asset_status: [
        "in_stock",
        "active",
        "allocated",
        "under_maintenance",
        "ready_for_reallocation",
        "disposed",
      ],
      asset_type: ["equipment", "tools", "materials"],
      business_type: ["wholesale", "retail", "both"],
      depreciation_method: [
        "straight_line",
        "declining_balance",
        "units_of_production",
      ],
      handover_status: ["active", "returned", "overdue"],
      project_status: ["planning", "in_progress", "completed", "on_hold"],
      task_status: ["pending", "in_progress", "completed", "overdue"],
    },
  },
} as const
