CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";
CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";
CREATE EXTENSION IF NOT EXISTS "plpgsql" WITH SCHEMA "pg_catalog";
CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";
--
-- PostgreSQL database dump
--


-- Dumped from database version 17.6
-- Dumped by pg_dump version 18.1

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--



--
-- Name: app_role; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.app_role AS ENUM (
    'admin',
    'user',
    'accountant',
    'hr_admin',
    'project_manager'
);


--
-- Name: asset_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.asset_status AS ENUM (
    'in_stock',
    'active',
    'allocated',
    'under_maintenance',
    'ready_for_reallocation',
    'disposed'
);


--
-- Name: asset_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.asset_type AS ENUM (
    'equipment',
    'tools',
    'materials'
);


--
-- Name: business_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.business_type AS ENUM (
    'wholesale',
    'retail',
    'both'
);


--
-- Name: depreciation_method; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.depreciation_method AS ENUM (
    'straight_line',
    'declining_balance',
    'units_of_production'
);


--
-- Name: handover_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.handover_status AS ENUM (
    'active',
    'returned',
    'overdue'
);


--
-- Name: project_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.project_status AS ENUM (
    'planning',
    'in_progress',
    'completed',
    'on_hold'
);


--
-- Name: task_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.task_status AS ENUM (
    'pending',
    'in_progress',
    'completed',
    'overdue'
);


--
-- Name: handle_new_user(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.handle_new_user() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', 'User'));
  
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user');
  
  RETURN NEW;
END;
$$;


--
-- Name: handle_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.handle_updated_at() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


--
-- Name: has_role(uuid, public.app_role); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.has_role(_user_id uuid, _role public.app_role) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;


--
-- Name: is_project_owner(uuid, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.is_project_owner(_user_id uuid, _project_id uuid) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.projects p
    WHERE p.id = _project_id
      AND p.created_by = _user_id
  )
$$;


--
-- Name: is_team_member(uuid, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.is_team_member(_user_id uuid, _project_id uuid) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.team_members tm
    WHERE tm.project_id = _project_id
      AND tm.user_id = _user_id
  )
$$;


--
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


--
-- Name: user_can_access_project(uuid, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.user_can_access_project(_user_id uuid, _project_id uuid) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.projects p
    WHERE p.id = _project_id
      AND (
        p.created_by = _user_id
        OR public.has_role(_user_id, 'admin')
        OR EXISTS (
          SELECT 1
          FROM public.team_members tm
          WHERE tm.project_id = p.id
            AND tm.user_id = _user_id
        )
      )
  )
$$;


SET default_table_access_method = heap;

--
-- Name: accounting_transactions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.accounting_transactions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    transaction_date date DEFAULT CURRENT_DATE NOT NULL,
    transaction_type text NOT NULL,
    category text NOT NULL,
    amount numeric NOT NULL,
    description text,
    project_id uuid,
    created_by uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT accounting_transactions_amount_check CHECK ((amount > (0)::numeric)),
    CONSTRAINT accounting_transactions_transaction_type_check CHECK ((transaction_type = ANY (ARRAY['income'::text, 'expense'::text])))
);


