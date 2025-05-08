
import {
  collection,
  addDoc,
  setDoc,
  doc,
  serverTimestamp,
  writeBatch,
  getDoc,
  Timestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { User, Conversation, Message, ParticipantInfo } from '@/types';

// Function to generate a deterministic conversation ID
export function getConversationId(uid1: string, uid2: string): string {
  return [uid1, uid2].sort().join('_');
}

// Function to send a message and update/create the conversation document
export async function sendMessage(
  sender: User,
  receiver: User,
  text: string
): Promise<void> {
  if (!sender?.uid || !receiver?.uid || !text.trim()) {
    throw new Error('Invalid arguments for sendMessage');
  }

  const conversationId = getConversationId(sender.uid, receiver.uid);
  const conversationRef = doc(db, 'conversations', conversationId);
  const messagesRef = collection(db, 'conversations', conversationId, 'messages');
  const now = serverTimestamp();

  console.log(`sendMessage: Sending message from ${sender.uid} to ${receiver.uid} in conversation ${conversationId}`);

  const newMessage: Omit<Message, 'id' | 'timestamp'> & { timestamp: any } = {
    conversationId: conversationId,
    senderUid: sender.uid,
    receiverUid: receiver.uid,
    text: text.trim(),
    timestamp: now,
  };

  const conversationDataUpdate = {
    participants: [sender.uid, receiver.uid],
     // Include basic info for quick display in conversation list
     participantInfo: {
      [sender.uid]: {
        fullName: sender.fullName,
        profileImageUrl: sender.profileImageUrl || '',
      },
      [receiver.uid]: {
        fullName: receiver.fullName,
        profileImageUrl: receiver.profileImageUrl || '',
      },
    },
    lastMessage: {
      text: text.trim(),
      senderUid: sender.uid,
      timestamp: now,
    },
    lastUpdatedAt: now,
  };

  try {
    const batch = writeBatch(db);

    // 1. Add the new message document to the subcollection
    const newMessageRef = doc(collection(db, 'conversations', conversationId, 'messages')); // Generate ref beforehand
    batch.set(newMessageRef, newMessage);
    console.log("sendMessage: Message added to batch.");

    // 2. Update (or create if it doesn't exist) the conversation document
    // Use set with merge:true to create if not exists, or update if exists
    batch.set(conversationRef, conversationDataUpdate, { merge: true });
    console.log("sendMessage: Conversation update added to batch.");

    // 3. Commit the batch
    await batch.commit();
    console.log(`sendMessage: Batch committed successfully for conversation ${conversationId}.`);

  } catch (error) {
    console.error(`sendMessage: Error sending message or updating conversation ${conversationId}:`, error);
    // Consider more specific error handling if needed
    throw new Error(`Failed to send message: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// Optional: Function to fetch participant details if needed separately
// (This might not be necessary if participantInfo is stored in the conversation doc)
export async function getUserDetails(uid: string): Promise<ParticipantInfo | null> {
    if (!uid) return null;
    try {
        const userDocRef = doc(db, "users", uid);
        const userDoc = await getDoc(userDocRef);
        if (userDoc.exists()) {
            const data = userDoc.data();
            return {
                fullName: data.fullName || 'Unknown User',
                profileImageUrl: data.profileImageUrl || '',
            };
        }
        return null;
    } catch (error) {
        console.error(`Error fetching details for user ${uid}:`, error);
        return null; // Return null on error
    }
}
