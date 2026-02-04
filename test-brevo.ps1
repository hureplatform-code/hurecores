# Quick Diagnostic: Check if Brevo Email is Working

Write-Host "🔍 Testing Brevo Email API..." -ForegroundColor Cyan
Write-Host ""

$apiKey = "your-brevo-api-key-here"
$senderEmail = "theboysofficialone@gmail.com"
$testEmail = "clientfiver6@gmail.com"

$body = @{
    sender = @{
        name = "HURE Core Test"
        email = $senderEmail
    }
    to = @(
        @{
            email = $testEmail
            name = "Test User"
        }
    )
    subject = "HURE Core - Email Test"
    htmlContent = "<h1>✅ Email is Working!</h1><p>If you received this, your Brevo configuration is correct.</p>"
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri "https://api.brevo.com/v3/smtp/email" `
        -Method Post `
        -Headers @{
            "accept" = "application/json"
            "api-key" = $apiKey
            "content-type" = "application/json"
        } `
        -Body $body

    Write-Host "✅ SUCCESS! Email sent" -ForegroundColor Green
    Write-Host "Message ID: $($response.messageId)" -ForegroundColor Green
    Write-Host ""
    Write-Host "📧 Check your inbox: $testEmail" -ForegroundColor Yellow
} catch {
    Write-Host "❌ FAILED!" -ForegroundColor Red
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host ""
    Write-Host "Response:" -ForegroundColor Yellow
    Write-Host $_.ErrorDetails.Message -ForegroundColor Red
}

Write-Host ""
Write-Host "Press any key to continue..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
