
"use client";

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  limit,
  Timestamp,
  DocumentData,
  QuerySnapshot,
  doc,
  getDoc,
  // Removed collectionGroup as it wasn't used here
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Conversation, Message, ParticipantInfo, User } from '@/types'; // Added User
import { useAuth } from '@/contexts/AuthContext';

// Helper to fetch user details for participant info (if not already stored)
// Note: Storing basic info in the conversation doc is more efficient for lists.
async function fetchParticipantDetails(uid: string): Promise<ParticipantInfo | null> {
  try {
    const userDocRef = doc(db, "users", uid);
    const userDoc = await getDoc(userDocRef);
    if (userDoc.exists()) {
      const data = userDoc.data() as User; // Cast to User type
      return {
        fullName: data.fullName || 'Unknown User',
        profileImageUrl: data.profileImageUrl || '',
      };
    }
    console.warn(`fetchParticipantDetails: No user document found for UID: ${uid}`);
    return { fullName: 'Unknown User', profileImageUrl: '' }; // Return default on not found
  } catch (error) {
    console.error(`Error fetching details for user ${uid}:`, error);
    return null; // Return null on error
  }
}


// Hook to get the list of conversations for the current user
export function useUserConversations() {
  const { currentUser } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Keep track of listeners to prevent duplicates or stale listeners
  const unsubscribeRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    // Cleanup previous listener if user changes or component unmounts
    if (unsubscribeRef.current) {
      console.log("useUserConversations: Cleaning up previous listener.");
      unsubscribeRef.current();
      unsubscribeRef.current = null;
    }

    if (!currentUser?.uid) {
      setLoading(false);
      setConversations([]);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);
    console.log(`useUserConversations: Setting up listener for user ${currentUser.uid}`);

    const conversationsRef = collection(db, 'conversations');
    const q = query(
      conversationsRef,
      where('participants', 'array-contains', currentUser.uid),
      orderBy('lastUpdatedAt', 'desc') // Order by last update time
    );

    unsubscribeRef.current = onSnapshot(q,
      async (querySnapshot: QuerySnapshot<DocumentData>) => { // Mark async for potential fetches
        console.log(`useUserConversations: Snapshot received with ${querySnapshot.docs.length} docs.`);
        try {
           const fetchedConversationsPromises = querySnapshot.docs.map(async (docSnap): Promise<Conversation | null> => {
             const data = docSnap.data();
             const participants = data.participants || [];
             let participantInfo = data.participantInfo || {};

             // Ensure participantInfo is populated for both users
             // Fetch if missing (less efficient but ensures data consistency)
             for (const uid of participants) {
               if (!participantInfo[uid]?.fullName) {
                 console.warn(`useUserConversations: Participant info missing for ${uid} in conv ${docSnap.id}. Fetching...`);
                 const details = await fetchParticipantDetails(uid);
                 if (details) {
                   participantInfo[uid] = details;
                 } else {
                   // Handle case where user details couldn't be fetched (e.g., deleted user)
                   participantInfo[uid] = { fullName: 'Deleted User', profileImageUrl: '' };
                 }
               }
             }


             // Convert Timestamps safely
             const lastUpdatedAtMillis = data.lastUpdatedAt instanceof Timestamp
               ? data.lastUpdatedAt.toMillis()
               : (typeof data.lastUpdatedAt === 'number' ? data.lastUpdatedAt : Date.now()); // Fallback

             const lastMessageTimestampMillis = data.lastMessage?.timestamp instanceof Timestamp
               ? data.lastMessage.timestamp.toMillis()
               : (typeof data.lastMessage?.timestamp === 'number' ? data.lastMessage.timestamp : 0); // Fallback or 0


             return {
               id: docSnap.id,
               participants: participants,
               participantInfo: participantInfo, // Now potentially includes fetched data
               lastMessage: data.lastMessage ? {
                 text: data.lastMessage.text || '',
                 senderUid: data.lastMessage.senderUid || '',
                 timestamp: lastMessageTimestampMillis,
               } : undefined, // Ensure lastMessage structure is consistent
               lastUpdatedAt: lastUpdatedAtMillis,
             };
           });

           // Resolve all promises and filter out any nulls (if fetching failed badly)
           const fetchedConversations = (await Promise.all(fetchedConversationsPromises)).filter(c => c !== null) as Conversation[];

           setConversations(fetchedConversations);
           setError(null); // Clear previous errors on successful fetch

        } catch (processingError: any) {
             console.error("useUserConversations: Error processing snapshot data:", processingError);
             setError(`Failed to process conversation data: ${processingError.message}`);
        } finally {
           setLoading(false);
        }
      },
      (err: any) => {
        console.error("useUserConversations: Error in onSnapshot listener:", err);
        setError(`Failed to load conversations: ${err.message}`);
        setLoading(false);
      }
    );

    // Cleanup listener on unmount
    return () => {
        if (unsubscribeRef.current) {
            console.log("useUserConversations: Cleaning up listener on unmount/re-run.");
            unsubscribeRef.current();
            unsubscribeRef.current = null;
        }
    }
  }, [currentUser?.uid]); // Re-run ONLY if user ID changes

  return { conversations, loading, error };
}


// Hook to get messages for a specific conversation
export function useConversationMessages(conversationId: string | null) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const unsubscribeRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    // Clean up previous listener
    if (unsubscribeRef.current) {
      console.log(`useConversationMessages: Cleaning up listener for previous conv: ${conversationId}`);
      unsubscribeRef.current();
      unsubscribeRef.current = null;
    }

    if (!conversationId) {
      setMessages([]);
      setLoading(false);
      setError(null);
      return; // Exit if no conversationId
    }

    setLoading(true);
    setError(null);
    console.log(`useConversationMessages: Setting up listener for conversation ${conversationId}`);

    const messagesRef = collection(db, 'conversations', conversationId, 'messages');
    // Get a reasonable number of recent messages, ordered correctly
    const q = query(messagesRef, orderBy('timestamp', 'asc'), limit(50));

    unsubscribeRef.current = onSnapshot(q,
      (querySnapshot: QuerySnapshot<DocumentData>) => {
        console.log(`useConversationMessages: Snapshot received for ${conversationId} with ${querySnapshot.docs.length} messages.`);
        const fetchedMessages: Message[] = querySnapshot.docs.map((doc) => {
          const data = doc.data();
          // Convert timestamp safely
           const timestampMillis = data.timestamp instanceof Timestamp
             ? data.timestamp.toMillis()
             : (typeof data.timestamp === 'number' ? data.timestamp : Date.now()); // Fallback

          return {
            id: doc.id,
            conversationId: conversationId, // Ensure this is set
            senderUid: data.senderUid || '',
            receiverUid: data.receiverUid || '', // Though less critical for display, include if needed
            text: data.text || '',
            timestamp: timestampMillis,
          };
        });
        setMessages(fetchedMessages);
        setLoading(false);
        setError(null); // Clear error on success
      },
      (err: any) => {
        console.error(`useConversationMessages: Error fetching messages for ${conversationId}:`, err);
        setError(`Failed to load messages: ${err.message}`);
        setLoading(false);
      }
    );

    // Cleanup function for this specific listener
    return () => {
      if (unsubscribeRef.current) {
        console.log(`useConversationMessages: Cleaning up listener for ${conversationId}.`);
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
    };
  }, [conversationId]); // Dependency array ensures re-run only when conversationId changes

  return { messages, loading, error };
}

