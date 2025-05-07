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
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";
import type { UserType, StudentProfile, AlumniProfile } from "@/types";
import { USER_TYPES, COURSES, UNIVERSITIES_SAMPLE, SKILLS_AND_FIELDS } from "@/lib/constants";
import { useRouter } from "next/navigation";

const baseSchema = z.object({
  userType: z.enum([USER_TYPES.STUDENT, USER_TYPES.ALUMNI], {
    required_error: "Please select if you are a student or alumni.",
  }),
  // profileImageUrl: z.string().url().optional().or(z.literal("")), // Optional for now
  contactNo: z.string().min(10, "Contact number must be at least 10 digits.").optional().or(z.literal("")),
  address: z.string().min(5, "Address seems too short.").optional().or(z.literal("")),
});

const studentSchema = baseSchema.extend({
  userType: z.literal(USER_TYPES.STUDENT),
  pursuingCourse: z.string().min(1, "Please select your current course."),
  university: z.string().min(1, "Please select your university."),
  fieldOfInterest: z.string().min(1, "Please select your field of interest."),
});

const alumniSchema = baseSchema.extend({
  userType: z.literal(USER_TYPES.ALUMNI),
  passOutUniversity: z.string().min(1, "Please select your pass out university."),
  bio: z.string().min(20, "Bio should be at least 20 characters.").max(500, "Bio cannot exceed 500 characters."),
  workingField: z.string().min(1, "Please select your working field."),
});

// A discriminated union schema
const profileSetupFormSchema = z.discriminatedUnion("userType", [
  studentSchema,
  alumniSchema,
]);


type ProfileSetupFormValues = z.infer<typeof profileSetupFormSchema>;

export function ProfileSetupForm() {
  const { firebaseUser, currentUser, completeProfile, loading: authLoading, error: authError } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const form = useForm<ProfileSetupFormValues>({
    resolver: zodResolver(profileSetupFormSchema),
    defaultValues: {
      // userType: undefined, // Will be set by radio button selection
      // profileImageUrl: "",
      contactNo: "",
      address: "",
      // Conditional fields will appear once userType is selected
    },
  });

  const userType = form.watch("userType");

  useEffect(() => {
    if (!firebaseUser && !authLoading) {
      toast({ title: "Not Authenticated", description: "Please login to setup your profile.", variant: "destructive"});
      router.push("/login");
    }
  }, [firebaseUser, authLoading, router, toast]);


  async function onSubmit(values: ProfileSetupFormValues) {
    if (!firebaseUser) {
      toast({ title: "Error", description: "You are not logged in.", variant: "destructive" });
      return;
    }
    
    setIsLoading(true);
    const { userType, ...profileData } = values;

    try {
      await completeProfile(firebaseUser.uid, userType as UserType, profileData as StudentProfile | AlumniProfile);
      toast({
        title: "Profile Complete!",
        description: "Your profile has been successfully set up.",
      });
      // Redirection is handled by AuthContext after profile completion
    } catch (e: any) {
      toast({
        title: "Profile Setup Failed",
        description: authError || e.message || "An unexpected error occurred.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }

  if (authLoading || !firebaseUser) {
    return <div className="flex justify-center items-center h-64"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }
  
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <FormField
          control={form.control}
          name="userType"
          render={({ field }) => (
            <FormItem className="space-y-3">
              <FormLabel className="text-lg font-semibold">Are you a Student or Alumni?</FormLabel>
              <FormControl>
                <RadioGroup
                  onValueChange={(value) => {
                    field.onChange(value);
                    // Reset conditional fields when userType changes to avoid validation errors from previous type
                    if (value === USER_TYPES.STUDENT) {
                      form.reset({ ...form.getValues(), userType: value, passOutUniversity: undefined, bio: undefined, workingField: undefined });
                    } else if (value === USER_TYPES.ALUMNI) {
                      form.reset({ ...form.getValues(), userType: value, pursuingCourse: undefined, university: undefined, fieldOfInterest: undefined });
                    }
                  }}
                  defaultValue={field.value}
                  className="flex space-x-4"
                >
                  <FormItem className="flex items-center space-x-2 p-3 border rounded-md hover:bg-accent/50 has-[[data-state=checked]]:bg-primary has-[[data-state=checked]]:text-primary-foreground has-[[data-state=checked]]:border-primary transition-colors">
                    <FormControl>
                      <RadioGroupItem value={USER_TYPES.STUDENT} className="border-muted-foreground data-[state=checked]:border-primary-foreground"/>
                    </FormControl>
                    <FormLabel className="font-medium cursor-pointer">Student</FormLabel>
                  </FormItem>
                  <FormItem className="flex items-center space-x-2 p-3 border rounded-md hover:bg-accent/50 has-[[data-state=checked]]:bg-primary has-[[data-state=checked]]:text-primary-foreground has-[[data-state=checked]]:border-primary transition-colors">
                    <FormControl>
                      <RadioGroupItem value={USER_TYPES.ALUMNI} className="border-muted-foreground data-[state=checked]:border-primary-foreground"/>
                    </FormControl>
                    <FormLabel className="font-medium cursor-pointer">Alumni</FormLabel>
                  </FormItem>
                </RadioGroup>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Common Fields: Profile Image, Contact, Address */}
        {/* <FormField
          control={form.control}
          name="profileImageUrl"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Profile Image URL (Optional)</FormLabel>
              <FormControl>
                <Input placeholder="https://example.com/image.png" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        /> */}

        <FormField
          control={form.control}
          name="contactNo"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Contact Number</FormLabel>
              <FormControl>
                <Input type="tel" placeholder="e.g., +1234567890" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="address"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Address</FormLabel>
              <FormControl>
                <Textarea placeholder="123 Main St, Anytown, USA" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        {/* Student Specific Fields */}
        {userType === USER_TYPES.STUDENT && (
          <>
            <FormField
              control={form.control}
              name="pursuingCourse"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Current Pursuing Course</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select your course" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {COURSES.map((course) => (
                        <SelectItem key={course} value={course}>
                          {course}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="university"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name of University</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select your university" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {UNIVERSITIES_SAMPLE.map((uni) => (
                        <SelectItem key={uni} value={uni}>
                          {uni}
                        </SelectItem>
                      ))}
                      {/* In a real app, this list would be much longer or searchable */}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="fieldOfInterest"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Field of Interest</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select your primary interest" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {SKILLS_AND_FIELDS.map((skill) => (
                        <SelectItem key={skill} value={skill}>
                          {skill}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </>
        )}

        {/* Alumni Specific Fields */}
        {userType === USER_TYPES.ALUMNI && (
          <>
            <FormField
              control={form.control}
              name="passOutUniversity"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Pass Out Undergraduate University</FormLabel>
                   <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select your university" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {UNIVERSITIES_SAMPLE.map((uni) => (
                        <SelectItem key={uni} value={uni}>
                          {uni}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="bio"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Bio</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Tell us about your qualifications, degrees, achievements, current work, etc. (min 20 characters)"
                      className="min-h-[100px]"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="workingField"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Working Field</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select your primary working field" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {SKILLS_AND_FIELDS.map((skill) => (
                        <SelectItem key={skill} value={skill}>
                          {skill}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </>
        )}
        
        <Button type="submit" className="w-full text-lg py-6" disabled={isLoading || !userType}>
          {isLoading && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
          Complete Profile & Continue
        </Button>
      </form>
    </Form>
  );
}