--
-- Name: asset_allocations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.asset_allocations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    asset_master_id uuid NOT NULL,
    allocated_to uuid NOT NULL,
    allocated_by uuid NOT NULL,
    purpose text NOT NULL,
    project_id uuid,
    allocation_date timestamp with time zone DEFAULT now() NOT NULL,
    expected_return_date date,
    actual_return_date timestamp with time zone,
    status public.handover_status DEFAULT 'active'::public.handover_status NOT NULL,
    return_condition text,
    reusability_percentage numeric,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: asset_disposals; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.asset_disposals (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    asset_master_id uuid NOT NULL,
    disposal_date date DEFAULT CURRENT_DATE NOT NULL,
    disposal_reason text NOT NULL,
    nbv_at_disposal numeric DEFAULT 0 NOT NULL,
    sale_price numeric DEFAULT 0,
    gain_loss numeric DEFAULT 0,
    approved_by uuid,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: asset_location_history; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.asset_location_history (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    asset_master_id uuid NOT NULL,
    location text NOT NULL,
    "timestamp" timestamp with time zone DEFAULT now() NOT NULL,
    moved_by uuid,
    notes text
);


--
-- Name: asset_master_data; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.asset_master_data (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    asset_id text NOT NULL,
    sku text NOT NULL,
    asset_name text NOT NULL,
    asset_type public.asset_type NOT NULL,
    cost_center text NOT NULL,
    cost_basis numeric DEFAULT 0 NOT NULL,
    activation_date date,
    useful_life_months integer,
    amortization_period_months integer,
    depreciation_method public.depreciation_method,
    current_status public.asset_status DEFAULT 'in_stock'::public.asset_status NOT NULL,
    nbv numeric DEFAULT 0,
    accumulated_depreciation numeric DEFAULT 0,
    total_maintenance_cost numeric DEFAULT 0,
    inventory_item_id uuid,
    created_by uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    brand text,
    unit text,
    quantity_supplied_previous numeric DEFAULT 0,
    quantity_requested numeric DEFAULT 0,
    quantity_per_contract numeric DEFAULT 0,
    installation_scope text,
    notes text
);


--
-- Name: brands; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.brands (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    description text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: client_requirements; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.client_requirements (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    project_id uuid NOT NULL,
    requirement_title text NOT NULL,
    requirement_description text,
    priority text DEFAULT 'medium'::text NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    assigned_to uuid,
    due_date date,
    completion_percentage numeric DEFAULT 0,
    created_by uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: contract_guarantees; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.contract_guarantees (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    contract_id uuid NOT NULL,
    guarantee_type text NOT NULL,
    guarantee_number text,
    guarantee_value numeric DEFAULT 0 NOT NULL,
    issue_date date,
    expiry_date date,
    issuing_bank text,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: contracts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.contracts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    contract_number text NOT NULL,
    client_name text NOT NULL,
    is_appendix boolean DEFAULT false NOT NULL,
    parent_contract_id uuid,
    project_id uuid,
    contract_type text DEFAULT 'Thi công'::text NOT NULL,
    contract_value numeric DEFAULT 0 NOT NULL,
    payment_value numeric DEFAULT 0 NOT NULL,
    effective_date date,
    expiry_date date,
    status text DEFAULT 'active'::text NOT NULL,
    created_by uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: depreciation_schedules; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.depreciation_schedules (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    asset_master_id uuid NOT NULL,
    period_date date NOT NULL,
    depreciation_amount numeric DEFAULT 0 NOT NULL,
    accumulated_depreciation numeric DEFAULT 0 NOT NULL,
    nbv numeric DEFAULT 0 NOT NULL,
    is_processed boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: employees; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.employees (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    full_name text NOT NULL,
    date_of_birth date,
    date_joined date DEFAULT CURRENT_DATE NOT NULL,
    "position" text,
    department text,
    phone text,
    employee_card_photo_url text,
    id_card_photo_url text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    certificate_expiry_date date
);


--
-- Name: goods_receipt_notes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.goods_receipt_notes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    grn_number text NOT NULL,
    receipt_date date DEFAULT CURRENT_DATE NOT NULL,
    supplier text,
    total_value numeric DEFAULT 0 NOT NULL,
    notes text,
    created_by uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: grn_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.grn_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    grn_id uuid NOT NULL,
    asset_master_id uuid NOT NULL,
    quantity numeric DEFAULT 1 NOT NULL,
    unit_cost numeric DEFAULT 0 NOT NULL,
    total_cost numeric DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: handover_slips; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.handover_slips (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    slip_number text NOT NULL,
    allocation_id uuid NOT NULL,
    handover_timestamp timestamp with time zone DEFAULT now() NOT NULL,
    location text,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: inventory_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.inventory_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    product_code text NOT NULL,
    product_name text NOT NULL,
    unit text NOT NULL,
    category_id uuid,
    brand_id uuid,
    product_group_id uuid,
    wholesale_price numeric DEFAULT 0,
    retail_price numeric DEFAULT 0,
    stock_quantity numeric DEFAULT 0,
    min_stock_level numeric DEFAULT 0,
    business_type public.business_type DEFAULT 'both'::public.business_type,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: maintenance_records; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.maintenance_records (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    asset_master_id uuid NOT NULL,
    maintenance_date date DEFAULT CURRENT_DATE NOT NULL,
    maintenance_type text NOT NULL,
    description text,
    cost numeric DEFAULT 0 NOT NULL,
    vendor text,
    reported_by uuid,
    performed_by text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: materials; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.materials (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    project_id uuid NOT NULL,
    name text NOT NULL,
    quantity numeric(10,2) NOT NULL,
    unit text NOT NULL,
    unit_price numeric(15,2),
    supplier text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: notifications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.notifications (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    title text NOT NULL,
    message text NOT NULL,
    type text NOT NULL,
    reference_id uuid,
    is_read boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: product_categories; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.product_categories (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    description text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: product_groups; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.product_groups (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    description text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: profiles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.profiles (
    id uuid NOT NULL,
    full_name text NOT NULL,
    avatar_url text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: project_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.project_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    project_id uuid NOT NULL,
    item_name text NOT NULL,
    description text,
    quantity numeric DEFAULT 1 NOT NULL,
    unit text DEFAULT 'cái'::text NOT NULL,
    unit_price numeric DEFAULT 0 NOT NULL,
    total_price numeric DEFAULT 0 NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    completion_percentage numeric DEFAULT 0 NOT NULL,
    start_date date,
    end_date date,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: project_kpis; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.project_kpis (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    project_id uuid NOT NULL,
    kpi_name text NOT NULL,
    description text,
    target_value numeric DEFAULT 100 NOT NULL,
    current_value numeric DEFAULT 0 NOT NULL,
    unit text DEFAULT '%'::text NOT NULL,
    weight numeric DEFAULT 1 NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    due_date date,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: projects; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.projects (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    description text,
    location text,
    status public.project_status DEFAULT 'planning'::public.project_status NOT NULL,
    start_date date,
    end_date date,
    budget numeric(15,2),
    created_by uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    priority text DEFAULT 'medium'::text
);


--
-- Name: tasks; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tasks (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    project_id uuid NOT NULL,
    title text NOT NULL,
    description text,
    status public.task_status DEFAULT 'pending'::public.task_status NOT NULL,
    assigned_to uuid,
    due_date date,
    priority text,
    created_by uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT tasks_priority_check CHECK ((priority = ANY (ARRAY['low'::text, 'medium'::text, 'high'::text, 'urgent'::text])))
);


--
-- Name: team_members; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.team_members (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    project_id uuid NOT NULL,
    user_id uuid NOT NULL,
    role text NOT NULL,
    joined_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: user_permissions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_permissions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    allowed_modules text[] DEFAULT ARRAY['overview'::text],
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: user_roles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_roles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    role public.app_role DEFAULT 'user'::public.app_role NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: accounting_transactions accounting_transactions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.accounting_transactions
    ADD CONSTRAINT accounting_transactions_pkey PRIMARY KEY (id);


--
-- Name: asset_allocations asset_allocations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.asset_allocations
    ADD CONSTRAINT asset_allocations_pkey PRIMARY KEY (id);


--
-- Name: asset_disposals asset_disposals_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.asset_disposals
    ADD CONSTRAINT asset_disposals_pkey PRIMARY KEY (id);


--
-- Name: asset_location_history asset_location_history_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.asset_location_history
    ADD CONSTRAINT asset_location_history_pkey PRIMARY KEY (id);


--
-- Name: asset_master_data asset_master_data_asset_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.asset_master_data
    ADD CONSTRAINT asset_master_data_asset_id_key UNIQUE (asset_id);


--
-- Name: asset_master_data asset_master_data_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.asset_master_data
    ADD CONSTRAINT asset_master_data_pkey PRIMARY KEY (id);


--
-- Name: brands brands_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.brands
    ADD CONSTRAINT brands_pkey PRIMARY KEY (id);


--
-- Name: client_requirements client_requirements_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.client_requirements
    ADD CONSTRAINT client_requirements_pkey PRIMARY KEY (id);


--
-- Name: contract_guarantees contract_guarantees_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.contract_guarantees
    ADD CONSTRAINT contract_guarantees_pkey PRIMARY KEY (id);


--
-- Name: contracts contracts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.contracts
    ADD CONSTRAINT contracts_pkey PRIMARY KEY (id);


--
-- Name: depreciation_schedules depreciation_schedules_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.depreciation_schedules
    ADD CONSTRAINT depreciation_schedules_pkey PRIMARY KEY (id);


--
-- Name: employees employees_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employees
    ADD CONSTRAINT employees_pkey PRIMARY KEY (id);


--
-- Name: goods_receipt_notes goods_receipt_notes_grn_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.goods_receipt_notes
    ADD CONSTRAINT goods_receipt_notes_grn_number_key UNIQUE (grn_number);


--
-- Name: goods_receipt_notes goods_receipt_notes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.goods_receipt_notes
    ADD CONSTRAINT goods_receipt_notes_pkey PRIMARY KEY (id);


--
-- Name: grn_items grn_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.grn_items
    ADD CONSTRAINT grn_items_pkey PRIMARY KEY (id);


--
-- Name: handover_slips handover_slips_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.handover_slips
    ADD CONSTRAINT handover_slips_pkey PRIMARY KEY (id);


--
-- Name: handover_slips handover_slips_slip_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.handover_slips
    ADD CONSTRAINT handover_slips_slip_number_key UNIQUE (slip_number);


--
-- Name: inventory_items inventory_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventory_items
    ADD CONSTRAINT inventory_items_pkey PRIMARY KEY (id);


--
-- Name: inventory_items inventory_items_product_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventory_items
    ADD CONSTRAINT inventory_items_product_code_key UNIQUE (product_code);


--
-- Name: maintenance_records maintenance_records_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.maintenance_records
    ADD CONSTRAINT maintenance_records_pkey PRIMARY KEY (id);


--
-- Name: materials materials_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.materials
    ADD CONSTRAINT materials_pkey PRIMARY KEY (id);


--
-- Name: notifications notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_pkey PRIMARY KEY (id);


--
-- Name: product_categories product_categories_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_categories
    ADD CONSTRAINT product_categories_pkey PRIMARY KEY (id);


--
-- Name: product_groups product_groups_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_groups
    ADD CONSTRAINT product_groups_pkey PRIMARY KEY (id);


--
-- Name: profiles profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_pkey PRIMARY KEY (id);


--
-- Name: project_items project_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.project_items
    ADD CONSTRAINT project_items_pkey PRIMARY KEY (id);


--
-- Name: project_kpis project_kpis_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.project_kpis
    ADD CONSTRAINT project_kpis_pkey PRIMARY KEY (id);


--
-- Name: projects projects_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.projects
    ADD CONSTRAINT projects_pkey PRIMARY KEY (id);


--
-- Name: tasks tasks_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tasks
    ADD CONSTRAINT tasks_pkey PRIMARY KEY (id);


--
-- Name: team_members team_members_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.team_members
    ADD CONSTRAINT team_members_pkey PRIMARY KEY (id);


--
-- Name: team_members team_members_project_id_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.team_members
    ADD CONSTRAINT team_members_project_id_user_id_key UNIQUE (project_id, user_id);


--
-- Name: user_permissions user_permissions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_permissions
    ADD CONSTRAINT user_permissions_pkey PRIMARY KEY (id);


--
-- Name: user_permissions user_permissions_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_permissions
    ADD CONSTRAINT user_permissions_user_id_key UNIQUE (user_id);


--
-- Name: user_roles user_roles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_pkey PRIMARY KEY (id);


--
-- Name: user_roles user_roles_user_id_role_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_user_id_role_key UNIQUE (user_id, role);


--
-- Name: idx_accounting_transactions_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_accounting_transactions_date ON public.accounting_transactions USING btree (transaction_date DESC);


--
-- Name: idx_accounting_transactions_project; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_accounting_transactions_project ON public.accounting_transactions USING btree (project_id);


--
-- Name: idx_accounting_transactions_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_accounting_transactions_type ON public.accounting_transactions USING btree (transaction_type);


--
-- Name: idx_asset_allocations_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_asset_allocations_status ON public.asset_allocations USING btree (status);


--
-- Name: idx_asset_allocations_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_asset_allocations_user ON public.asset_allocations USING btree (allocated_to);


--
-- Name: idx_asset_master_asset_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_asset_master_asset_id ON public.asset_master_data USING btree (asset_id);


--
-- Name: idx_asset_master_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_asset_master_status ON public.asset_master_data USING btree (current_status);


--
-- Name: idx_client_requirements_assigned_to; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_client_requirements_assigned_to ON public.client_requirements USING btree (assigned_to);


--
-- Name: idx_client_requirements_project_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_client_requirements_project_id ON public.client_requirements USING btree (project_id);


--
-- Name: idx_depreciation_asset; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_depreciation_asset ON public.depreciation_schedules USING btree (asset_master_id);


--
-- Name: idx_maintenance_asset; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_maintenance_asset ON public.maintenance_records USING btree (asset_master_id);


--
-- Name: materials set_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.materials FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();


--
-- Name: profiles set_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();


--
-- Name: projects set_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.projects FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();


--
-- Name: tasks set_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.tasks FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();


--
-- Name: accounting_transactions update_accounting_transactions_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_accounting_transactions_updated_at BEFORE UPDATE ON public.accounting_transactions FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();


--
-- Name: asset_allocations update_asset_allocations_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_asset_allocations_updated_at BEFORE UPDATE ON public.asset_allocations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: asset_disposals update_asset_disposals_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_asset_disposals_updated_at BEFORE UPDATE ON public.asset_disposals FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: asset_master_data update_asset_master_data_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_asset_master_data_updated_at BEFORE UPDATE ON public.asset_master_data FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: brands update_brands_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_brands_updated_at BEFORE UPDATE ON public.brands FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();


--
-- Name: client_requirements update_client_requirements_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_client_requirements_updated_at BEFORE UPDATE ON public.client_requirements FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();


--
-- Name: contract_guarantees update_contract_guarantees_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_contract_guarantees_updated_at BEFORE UPDATE ON public.contract_guarantees FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();


--
-- Name: contracts update_contracts_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_contracts_updated_at BEFORE UPDATE ON public.contracts FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();


--
-- Name: employees update_employees_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_employees_updated_at BEFORE UPDATE ON public.employees FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();


--
-- Name: goods_receipt_notes update_goods_receipt_notes_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_goods_receipt_notes_updated_at BEFORE UPDATE ON public.goods_receipt_notes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: inventory_items update_inventory_items_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_inventory_items_updated_at BEFORE UPDATE ON public.inventory_items FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();


--
-- Name: maintenance_records update_maintenance_records_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_maintenance_records_updated_at BEFORE UPDATE ON public.maintenance_records FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: notifications update_notifications_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_notifications_updated_at BEFORE UPDATE ON public.notifications FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();


--
-- Name: product_categories update_product_categories_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_product_categories_updated_at BEFORE UPDATE ON public.product_categories FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();


--
-- Name: product_groups update_product_groups_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_product_groups_updated_at BEFORE UPDATE ON public.product_groups FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();


--
-- Name: project_items update_project_items_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_project_items_updated_at BEFORE UPDATE ON public.project_items FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: project_kpis update_project_kpis_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_project_kpis_updated_at BEFORE UPDATE ON public.project_kpis FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: user_permissions update_user_permissions_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_user_permissions_updated_at BEFORE UPDATE ON public.user_permissions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: accounting_transactions accounting_transactions_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.accounting_transactions
    ADD CONSTRAINT accounting_transactions_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE SET NULL;


--
-- Name: asset_allocations asset_allocations_allocated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.asset_allocations
    ADD CONSTRAINT asset_allocations_allocated_by_fkey FOREIGN KEY (allocated_by) REFERENCES public.employees(id) ON DELETE SET NULL;


--
-- Name: asset_allocations asset_allocations_allocated_to_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.asset_allocations
    ADD CONSTRAINT asset_allocations_allocated_to_fkey FOREIGN KEY (allocated_to) REFERENCES public.employees(id) ON DELETE SET NULL;


--
-- Name: asset_allocations asset_allocations_asset_master_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.asset_allocations
    ADD CONSTRAINT asset_allocations_asset_master_id_fkey FOREIGN KEY (asset_master_id) REFERENCES public.asset_master_data(id) ON DELETE CASCADE;


--
-- Name: asset_allocations asset_allocations_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.asset_allocations
    ADD CONSTRAINT asset_allocations_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id);


--
-- Name: asset_disposals asset_disposals_approved_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.asset_disposals
    ADD CONSTRAINT asset_disposals_approved_by_fkey FOREIGN KEY (approved_by) REFERENCES auth.users(id);


--
-- Name: asset_disposals asset_disposals_asset_master_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.asset_disposals
    ADD CONSTRAINT asset_disposals_asset_master_id_fkey FOREIGN KEY (asset_master_id) REFERENCES public.asset_master_data(id) ON DELETE CASCADE;


--
-- Name: asset_location_history asset_location_history_asset_master_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.asset_location_history
    ADD CONSTRAINT asset_location_history_asset_master_id_fkey FOREIGN KEY (asset_master_id) REFERENCES public.asset_master_data(id) ON DELETE CASCADE;


--
-- Name: asset_location_history asset_location_history_moved_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.asset_location_history
    ADD CONSTRAINT asset_location_history_moved_by_fkey FOREIGN KEY (moved_by) REFERENCES auth.users(id);


--
-- Name: asset_master_data asset_master_data_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.asset_master_data
    ADD CONSTRAINT asset_master_data_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id);


--
-- Name: asset_master_data asset_master_data_inventory_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.asset_master_data
    ADD CONSTRAINT asset_master_data_inventory_item_id_fkey FOREIGN KEY (inventory_item_id) REFERENCES public.inventory_items(id);


--
-- Name: contract_guarantees contract_guarantees_contract_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.contract_guarantees
    ADD CONSTRAINT contract_guarantees_contract_id_fkey FOREIGN KEY (contract_id) REFERENCES public.contracts(id) ON DELETE CASCADE;


--
-- Name: contracts contracts_parent_contract_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.contracts
    ADD CONSTRAINT contracts_parent_contract_id_fkey FOREIGN KEY (parent_contract_id) REFERENCES public.contracts(id) ON DELETE SET NULL;


--
-- Name: contracts contracts_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.contracts
    ADD CONSTRAINT contracts_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE SET NULL;


--
-- Name: depreciation_schedules depreciation_schedules_asset_master_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.depreciation_schedules
    ADD CONSTRAINT depreciation_schedules_asset_master_id_fkey FOREIGN KEY (asset_master_id) REFERENCES public.asset_master_data(id) ON DELETE CASCADE;


--
-- Name: employees employees_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employees
    ADD CONSTRAINT employees_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;


--
-- Name: goods_receipt_notes goods_receipt_notes_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.goods_receipt_notes
    ADD CONSTRAINT goods_receipt_notes_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id);


--
-- Name: grn_items grn_items_asset_master_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.grn_items
    ADD CONSTRAINT grn_items_asset_master_id_fkey FOREIGN KEY (asset_master_id) REFERENCES public.asset_master_data(id) ON DELETE CASCADE;


--
-- Name: grn_items grn_items_grn_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.grn_items
    ADD CONSTRAINT grn_items_grn_id_fkey FOREIGN KEY (grn_id) REFERENCES public.goods_receipt_notes(id) ON DELETE CASCADE;


--
-- Name: handover_slips handover_slips_allocation_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.handover_slips
    ADD CONSTRAINT handover_slips_allocation_id_fkey FOREIGN KEY (allocation_id) REFERENCES public.asset_allocations(id) ON DELETE CASCADE;


--
-- Name: inventory_items inventory_items_brand_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventory_items
    ADD CONSTRAINT inventory_items_brand_id_fkey FOREIGN KEY (brand_id) REFERENCES public.brands(id);


--
-- Name: inventory_items inventory_items_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventory_items
    ADD CONSTRAINT inventory_items_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.product_categories(id);


--
-- Name: inventory_items inventory_items_product_group_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventory_items
    ADD CONSTRAINT inventory_items_product_group_id_fkey FOREIGN KEY (product_group_id) REFERENCES public.product_groups(id);


--
-- Name: maintenance_records maintenance_records_asset_master_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.maintenance_records
    ADD CONSTRAINT maintenance_records_asset_master_id_fkey FOREIGN KEY (asset_master_id) REFERENCES public.asset_master_data(id) ON DELETE CASCADE;


--
-- Name: maintenance_records maintenance_records_reported_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.maintenance_records
    ADD CONSTRAINT maintenance_records_reported_by_fkey FOREIGN KEY (reported_by) REFERENCES auth.users(id);


--
-- Name: materials materials_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.materials
    ADD CONSTRAINT materials_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;


--
-- Name: notifications notifications_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: profiles profiles_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: project_items project_items_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.project_items
    ADD CONSTRAINT project_items_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;


--
-- Name: project_kpis project_kpis_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.project_kpis
    ADD CONSTRAINT project_kpis_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;


--
-- Name: projects projects_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.projects
    ADD CONSTRAINT projects_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: tasks tasks_assigned_to_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tasks
    ADD CONSTRAINT tasks_assigned_to_fkey FOREIGN KEY (assigned_to) REFERENCES public.employees(id) ON DELETE SET NULL;


--
-- Name: tasks tasks_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tasks
    ADD CONSTRAINT tasks_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: tasks tasks_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tasks
    ADD CONSTRAINT tasks_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;


--
-- Name: team_members team_members_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.team_members
    ADD CONSTRAINT team_members_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;


--
-- Name: team_members team_members_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.team_members
    ADD CONSTRAINT team_members_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: user_roles user_roles_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: employees Admins and HR can view all employees, users can view own record; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins and HR can view all employees, users can view own record" ON public.employees FOR SELECT USING ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'hr_admin'::public.app_role) OR (user_id = auth.uid())));


--
-- Name: goods_receipt_notes Admins can manage GRN; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage GRN" ON public.goods_receipt_notes USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: grn_items Admins can manage GRN items; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage GRN items" ON public.grn_items USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: asset_allocations Admins can manage allocations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage allocations" ON public.asset_allocations USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: asset_master_data Admins can manage asset master data; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage asset master data" ON public.asset_master_data USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: brands Admins can manage brands; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage brands" ON public.brands TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: product_categories Admins can manage categories; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage categories" ON public.product_categories TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: contract_guarantees Admins can manage contract guarantees; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage contract guarantees" ON public.contract_guarantees USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: contracts Admins can manage contracts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage contracts" ON public.contracts USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: depreciation_schedules Admins can manage depreciation schedules; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage depreciation schedules" ON public.depreciation_schedules USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: asset_disposals Admins can manage disposals; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage disposals" ON public.asset_disposals USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: employees Admins can manage employees; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage employees" ON public.employees USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: handover_slips Admins can manage handover slips; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage handover slips" ON public.handover_slips USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: inventory_items Admins can manage inventory items; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage inventory items" ON public.inventory_items TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: maintenance_records Admins can manage maintenance records; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage maintenance records" ON public.maintenance_records USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: user_permissions Admins can manage permissions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage permissions" ON public.user_permissions USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: product_groups Admins can manage product groups; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage product groups" ON public.product_groups TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: accounting_transactions Admins can manage transactions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage transactions" ON public.accounting_transactions USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: asset_location_history Authenticated users can create location history; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can create location history" ON public.asset_location_history FOR INSERT WITH CHECK ((auth.uid() = moved_by));


--
-- Name: maintenance_records Authenticated users can create maintenance records; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can create maintenance records" ON public.maintenance_records FOR INSERT WITH CHECK ((auth.uid() = reported_by));


--
-- Name: projects Authenticated users can create projects; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can create projects" ON public.projects FOR INSERT TO authenticated WITH CHECK ((auth.uid() = created_by));


--
-- Name: goods_receipt_notes Authenticated users can view GRN; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can view GRN" ON public.goods_receipt_notes FOR SELECT USING (true);


--
-- Name: grn_items Authenticated users can view GRN items; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can view GRN items" ON public.grn_items FOR SELECT USING (true);


--
-- Name: asset_master_data Authenticated users can view asset master data; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can view asset master data" ON public.asset_master_data FOR SELECT USING (true);


--
-- Name: brands Authenticated users can view brands; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can view brands" ON public.brands FOR SELECT TO authenticated USING (true);


--
-- Name: product_categories Authenticated users can view categories; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can view categories" ON public.product_categories FOR SELECT TO authenticated USING (true);


--
-- Name: contract_guarantees Authenticated users can view contract guarantees; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can view contract guarantees" ON public.contract_guarantees FOR SELECT USING (true);


--
-- Name: contracts Authenticated users can view contracts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can view contracts" ON public.contracts FOR SELECT USING (true);


--
-- Name: depreciation_schedules Authenticated users can view depreciation schedules; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can view depreciation schedules" ON public.depreciation_schedules FOR SELECT USING (true);


--
-- Name: asset_disposals Authenticated users can view disposals; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can view disposals" ON public.asset_disposals FOR SELECT USING (true);


--
-- Name: inventory_items Authenticated users can view inventory items; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can view inventory items" ON public.inventory_items FOR SELECT TO authenticated USING (true);


--
-- Name: asset_location_history Authenticated users can view location history; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can view location history" ON public.asset_location_history FOR SELECT USING (true);


--
-- Name: maintenance_records Authenticated users can view maintenance records; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can view maintenance records" ON public.maintenance_records FOR SELECT USING (true);


--
-- Name: product_groups Authenticated users can view product groups; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can view product groups" ON public.product_groups FOR SELECT TO authenticated USING (true);


--
-- Name: accounting_transactions Authenticated users can view transactions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can view transactions" ON public.accounting_transactions FOR SELECT USING (true);


--
-- Name: user_roles Only admins can manage roles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Only admins can manage roles" ON public.user_roles TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: projects Project creators and admins can delete projects; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Project creators and admins can delete projects" ON public.projects FOR DELETE TO authenticated USING (((auth.uid() = created_by) OR public.has_role(auth.uid(), 'admin'::public.app_role)));


--
-- Name: projects Project creators and admins can update projects; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Project creators and admins can update projects" ON public.projects FOR UPDATE TO authenticated USING (((auth.uid() = created_by) OR public.has_role(auth.uid(), 'admin'::public.app_role)));


--
-- Name: materials Project owners can manage materials; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Project owners can manage materials" ON public.materials TO authenticated USING ((public.has_role(auth.uid(), 'admin'::public.app_role) OR (EXISTS ( SELECT 1
   FROM public.projects
  WHERE ((projects.id = materials.project_id) AND (projects.created_by = auth.uid()))))));


--
-- Name: project_kpis Project owners can manage project KPIs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Project owners can manage project KPIs" ON public.project_kpis USING ((public.has_role(auth.uid(), 'admin'::public.app_role) OR (EXISTS ( SELECT 1
   FROM public.projects
  WHERE ((projects.id = project_kpis.project_id) AND (projects.created_by = auth.uid()))))));


--
-- Name: project_items Project owners can manage project items; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Project owners can manage project items" ON public.project_items USING ((public.has_role(auth.uid(), 'admin'::public.app_role) OR (EXISTS ( SELECT 1
   FROM public.projects
  WHERE ((projects.id = project_items.project_id) AND (projects.created_by = auth.uid()))))));


