
"use client";

import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MessageSquare, Loader2 } from "lucide-react";
import { useAuth } from '@/contexts/AuthContext';
import ConversationList from '@/components/dashboard/ConversationList';
import ChatWindow from '@/components/dashboard/ChatWindow';
import { useUserConversations } from '@/hooks/useConversations';
import type { ParticipantInfo } from '@/types';

export default function ConversationsPage() {
  const { currentUser, loading: authLoading } = useAuth();
  const { conversations, loading: conversationsLoading, error: conversationsError } = useUserConversations();
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [selectedParticipantUid, setSelectedParticipantUid] = useState<string | null>(null);

  const handleSelectConversation = (conversationId: string, participantUid: string) => {
     console.log("Selected conversation:", conversationId, "with participant:", participantUid);
    setSelectedConversationId(conversationId);
    setSelectedParticipantUid(participantUid);
  };

  // Memoize participant info to avoid re-calculating on every render
  const selectedParticipantInfo: ParticipantInfo | null = useMemo(() => {
    if (!selectedConversationId || !selectedParticipantUid) return null;
    const selectedConv = conversations.find(c => c.id === selectedConversationId);
    return selectedConv?.participantInfo?.[selectedParticipantUid] || null;
  }, [selectedConversationId, selectedParticipantUid, conversations]);


  if (authLoading) {
     return (
        <div className="flex h-full flex-1 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
     );
  }

  if (!currentUser) {
    // Should be handled by layout, but added as a safeguard
    return <p className="p-4 text-center text-muted-foreground">Please log in to view conversations.</p>;
  }

  return (
    <div className="flex h-[calc(100vh-theme(spacing.16))] border border-border rounded-lg overflow-hidden shadow-md"> {/* Adjust container height */}
      <ConversationList
        conversations={conversations}
        selectedConversationId={selectedConversationId}
        onSelectConversation={handleSelectConversation}
        currentUserId={currentUser.uid}
        loading={conversationsLoading}
      />

      <div className="flex-1 flex flex-col bg-background">
        {conversationsError && (
           <div className="p-4 text-center text-destructive">
              Error loading conversations: {conversationsError}
            </div>
        )}
        {!selectedConversationId ? (
          <div className="flex flex-1 flex-col items-center justify-center p-8 text-center">
             <MessageSquare className="w-16 h-16 text-primary/30 mb-4" />
             <h2 className="text-xl font-semibold text-foreground mb-2">Select a Conversation</h2>
             <p className="text-muted-foreground max-w-xs">
               Choose a conversation from the list on the left to start chatting.
             </p>
           </div>
        ) : (
          <ChatWindow
            key={selectedConversationId} // Force re-render when conversation changes
            conversationId={selectedConversationId}
            otherParticipantUid={selectedParticipantUid!} // We know this is set if conversationId is set
            otherParticipantInfo={selectedParticipantInfo}
          />
        )}
      </div>
    </div>
  );
}
