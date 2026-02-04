
import * as admin from 'firebase-admin';
import * as fs from 'fs';
import * as path from 'path';

// --- CONFIGURATION ---
const SERVICE_ACCOUNT_PATH = './serviceAccountKey.json'; // Path to your service account key
const PRESERVED_EMAILS = [
    'appssignin01@gmail.com',
    'idthe3tree@gmail.com', // Potential superadmin (verify this!)
    'barathanand2004@gmail.com' // Potential superadmin (verify this!)
];

// Set to false to ACTUALLY DELETE data.
// KEPT TRUE BY DEFAULT FOR SAFETY.
const DRY_RUN = true;

// Collections to clean up. 
// 'users' is handled specially (by ID). 
// Others are WIPED completely (except logic you might add).
const COLLECTIONS_TO_WIPE = [
    'organizations',
    'auditLogs',
    'notifications',
    'staff',
    'therapists',
    // Add other collections here
];
// ---------------------

async function main() {
    console.log(`Starting cleanup script... (DRY_RUN: ${DRY_RUN})`);

    if (!fs.existsSync(SERVICE_ACCOUNT_PATH)) {
        console.error(`Error: Service account key not found at ${SERVICE_ACCOUNT_PATH}`);
        console.error('Please download it from Firebase Console -> Project Settings -> Service Accounts');
        process.exit(1);
    }

    const serviceAccount = JSON.parse(fs.readFileSync(SERVICE_ACCOUNT_PATH, 'utf8'));

    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });

    const auth = admin.auth();
    const db = admin.firestore();

    // 1. Resolve Preserved UIDs
    console.log('\n--- Resolving Preserved Users ---');
    const preservedUids: string[] = [];
    for (const email of PRESERVED_EMAILS) {
        try {
            const user = await auth.getUserByEmail(email);
            preservedUids.push(user.uid);
            console.log(`Found preserved user: ${email} -> ${user.uid}`);
        } catch (error: any) {
            if (error.code === 'auth/user-not-found') {
                console.warn(`Warning: Preserved user email not found: ${email}`);
            } else {
                console.error(`Error fetching user ${email}:`, error);
            }
        }
    }

    // 2. Clean Authentication
    console.log('\n--- Cleaning Authentication ---');
    let nextPageToken;
    do {
        const listUsersResult = await auth.listUsers(1000, nextPageToken);
        const usersToDelete = listUsersResult.users
            .filter(user => !preservedUids.includes(user.uid))
            .map(user => user.uid);

        if (usersToDelete.length > 0) {
            console.log(`Found ${usersToDelete.length} users to delete in this batch.`);
            if (!DRY_RUN) {
                const deleteResult = await auth.deleteUsers(usersToDelete);
                console.log(`Deleted ${deleteResult.successCount} users.`);
                if (deleteResult.failureCount > 0) {
                    console.error(`Failed to delete ${deleteResult.failureCount} users:`, deleteResult.errors);
                }
            } else {
                console.log(`[DRY RUN] Would delete users: ${usersToDelete.join(', ')}`);
            }
        } else {
            console.log('No users to delete in this batch.');
        }

        nextPageToken = listUsersResult.pageToken;
    } while (nextPageToken);


    // 3. Clean Firestore - "users" Collection
    console.log('\n--- Cleaning Firestore "users" Collection ---');
    const usersSnapshot = await db.collection('users').get();
    let usersDeleted = 0;
    const batchSize = 500;
    let batch = db.batch();
    let batchCount = 0;

    for (const doc of usersSnapshot.docs) {
        if (!preservedUids.includes(doc.id)) { // Assuming doc ID is the UID
            if (!DRY_RUN) {
                batch.delete(doc.ref);
                batchCount++;
                if (batchCount >= batchSize) {
                    await batch.commit();
                    batch = db.batch();
                    batchCount = 0;
                }
            } else {
                // console.log(`[DRY RUN] Would delete user profile: ${doc.id}`);
            }
            usersDeleted++;
        } else {
            console.log(`Skipping preserved user profile: ${doc.id}`);
        }
    }

    if (!DRY_RUN && batchCount > 0) {
        await batch.commit();
    }
    console.log(`${DRY_RUN ? '[DRY RUN] Would delete' : 'Deleted'} ${usersDeleted} user profiles.`);

    // 4. Clean Other Collections
    console.log('\n--- Cleaning Other Collections ---');
    for (const collectionName of COLLECTIONS_TO_WIPE) {
        console.log(`Processing collection: ${collectionName}`);
        const snapshot = await db.collection(collectionName).get();
        if (snapshot.empty) {
            console.log(`  (Empty)`);
            continue;
        }

        let deletedCount = 0;
        let collBatch = db.batch();
        let collBatchCount = 0;

        for (const doc of snapshot.docs) {
            // Add custom logic here if you need to preserve specific organizations, etc.
            // For now, we WIPE everything in these collections.

            if (!DRY_RUN) {
                collBatch.delete(doc.ref);
                collBatchCount++;
                if (collBatchCount >= batchSize) {
                    await collBatch.commit();
                    collBatch = db.batch();
                    collBatchCount = 0;
                }
            }
            deletedCount++;
        }

        if (!DRY_RUN && collBatchCount > 0) {
            await collBatch.commit();
        }
        console.log(`  ${DRY_RUN ? '[DRY RUN] Would delete' : 'Deleted'} ${deletedCount} documents.`);
    }

    console.log('\n--- Cleanup Complete ---');
}

main().catch(console.error);
