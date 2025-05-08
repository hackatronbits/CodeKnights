
"use client";

import type { Conversation } from '@/types';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns'; // For relative time

interface ConversationListProps {
  conversations: Conversation[];
  selectedConversationId: string | null;
  onSelectConversation: (conversationId: string, otherParticipantUid: string) => void;
  currentUserId: string;
  loading: boolean;
}

export default function ConversationList({
  conversations,
  selectedConversationId,
  onSelectConversation,
  currentUserId,
  loading,
}: ConversationListProps) {

  const getOtherParticipant = (conv: Conversation) => {
    const otherUid = conv.participants.find(uid => uid !== currentUserId);
    return otherUid ? conv.participantInfo[otherUid] : null;
  };

   const getInitials = (name?: string) => {
      if (!name) return '??';
      const names = name.split(' ');
      if (names.length > 1) {
        return `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase();
      }
      return name.substring(0, 2).toUpperCase();
    };

   const formatTimestamp = (timestamp?: number) => {
    if (!timestamp) return '';
    try {
      return formatDistanceToNow(new Date(timestamp), { addSuffix: true });
    } catch (e) {
      console.error("Error formatting date:", e);
      return new Date(timestamp).toLocaleTimeString(); // Fallback
    }
  };

  if (loading) {
    return (
      <div className="w-full md:w-1/3 lg:w-1/4 border-r border-border p-4 space-y-3">
         {[...Array(5)].map((_, i) => (
           <div key={i} className="flex items-center space-x-3">
             <Skeleton className="h-10 w-10 rounded-full" />
             <div className="space-y-1 flex-1">
               <Skeleton className="h-4 w-3/4" />
               <Skeleton className="h-3 w-1/2" />
             </div>
           </div>
         ))}
      </div>
    );
  }

  if (conversations.length === 0) {
    return (
      <div className="w-full md:w-1/3 lg:w-1/4 border-r border-border p-4 text-center text-muted-foreground">
        No conversations yet. Find a mentor or mentee to start chatting!
      </div>
    );
  }

  return (
    <ScrollArea className="w-full md:w-1/3 lg:w-1/4 h-[calc(100vh-var(--header-height,8rem))] border-r border-border"> {/* Adjust height as needed */}
      <div className="p-2 space-y-1">
        {conversations.map((conv) => {
          const otherParticipant = getOtherParticipant(conv);
          const otherParticipantUid = conv.participants.find(uid => uid !== currentUserId);
          if (!otherParticipant || !otherParticipantUid) return null; // Should not happen if data is correct

          const isSelected = conv.id === selectedConversationId;

          return (
            <button
              key={conv.id}
              onClick={() => onSelectConversation(conv.id, otherParticipantUid)}
              className={cn(
                'flex items-center w-full p-3 rounded-md text-left transition-colors duration-150',
                isSelected ? 'bg-primary/10' : 'hover:bg-accent/50',
              )}
            >
              <Avatar className="h-10 w-10 mr-3">
                <AvatarImage src={otherParticipant.profileImageUrl} alt={otherParticipant.fullName} data-ai-hint="profile person"/>
                <AvatarFallback>{getInitials(otherParticipant.fullName)}</AvatarFallback>
              </Avatar>
              <div className="flex-1 overflow-hidden">
                <p className="font-semibold truncate text-sm">{otherParticipant.fullName}</p>
                {conv.lastMessage ? (
                   <p className={cn("text-xs truncate", isSelected ? 'text-foreground/90' : 'text-muted-foreground')}>
                        {conv.lastMessage.senderUid === currentUserId ? 'You: ' : ''}
                        {conv.lastMessage.text}
                    </p>
                ) : (
                  <p className="text-xs text-muted-foreground italic">No messages yet</p>
                )}
              </div>
              {conv.lastMessage && (
                  <span className="text-xs text-muted-foreground/80 ml-2 flex-shrink-0">
                     {formatTimestamp(conv.lastMessage.timestamp)}
                  </span>
              )}
            </button>
          );
        })}
      </div>
    </ScrollArea>
  );
}
