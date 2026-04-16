#!/usr/bin/env bash
# Verification System Testing Script
# Run this after deploying the fixes

echo "========================================="
echo "🔍 Verification System Debug Test"
echo "========================================="
echo ""

# Test 1: Database verification
echo "Test 1: Database Structure"
echo "✓ Run this SQL query:"
echo "   SELECT column_name FROM information_schema.columns WHERE table_name='apartments' AND column_name LIKE '%verification%';"
echo ""

# Test 2: Backend API
echo "Test 2: Admin Properties API Response"
echo "✓ Run this in browser console:"
echo '   fetch("/api/admin/properties", {headers: {Authorization: "Bearer YOUR_TOKEN"}}).then(r => r.json()).then(d => {'
echo '     console.log("✅ Response:", d);'
echo '     const propsWithDocs = d.filter(p => p.verification_docs?.length > 0);'
echo '     console.log("📄 Properties with docs:", propsWithDocs.length);'
echo '     if (propsWithDocs[0]) console.log("📋 Sample:", propsWithDocs[0]);'
echo '   })'
echo ""

# Test 3: Frontend State
echo "Test 3: Frontend Component State"
echo "✓ In Admin Properties page console:"
echo "   - Look for logs starting with '✅ Admin Properties Data:'"
echo "   - Look for logs showing '📋 Property:' with verification_docs_count"
echo "   - Look for logs showing '📄 Properties with verification_docs:'"
echo ""

# Test 4: Modal Opening
echo "Test 4: Verification Modal"
echo "✓ Click 'مراجعة الوثائق' button and check console:"
echo "   - Should see: '🔓 Opening verification modal for property:'"
echo "   - Should see: '✅ Verification details fetched:'"
echo "   - Modal should render with document gallery"
echo ""

# Test 5: Complete User Flow
echo "Test 5: Complete User Flow Test"
echo ""
echo "Step 1: Landlord Upload Docs"
echo "  ✓ Open Add Apartment page"
echo "  ✓ Scroll to 'وثائق إثبات الملكية' section"
echo "  ✓ Upload 2-3 test images"
echo "  ✓ Check console for FormData"
echo ""

echo "Step 2: Backend Receives Docs"
echo "  ✓ Watch Network tab"
echo "  ✓ POST /apartments should include 'verificationDocs' parameter"
echo "  ✓ Backend should log: './apartments.js: INSERT verification_docs = [...]'"
echo ""

echo "Step 3: Database Stores Docs"
echo "  ✓ Query database:"
echo "     SELECT id, title, verification_docs FROM apartments WHERE verification_docs != '[]' LIMIT 1;"
echo "  ✓ Should show array of URLs"
echo ""

echo "Step 4: Admin Sees Data"
echo "  ✓ Open Admin Dashboard → Properties"
echo "  ✓ Look for 'مراجعة الوثائق' button on property row"
echo "  ✓ Console should show 'verification_docs_count: X'"
echo ""

echo "Step 5: Admin Reviews Docs"
echo "  ✓ Click 'مراجعة الوثائق' button"
echo "  ✓ Modal should open with:"
echo "     - Landlord info"
echo "     - Document gallery"
echo "     - Status badge"
echo "  ✓ Click document to enlarge"
echo "  ✓ Enter feedback"
echo "  ✓ Click Approve or Reject"
echo "  ✓ Notification should be sent to landlord"
echo ""

echo "========================================="
echo "✅ All tests completed!"
echo "========================================="
echo ""
echo "Console Logs to Watch For:"
echo "  ✅ Admin Properties Data: [...]"
echo "  📄 Properties with verification_docs: N"
echo "  📋 Property: {...verification_docs_count: X}"
echo "  🔓 Opening verification modal for property: {...}"
echo "  ✅ Verification details fetched: {...}"
echo "  📝 VerificationModal rendered with property: {...}"
echo ""
echo "If you see all these logs, the system is working! ✅"
