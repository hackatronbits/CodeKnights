
"use client";

import { useState, useEffect, useRef, useCallback } from 'react';
import type { Message, User } from '@/types';
import { useConversationMessages } from '@/hooks/useConversations';
import { sendMessage } from '@/services/chatService';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, Send } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { format } from 'date-fns'; // For detailed timestamps

interface ChatWindowProps {
  conversationId: string;
  otherParticipantUid: string;
  otherParticipantInfo: { fullName: string; profileImageUrl?: string } | null;
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


  const getInitials = (name?: string) => {
    if (!name) return '??';
    const names = name.split(' ');
    if (names.length > 1) {
      return `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  const scrollToBottom = useCallback(() => {
     setTimeout(() => {
        if (viewportRef.current) {
           viewportRef.current.scrollTop = viewportRef.current.scrollHeight;
           console.log("Scrolled to bottom");
        }
     }, 100); // Small delay to allow DOM update
  }, []);


  useEffect(() => {
    if (messages.length > 0) {
        console.log("ChatWindow: Messages updated, scrolling to bottom.");
        scrollToBottom();
    }
  }, [messages, scrollToBottom]);


  const handleSendMessage = async (e?: React.FormEvent<HTMLFormElement>) => {
    e?.preventDefault(); // Prevent default form submission if used
    if (!newMessage.trim() || !currentUser || !otherParticipantUid || !otherParticipantInfo) return;

    setIsSending(true);
    const messageText = newMessage;
    setNewMessage(''); // Clear input immediately

    // Need the full receiver user object for sendMessage currently
    // In a real app, you might fetch this once or pass more info
    const receiver: User = {
        uid: otherParticipantUid,
        fullName: otherParticipantInfo.fullName,
        profileImageUrl: otherParticipantInfo.profileImageUrl,
        // Add dummy values for other required fields if necessary,
        // or adjust sendMessage to only require necessary fields
        email: '', // Dummy
        userType: currentUser.userType === 'student' ? 'alumni' : 'student', // Infer opponent type
        isProfileComplete: true, // Assume complete
        createdAt: 0, // Dummy
    };


    try {
      await sendMessage(currentUser, receiver, messageText);
      console.log("ChatWindow: Message sent successfully.");
      // scrollToBottom is handled by the useEffect watching messages
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
       return format(new Date(timestamp), 'p, MMM d'); // e.g., 3:45 PM, May 10
     } catch (e) {
       console.error("Error formatting message timestamp:", e);
       return new Date(timestamp).toLocaleTimeString(); // Fallback
     }
   };


  if (!otherParticipantInfo) {
    // This might happen briefly while the parent component updates state
    return <div className="flex-1 flex items-center justify-center text-muted-foreground">Loading participant info...</div>;
  }

  return (
    <div className="flex flex-col flex-1 h-full">
      {/* Chat Header */}
      <div className="flex items-center p-4 border-b border-border bg-card">
         <Avatar className="h-9 w-9 mr-3">
            <AvatarImage src={otherParticipantInfo.profileImageUrl} alt={otherParticipantInfo.fullName} data-ai-hint="profile person"/>
            <AvatarFallback>{getInitials(otherParticipantInfo.fullName)}</AvatarFallback>
          </Avatar>
        <h2 className="text-lg font-semibold">{otherParticipantInfo.fullName}</h2>
      </div>

      {/* Message Area */}
      <ScrollArea className="flex-1 p-4 bg-background" viewportRef={viewportRef}>
         <div ref={scrollAreaRef} className="space-y-4">
          {loadingMessages && (
             <div className="space-y-4">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className={cn("flex items-end space-x-2", i % 2 === 0 ? "justify-start" : "justify-end")}>
                    {i % 2 === 0 && <Skeleton className="h-8 w-8 rounded-full" />}
                     <Skeleton className="h-10 w-3/5 rounded-lg" />
                    {i % 2 !== 0 && <Skeleton className="h-8 w-8 rounded-full" />}
                   </div>
                ))}
             </div>
          )}
           {messagesError && (
             <p className="text-center text-destructive">Error loading messages: {messagesError}</p>
           )}
           {!loadingMessages && messages.length === 0 && !messagesError && (
             <p className="text-center text-muted-foreground pt-10">No messages yet. Start the conversation!</p>
           )}
          {messages.map((msg, index) => {
            const isSender = msg.senderUid === currentUser?.uid;
             const showAvatar = index === 0 || messages[index - 1]?.senderUid !== msg.senderUid;

            return (
              <div
                key={msg.id}
                className={cn('flex items-end space-x-2', isSender ? 'justify-end' : 'justify-start')}
              >
                 {!isSender && showAvatar && (
                    <Avatar className="h-8 w-8 flex-shrink-0">
                      <AvatarImage src={otherParticipantInfo.profileImageUrl} alt={otherParticipantInfo.fullName} />
                       <AvatarFallback>{getInitials(otherParticipantInfo.fullName)}</AvatarFallback>
                     </Avatar>
                 )}
                 {!isSender && !showAvatar && <div className="w-8 flex-shrink-0"></div>} {/* Placeholder for alignment */}

                 <div className={cn(
                    'max-w-[70%] rounded-lg px-4 py-2',
                    isSender ? 'bg-primary text-primary-foreground' : 'bg-muted text-foreground'
                  )}>
                  <p className="text-sm">{msg.text}</p>
                   <p className={cn("text-xs mt-1 opacity-70", isSender ? 'text-right' : 'text-left')}>
                       {formatMessageTimestamp(msg.timestamp)}
                   </p>
                 </div>

                 {isSender && showAvatar && (
                    <Avatar className="h-8 w-8 flex-shrink-0">
                      <AvatarImage src={currentUser?.profileImageUrl} alt={currentUser?.fullName} />
                       <AvatarFallback>{getInitials(currentUser?.fullName)}</AvatarFallback>
                     </Avatar>
                 )}
                 {isSender && !showAvatar && <div className="w-8 flex-shrink-0"></div>} {/* Placeholder for alignment */}
              </div>
            );
          })}
         </div>
      </ScrollArea>

      {/* Input Area */}
      <div className="p-4 border-t border-border bg-card">
        <form onSubmit={handleSendMessage} className="flex items-center space-x-3">
          <Input
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type your message..."
            className="flex-1"
            disabled={isSending || loadingMessages}
            autoComplete="off"
          />
          <Button type="submit" disabled={isSending || !newMessage.trim()} size="icon">
            {isSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            <span className="sr-only">Send message</span>
          </Button>
        </form>
      </div>
    </div>
  );
}
