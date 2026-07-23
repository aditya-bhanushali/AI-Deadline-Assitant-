import { GoogleGenerativeAI } from "@google/generative-ai";

/**
 * Parses university announcements, emails, or chat logs into structured deadline objects using Gemini API.
 * 
 * @param {string} text - Raw text content from email, WhatsApp, or Discord.
 * @param {string} selectedCourse - The targeted academic course.
 * @param {string} apiKey - Gemini API key.
 * @returns {Promise<Array>} List of extracted deadline objects.
 */
export async function parseDeadlinesWithGemini(text, selectedCourse, apiKey) {
  if (!apiKey || !apiKey.trim()) {
    throw new Error("Gemini API Key is missing. Please provide a valid key in Settings.");
  }

  const genAI = new GoogleGenerativeAI(apiKey.trim());

  // Use Gemini 2.5 Flash as primary model
  const model = genAI.getGenerativeModel({
    model: "gemini-2.5-flash",
    generationConfig: {
      responseMimeType: "application/json",
    }
  });

  const systemPrompt = `
You are a university academic assistant agent. You parse raw email messages, WhatsApp messages, or Discord chats to extract deadlines, exams, lab submissions, and syllabus schedules.

Analyze the input text and extract all events. Return a JSON array of objects with the exact structure below. 
If a specific field is not explicitly mentioned, infer a sensible value based on the text context.

Format requirements:
1. "course": Use "${selectedCourse}" as default, unless a specific course is explicitly named in the text.
2. "title": A brief, descriptive title of the assignment, quiz, exam, or project.
3. "description": A concise summary of syllabus requirements, submission guidelines, or syllabus context.
4. "dueDate": Format as a local ISO datetime string (e.g. "YYYY-MM-DDTHH:MM"), such as "2026-07-25T23:59".
   - If the exact time isn't mentioned, default to "23:59".
   - If only a date is mentioned, use that date.
   - If no year is mentioned, assume current year 2026.
5. "urgency": Return either "High", "Medium", or "Low" based on the professor's tone, weightage, or proximity.
6. "status": Always default to "Pending".

Example output format:
[
  {
    "course": "${selectedCourse}",
    "title": "Assignment 3: Routing Protocols",
    "description": "Implement Dijkstra's routing algorithms in Python. Worth 10% of overall grade.",
    "dueDate": "2026-07-24T23:59",
    "urgency": "High",
    "status": "Pending"
  }
]
`;

  const userPrompt = `Input Text announcement to parse:\n"""\n${text}\n"""`;

  try {
    const result = await model.generateContent([systemPrompt, userPrompt]);
    const responseText = result.response.text();
    
    // Sanitize response string (remove code block wrappers if present)
    let cleanedText = responseText.trim();
    cleanedText = cleanedText.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();

    const parsedData = JSON.parse(cleanedText);
    
    let deadlineArray = [];
    if (Array.isArray(parsedData)) {
      deadlineArray = parsedData;
    } else if (parsedData && typeof parsedData === 'object') {
      // Find the first array property in the object (e.g. parsedData.deadlines, parsedData.events, parsedData.items)
      const foundArray = Object.values(parsedData).find(val => Array.isArray(val));
      if (foundArray) {
        deadlineArray = foundArray;
      } else {
        throw new Error("No deadline list found in AI response format.");
      }
    } else {
      throw new Error("Invalid response format from Gemini API.");
    }

    if (deadlineArray.length === 0) {
      return [];
    }
    
    return deadlineArray.map((item, index) => ({
      course: item.course || selectedCourse,
      title: item.title || "Parsed Deadline",
      description: item.description || "",
      dueDate: item.dueDate || new Date().toISOString().slice(0, 16),
      urgency: item.urgency || "Medium",
      status: item.status || "Pending",
      id: `dl-gemini-${Date.now()}-${index}`
    }));
  } catch (error) {
    console.error("Gemini Parsing Error:", error);
    throw new Error(error.message || "Failed to parse text with Gemini Agent.");
  }
}
