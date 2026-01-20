import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
const fetch = require("node-fetch");

admin.initializeApp();

// Brevo Configuration
// Ensure you set this via: firebase functions:config:set brevo.key="YOUR_API_KEY"
// For local dev, use runtime config or hardcode temporarily (be careful!)

interface EmailRecipient {
    email: string;
    name?: string;
}

interface SendEmailParams {
    to: EmailRecipient[];
    subject: string;
    htmlContent: string;
    textContent?: string;
    senderName?: string;
    senderEmail?: string;
}

export const sendEmail = functions.https.onCall(async (data: SendEmailParams, context: functions.https.CallableContext) => {
    // Basic Auth Check
    // if (!context.auth) {
    //     throw new functions.https.HttpsError('unauthenticated', 'The function must be called while authenticated.');
    // }

    const { to, subject, htmlContent, textContent, senderName, senderEmail } = data;

    if (!to || !subject || !htmlContent) {
        throw new functions.https.HttpsError('invalid-argument', 'Missing required fields: to, subject, htmlContent');
    }

    // Get API Key from config
    const apiKey = functions.config().brevo?.key || process.env.BREVO_API_KEY;

    if (!apiKey) {
        console.error("BREVO_API_KEY is missing in functions config.");
        throw new functions.https.HttpsError('internal', 'Email service not configured correctly.');
    }

    try {
        const response = await fetch('https://api.brevo.com/v3/smtp/email', {
            method: 'POST',
            headers: {
                'accept': 'application/json',
                'api-key': apiKey,
                'content-type': 'application/json'
            },
            body: JSON.stringify({
                sender: {
                    name: senderName || 'HURE Core',
                    email: senderEmail || 'noreply@gethure.com'
                },
                to: to,
                subject: subject,
                htmlContent: htmlContent,
                textContent: textContent
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Brevo API error:', errorText);
            throw new functions.https.HttpsError('internal', `Brevo API error: ${response.statusText}`);
        }

        const responseData = await response.json();
        return { success: true, data: responseData };

    } catch (error) {
        console.error('Error sending email:', error);
        throw new functions.https.HttpsError('internal', 'Failed to send email.');
    }
});

// Simple OTP Generation and Sending
export const sendOTP = functions.https.onCall(async (data: { email: string; firstName?: string }, context: functions.https.CallableContext) => {
    const { email, firstName } = data;
    if (!email) {
        throw new functions.https.HttpsError('invalid-argument', 'Email is required.');
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = admin.firestore.Timestamp.fromMillis(Date.now() + 10 * 60 * 1000); // 10 mins

    try {
        // Store OTP in Firestore
        await admin.firestore().collection('email_otps').add({
            email,
            otp,
            expiresAt,
            verified: false,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            attempts: 0
        });

        // Send OTP via Email (re-using the logic manually to avoid self-call complexity or use a shared helper)
        const apiKey = functions.config().brevo?.key || process.env.BREVO_API_KEY;
        if (!apiKey) throw new Error("BREVO_API_KEY missing");

        await fetch('https://api.brevo.com/v3/smtp/email', {
            method: 'POST',
            headers: {
                'accept': 'application/json',
                'api-key': apiKey,
                'content-type': 'application/json'
            },
            body: JSON.stringify({
                sender: { name: 'HURE Core', email: 'noreply@gethure.com' },
                to: [{ email, name: firstName }],
                subject: 'Your Verification Code',
                htmlContent: `<p>Your code is: <strong>${otp}</strong></p>`
            })
        });

        return { success: true };
    } catch (error) {
        console.error("OTP Error:", error);
        throw new functions.https.HttpsError('internal', 'Failed to send OTP.');
    }
});

export const verifyOTP = functions.https.onCall(async (data: { email: string; otp: string }, context: functions.https.CallableContext) => {
    const { email, otp } = data;
    if (!email || !otp) {
        throw new functions.https.HttpsError('invalid-argument', 'Email and OTP required.');
    }

    const snapshot = await admin.firestore().collection('email_otps')
        .where('email', '==', email)
        .where('verified', '==', false)
        .where('expiresAt', '>', admin.firestore.Timestamp.now())
        .orderBy('expiresAt', 'desc')
        .limit(1)
        .get();

    if (snapshot.empty) {
        throw new functions.https.HttpsError('not-found', 'Invalid or expired OTP.');
    }

    const doc = snapshot.docs[0];
    const record = doc.data();

    if (record.otp !== otp) {
        // Increment attempts?
        await doc.ref.update({ attempts: admin.firestore.FieldValue.increment(1) });
        throw new functions.https.HttpsError('invalid-argument', 'Incorrect OTP.');
    }

    // Mark verified
    await doc.ref.update({ verified: true });

    return { success: true, verified: true };
});
