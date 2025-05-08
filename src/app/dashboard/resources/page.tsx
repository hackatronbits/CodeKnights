import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { BookOpen, School, Link as LinkIcon } from "lucide-react";
import Link from 'next/link'; // Use Next.js Link for client-side navigation

// Define university data structure (ideally this would come from constants or backend)
interface UniversityResource {
  name: string;
  link: string;
  logoSeed: string; // Seed for placeholder logo
}

const universityResources: UniversityResource[] = [
  { name: "Stanford University", link: "https://www.stanford.edu/", logoSeed: "stanford" },
  { name: "Massachusetts Institute of Technology (MIT)", link: "https://web.mit.edu/", logoSeed: "mit" },
  { name: "Harvard University", link: "https://www.harvard.edu/", logoSeed: "harvard" },
  { name: "University of California, Berkeley (UCB)", link: "https://www.berkeley.edu/", logoSeed: "ucb" },
  { name: "University of Oxford", link: "https://www.ox.ac.uk/", logoSeed: "oxford" },
  { name: "California Institute of Technology (Caltech)", link: "https://www.caltech.edu/", logoSeed: "caltech" },
  { name: "University of Cambridge", link: "https://www.cam.ac.uk/", logoSeed: "cambridge" },
  { name: "ETH Zurich", link: "https://ethz.ch/en.html", logoSeed: "ethzurich" },
  { name: "National University of Singapore (NUS)", link: "https://nus.edu.sg/", logoSeed: "nus" },
  { name: "Princeton University", link: "https://www.princeton.edu/", logoSeed: "princeton" },
  { name: "Yale University", link: "https://www.yale.edu/", logoSeed: "yale" },
  { name: "Imperial College London", link: "https://www.imperial.ac.uk/", logoSeed: "imperial" },
  // Add more universities as needed
];

export default function ResourcesPage() {
  return (
    <div className="space-y-8">
      <Card className="shadow-md">
        <CardHeader>
          <CardTitle className="text-2xl md:text-3xl flex items-center">
            <BookOpen className="mr-3 h-7 w-7 text-primary" /> Educational Resources
          </CardTitle>
          <CardDescription>
            Explore official websites of various universities for information on programs, admissions, and research.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {universityResources.map((uni) => (
              <Card key={uni.name} className="hover:shadow-lg transition-shadow duration-200 flex flex-col">
                <CardHeader className="flex flex-row items-center gap-4 pb-4">
                   <Avatar className="h-12 w-12 border">
                    {/* Placeholder Logo */}
                    <AvatarImage src={`https://picsum.photos/seed/${uni.logoSeed}/64/64`} alt={`${uni.name} logo`} data-ai-hint="university building" />
                    <AvatarFallback><School className="h-6 w-6" /></AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                     <CardTitle className="text-lg leading-tight">{uni.name}</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="flex-grow pt-0">
                  {/* Optional: Add a short description if available */}
                  {/* <p className="text-sm text-muted-foreground mb-4">A leading institution in...</p> */}
                </CardContent>
                 <CardFooter className="p-4 border-t mt-auto">
                    <Button variant="outline" asChild className="w-full">
                        <Link href={uni.link} target="_blank" rel="noopener noreferrer">
                         <LinkIcon className="mr-2 h-4 w-4" /> Visit Website
                        </Link>
                    </Button>
                 </CardFooter>
              </Card>
            ))}
          </div>
          <p className="text-sm text-muted-foreground mt-8 text-center">
            More resources like career advice, articles, and study materials coming soon!
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