--
-- Name: client_requirements Project owners can manage requirements; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Project owners can manage requirements" ON public.client_requirements USING ((public.has_role(auth.uid(), 'admin'::public.app_role) OR (EXISTS ( SELECT 1
   FROM public.projects
  WHERE ((projects.id = client_requirements.project_id) AND (projects.created_by = auth.uid()))))));


--
-- Name: team_members Project owners can manage team members; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Project owners can manage team members" ON public.team_members USING ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.is_project_owner(auth.uid(), project_id)));


--
-- Name: notifications System can create notifications; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "System can create notifications" ON public.notifications FOR INSERT WITH CHECK (true);


--
-- Name: tasks Task creators and project owners can delete tasks; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Task creators and project owners can delete tasks" ON public.tasks FOR DELETE USING (((auth.uid() = created_by) OR public.has_role(auth.uid(), 'admin'::public.app_role) OR public.user_can_access_project(auth.uid(), project_id)));


--
-- Name: tasks Task creators and project owners can update tasks; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Task creators and project owners can update tasks" ON public.tasks FOR UPDATE USING (((auth.uid() = created_by) OR public.has_role(auth.uid(), 'admin'::public.app_role) OR public.user_can_access_project(auth.uid(), project_id)));


--
-- Name: tasks Users can create tasks in their projects; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create tasks in their projects" ON public.tasks FOR INSERT WITH CHECK (((auth.uid() = created_by) AND public.user_can_access_project(auth.uid(), project_id)));


