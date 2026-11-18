import firestore from "./firebase.js";

async function checkFirebase(): Promise<void> {
    try {
        await firestore.listCollections();

        console.log("Firebase Firestore connection successful!");
    } catch (error) {
        console.error("Firebase connection failed:", error);
    }
}

checkFirebase();