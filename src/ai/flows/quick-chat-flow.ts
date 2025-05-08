'use server';
/**
 * @fileOverview A quick chatbot flow for answering general questions about MentorConnect.
 *
 * - quickChatFlow - Handles the chatbot interaction.
 * - QuickChatInput - Input schema for the flow.
 * - QuickChatOutput - Output schema for the flow.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

// Input schema for the chatbot flow
// REMOVED export keyword
const QuickChatInputSchema = z.object({
  message: z.string().describe('The user\'s message to the chatbot.'),
  // Optional: Add conversation history if needed for more context
  // history: z.array(z.object({ role: z.enum(['user', 'model']), text: z.string() })).optional(),
});
export type QuickChatInput = z.infer<typeof QuickChatInputSchema>;

// Output schema for the chatbot flow
// REMOVED export keyword
const QuickChatOutputSchema = z.object({
  response: z.string().describe('The chatbot\'s response message.'),
});
export type QuickChatOutput = z.infer<typeof QuickChatOutputSchema>;

// Define the prompt for the chatbot
const quickChatPrompt = ai.definePrompt({
  name: 'quickChatPrompt',
  input: { schema: QuickChatInputSchema },
  output: { schema: QuickChatOutputSchema },
  prompt: `You are a helpful assistant for the MentorConnect platform.
  Your goal is to answer user questions about navigating the platform, understanding its features (like finding mentors/mentees, messaging, profile setup), or general mentorship advice.
  Be concise and helpful. If you cannot answer a specific question or it's too complex, politely suggest contacting support or exploring the relevant section of the platform.

  User's message: {{{message}}}

  Your response:`,
});

// Define the Genkit flow
const quickChatFlowFn = ai.defineFlow(
  {
    name: 'quickChatFlow',
    inputSchema: QuickChatInputSchema,
    outputSchema: QuickChatOutputSchema,
  },
  async (input) => {
    console.log("QuickChatFlow: Received input -", input.message);
    const { output } = await quickChatPrompt(input);
    console.log("QuickChatFlow: Generated response -", output?.response);
    // Ensure output is not null - provide a default fallback if necessary
    return output ?? { response: "Sorry, I couldn't generate a response right now. Please try again." };
  }
);

// Exported wrapper function to call the flow
export async function quickChatFlow(input: QuickChatInput): Promise<QuickChatOutput> {
  return quickChatFlowFn(input);
}
