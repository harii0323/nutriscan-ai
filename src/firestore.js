// Isolated Firestore instance for on-demand lazy loading
// Keeps initial homepage bundle free from Firestore SDK overhead
import { getFirestore } from 'firebase/firestore';
import { app, APP_ID } from './firebaseConfig.js';

export const db = getFirestore(app);
export { APP_ID };
export default db;
