-- Add UPDATE policy for kiwify_subscriptions (users can only update their own subscriptions)
CREATE POLICY "Users can update their own kiwify subscriptions"
ON public.kiwify_subscriptions
AS PERMISSIVE
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

-- Add DELETE policy for kiwify_subscriptions (users can only delete their own subscriptions)
CREATE POLICY "Users can delete their own kiwify subscriptions"
ON public.kiwify_subscriptions
AS PERMISSIVE
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);