--
-- Name: notifications Users can delete their own notifications; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their own notifications" ON public.notifications FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: profiles Users can update own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING ((auth.uid() = id));


--
-- Name: notifications Users can update their own notifications; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own notifications" ON public.notifications FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: profiles Users can view all profiles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view all profiles" ON public.profiles FOR SELECT TO authenticated USING (true);


--
-- Name: user_roles Users can view all roles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view all roles" ON public.user_roles FOR SELECT TO authenticated USING (true);


--
-- Name: handover_slips Users can view handover slips; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view handover slips" ON public.handover_slips FOR SELECT USING (true);


--
-- Name: materials Users can view materials in their projects; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view materials in their projects" ON public.materials FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.projects
  WHERE ((projects.id = materials.project_id) AND ((projects.created_by = auth.uid()) OR public.has_role(auth.uid(), 'admin'::public.app_role) OR (EXISTS ( SELECT 1
           FROM public.team_members
          WHERE ((team_members.project_id = projects.id) AND (team_members.user_id = auth.uid())))))))));


--
-- Name: project_kpis Users can view project KPIs in their projects; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view project KPIs in their projects" ON public.project_kpis FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.projects
  WHERE ((projects.id = project_kpis.project_id) AND ((projects.created_by = auth.uid()) OR public.has_role(auth.uid(), 'admin'::public.app_role) OR (EXISTS ( SELECT 1
           FROM public.team_members
          WHERE ((team_members.project_id = projects.id) AND (team_members.user_id = auth.uid())))))))));


