import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Target, Eye, Heart, Users, CheckCircle, BookOpen } from "lucide-react";
import Link from "next/link";
import Image from "next/image";

export default function AboutPage() {
  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-grow container px-4 md:px-8 py-12 md:py-16">
        <section className="text-center mb-16">
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-foreground mb-4">
            About MentorConnect
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto">
            Bridging the gap between aspiring students and experienced alumni to foster growth, learning, and success through mentorship.
          </p>
        </section>

        {/* Mission, Vision, Values */}
        <section className="grid md:grid-cols-3 gap-8 mb-16 text-center">
          <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300 group hover:scale-[1.03]">
            <CardHeader>
              <CardTitle className="flex flex-col items-center gap-2 text-xl">
                <Target className="w-10 h-10 text-primary mb-2 group-hover:animate-pulse" />
                Our Mission
              </CardTitle>
            </CardHeader>
            <CardContent className="text-muted-foreground">
              To empower students by connecting them with knowledgeable and supportive alumni mentors, facilitating personal and professional development.
            </CardContent>
          </Card>
          <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300 group hover:scale-[1.03]">
            <CardHeader>
              <CardTitle className="flex flex-col items-center gap-2 text-xl">
                <Eye className="w-10 h-10 text-primary mb-2 group-hover:animate-pulse" />
                Our Vision
              </CardTitle>
            </CardHeader>
            <CardContent className="text-muted-foreground">
              To build a thriving community where mentorship is accessible, impactful, and contributes to the lifelong success of both students and alumni.
            </CardContent>
          </Card>
          <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300 group hover:scale-[1.03]">
            <CardHeader>
              <CardTitle className="flex flex-col items-center gap-2 text-xl">
                <Heart className="w-10 h-10 text-primary mb-2 group-hover:animate-pulse" />
                Our Values
              </CardTitle>
            </CardHeader>
            <CardContent className="text-muted-foreground">
              Connection, Growth, Support, Community, Giving Back. We believe in the power of shared experiences and mutual learning.
            </CardContent>
          </Card>
        </section>

        {/* Our Story Section */}
        <section className="mb-16 grid md:grid-cols-2 gap-12 items-center bg-secondary/20 p-8 rounded-lg">
           <div className="order-2 md:order-1 space-y-4">
             <h2 className="text-3xl font-bold text-foreground">Our Story</h2>
             <p className="text-muted-foreground">
               MentorConnect was born from a simple idea: to make mentorship accessible to every student, regardless of their background or connections. We observed the challenges students faced in finding guidance and the desire of alumni to share their valuable experience.
             </p>
             <p className="text-muted-foreground">
               We envisioned a platform that could seamlessly connect these two groups, fostering meaningful relationships built on shared interests and goals. Since our launch, we've been dedicated to building a supportive ecosystem where knowledge is shared, careers are launched, and potential is unlocked.
             </p>
           </div>
           <div className="order-1 md:order-2">
              <Image
                src="https://picsum.photos/seed/about-story/500/350"
                alt="Illustration of connection or growth"
                width={500}
                height={350}
                className="rounded-xl shadow-lg mx-auto"
                data-ai-hint="connection growth"
              />
            </div>
        </section>

        {/* Key Features Section */}
        <section className="mb-16">
           <h2 className="text-3xl font-bold text-foreground text-center mb-8">Key Features</h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                { icon: Users, title: "Targeted Matching", description: "Find mentors/mentees based on field, university, and interests." },
                { icon: MessageCircle, title: "Secure Messaging", description: "Communicate safely and directly within the platform." },
                { icon: Search, title: "Easy Discovery", description: "Browse profiles and filter results to find the perfect connection." },
                { icon: BookOpen, title: "Resource Hub", description: "Access helpful articles, university links, and career advice." },
              ].map((feature, index) => (
                <div key={index} className="flex items-start space-x-4 p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors">
                   <feature.icon className="w-6 h-6 text-primary mt-1 flex-shrink-0" />
                   <div>
                     <h3 className="font-semibold text-foreground mb-1">{feature.title}</h3>
                     <p className="text-sm text-muted-foreground">{feature.description}</p>
                   </div>
                </div>
               ))}
            </div>
         </section>


        {/* Call to Action */}
        <section className="text-center py-12 bg-gradient-to-r from-primary/80 to-primary rounded-lg">
           <h2 className="text-3xl font-bold text-primary-foreground mb-4">Ready to Connect?</h2>
           <p className="text-lg text-primary-foreground/90 mb-8 max-w-xl mx-auto">
              Join our growing community today and start your mentorship journey.
            </p>
           <div className="flex justify-center gap-4">
             <Button size="lg" variant="secondary" asChild className="shadow-lg hover:shadow-xl transition-shadow">
               <Link href="/#signup">Sign Up Now</Link>
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
