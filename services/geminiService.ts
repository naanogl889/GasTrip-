
import { GoogleGenAI, Type } from "@google/genai";
import { TripData, HelperType } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const getFuelInsights = async (data: TripData) => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Analiza este viaje: ${data.distance}km, ${data.consumption}L/100km, ${data.price}€/L.`,
      config: {
        systemInstruction: "Eres un experto en eficiencia de conducción. Genera 3 consejos breves en JSON sobre cómo ahorrar específicamente en este tipo de viaje. Formato: [{title, tip, impact: 'low'|'medium'|'high'}]",
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              tip: { type: Type.STRING },
              impact: { type: Type.STRING }
            },
            required: ["title", "tip", "impact"]
          }
        }
      },
    });
    return response.text ? JSON.parse(response.text) : [];
  } catch (error) {
    return [];
  }
};

export const getSmartHelper = async (type: HelperType, params: any) => {
  const model = type === 'distance' ? 'gemini-3-flash-preview' : 'gemini-3-flash-preview';
  const tools = type === 'distance' || type === 'price' ? [{ googleSearch: {} }] : [];
  
  let prompt = "";
  let systemInstruction = "Eres un asistente de datos de viaje. Responde exclusivamente con el número solicitado (puedes usar decimales con punto). No incluyas texto, unidades ni explicaciones.";

  if (type === 'distance') {
    prompt = `¿Cuántos kilómetros hay por carretera entre ${params.origin} y ${params.destination}? Devuelve la distancia de SOLO UN TRAYECTO.`;
  } else if (type === 'consumption') {
    prompt = `Estima el consumo medio real en L/100km para un coche modelo "${params.carModel}" en ciclo "${params.routeType}".`;
  } else if (type === 'price') {
    prompt = `¿Cuál es el precio medio actual por litro de ${params.fuelType} en la ciudad de ${params.city}? Busca datos reales de hoy.`;
  }

  try {
    const response = await ai.models.generateContent({
      model: model,
      contents: prompt,
      config: {
        systemInstruction,
        tools: tools as any,
      },
    });
    const text = response.text || "";
    const match = text.match(/\d+[.,]?\d*/);
    return match ? parseFloat(match[0].replace(',', '.')) : null;
  } catch (error) {
    console.error("Helper error:", error);
    return null;
  }
};
