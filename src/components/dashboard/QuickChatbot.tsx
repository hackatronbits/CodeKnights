'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter, SheetClose } from '@/components/ui/sheet';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Loader2, MessageCircle, Send, Bot, User } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { quickChatFlow, type QuickChatInput, type QuickChatOutput } from '@/ai/flows/quick-chat-flow';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: number;
}

export default function QuickChatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [userInput, setUserInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { currentUser } = useAuth();
  const { toast } = useToast();
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

   const scrollToBottom = useCallback((behavior: ScrollBehavior = "smooth") => {
     setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior }), 50); // Delay slightly
     console.log("QuickChatbot: Scrolled to bottom");
   }, []);

   // Scroll when new messages arrive or sheet opens
   useEffect(() => {
      if (isOpen && messages.length > 0) {
        scrollToBottom('auto'); // Use 'auto' for quick updates/opening
      }
   }, [messages, isOpen, scrollToBottom]);


  const handleSendMessage = async (e?: React.FormEvent<HTMLFormElement>) => {
    e?.preventDefault();
    if (!userInput.trim() || isLoading) return;

    const userMessageText = userInput;
    setUserInput(''); // Clear input

    const newUserMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      text: userMessageText,
      timestamp: Date.now(),
    };

    setMessages((prev) => [...prev, newUserMessage]);
    setIsLoading(true);

    try {
      const input: QuickChatInput = { message: userMessageText };
      const output: QuickChatOutput = await quickChatFlow(input);

      const botMessage: ChatMessage = {
        id: `model-${Date.now()}`,
        role: 'model',
        text: output.response,
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, botMessage]);

    } catch (error) {
      console.error('QuickChatbot Error:', error);
      toast({
        title: 'Chatbot Error',
        description: error instanceof Error ? error.message : 'Failed to get response.',
        variant: 'destructive',
      });
       // Optionally add the message back to input or show an error message in chat
       const errorMessage: ChatMessage = {
        id: `error-${Date.now()}`,
        role: 'model',
        text: "Sorry, I encountered an error. Please try again.",
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const formatTimestamp = (timestamp: number) => {
     try {
       return format(new Date(timestamp), 'p'); // e.g., 3:45 PM
     } catch (e) {
       return new Date(timestamp).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
     }
   };


  return (
    <>
      {/* Floating Action Button */}
      <Button
        size="icon"
        className="fixed bottom-6 right-6 z-50 h-14 w-14 rounded-full shadow-lg hover:scale-110 transition-transform"
        onClick={() => setIsOpen(true)}
        aria-label="Open Quick Chat"
      >
        <MessageCircle className="h-6 w-6" />
      </Button>

      {/* Chat Sheet */}
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetContent className="flex flex-col p-0" side="right">
          <SheetHeader className="p-4 border-b">
            <SheetTitle className="flex items-center gap-2">
              <Bot className="h-5 w-5 text-primary"/> Quick Assistant
            </SheetTitle>
          </SheetHeader>

          {/* Message Area */}
          <ScrollArea className="flex-1 overflow-y-auto" viewportRef={viewportRef}>
            <div ref={scrollAreaRef} className="p-4 space-y-4 min-h-full flex flex-col">
              {messages.length === 0 && !isLoading && (
                <div className="flex flex-col items-center justify-center text-center text-muted-foreground p-6 flex-1">
                   <p className="text-lg">Hi there!</p>
                   <p>Ask me about MentorConnect.</p>
               </div>
              )}
              {messages.map((msg) => {
                 const isModel = msg.role === 'model';
                 return (
                  <div
                    key={msg.id}
                    className={cn(
                      'flex items-start gap-3 w-full',
                      isModel ? 'justify-start pr-8' : 'justify-end pl-8'
                    )}
                  >
                    {isModel && (
                       <Avatar className="h-8 w-8 border flex-shrink-0">
                         <AvatarFallback><Bot size={18}/></AvatarFallback>
                       </Avatar>
                    )}
                    <div className={cn(
                      'max-w-[80%] rounded-xl px-3 py-2 shadow-sm text-sm',
                      isModel
                        ? 'bg-muted text-foreground dark:bg-card dark:text-card-foreground'
                        : 'bg-primary text-primary-foreground'
                    )}>
                      <p className="break-words">{msg.text}</p>
                      <p className={cn(
                         "text-xs mt-1 opacity-75",
                         isModel ? 'text-left text-muted-foreground' : 'text-right text-primary-foreground/80'
                       )}>
                          {formatTimestamp(msg.timestamp)}
                      </p>
                    </div>
                     {!isModel && (
                       <Avatar className="h-8 w-8 border flex-shrink-0">
                          <AvatarImage src={currentUser?.profileImageUrl || undefined} alt={currentUser?.fullName || 'User'} />
                         <AvatarFallback><User size={18}/></AvatarFallback>
                       </Avatar>
                    )}
                  </div>
                 );
              })}
               {isLoading && (
                  <div className="flex justify-start items-center gap-3 w-full pr-8">
                     <Avatar className="h-8 w-8 border flex-shrink-0">
                       <AvatarFallback><Bot size={18}/></AvatarFallback>
                     </Avatar>
                    <div className="bg-muted text-foreground dark:bg-card dark:text-card-foreground rounded-xl px-3 py-2 shadow-sm text-sm">
                       <Loader2 className="h-4 w-4 animate-spin" />
                    </div>
                 </div>
               )}
              <div ref={messagesEndRef} /> {/* Scroll target */}
            </div>
          </ScrollArea>

          {/* Input Area */}
          <SheetFooter className="p-4 border-t bg-background">
            <form onSubmit={handleSendMessage} className="flex items-center space-x-2 w-full">
              <Input
                value={userInput}
                onChange={(e) => setUserInput(e.target.value)}
                placeholder="Ask something..."
                className="flex-1"
                disabled={isLoading}
                autoComplete="off"
              />
              <Button type="submit" disabled={isLoading || !userInput.trim()} size="icon">
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </Button>
            </form>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </>
  );
}
