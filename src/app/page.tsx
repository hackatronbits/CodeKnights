import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { SignupForm } from "@/components/auth/SignupForm";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { CheckCircle, Users, MessageCircle, BookOpen } from "lucide-react";
import Link from "next/link";
import { MOCK_TESTIMONIALS } from "@/lib/constants";
import Image from "next/image";

export default function LandingPage() {
  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-grow">
        {/* Hero Section */}
        <section className="py-16 md:py-24 bg-gradient-to-br from-background to-secondary/30">
          <div className="container px-4 md:px-8 grid md:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight text-foreground">
                Connect, Learn, Grow.
              </h1>
              <p className="text-lg md:text-xl text-muted-foreground">
                MentorConnect bridges the gap between ambitious students and experienced alumni. Find your mentor, share your knowledge, and unlock your potential.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Button size="lg" asChild className="shadow-lg hover:shadow-xl transition-shadow">
                  <Link href="#signup">Get Started Today</Link>
                </Button>
                <Button size="lg" variant="outline" asChild className="shadow-lg hover:shadow-xl transition-shadow">
                   <Link href="#about">Learn More</Link>
                </Button>
              </div>
            </div>
            <div className="hidden md:block">
              <Image 
                src="https://picsum.photos/seed/mentorconnect-hero/600/400" 
                alt="Mentorship illustration"
                width={600}
                height={400}
                className="rounded-xl shadow-2xl"
                data-ai-hint="mentorship collaboration"
              />
            </div>
          </div>
        </section>

        {/* Signup Form Section - Right-aligned */}
        <section id="signup" className="py-16 md:py-24">
          <div className="container px-4 md:px-8 grid md:grid-cols-12 gap-8 items-center">
            <div className="md:col-span-7 space-y-8">
              <h2 className="text-3xl md:text-4xl font-bold text-foreground">Why Join MentorConnect?</h2>
              <ul className="space-y-4">
                {[
                  { icon: <Users className="text-primary" />, title: "Expand Your Network", description: "Connect with a diverse community of students and accomplished alumni." },
                  { icon: <CheckCircle className="text-primary" />, title: "Personalized Guidance", description: "Receive tailored advice and support to navigate your academic and career path." },
                  { icon: <BookOpen className="text-primary" />, title: "Share Your Expertise", description: "Alumni can give back by mentoring the next generation of leaders." },
                  { icon: <MessageCircle className="text-primary" />, title: "Meaningful Conversations", description: "Engage in discussions that foster growth, innovation, and lifelong learning." },
                ].map((item, index) => (
                  <li key={index} className="flex items-start space-x-4">
                    <div className="flex-shrink-0 mt-1">{item.icon}</div>
                    <div>
                      <h3 className="text-lg font-semibold text-foreground">{item.title}</h3>
                      <p className="text-muted-foreground">{item.description}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
            <div className="md:col-span-5">
              <Card className="p-6 md:p-8 shadow-xl border-primary border-2">
                <CardHeader className="p-0 mb-6">
                  <CardTitle className="text-2xl md:text-3xl font-bold text-center text-foreground">Join MentorConnect</CardTitle>
                  <CardDescription className="text-center text-muted-foreground">
                    Create your account to start connecting.
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                  <SignupForm />
                  <p className="mt-6 text-center text-sm text-muted-foreground">
                    Already have an account?{" "}
                    <Link href="/login" className="font-medium text-primary hover:underline">
                      Login
                    </Link>
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* Testimonials Section */}
        <section className="py-16 md:py-24 bg-secondary/30">
          <div className="container px-4 md:px-8">
            <h2 className="text-3xl md:text-4xl font-bold text-center mb-12 text-foreground">
              What Our Users Say
            </h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {MOCK_TESTIMONIALS.map((testimonial) => (
                <Card key={testimonial.id} className="shadow-lg">
                  <CardHeader>
                    <div className="flex items-center space-x-4">
                      <Avatar>
                        <AvatarImage src={testimonial.avatarUrl} alt={testimonial.name} data-ai-hint="profile person" />
                        <AvatarFallback>{testimonial.name.substring(0, 2)}</AvatarFallback>
                      </Avatar>
                      <div>
                        <CardTitle className="text-lg">{testimonial.name}</CardTitle>
                        <CardDescription>{testimonial.role}</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground italic">"{testimonial.feedback}"</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* About Us Section */}
        <section id="about" className="py-16 md:py-24">
          <div className="container px-4 md:px-8 grid md:grid-cols-2 gap-12 items-center">
            <div>
              <Image 
                src="https://picsum.photos/seed/mentorconnect-about/500/350" 
                alt="Team working together"
                width={500}
                height={350}
                className="rounded-xl shadow-xl"
                data-ai-hint="team collaboration"
              />
            </div>
            <div className="space-y-6">
              <h2 className="text-3xl md:text-4xl font-bold text-foreground">About MentorConnect</h2>
              <p className="text-lg text-muted-foreground">
                MentorConnect was born from a simple idea: to make mentorship accessible to every student, regardless of their background or connections. We believe in the power of shared experience and the profound impact that guidance from seasoned professionals can have on a student's journey.
              </p>
              <p className="text-lg text-muted-foreground">
                Our platform is designed to foster meaningful relationships between students seeking direction and alumni willing to share their wisdom. We are passionate about building a supportive community where learning, growth, and success are shared aspirations.
              </p>
            </div>
          </div>
        </section>

        {/* Description Section */}
        <section className="py-16 md:py-24 bg-secondary/30">
          <div className="container px-4 md:px-8 text-center">
            <h2 className="text-3xl md:text-4xl font-bold mb-6 text-foreground">How It Works</h2>
            <p className="text-lg md:text-xl max-w-3xl mx-auto text-muted-foreground mb-12">
              MentorConnect offers a seamless experience for both students and alumni. Discover how our platform empowers you to achieve your mentorship goals.
            </p>
            <div className="grid md:grid-cols-3 gap-8 text-left">
              <Card className="shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <UserPlus className="text-primary" /> For Students
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-muted-foreground">
                  <p>Create your profile highlighting your interests and aspirations.</p>
                  <p>Discover and filter alumni mentors based on field of interest, university, or both.</p>
                  <p>Connect with mentors, gain insights, and build valuable relationships.</p>
                  <p>Access resources and track your mentorship progress.</p>
                </CardContent>
              </Card>
              <Card className="shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Briefcase className="text-primary" /> For Alumni
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-muted-foreground">
                  <p>Build your alumni profile showcasing your expertise and experience.</p>
                  <p>Make yourself discoverable to students seeking guidance in your field.</p>
                  <p>Share your knowledge, offer advice, and inspire the next generation.</p>
                  <p>Manage your mentorship connections and availability.</p>
                </CardContent>
              </Card>
              <Card className="shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CheckCircle className="text-primary" /> Platform Features
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-muted-foreground">
                  <p>Secure user authentication and profile management.</p>
                  <p>Advanced search and filtering for precise matching.</p>
                  <p>Intuitive dashboard for easy navigation and interaction.</p>
                  <p>Responsive design for access on any device.</p>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
