-- Add write policies for servicos_planos restricted to admin email

-- Policy for INSERT - only admin can add service plans
CREATE POLICY "Admin can insert service plans"
ON public.servicos_planos
FOR INSERT
TO authenticated
WITH CHECK (auth.jwt() ->> 'email' = 'oliveirapaulojoao1@gmail.com');

-- Policy for UPDATE - only admin can update service plans
CREATE POLICY "Admin can update service plans"
ON public.servicos_planos
FOR UPDATE
TO authenticated
USING (auth.jwt() ->> 'email' = 'oliveirapaulojoao1@gmail.com')
WITH CHECK (auth.jwt() ->> 'email' = 'oliveirapaulojoao1@gmail.com');

-- Policy for DELETE - only admin can delete service plans
CREATE POLICY "Admin can delete service plans"
ON public.servicos_planos
FOR DELETE
TO authenticated
USING (auth.jwt() ->> 'email' = 'oliveirapaulojoao1@gmail.com');