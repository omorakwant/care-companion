
-- Tighten audio_notices update to only staff/admin
DROP POLICY "System can update audio notices" ON public.audio_notices;
CREATE POLICY "Staff and admin can update audio notices" ON public.audio_notices FOR UPDATE TO authenticated 
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff'));

-- Tighten patients update to staff/admin  
DROP POLICY "Staff and admin can update patients" ON public.patients;
CREATE POLICY "Staff and admin can update patients" ON public.patients FOR UPDATE TO authenticated 
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff') OR public.has_role(auth.uid(), 'receptionist'));

-- Tighten tasks update to assigned user or creator or admin
DROP POLICY "Users can update tasks" ON public.tasks;
CREATE POLICY "Users can update tasks" ON public.tasks FOR UPDATE TO authenticated 
USING (auth.uid() = assigned_to OR auth.uid() = created_by OR public.has_role(auth.uid(), 'admin'));
