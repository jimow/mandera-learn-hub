-- Create enum for class level
CREATE TYPE public.class_level AS ENUM ('pp1', 'pp2');

-- Add class_level column to students table
ALTER TABLE public.students 
ADD COLUMN class_level public.class_level DEFAULT 'pp1';