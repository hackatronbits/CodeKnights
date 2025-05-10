import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { BookOpen, School, Link as LinkIcon, FileText, Brain, Briefcase, Star } from "lucide-react";
import Link from 'next/link';
import { UNIVERSITIES } from '@/lib/universitiesData';

function StarRating({ value }: { value: number }) {
  // Show half stars if needed
  const rounded = Math.round(value * 2) / 2;
  return (
    <div className="flex items-center gap-0.5">
      {[1,2,3,4,5].map((star) => (
        <Star key={star} className={star <= rounded ? 'text-yellow-500' : 'text-gray-300'} fill={star <= rounded ? 'currentColor' : 'none'} size={18} />
      ))}
      <span className="ml-1 text-xs text-muted-foreground">{value.toFixed(1)}</span>
    </div>
  );
}

export default function ResourcesPage() {
  return (
    <div className="space-y-8">
      <Card className="shadow-md">
        <CardHeader>
          <CardTitle className="text-2xl md:text-3xl flex items-center">
            <BookOpen className="mr-3 h-7 w-7 text-primary" /> Educational Resources
          </CardTitle>
          <CardDescription>
            Explore official websites of various universities for information on programs, admissions, and research. More resources like career advice, articles, and study materials coming soon!
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {UNIVERSITIES.map((uni) => (
              <Card key={uni.id} className="hover:shadow-lg transition-shadow duration-200 flex flex-col">
                <CardHeader className="flex flex-row items-center gap-4 pb-4">
                   <Avatar className="h-12 w-12 border">
                    {/* Placeholder Logo */}
                    <AvatarImage src={`https://picsum.photos/seed/${uni.logoSeed}/64/64`} alt={`${uni.name} logo`} data-ai-hint="university building" />
                    <AvatarFallback><School className="h-6 w-6" /></AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                     <CardTitle className="text-lg leading-tight">{uni.name}</CardTitle>
                     <div className="mt-1"><StarRating value={uni.avgRating} /></div>
                  </div>
                </CardHeader>
                <CardContent className="flex-grow pt-0">
                  {/* Optional: Add a short description if available */}
                </CardContent>
                <CardFooter className="p-4 border-t mt-auto flex flex-col gap-2">
                  <Button variant="outline" asChild className="w-full">
                    <Link href={uni.link} target="_blank" rel="noopener noreferrer">
                      <LinkIcon className="mr-2 h-4 w-4" /> Visit Website
                    </Link>
                  </Button>
                  <Button variant="default" asChild className="w-full mt-2">
                    <Link href={`/dashboard/university-details/${uni.id}`}>
                      Know More
                    </Link>
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
          <div className="mt-12 text-center border-t pt-8">
              <h3 className="text-xl font-semibold mb-4 text-foreground">Coming Soon...</h3>
              <p className="text-muted-foreground max-w-xl mx-auto">
                We're actively working on expanding this section! Soon you'll find curated study materials, insightful career advice articles, and other valuable resources to support your academic and professional journey.
              </p>
              <div className="flex justify-center gap-8 mt-6 text-primary/70">
                 <FileText className="w-10 h-10" />
                 <Brain className="w-10 h-10" />
                 <Briefcase className="w-10 h-10" />
              </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
