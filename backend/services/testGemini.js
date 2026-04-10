import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";
dotenv.config();

async function test() {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const result = await model.generateContent("Respond with 'OK' if you can read this.");
    console.log("✅ Gemini Response:", result.response.text());
  } catch (error) {
    console.error("❌ Gemini API error:", error);
  }
}
test();
