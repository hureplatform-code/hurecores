/**
 * Script to delete "Comp Off" leave type AND related entitlements from all existing organizations
 * 
 * Run this once with: npx ts-node scripts/deleteCompOff.ts
 * Or add to package.json: "cleanup:compoff": "ts-node scripts/deleteCompOff.ts"
 */

import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, query, where, deleteDoc, doc } from 'firebase/firestore';

// Firebase config (same as your app)
const firebaseConfig = {
  apiKey: "AIzaSyBxhGpBaFxwQkV_mGsVrH9txGHdDjNbhPc",
  authDomain: "hure-core.firebaseapp.com",
  projectId: "hure-core",
  storageBucket: "hure-core.firebasestorage.app",
  messagingSenderId: "131aborede472",
  appId: "1:131472:web:xyz"
};

async function deleteCompOffFromAllOrgs() {
  console.log('🚀 Starting Comp Off cleanup...\n');
  
  const app = initializeApp(firebaseConfig);
  const db = getFirestore(app);
  
  try {
    // Get all organizations
    const orgsSnapshot = await getDocs(collection(db, 'organizations'));
    console.log(`Found ${orgsSnapshot.size} organizations\n`);
    
    let deletedTypesCount = 0;
    let deletedEntitlementsCount = 0;
    
    for (const orgDoc of orgsSnapshot.docs) {
      const orgId = orgDoc.id;
      const orgName = orgDoc.data().name || orgId;
      
      // 1. Find and delete "Comp Off" leave type
      const leaveTypesRef = collection(db, `organizations/${orgId}/leaveTypes`);
      const compOffQuery = query(leaveTypesRef, where('name', '==', 'Comp Off'));
      const compOffSnapshot = await getDocs(compOffQuery);
      
      let compOffTypeId: string | null = null;
      
      if (!compOffSnapshot.empty) {
        for (const leaveTypeDoc of compOffSnapshot.docs) {
          compOffTypeId = leaveTypeDoc.id;
          await deleteDoc(doc(db, `organizations/${orgId}/leaveTypes/${leaveTypeDoc.id}`));
          console.log(`✅ Deleted "Comp Off" leave type from: ${orgName}`);
          deletedTypesCount++;
        }
      }
      
      // 2. Delete all leave entitlements that reference "Comp Off" (by leaveTypeId or name)
      const entitlementsRef = collection(db, `organizations/${orgId}/leaveEntitlements`);
      const entitlementsSnapshot = await getDocs(entitlementsRef);
      
      for (const entDoc of entitlementsSnapshot.docs) {
        const entData = entDoc.data();
        // Check if this entitlement is for Comp Off (by ID or by name stored in entitlement)
        if (entData.leaveTypeId === compOffTypeId || 
            entData.leaveTypeName === 'Comp Off' ||
            entData.name === 'Comp Off') {
          await deleteDoc(doc(db, `organizations/${orgId}/leaveEntitlements/${entDoc.id}`));
          console.log(`  🗑️  Deleted Comp Off entitlement for staff: ${entData.staffId || 'unknown'}`);
          deletedEntitlementsCount++;
        }
      }
    }
    
    console.log(`\n✨ Done!`);
    console.log(`   - Deleted ${deletedTypesCount} "Comp Off" leave type(s)`);
    console.log(`   - Deleted ${deletedEntitlementsCount} staff entitlement(s)`);
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
  
  process.exit(0);
}

deleteCompOffFromAllOrgs();
