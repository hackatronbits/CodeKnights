
"use client";

import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MessageSquareText, Loader2 } from "lucide-react"; // Changed icon
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
    // Ensure participantInfo exists before accessing
    return selectedConv?.participantInfo?.[selectedParticipantUid] || null;
  }, [selectedConversationId, selectedParticipantUid, conversations]);


  if (authLoading) {
     return (
        <div className="flex h-[calc(100vh-theme(spacing.16))] flex-1 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
     );
  }

  if (!currentUser) {
    // Should be handled by layout, but added as a safeguard
    return <p className="p-4 text-center text-muted-foreground">Please log in to view conversations.</p>;
  }

  return (
    <div className="flex h-[calc(100vh-theme(spacing.16))] border border-border rounded-lg overflow-hidden shadow-lg bg-card"> {/* Adjust height & add bg */}
      {/* Conversation List Pane */}
      <ConversationList
        conversations={conversations}
        selectedConversationId={selectedConversationId}
        onSelectConversation={handleSelectConversation}
        currentUserId={currentUser.uid}
        loading={conversationsLoading}
      />

      {/* Chat Window Pane */}
      <div className="flex-1 flex flex-col bg-background"> {/* Chat area background */}
        {conversationsError && (
           <div className="p-4 text-center text-destructive border-b"> {/* Added border */}
              Error loading conversations: {conversationsError}
            </div>
        )}
        {!selectedConversationId ? (
          // Placeholder when no conversation is selected
          <div className="flex flex-1 flex-col items-center justify-center p-8 text-center bg-muted/30"> {/* Subtle background */}
             <MessageSquareText className="w-20 h-20 text-primary/40 mb-6" /> {/* Larger icon */}
             <h2 className="text-2xl font-semibold text-foreground mb-3">Your Conversations</h2>
             <p className="text-muted-foreground max-w-sm text-base">
               Select a conversation from the list on the left to view messages and continue chatting.
             </p>
           </div>
        ) : (
          // Render ChatWindow only when a conversation is selected
          <ChatWindow
            key={selectedConversationId} // Force re-render when conversation changes
            conversationId={selectedConversationId}
            otherParticipantUid={selectedParticipantUid!} // We know this is set if conversationId is set
            otherParticipantInfo={selectedParticipantInfo} // Pass participant info
          />
        )}
      </div>
    </div>
  );
}

