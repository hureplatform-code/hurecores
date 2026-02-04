## 📧 BREVO EMAIL NOT WORKING - COMPLETE FIX GUIDE

### ✅ Step 1: Set Edge Function Secret (DONE)
I just ran: `npx supabase secrets set BREVO_API_KEY=...`

### ⚠️ Step 2: VERIFY SENDER EMAIL IN BREVO (CRITICAL!)

**This is likely why emails aren't sending:**

1. **Go to Brevo Senders**: https://app.brevo.com/senders/list

2. **Click "Add a Sender"**

3. **Add this email**: `clientfiver6@gmail.com`
   - Name: `HURE Core`

4. **Verify the email**:
   - Check your Gmail inbox
   - Look for email from Brevo
   - Click the verification link

5. **Wait 5 minutes** for verification to complete

### 🔄 Step 3: After Email is Verified

Run this in PowerShell:
```powershell
cd "d:\hurecore-web(final)\hurecore-web"
npx supabase functions deploy send-email-otp --no-verify-jwt
```

### 🧪 Step 4: Test Again

1. Open: http://localhost:3000/#/signup
2. Fill the form
3. Click "Send Verification Code"
4. **Check your Gmail for the OTP**

---

## 🚨 ALTERNATIVE: Use Pre-Verified Brevo Email

If you can't verify `clientfiver6@gmail.com`, use Brevo's default sender:

1. Check what senders are already verified in Brevo
2. Update the Edge Function to use that email
3. Redeploy

**To check verified senders**: https://app.brevo.com/senders/list

---

## 📊 How to Check Edge Function Logs

If it still doesn't work, check logs:

1. Go to: https://supabase.com/dashboard/project/hjridosuleevyjjeirbv/functions/send-email-otp/logs
2. Look for errors like:
   - "Sender not verified"
   - "API key invalid"
   - "Failed to send email"

---

## ⚡ QUICK TEST

Run this in PowerShell to test if Brevo API works:
```powershell
Start-Process test-brevo-api.html
```

Enter your email and click "Send Test Email". If this works, the issue is in the Edge Function configuration.
