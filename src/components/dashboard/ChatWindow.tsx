
"use client";

import { useState, useEffect, useRef, useCallback } from 'react';
import type { Message, User, ParticipantInfo } from '@/types'; // Added ParticipantInfo
import { useConversationMessages } from '@/hooks/useConversations';
import { sendMessage } from '@/services/chatService';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, Send, AlertTriangle } from 'lucide-react'; // Added AlertTriangle
import { useAuth } from '@/contexts/AuthContext';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { format } from 'date-fns'; // For detailed timestamps

interface ChatWindowProps {
  conversationId: string;
  otherParticipantUid: string;
  otherParticipantInfo: ParticipantInfo | null; // Use ParticipantInfo type
}

export default function ChatWindow({
  conversationId,
  otherParticipantUid,
  otherParticipantInfo
}: ChatWindowProps) {
  const { currentUser } = useAuth();
  const { messages, loading: loadingMessages, error: messagesError } = useConversationMessages(conversationId);
  const [newMessage, setNewMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const { toast } = useToast();
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null); // Ref for the bottom of messages


  const getInitials = (name?: string) => {
    if (!name) return '??';
    const names = name.split(' ');
    if (names.length > 1) {
      return `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  const scrollToBottom = useCallback((behavior: ScrollBehavior = "smooth") => {
     messagesEndRef.current?.scrollIntoView({ behavior });
     console.log("Scrolled to bottom with behavior:", behavior);
  }, []);

  // Scroll to bottom initially and whenever messages change
  useEffect(() => {
    if (messages.length > 0 || loadingMessages) { // Scroll even during load
        // Use 'auto' for initial load/fast updates, 'smooth' might be too slow
        const behavior = messages.length < 5 ? 'auto' : 'smooth';
        console.log(`ChatWindow: Messages updated (${messages.length}), scrolling to bottom.`);
        // Timeout helps ensure the DOM has updated before scrolling
        setTimeout(() => scrollToBottom(behavior), 50);
    }
  }, [messages, loadingMessages, scrollToBottom]);


  const handleSendMessage = async (e?: React.FormEvent<HTMLFormElement>) => {
    e?.preventDefault(); // Prevent default form submission if used
    if (!newMessage.trim() || !currentUser || !otherParticipantUid || !otherParticipantInfo) return;

    setIsSending(true);
    const messageText = newMessage;
    setNewMessage(''); // Clear input immediately

    // Create a minimal receiver object needed for sendMessage
    const receiver: Pick<User, 'uid' | 'fullName' | 'profileImageUrl' | 'userType' | 'email' | 'isProfileComplete' | 'createdAt'> = {
        uid: otherParticipantUid,
        fullName: otherParticipantInfo.fullName,
        profileImageUrl: otherParticipantInfo.profileImageUrl,
        // Infer opponent type - THIS IS AN ASSUMPTION, adjust if needed
        userType: currentUser.userType === 'student' ? 'alumni' : 'student',
        // Add dummy/assumed values for other fields if sendMessage requires them
        email: '', // Dummy
        isProfileComplete: true, // Assume complete
        createdAt: 0, // Dummy
    };

    try {
      await sendMessage(currentUser, receiver as User, messageText); // Cast receiver for now
      console.log("ChatWindow: Message sent successfully.");
      setTimeout(() => scrollToBottom('smooth'), 100); // Scroll after sending
    } catch (error) {
      console.error('ChatWindow: Error sending message:', error);
      toast({
        title: 'Error Sending Message',
        description: error instanceof Error ? error.message : 'Could not send message.',
        variant: 'destructive',
      });
      setNewMessage(messageText); // Put message back in input on error
    } finally {
      setIsSending(false);
    }
  };

   const formatMessageTimestamp = (timestamp: number) => {
     if (!timestamp) return '';
     try {
       // Format example: 3:45 PM, May 10
       return format(new Date(timestamp), 'p, MMM d');
     } catch (e) {
       console.error("Error formatting message timestamp:", e);
       // Fallback to simpler time format
       return new Date(timestamp).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
     }
   };


  if (!otherParticipantInfo) {
    // Show a loading state if participant info isn't ready yet
    return <div className="flex-1 flex items-center justify-center text-muted-foreground p-4">Loading chat details...</div>;
  }

  return (
    <div className="flex flex-col flex-1 h-full overflow-hidden"> {/* Prevent outer container scroll */}
      {/* Chat Header */}
      <div className="flex items-center p-3 border-b border-border bg-card shadow-sm z-10"> {/* Added shadow */}
         <Avatar className="h-9 w-9 mr-3 flex-shrink-0 border">
            <AvatarImage src={otherParticipantInfo.profileImageUrl} alt={otherParticipantInfo.fullName} data-ai-hint="profile person"/>
            <AvatarFallback>{getInitials(otherParticipantInfo.fullName)}</AvatarFallback>
          </Avatar>
        <h2 className="text-lg font-semibold truncate">{otherParticipantInfo.fullName}</h2>
      </div>

      {/* Message Area */}
      <ScrollArea className="flex-1" viewportRef={viewportRef}>
         <div ref={scrollAreaRef} className="p-4 space-y-4 min-h-full flex flex-col"> {/* Use flex-col for spacing */}
          {/* Loading Skeletons */}
          {loadingMessages && (
             <div className="space-y-4 flex-1"> {/* Take available space */}
                {[...Array(5)].map((_, i) => (
                  <div key={`skel-${i}`} className={cn("flex items-end space-x-2", i % 2 === 0 ? "justify-start" : "justify-end")}>
                    {i % 2 === 0 && <Skeleton className="h-8 w-8 rounded-full flex-shrink-0" />}
                     <Skeleton className="h-10 w-3/5 rounded-lg" />
                    {i % 2 !== 0 && <Skeleton className="h-8 w-8 rounded-full flex-shrink-0" />}
                   </div>
                ))}
             </div>
          )}
          {/* Error Message */}
           {messagesError && !loadingMessages && (
             <div className="flex flex-col items-center justify-center text-center text-destructive p-6 flex-1">
                 <AlertTriangle className="w-10 h-10 mb-2"/>
                 <p className="font-semibold">Error loading messages</p>
                 <p className="text-sm">{messagesError}</p>
            </div>
           )}
          {/* No Messages Placeholder */}
           {!loadingMessages && messages.length === 0 && !messagesError && (
              <div className="flex flex-col items-center justify-center text-center text-muted-foreground p-6 flex-1">
                  <p className="text-lg">No messages yet.</p>
                  <p>Start the conversation!</p>
              </div>
           )}
          {/* Actual Messages */}
          {messages.map((msg, index) => {
            const isSender = msg.senderUid === currentUser?.uid;
            // Show avatar only if the previous message is from a different sender or doesn't exist
            const showAvatar = index === 0 || messages[index - 1]?.senderUid !== msg.senderUid;
            // Determine which avatar to show
            const avatarSrc = isSender ? currentUser?.profileImageUrl : otherParticipantInfo?.profileImageUrl;
            const avatarName = isSender ? currentUser?.fullName : otherParticipantInfo?.fullName;
            const avatarInitials = getInitials(avatarName);

            return (
              <div
                key={msg.id || `msg-${index}`} // Use msg.id if available, fallback to index
                className={cn(
                    'flex items-end space-x-2 w-full',
                    isSender ? 'justify-end pl-10' : 'justify-start pr-10' // Add padding to opposite side
                 )}
              >
                 {/* Receiver Avatar (Left) */}
                 {!isSender && (
                    <div className="w-8 flex-shrink-0 self-end"> {/* Ensure avatar aligns at bottom */}
                        {showAvatar ? (
                             <Avatar className="h-8 w-8">
                                <AvatarImage src={avatarSrc} alt={avatarName} />
                                <AvatarFallback>{avatarInitials}</AvatarFallback>
                             </Avatar>
                        ) : <div className="h-8 w-8"></div> /* Placeholder for alignment */}
                    </div>
                 )}

                 {/* Message Bubble */}
                 <div className={cn(
                    'max-w-[75%] rounded-xl px-4 py-2 shadow-sm', // Use rounded-xl, add shadow
                    isSender
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-foreground dark:bg-card dark:text-card-foreground' // Different bg for receiver
                  )}>
                  <p className="text-sm break-words">{msg.text}</p> {/* Allow long words to break */}
                   <p className={cn(
                       "text-xs mt-1 opacity-75", // Slightly more visible timestamp
                       isSender ? 'text-right text-primary-foreground/80' : 'text-left text-muted-foreground'
                    )}>
                       {formatMessageTimestamp(msg.timestamp)}
                   </p>
                 </div>

                 {/* Sender Avatar (Right) */}
                 {isSender && (
                     <div className="w-8 flex-shrink-0 self-end">
                        {showAvatar ? (
                            <Avatar className="h-8 w-8">
                                <AvatarImage src={avatarSrc} alt={avatarName} />
                                <AvatarFallback>{avatarInitials}</AvatarFallback>
                            </Avatar>
                        ) : <div className="h-8 w-8"></div>}
                    </div>
                 )}
              </div>
            );
          })}
          {/* Div to mark the end of messages for scrolling */}
          <div ref={messagesEndRef} />
         </div>
      </ScrollArea>

      {/* Input Area */}
      <div className="p-3 border-t border-border bg-card mt-auto"> {/* Ensure it sticks to bottom */}
        <form onSubmit={handleSendMessage} className="flex items-center space-x-3">
          <Input
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type your message..."
            className="flex-1 bg-background focus-visible:ring-1 focus-visible:ring-ring focus-visible:ring-offset-0" // Subtle focus
            disabled={isSending || loadingMessages}
            autoComplete="off"
            rows={1} // Start with single row, can expand if needed (requires different component or styling)
          />
          <Button type="submit" disabled={isSending || !newMessage.trim() || loadingMessages} size="icon" aria-label="Send message">
            {isSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </form>
      </div>
    </div>
  );
}
