import { GoogleGenAI } from "@google/genai";

let aiClient: GoogleGenAI | null = null;

function getAiClient(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY environment variable is missing.");
    }
    aiClient = new GoogleGenAI({ apiKey });
  }
  return aiClient;
}

export async function generateEngagementStrategy(platform: string, targetUrlOrNiche: string) {
  try {
    const ai = getAiClient();
    const prompt = `You are an expert Social Media Growth & Engagement Botting Strategist for BoostBotting.site.
Analyze the target on platform "${platform}" with link/niche "${targetUrlOrNiche}".

Provide a structured, highly actionable growth plan containing:
1. Recommended Services & Quantities (e.g., Views vs. Likes vs. Followers ratio for algorithmic boost).
2. Drip-Feed Schedule (e.g. 5 runs over 24 hours to look 100% natural and trigger FYP/Explore page).
3. 10 High-Performing Target Hashtags & Keywords.
4. Estimated Reach Multiplier (e.g. +350% Reach, +180% Engagement Rate).
5. 5 Natural Custom Comments tailored to this niche.

Return JSON with keys:
"summary": string,
"recommendedOrder": { "serviceType": string, "quantity": number, "dripfeedRuns": number, "intervalMins": number },
"hashtags": string[],
"viralMultiplier": string,
"sampleComments": string[]
`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        temperature: 0.7
      }
    });

    const text = response.text;
    if (!text) throw new Error("Empty AI response");
    return JSON.parse(text);
  } catch (error: unknown) {
    console.warn("Gemini strategy generation fallback:", error);
    return {
      summary: `Growth optimization plan for ${platform} link. Boosting engagement with balanced likes-to-views ratio triggers algorithmic organic reach.`,
      recommendedOrder: {
        serviceType: `${platform} Likes + Views Drip-Feed`,
        quantity: 5000,
        dripfeedRuns: 5,
        intervalMins: 120
      },
      hashtags: ["#viral", `#${platform.toLowerCase()}`, "#trending", "#foryou", "#growth", "#engagement", "#explorepage"],
      viralMultiplier: "+280% Reach Multiplier",
      sampleComments: [
        "This is top tier content right here! 🔥",
        "Couldn't agree more with this post 💯",
        "Algorithm brought me here and I'm glad it did!",
        "Subscribed/followed instantly 🙌",
        "Quality edit and awesome breakdown 🚀"
      ]
    };
  }
}

export async function generateCustomCommentsBatch(platform: string, nicheOrTopic: string, count: number) {
  try {
    const ai = getAiClient();
    const prompt = `Generate exactly ${count} realistic, engaging, non-spammy custom comments for a post on ${platform} about "${nicheOrTopic}".
Each comment must be on a new line. Include popular context-appropriate emojis. Return plain text only.`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
    });

    const lines = (response.text || "").split("\n").map(l => l.trim()).filter(l => l.length > 0);
    return lines.slice(0, count);
  } catch (error) {
    console.warn("Fallback custom comments generator:", error);
    const fallbacks = [
      "This is pure fire! 🔥🔥",
      "Great insights! Really appreciate this post 💯",
      "Saving this reel for later 📌",
      "So true! Thanks for sharing this 🙌",
      "Awesome quality content as always 🚀",
      "The algorithm knew I needed to see this today ✨",
      "Loved this post! Keep 'em coming 👏",
      "Super helpful breakdown! 👍",
      "Tagging my friends for this! 🎯",
      "Clean visuals and great timing 🔥"
    ];
    return Array.from({ length: count }, (_, i) => fallbacks[i % fallbacks.length]);
  }
}
