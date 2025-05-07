import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BookOpen } from "lucide-react";

export default function ResourcesPage() {
  return (
    <div className="space-y-8">
      <Card className="shadow-md">
        <CardHeader>
          <CardTitle className="text-2xl md:text-3xl flex items-center">
            <BookOpen className="mr-3 h-7 w-7 text-primary" /> Resources
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-lg">
            This section is currently under development.
          </p>
          <p className="mt-4 text-muted-foreground">
            Soon, you'll find helpful articles, study materials, career advice, and more to support your journey. Stay tuned!
          </p>
          <div className="mt-8 flex justify-center">
            <BookOpen className="w-24 h-24 text-primary/30" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
