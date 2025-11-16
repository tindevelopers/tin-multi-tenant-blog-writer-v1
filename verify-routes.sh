#!/bin/bash
echo "=== API Route Verification Script ==="
echo ""

echo "1. Checking route files exist:"
echo "   /api/cloud-run/health:"
[ -f "src/app/api/cloud-run/health/route.ts" ] && echo "   ✅ EXISTS" || echo "   ❌ MISSING"
echo "   /api/keywords/analyze:"
[ -f "src/app/api/keywords/analyze/route.ts" ] && echo "   ✅ EXISTS" || echo "   ❌ MISSING"
echo ""

echo "2. Checking exports:"
echo "   GET /api/cloud-run/health:"
grep -q "export.*GET\|export async function GET" src/app/api/cloud-run/health/route.ts 2>/dev/null && echo "   ✅ EXPORTED" || echo "   ❌ NOT EXPORTED"
echo "   POST /api/keywords/analyze:"
grep -q "export.*POST\|export async function POST" src/app/api/keywords/analyze/route.ts 2>/dev/null && echo "   ✅ EXPORTED" || echo "   ❌ NOT EXPORTED"
echo ""

echo "3. Next.js App Router structure:"
echo "   Routes should be at:"
echo "   - src/app/api/cloud-run/health/route.ts"
echo "   - src/app/api/keywords/analyze/route.ts"
echo ""

echo "4. If routes exist but return 404:"
echo "   - Restart Next.js dev server"
echo "   - Check Vercel deployment includes these files"
echo "   - Verify Next.js version supports App Router (13+)"
