#!/bin/bash

# Script to update local .env files with new Supabase password
# Usage: ./update-local-env.sh "your_new_password_here"

if [ -z "$1" ]; then
  echo "Error: Please provide the new database password as an argument"
  echo "Usage: ./update-local-env.sh \"your_new_password_here\""
  exit 1
fi

NEW_PASSWORD="$1"

# Escape special characters for sed
ESCAPED_PASSWORD=$(printf '%s\n' "$NEW_PASSWORD" | sed 's:[][\/.^$*]:\\&:g')

echo "Updating .env files with new database password..."

# Update .env
if [ -f ".env" ]; then
  sed -i "s/Dare_Care_2026/$ESCAPED_PASSWORD/g" .env
  echo "✓ Updated .env"
fi

# Update .env.local
if [ -f ".env.local" ]; then
  sed -i "s/Dare_Care_2026/$ESCAPED_PASSWORD/g" .env.local
  echo "✓ Updated .env.local"
fi

# Update .env.migrate
if [ -f ".env.migrate" ]; then
  sed -i "s/Dare_Care_2026/$ESCAPED_PASSWORD/g" .env.migrate
  echo "✓ Updated .env.migrate"
fi

# Update .env.production (local copy - not used in Vercel)
if [ -f ".env.production" ]; then
  sed -i "s/Dare_Care_2026/$ESCAPED_PASSWORD/g" .env.production
  echo "✓ Updated .env.production"
fi

echo ""
echo "✅ All local .env files updated successfully!"
echo ""
echo "⚠️  IMPORTANT: These are LOCAL files only."
echo "    Make sure you've also updated:"
echo "    - Vercel Environment Variables (Production)"
echo "    - Any other deployment environments"
echo ""
echo "Next steps:"
echo "  1. Test local development: npm run dev"
echo "  2. Deploy to Vercel: vercel --prod"
