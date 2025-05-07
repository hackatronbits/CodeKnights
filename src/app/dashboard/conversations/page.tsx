import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MessageSquare } from "lucide-react";

export default function ConversationsPage() {
  return (
    <div className="space-y-8">
      <Card className="shadow-md">
        <CardHeader>
          <CardTitle className="text-2xl md:text-3xl flex items-center">
            <MessageSquare className="mr-3 h-7 w-7 text-primary" /> Conversations
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-lg">
            The direct messaging feature is currently under development.
          </p>
          <p className="mt-4 text-muted-foreground">
            We're working on a secure and intuitive way for you to communicate with your mentors and mentees directly through MentorConnect. Check back soon for updates!
          </p>
           <div className="mt-8 flex justify-center">
            <MessageSquare className="w-24 h-24 text-primary/30" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
