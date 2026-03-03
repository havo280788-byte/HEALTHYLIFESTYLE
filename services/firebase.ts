import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc, onSnapshot, query, orderBy, limit, deleteDoc, getDocs } from 'firebase/firestore';
import { LeaderboardEntry } from '../types';

// Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyCC1rwVcOlwAn77lqgJMzXj9ltxrHgJM4M",
    authDomain: "gamehealthylifestyle.firebaseapp.com",
    projectId: "gamehealthylifestyle",
    storageBucket: "gamehealthylifestyle.firebasestorage.app",
    messagingSenderId: "523307722342",
    appId: "1:523307722342:web:5258df47bacd908241efa7"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);

const COLLECTION_NAME = 'leaderboard_healthy_quest';

export const addLeaderboardEntry = async (entry: LeaderboardEntry) => {
    try {
        await addDoc(collection(db, COLLECTION_NAME), entry);
    } catch (e) {
        console.error("Error adding document: ", e);
    }
};

export const subscribeToLeaderboard = (callback: (entries: LeaderboardEntry[]) => void) => {
    // We order by timeSpent asc at the DB level, but we will re-sort 
    // on the client to handle Score DESC then Time ASC.
    const q = query(collection(db, COLLECTION_NAME), limit(100));

    return onSnapshot(q, (snapshot) => {
        const entries: LeaderboardEntry[] = [];
        snapshot.forEach((doc) => {
            entries.push(doc.data() as LeaderboardEntry);
        });

        // Client-side sort: Priority 1: Score (Highest first), Priority 2: Time (Fastest first)
        entries.sort((a, b) => {
            if (b.score !== a.score) {
                return b.score - a.score; // Score Descending
            }
            return a.timeSpent - b.timeSpent; // Time Ascending for same score
        });

        callback(entries);
    });
};

export const resetLeaderboard = async () => {
    try {
        const q = query(collection(db, COLLECTION_NAME));
        const snapshot = await getDocs(q);
        const deletePromises = snapshot.docs.map(doc => deleteDoc(doc.ref));
        await Promise.all(deletePromises);
    } catch (e) {
        console.error("Error resetting leaderboard: ", e);
    }
};
