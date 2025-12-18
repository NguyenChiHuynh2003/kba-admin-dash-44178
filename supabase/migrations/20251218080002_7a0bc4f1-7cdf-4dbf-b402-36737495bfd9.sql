-- Create project_items table
CREATE TABLE public.project_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  item_name TEXT NOT NULL,
  description TEXT,
  quantity NUMERIC NOT NULL DEFAULT 1,
  unit TEXT NOT NULL DEFAULT 'cái',
  unit_price NUMERIC NOT NULL DEFAULT 0,
  total_price NUMERIC NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending',
  completion_percentage NUMERIC NOT NULL DEFAULT 0,
  start_date DATE,
  end_date DATE,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create project_kpis table
CREATE TABLE public.project_kpis (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  kpi_name TEXT NOT NULL,
  description TEXT,
  target_value NUMERIC NOT NULL DEFAULT 100,
  current_value NUMERIC NOT NULL DEFAULT 0,
  unit TEXT NOT NULL DEFAULT '%',
  weight NUMERIC NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'pending',
  due_date DATE,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.project_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_kpis ENABLE ROW LEVEL SECURITY;

-- RLS policies for project_items
CREATE POLICY "Users can view items in their projects" ON public.project_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM projects 
      WHERE projects.id = project_items.project_id 
      AND (projects.created_by = auth.uid() OR has_role(auth.uid(), 'admin'::app_role) OR is_project_team_member(auth.uid(), projects.id))
    )
  );

CREATE POLICY "Project owners can manage items" ON public.project_items
  FOR ALL USING (
    has_role(auth.uid(), 'admin'::app_role) OR
    EXISTS (SELECT 1 FROM projects WHERE projects.id = project_items.project_id AND projects.created_by = auth.uid())
  );

-- RLS policies for project_kpis
CREATE POLICY "Users can view KPIs in their projects" ON public.project_kpis
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM projects 
      WHERE projects.id = project_kpis.project_id 
      AND (projects.created_by = auth.uid() OR has_role(auth.uid(), 'admin'::app_role) OR is_project_team_member(auth.uid(), projects.id))
    )
  );

CREATE POLICY "Project owners can manage KPIs" ON public.project_kpis
  FOR ALL USING (
    has_role(auth.uid(), 'admin'::app_role) OR
    EXISTS (SELECT 1 FROM projects WHERE projects.id = project_kpis.project_id AND projects.created_by = auth.uid())
  );

-- Create triggers for updated_at
CREATE TRIGGER update_project_items_updated_at
  BEFORE UPDATE ON public.project_items
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_project_kpis_updated_at
  BEFORE UPDATE ON public.project_kpis
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();