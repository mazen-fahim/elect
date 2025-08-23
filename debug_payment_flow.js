// Debug script to check localStorage state
console.log('=== Payment Flow Debug ===');

// Check all localStorage keys
console.log('localStorage keys:');
for (let i = 0; i < localStorage.length; i++) {
  const key = localStorage.key(i);
  const value = localStorage.getItem(key);
  console.log(`${key}: ${value?.length > 100 ? value.substring(0, 100) + '...' : value}`);
}

// Check specific payment-related items
console.log('\n=== Payment-specific items ===');
const afterPayment = localStorage.getItem('afterPaymentCreateElection');
const pendingData = localStorage.getItem('pendingElectionData');
const plannedVoters = localStorage.getItem('plannedVoters');

console.log('afterPaymentCreateElection:', afterPayment);
console.log('pendingElectionData exists:', !!pendingData);
console.log('pendingElectionData length:', pendingData?.length || 0);
console.log('plannedVoters:', plannedVoters);

if (pendingData) {
  try {
    const parsed = JSON.parse(pendingData);
    console.log('pendingElectionData keys:', Object.keys(parsed));
    console.log('method:', parsed.method);
    console.log('title:', parsed.title);
    if (parsed.method === 'csv') {
      console.log('candidatesFile exists:', !!parsed.candidatesFile);
      console.log('votersFile exists:', !!parsed.votersFile);
    }
  } catch (e) {
    console.error('Error parsing pendingElectionData:', e);
  }
}

// Check sessionStorage
console.log('\n=== SessionStorage ===');
const electionCreated = sessionStorage.getItem('electionCreated');
const orgId = sessionStorage.getItem('orgId');
console.log('electionCreated:', electionCreated);
console.log('orgId:', orgId);
