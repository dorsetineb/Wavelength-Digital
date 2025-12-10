import { GoogleGenAI, Type } from "@google/genai";
import { ConceptCard } from "../types";

export const generateConceptCards = async (): Promise<ConceptCard[]> => {
  const apiKey = process.env.API_KEY;

  if (apiKey && typeof apiKey === 'string') {
    try {
      const ai = new GoogleGenAI({ apiKey: apiKey });

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: "Gere 10 pares de conceitos opostos criativos e divertidos para o jogo 'Sintonia' (Wavelength) em Português. Os conceitos devem ser um espectro (ex: Quente / Frio, Herói / Vilão, Inútil / Útil). Retorne apenas JSON.",
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                left: { type: Type.STRING, description: "Conceito da esquerda (ex: Feio)" },
                right: { type: Type.STRING, description: "Conceito da direita (ex: Bonito)" }
              },
              required: ["left", "right"]
            }
          }
        }
      });

      if (response.text) {
        const data = JSON.parse(response.text) as ConceptCard[];
        if (Array.isArray(data) && data.length > 0) {
          return data;
        }
      }
    } catch (error) {
      console.error("AI Generation failed, switching to offline fallback.");
    }
  }

  // Fallback if API key is missing or request fails
  return getFallbackCards();
};

const getFallbackCards = (): ConceptCard[] => [
  { left: "Frio", right: "Quente" },
  { left: "Ruim", right: "Bom" },
  { left: "Feio", right: "Bonito" },
  { left: "Silencioso", right: "Barulhento" },
  { left: "Seco", right: "Molhado" },
  { left: "Sem Talento", right: "Talentoso" },
  { left: "Herói", right: "Vilão" },
  { left: "Normal", right: "Estranho" },
  { left: "Tempero Suave", right: "Apimentado" },
  { left: "Filme Ruim", right: "Filme Bom" },
  { left: "Duro", right: "Mole" },
  { left: "Triste", right: "Feliz" },
  { left: "Inútil", right: "Útil" },
  { left: "Barato", right: "Caro" },
  { left: "Superestimado", right: "Subestimado" }
];