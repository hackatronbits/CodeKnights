import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Mail, Phone, MapPin } from "lucide-react";

export default function ContactPage() {
  // Basic form submission handler (replace with actual logic)
  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    // Add form submission logic here (e.g., send data to an API)
    alert("Contact form submitted (placeholder action). Implement actual submission logic.");
  };

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-grow container px-4 md:px-8 py-12 md:py-16">
        <section className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-foreground mb-4">
            Contact Us
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
            Have questions or feedback? We'd love to hear from you. Reach out through the form below or use our contact details.
          </p>
        </section>

        <div className="grid md:grid-cols-2 gap-12">
          {/* Contact Form */}
          <Card className="shadow-lg border-primary/30">
            <CardHeader>
              <CardTitle>Send us a Message</CardTitle>
              <CardDescription>Fill out the form and we'll get back to you as soon as possible.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Name</Label>
                    <Input id="name" placeholder="Your Name" required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input id="email" type="email" placeholder="your.email@example.com" required />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="subject">Subject</Label>
                  <Input id="subject" placeholder="Subject of your message" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="message">Message</Label>
                  <Textarea id="message" placeholder="Type your message here..." required className="min-h-[120px]" />
                </div>
                <Button type="submit" className="w-full">Send Message</Button>
              </form>
            </CardContent>
          </Card>

          {/* Contact Information */}
          <div className="space-y-8">
            <h2 className="text-2xl font-semibold text-foreground mb-4">Contact Information</h2>
            <Card className="shadow-md bg-secondary/30 border-secondary">
               <CardContent className="p-6 space-y-4">
                 <div className="flex items-center gap-4">
                   <Mail className="w-6 h-6 text-primary flex-shrink-0" />
                   <div>
                     <h3 className="font-semibold text-foreground">Email</h3>
                     <a href="mailto:support@mentorconnect.example.com" className="text-muted-foreground hover:text-primary transition-colors">
                       support@mentorconnect.example.com
                     </a>
                   </div>
                 </div>
                 <div className="flex items-center gap-4">
                   <Phone className="w-6 h-6 text-primary flex-shrink-0" />
                   <div>
                     <h3 className="font-semibold text-foreground">Phone</h3>
                     <p className="text-muted-foreground">(123) 456-7890</p>
                   </div>
                 </div>
                 <div className="flex items-center gap-4">
                   <MapPin className="w-6 h-6 text-primary flex-shrink-0" />
                   <div>
                     <h3 className="font-semibold text-foreground">Address</h3>
                     <p className="text-muted-foreground">123 Mentorship Lane, Growth City, GC 12345</p>
                   </div>
                 </div>
               </CardContent>
            </Card>
             <p className="text-sm text-muted-foreground text-center mt-8">
               We typically respond within 24-48 business hours.
             </p>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}