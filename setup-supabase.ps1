# HURE Core - Supabase Setup Script
Write-Host "🚀 HURE Core - Supabase Setup" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""

# Step 1: Run Migration
Write-Host "📋 Step 1: Run OTP Verification Migration" -ForegroundColor Yellow
Write-Host ""
Write-Host "1. Open Supabase SQL Editor:" -ForegroundColor White
Write-Host "   https://hjridosuleevyjjeirbv.supabase.co/project/default/sql/new" -ForegroundColor Blue
Write-Host ""
Write-Host "2. Copy the contents of:" -ForegroundColor White
Write-Host "   supabase/migrations/003_otp_verification.sql" -ForegroundColor Green
Write-Host ""
$migrationPath = ".\supabase\migrations\003_otp_verification.sql"
if (Test-Path $migrationPath) {
    Write-Host "📄 Migration file found. Opening..." -ForegroundColor Green
    Start-Process notepad $migrationPath
} else {
    Write-Host "⚠️  Migration file not found at: $migrationPath" -ForegroundColor Red
}
Write-Host ""
Read-Host "Press Enter after running the migration in Supabase SQL Editor"

# Step 2: Set Environment Variables
Write-Host ""
Write-Host "🔑 Step 2: Set Edge Function Secrets" -ForegroundColor Yellow
Write-Host ""
Write-Host "1. Open Supabase Edge Functions Settings:" -ForegroundColor White
Write-Host "   https://hjridosuleevyjjeirbv.supabase.co/project/default/settings/functions" -ForegroundColor Blue
Write-Host ""
Write-Host "2. Add this secret:" -ForegroundColor White
Write-Host "   Name:  BREVO_API_KEY" -ForegroundColor Green
Write-Host "   Value: your-brevo-api-key-here" -ForegroundColor Green
Write-Host ""
Read-Host "Press Enter after adding the secret"

# Step 3: Deploy Edge Functions
Write-Host ""
Write-Host "☁️  Step 3: Deploy Edge Functions" -ForegroundColor Yellow
Write-Host ""

# Check if Supabase CLI is installed
$supabaseInstalled = Get-Command supabase -ErrorAction SilentlyContinue
if (-not $supabaseInstalled) {
    Write-Host "❌ Supabase CLI not found!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Install it with:" -ForegroundColor White
    Write-Host "  npm install -g supabase" -ForegroundColor Green
    Write-Host ""
    $install = Read-Host "Install now? (y/n)"
    if ($install -eq 'y') {
        npm install -g supabase
    } else {
        Write-Host "Skipping Edge Function deployment" -ForegroundColor Yellow
        exit
    }
}

Write-Host "Logging in to Supabase..." -ForegroundColor Cyan
supabase login

Write-Host ""
Write-Host "Linking to project..." -ForegroundColor Cyan
supabase link --project-ref hjridosuleevyjjeirbv

Write-Host ""
Write-Host "Deploying send-email-otp function..." -ForegroundColor Cyan
supabase functions deploy send-email-otp

Write-Host ""
Write-Host "Deploying verify-email-otp function..." -ForegroundColor Cyan
supabase functions deploy verify-email-otp

Write-Host ""
Write-Host "✅ Deployment Complete!" -ForegroundColor Green
Write-Host ""
Write-Host "📧 Edge Functions URLs:" -ForegroundColor Yellow
Write-Host "  Send OTP:   https://hjridosuleevyjjeirbv.supabase.co/functions/v1/send-email-otp" -ForegroundColor Blue
Write-Host "  Verify OTP: https://hjridosuleevyjjeirbv.supabase.co/functions/v1/verify-email-otp" -ForegroundColor Blue
Write-Host ""
Write-Host "🎉 Your signup flow with OTP verification is ready!" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. Start dev server: npm run dev" -ForegroundColor White
Write-Host "2. Go to: http://localhost:3000/#/signup" -ForegroundColor White
Write-Host "3. Test the complete signup flow" -ForegroundColor White
Write-Host ""
