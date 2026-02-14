-- Fix task update policy: any authenticated user (staff, admin, receptionist) can update task status
-- In a hospital setting, any team member should be able to mark tasks as in_progress or completed
DROP POLICY IF EXISTS "Users can update tasks" ON public.tasks;
CREATE POLICY "Users can update tasks" ON public.tasks
  FOR UPDATE TO authenticated
  USING (true);

-- Also allow staff to update beds (view-only status for staff, but all roles should at least see beds)
-- Keep beds update restricted to admin/receptionist (this is already correct)

-- Make audio_notices update more permissive so the processing status can be reflected
DROP POLICY IF EXISTS "Staff and admin can update audio notices" ON public.audio_notices;
CREATE POLICY "Authenticated users can update audio notices" ON public.audio_notices
  FOR UPDATE TO authenticated
  USING (true);
