import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Briefcase, Users, MessageSquare } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function ServicesPage() {
  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-grow container px-4 md:px-8 py-12 md:py-16">
        <section className="text-center mb-16">
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-foreground mb-4">
            Our Services
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto">
            Facilitating connections and growth through dedicated mentorship features.
          </p>
        </section>

        <section className="grid md:grid-cols-3 gap-8 mb-16">
          <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300 group hover:scale-[1.03]">
            <CardHeader>
              <CardTitle className="flex flex-col items-center gap-2 text-xl">
                <Users className="w-10 h-10 text-primary mb-2 group-hover:animate-pulse" />
                Mentor/Mentee Matching
              </CardTitle>
            </CardHeader>
            <CardContent className="text-muted-foreground text-center">
              Utilize our advanced search and filtering to find the perfect mentor or mentee based on field of interest, university, and more.
            </CardContent>
          </Card>
          <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300 group hover:scale-[1.03]">
            <CardHeader>
              <CardTitle className="flex flex-col items-center gap-2 text-xl">
                <MessageSquare className="w-10 h-10 text-primary mb-2 group-hover:animate-pulse" />
                Secure Communication
              </CardTitle>
            </CardHeader>
            <CardContent className="text-muted-foreground text-center">
              Engage in meaningful conversations directly through our secure, integrated messaging platform.
            </CardContent>
          </Card>
          <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300 group hover:scale-[1.03]">
            <CardHeader>
              <CardTitle className="flex flex-col items-center gap-2 text-xl">
                <Briefcase className="w-10 h-10 text-primary mb-2 group-hover:animate-pulse" />
                Profile Showcasing
              </CardTitle>
            </CardHeader>
            <CardContent className="text-muted-foreground text-center">
              Build a comprehensive profile to showcase your skills, experience, and aspirations, making it easier to connect with the right people.
            </CardContent>
          </Card>
        </section>

        <section className="text-center py-12 bg-gradient-to-r from-primary/80 to-primary rounded-lg group transition-all duration-300 ease-in-out hover:scale-[1.02] hover:shadow-2xl"> {/* Added hover effect */}
           <h2 className="text-3xl font-bold text-primary-foreground mb-4">Ready to Benefit?</h2>
           <p className="text-lg text-primary-foreground/90 mb-8 max-w-xl mx-auto">
              Join MentorConnect today to access these features and accelerate your growth.
            </p>
           <div className="flex justify-center gap-4">
             <Button size="lg" variant="secondary" asChild className="shadow-lg hover:shadow-xl transition-shadow">
               {/* Changed href from /#signup to / */}
               <Link href="/">Sign Up Now</Link>
             </Button>
             <Button size="lg" variant="outline" asChild className="bg-primary-foreground/10 text-primary-foreground border-primary-foreground/50 hover:bg-primary-foreground/20 shadow-lg hover:shadow-xl transition-shadow">
               <Link href="/login">Login</Link>
             </Button>
           </div>
         </section>
      </main>
      <Footer />
    </div>
  );
}