--
-- Name: project_items Users can view project items in their projects; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view project items in their projects" ON public.project_items FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.projects
  WHERE ((projects.id = project_items.project_id) AND ((projects.created_by = auth.uid()) OR public.has_role(auth.uid(), 'admin'::public.app_role) OR (EXISTS ( SELECT 1
           FROM public.team_members
          WHERE ((team_members.project_id = projects.id) AND (team_members.user_id = auth.uid())))))))));


--
-- Name: projects Users can view projects they're involved in; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view projects they're involved in" ON public.projects FOR SELECT USING (((auth.uid() = created_by) OR public.has_role(auth.uid(), 'admin'::public.app_role) OR public.is_team_member(auth.uid(), id)));


--
-- Name: client_requirements Users can view requirements in their projects; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view requirements in their projects" ON public.client_requirements FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.projects
  WHERE ((projects.id = client_requirements.project_id) AND ((projects.created_by = auth.uid()) OR public.has_role(auth.uid(), 'admin'::public.app_role) OR (EXISTS ( SELECT 1
           FROM public.team_members
          WHERE ((team_members.project_id = projects.id) AND (team_members.user_id = auth.uid())))))))));


--
-- Name: tasks Users can view tasks in their projects; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view tasks in their projects" ON public.tasks FOR SELECT USING (public.user_can_access_project(auth.uid(), project_id));


