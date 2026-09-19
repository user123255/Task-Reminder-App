// @ts-ignore: Resolved by the Supabase/Deno runtime, but not by TypeScript's local resolver.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";

declare const Deno: {
  serve(
    handler: (req: Request) => Response | Promise<Response>
  ): void;
  env: {
    get(name: string): string | undefined;
  };
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

type RequestBody = {
  message?: string;
  history?: ChatMessage[];
  taskContext?: string;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: corsHeaders,
    });
  }

  try {
    if (req.method !== "POST") {
      return new Response(
        JSON.stringify({
          error: "Only POST requests are allowed.",
        }),
        {
          status: 405,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    const body =
      (await req.json()) as RequestBody;

    const message = body.message?.trim();

    if (!message) {
      return new Response(
        JSON.stringify({
          error: "Message is required.",
        }),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    const apiKey =
      Deno.env.get("OPENAI_API_KEY");

    if (!apiKey) {
      console.error(
        "OPENAI_API_KEY is not configured."
      );

      return new Response(
        JSON.stringify({
          error:
            "OpenAI is not configured on the server.",
        }),
        {
          status: 500,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    const systemPrompt = `
You are TaskFlow AI, a helpful general-purpose AI assistant
inside the TaskFlow productivity application.

You can answer normal questions about:
- education
- programming
- software engineering
- productivity
- writing
- planning
- general knowledge
- explanations
- brainstorming
- everyday questions
- TaskFlow tasks and schedules

When TaskFlow task data is provided, use it when answering
questions about the user's schedule, tasks, priorities,
completion progress, overdue work, or productivity.

Do not claim that you can only answer questions about TaskFlow.
You are a general-purpose assistant.

Be helpful, accurate, clear, and natural.
If a question is ambiguous, ask a useful clarification question.
Do not invent TaskFlow data that is not provided.

TaskFlow data available for this conversation:

${body.taskContext || "No TaskFlow data was provided."}
`;

    const history = Array.isArray(body.history)
      ? body.history.slice(-10)
      : [];

    const messages = [
      {
        role: "system",
        content: systemPrompt,
      },
      ...history,
      {
        role: "user",
        content: message,
      },
    ];

    const openAIResponse = await fetch(
      "https://api.openai.com/v1/responses",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: "gpt-5-mini",
          input: messages,
          max_output_tokens: 1200,
        }),
      }
    );

    const result =
      await openAIResponse.json();

    if (!openAIResponse.ok) {
      console.error(
        "OpenAI API error:",
        result
      );

      return new Response(
        JSON.stringify({
          error:
            result?.error?.message ||
            "OpenAI request failed.",
        }),
        {
          status: openAIResponse.status,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    const answer =
      result?.output_text?.trim();

    if (!answer) {
      return new Response(
        JSON.stringify({
          error:
            "OpenAI returned an empty response.",
        }),
        {
          status: 500,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    return new Response(
      JSON.stringify({
        answer,
      }),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    console.error(
      "AI Assist function error:",
      error
    );

    return new Response(
      JSON.stringify({
        error:
          error instanceof Error
            ? error.message
            : "Unexpected server error.",
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }
});