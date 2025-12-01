#!/bin/bash

# Setup Test Environment Variables
# This script helps you configure the .env.local file for testing

set -e

echo "🔧 Multi-Content-Type Test Environment Setup"
echo "=============================================="
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check if .env.local exists
if [ ! -f .env.local ]; then
    echo -e "${RED}❌ .env.local not found!${NC}"
    echo ""
    echo "Would you like to create .env.local from .env.example? (y/n)"
    read -r create_env
    
    if [ "$create_env" = "y" ]; then
        if [ -f .env.example ]; then
            cp .env.example .env.local
            echo -e "${GREEN}✅ Created .env.local from .env.example${NC}"
        else
            echo -e "${RED}❌ .env.example not found. Creating basic .env.local...${NC}"
            cat > .env.local << 'EOF'
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# App Configuration
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_API_URL=http://localhost:3000
EOF
            echo -e "${GREEN}✅ Created basic .env.local${NC}"
        fi
    else
        echo -e "${RED}❌ Cannot proceed without .env.local${NC}"
        exit 1
    fi
fi

echo ""
echo -e "${BLUE}Checking required environment variables...${NC}"
echo ""

# Load current .env.local
source .env.local 2>/dev/null || true

# Check each required variable
MISSING_VARS=()

check_var() {
    var_name=$1
    var_value=${!var_name}
    
    if [ -z "$var_value" ] || [ "$var_value" = "your-project-id.supabase.co" ] || [[ "$var_value" == *"your-"* ]]; then
        echo -e "${RED}❌ $var_name is not set${NC}"
        MISSING_VARS+=("$var_name")
        return 1
    else
        echo -e "${GREEN}✅ $var_name is set${NC}"
        return 0
    fi
}

# Check required variables
echo "Required for testing:"
check_var "NEXT_PUBLIC_SUPABASE_URL"
check_var "NEXT_PUBLIC_SUPABASE_ANON_KEY"
check_var "SUPABASE_SERVICE_ROLE_KEY"

echo ""

if [ ${#MISSING_VARS[@]} -gt 0 ]; then
    echo -e "${YELLOW}⚠️  Missing ${#MISSING_VARS[@]} required variable(s)${NC}"
    echo ""
    echo -e "${BLUE}To get these values:${NC}"
    echo "1. Go to your Supabase Dashboard"
    echo "2. Select your project"
    echo "3. Go to: Project Settings → API"
    echo ""
    echo -e "${YELLOW}Then add these to your .env.local file:${NC}"
    for var in "${MISSING_VARS[@]}"; do
        echo "  - $var"
    done
    echo ""
    echo -e "${BLUE}Example .env.local:${NC}"
    cat << 'EOF'
NEXT_PUBLIC_SUPABASE_URL=https://abcdefghijklmnop.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
EOF
    echo ""
    exit 1
else
    echo -e "${GREEN}✅ All required variables are set!${NC}"
    echo ""
    echo -e "${BLUE}You can now run tests:${NC}"
    echo "  npm run test:multi-content-type"
    echo ""
fi