--
-- Name: team_members Users can view team members in their projects; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view team members in their projects" ON public.team_members FOR SELECT USING ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.is_project_owner(auth.uid(), project_id) OR (user_id = auth.uid())));


--
-- Name: asset_allocations Users can view their allocations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their allocations" ON public.asset_allocations FOR SELECT USING (((auth.uid() = allocated_to) OR public.has_role(auth.uid(), 'admin'::public.app_role)));


--
-- Name: notifications Users can view their own notifications; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own notifications" ON public.notifications FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: user_permissions Users can view their own permissions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own permissions" ON public.user_permissions FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: accounting_transactions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.accounting_transactions ENABLE ROW LEVEL SECURITY;

--
-- Name: asset_allocations; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.asset_allocations ENABLE ROW LEVEL SECURITY;

--
-- Name: asset_disposals; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.asset_disposals ENABLE ROW LEVEL SECURITY;

--
-- Name: asset_location_history; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.asset_location_history ENABLE ROW LEVEL SECURITY;

--
-- Name: asset_master_data; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.asset_master_data ENABLE ROW LEVEL SECURITY;

--
-- Name: brands; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.brands ENABLE ROW LEVEL SECURITY;

--
-- Name: client_requirements; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.client_requirements ENABLE ROW LEVEL SECURITY;

