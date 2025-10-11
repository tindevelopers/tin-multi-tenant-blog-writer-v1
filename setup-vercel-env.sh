#!/bin/bash

echo "🔧 Setting up Vercel environment variables..."

# Set environment variables for Vercel
echo "Setting NEXT_PUBLIC_SUPABASE_URL..."
vercel env add NEXT_PUBLIC_SUPABASE_URL production <<< "https://edtxtpqrfpxeogukfunq.supabase.co"

echo "Setting NEXT_PUBLIC_SUPABASE_ANON_KEY..."
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY production <<< "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVkdHh0cHFyZnB4ZW9ndWtmdW5xIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgxMTU5NTcsImV4cCI6MjA3MzY5MTk1N30.viyecHpzThDCp0JivzOsFpYbQCwoRMeVgEjcIgFuHBg"

echo "Setting SUPABASE_SERVICE_ROLE_KEY..."
vercel env add SUPABASE_SERVICE_ROLE_KEY production <<< "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVkdHh0cHFyZnB4ZW9ndWtmdW5xIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1ODExNTk1NywiZXhwIjoyMDczNjkxOTU3fQ.QW7ox0NJ6V_1VtNEMFRSr9x44NY6JF1TA_7SnKRP600"

echo "Setting NEXT_PUBLIC_APP_URL..."
vercel env add NEXT_PUBLIC_APP_URL production <<< "https://tin-multi-tenant-blog-writer-v1.vercel.app"

echo "✅ All environment variables set successfully!"
