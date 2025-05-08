
"use client";

import { useState, useEffect, useRef } from 'react';
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
  collectionGroup,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Conversation, Message, ParticipantInfo } from '@/types';
import { useAuth } from '@/contexts/AuthContext';

// Hook to get the list of conversations for the current user
export function useUserConversations() {
  const { currentUser } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!currentUser?.uid) {
      setLoading(false);
      setConversations([]);
      return;
    }

    setLoading(true);
    setError(null);
    console.log(`useUserConversations: Setting up listener for user ${currentUser.uid}`);

    const conversationsRef = collection(db, 'conversations');
    const q = query(
      conversationsRef,
      where('participants', 'array-contains', currentUser.uid),
      orderBy('lastUpdatedAt', 'desc')
    );

    const unsubscribe = onSnapshot(q,
      (querySnapshot: QuerySnapshot<DocumentData>) => {
        console.log(`useUserConversations: Snapshot received with ${querySnapshot.docs.length} docs.`);
        const fetchedConversations: Conversation[] = querySnapshot.docs.map((doc) => {
           const data = doc.data();
           // Convert Timestamps
           const lastUpdatedAt = data.lastUpdatedAt instanceof Timestamp ? data.lastUpdatedAt.toMillis() : (data.lastUpdatedAt || 0);
           const lastMessageTimestamp = data.lastMessage?.timestamp instanceof Timestamp ? data.lastMessage.timestamp.toMillis() : (data.lastMessage?.timestamp || 0);

           return {
            id: doc.id,
            participants: data.participants || [],
            participantInfo: data.participantInfo || {},
            lastMessage: data.lastMessage ? {
                 ...data.lastMessage,
                 timestamp: lastMessageTimestamp,
            } : undefined,
            lastUpdatedAt: lastUpdatedAt,
          } as Conversation;
        });
        setConversations(fetchedConversations);
        setLoading(false);
      },
      (err: any) => {
        console.error("useUserConversations: Error fetching conversations:", err);
        setError(`Failed to load conversations: ${err.message}`);
        setLoading(false);
      }
    );

    // Cleanup listener on unmount
    return () => {
        console.log("useUserConversations: Cleaning up listener.");
        unsubscribe();
    }
  }, [currentUser?.uid]); // Re-run if user changes

  return { conversations, loading, error };
}


// Hook to get messages for a specific conversation
export function useConversationMessages(conversationId: string | null) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState<boolean>(false); // Only load when conversationId is valid
  const [error, setError] = useState<string | null>(null);

  // Ref to store the unsubscribe function
  const unsubscribeRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    // Clean up previous listener if conversationId changes or becomes null
    if (unsubscribeRef.current) {
      console.log(`useConversationMessages: Cleaning up listener for previous conversation.`);
      unsubscribeRef.current();
      unsubscribeRef.current = null;
    }

    if (!conversationId) {
      setMessages([]);
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);
    console.log(`useConversationMessages: Setting up listener for conversation ${conversationId}`);

    const messagesRef = collection(db, 'conversations', conversationId, 'messages');
    const q = query(messagesRef, orderBy('timestamp', 'asc'), limit(100)); // Get latest 100 messages

    // Store the new unsubscribe function
    unsubscribeRef.current = onSnapshot(q,
      (querySnapshot: QuerySnapshot<DocumentData>) => {
        console.log(`useConversationMessages: Snapshot received for ${conversationId} with ${querySnapshot.docs.length} messages.`);
        const fetchedMessages: Message[] = querySnapshot.docs.map((doc) => {
          const data = doc.data();
           const timestamp = data.timestamp instanceof Timestamp ? data.timestamp.toMillis() : (data.timestamp || 0);
          return {
            id: doc.id,
            conversationId: conversationId,
            senderUid: data.senderUid,
            receiverUid: data.receiverUid,
            text: data.text,
            timestamp: timestamp,
          } as Message;
        });
        setMessages(fetchedMessages);
        setLoading(false);
      },
      (err: any) => {
        console.error(`useConversationMessages: Error fetching messages for ${conversationId}:`, err);
        setError(`Failed to load messages: ${err.message}`);
        setLoading(false);
      }
    );

    // Cleanup function that runs when component unmounts or conversationId changes
    return () => {
      if (unsubscribeRef.current) {
        console.log(`useConversationMessages: Cleaning up listener for conversation ${conversationId}.`);
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
    };
  }, [conversationId]); // Re-run effect if conversationId changes

  return { messages, loading, error };
}