--
-- Name: contract_guarantees; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.contract_guarantees ENABLE ROW LEVEL SECURITY;

--
-- Name: contracts; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.contracts ENABLE ROW LEVEL SECURITY;

--
-- Name: depreciation_schedules; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.depreciation_schedules ENABLE ROW LEVEL SECURITY;

--
-- Name: employees; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;

--
-- Name: goods_receipt_notes; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.goods_receipt_notes ENABLE ROW LEVEL SECURITY;

--
-- Name: grn_items; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.grn_items ENABLE ROW LEVEL SECURITY;

--
-- Name: handover_slips; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.handover_slips ENABLE ROW LEVEL SECURITY;

--
-- Name: inventory_items; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.inventory_items ENABLE ROW LEVEL SECURITY;

--
-- Name: maintenance_records; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.maintenance_records ENABLE ROW LEVEL SECURITY;

--
-- Name: materials; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.materials ENABLE ROW LEVEL SECURITY;

--
-- Name: notifications; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

--
-- Name: product_categories; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.product_categories ENABLE ROW LEVEL SECURITY;

--
-- Name: product_groups; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.product_groups ENABLE ROW LEVEL SECURITY;

--
-- Name: profiles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

--
-- Name: project_items; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.project_items ENABLE ROW LEVEL SECURITY;

--
-- Name: project_kpis; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.project_kpis ENABLE ROW LEVEL SECURITY;

--
-- Name: projects; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

--
-- Name: tasks; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

--
-- Name: team_members; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;

--
-- Name: user_permissions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.user_permissions ENABLE ROW LEVEL SECURITY;

--
-- Name: user_roles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

--
-- PostgreSQL database dump complete
--


