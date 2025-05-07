
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { useState, useEffect } from "react";

const signupFormSchema = z.object({
  fullName: z.string().min(2, {
    message: "Full name must be at least 2 characters.",
  }),
  email: z.string().email({
    message: "Please enter a valid email address.",
  }),
  password: z.string().min(6, {
    message: "Password must be at least 6 characters.",
  }),
});

type SignupFormValues = z.infer<typeof signupFormSchema>;

export function SignupForm() {
  // Use loading state from AuthContext primarily for initial load, manage submission loading locally
  const { signUp, error: authErrorFromContext, loading: authContextLoading } = useAuth();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false); // Local loading state for form submission

  const form = useForm<SignupFormValues>({
    resolver: zodResolver(signupFormSchema),
    defaultValues: {
      fullName: "",
      email: "",
      password: "",
    },
  });

  // Use useEffect to show toast based on authErrorFromContext changes after submission attempt
  useEffect(() => {
    if (authErrorFromContext && isSubmitting) { // Only show toast if related to the current submission attempt
       toast({
        title: "Signup Failed",
        description: authErrorFromContext, // Display the error from context
        variant: "destructive",
      });
    }
  }, [authErrorFromContext, isSubmitting, toast]);


  async function onSubmit(values: SignupFormValues) {
    setIsSubmitting(true); // Start local loading indicator
    const user = await signUp(values.email, values.password, values.fullName);
    
    if (user) {
      // Success: Toast shown by context/redirect handler or can add one here
      toast({
        title: "Signup Initiated!",
        description: "Redirecting you to complete your profile...",
      });
      // Router push handled by AuthContext/useEffect listener
    } else {
      // Failure: Error message will be set in context, useEffect hook above will show toast.
      console.log("Signup failed, error should be displayed via toast from context.");
      // No need to call toast here as the useEffect handles it based on context error change
    }
    setIsSubmitting(false); // Stop local loading indicator regardless of outcome
  }

  // Disable form if AuthContext is still loading initial state OR if the form is currently submitting
  const formDisabled = authContextLoading || isSubmitting;

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="fullName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Full Name</FormLabel>
              <FormControl>
                <Input placeholder="John Doe" {...field} disabled={formDisabled} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email ID</FormLabel>
              <FormControl>
                <Input type="email" placeholder="name@example.com" {...field} disabled={formDisabled} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Password</FormLabel>
              <FormControl>
                <Input type="password" placeholder="•••••••• (min. 6 characters)" {...field} disabled={formDisabled} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" className="w-full" disabled={formDisabled}>
          {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {isSubmitting ? 'Signing Up...' : 'Sign Up'}
        </Button>
      </form>
    </Form>
  );
}

