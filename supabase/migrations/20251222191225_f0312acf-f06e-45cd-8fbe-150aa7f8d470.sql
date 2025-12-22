-- Enable realtime for content table (for video uploads)
ALTER PUBLICATION supabase_realtime ADD TABLE public.content;

-- Enable realtime for content_comments table (for new comments)
ALTER PUBLICATION supabase_realtime ADD TABLE public.content_comments;

-- Set replica identity to full for better change tracking
ALTER TABLE public.content REPLICA IDENTITY FULL;
ALTER TABLE public.content_comments REPLICA IDENTITY FULL;