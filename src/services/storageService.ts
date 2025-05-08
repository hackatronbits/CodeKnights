import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, auth, getFirebaseServices } from "@/lib/firebase"; // Ensure storage is initialized and potentially exported from firebase.ts
import { v4 as uuidv4 } from 'uuid'; // Use UUID for unique filenames

// Ensure Firebase services are ready
function checkFirebaseReady() {
    const { storage: currentStorage, error: initErr } = getFirebaseServices();
    if (initErr || !currentStorage) {
        const message = initErr || "Firebase Storage service is unavailable.";
        console.error("Storage Service Error:", message);
        throw new Error(message);
    }
    return { storage: currentStorage };
}

/**
 * Uploads a profile picture to Firebase Storage.
 * @param userId - The UID of the user.
 * @param file - The image File object to upload.
 * @returns Promise<string> - Resolves with the public download URL of the uploaded image.
 */
export async function uploadProfilePicture(userId: string, file: File): Promise<string> {
    const { storage } = checkFirebaseReady();

    if (!userId || !file) {
        throw new Error("User ID and file are required for upload.");
    }

    // Generate a unique filename using UUID and preserve original extension
    const fileExtension = file.name.split('.').pop();
    const uniqueFilename = `${uuidv4()}.${fileExtension}`;
    const storagePath = `profilePictures/${userId}/${uniqueFilename}`;
    const storageRef = ref(storage, storagePath);

    console.log(`Uploading profile picture to: ${storagePath}`);

    try {
        // Upload the file
        const snapshot = await uploadBytes(storageRef, file);
        console.log('Uploaded a blob or file!', snapshot);

        // Get the download URL
        const downloadURL = await getDownloadURL(snapshot.ref);
        console.log('File available at', downloadURL);
        return downloadURL;

    } catch (error: any) {
        console.error("Upload failed:", error);
        // Handle specific storage errors if needed
        // See: https://firebase.google.com/docs/storage/web/handle-errors
        throw new Error(`Failed to upload profile picture: ${error.message}`);
    }
}

// Future: Add a function to delete an old profile picture if needed
// export async function deleteProfilePicture(userId: string, filename: string): Promise<void> { ... }