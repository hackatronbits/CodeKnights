
"use client";

import type { Conversation } from '@/types';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { formatDistanceToNowStrict } from 'date-fns'; // Use strict format for shorter output

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
    // Ensure participantInfo exists before accessing
    return otherUid && conv.participantInfo ? conv.participantInfo[otherUid] : null;
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
      // Use strict format for brevity (e.g., "5m", "2h", "3d")
      return formatDistanceToNowStrict(new Date(timestamp));
    } catch (e) {
      console.error("Error formatting date:", e);
      return new Date(timestamp).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }); // Fallback: 3:45 PM
    }
  };

  if (loading) {
    return (
      <div className="w-full md:w-[300px] lg:w-[350px] border-r border-border p-4 space-y-3 h-full overflow-y-auto bg-card">
         {[...Array(8)].map((_, i) => ( // Show more skeletons
           <div key={i} className="flex items-center space-x-3 p-2">
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
      <div className="w-full md:w-[300px] lg:w-[350px] border-r border-border p-4 text-center text-muted-foreground flex items-center justify-center h-full bg-card">
         <div className="text-sm">
            No conversations yet. Find a mentor or mentee to start chatting!
         </div>
      </div>
    );
  }

  // Sort conversations by lastUpdatedAt timestamp (most recent first)
  const sortedConversations = [...conversations].sort((a, b) => (b.lastUpdatedAt || 0) - (a.lastUpdatedAt || 0));

  return (
    // Ensure ScrollArea takes full height within its container
    <ScrollArea className="w-full md:w-[300px] lg:w-[350px] h-full border-r border-border bg-card">
      <div className="p-2 space-y-1">
        {sortedConversations.map((conv) => {
          const otherParticipant = getOtherParticipant(conv);
          const otherParticipantUid = conv.participants.find(uid => uid !== currentUserId);

          // Skip rendering if participant info is missing (shouldn't happen with correct data structure)
          if (!otherParticipant || !otherParticipantUid) {
            console.warn("Skipping conversation render due to missing participant info:", conv.id);
            return null;
          }

          const isSelected = conv.id === selectedConversationId;
          const lastMessageText = conv.lastMessage?.text || "No messages yet";
          const lastMessageSender = conv.lastMessage?.senderUid === currentUserId ? "You: " : "";
          const lastMessageTimestamp = formatTimestamp(conv.lastMessage?.timestamp);

          return (
            <button
              key={conv.id}
              onClick={() => onSelectConversation(conv.id, otherParticipantUid)}
              className={cn(
                'flex items-center w-full p-3 rounded-lg text-left transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card', // Added focus styles
                isSelected
                  ? 'bg-primary/15 text-primary-foreground hover:bg-primary/20' // More distinct selected style
                  : 'hover:bg-accent/60 text-card-foreground', // Use card foreground for text
                 'group' // Add group for potential future styling
              )}
              aria-current={isSelected ? "page" : undefined}
            >
              <Avatar className="h-10 w-10 mr-3 flex-shrink-0 border-2 border-transparent group-hover:border-primary/30 transition-colors">
                <AvatarImage src={otherParticipant.profileImageUrl} alt={otherParticipant.fullName} data-ai-hint="profile person"/>
                <AvatarFallback>{getInitials(otherParticipant.fullName)}</AvatarFallback>
              </Avatar>
              <div className="flex-1 overflow-hidden min-w-0"> {/* Ensure text truncation works */}
                <p className={cn(
                    "font-semibold truncate text-sm",
                    isSelected ? "text-primary-foreground" : "text-foreground" // Adjust text color based on selection
                 )}>
                    {otherParticipant.fullName}
                </p>
                <p className={cn(
                    "text-xs truncate",
                     isSelected ? 'text-primary-foreground/80' : 'text-muted-foreground' // Adjust muted color based on selection
                 )}>
                  {lastMessageSender}{lastMessageText}
                </p>
              </div>
              {lastMessageTimestamp && (
                  <span className={cn(
                      "text-xs ml-2 flex-shrink-0 self-start pt-1", // Align timestamp top-right ish
                       isSelected ? 'text-primary-foreground/70' : 'text-muted-foreground/80'
                   )}>
                     {lastMessageTimestamp}
                  </span>
              )}
            </button>
          );
        })}
      </div>
    </ScrollArea>
  );
}
