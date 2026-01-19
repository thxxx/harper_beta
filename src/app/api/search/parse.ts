import { logger } from "@/utils/logger";
import { geminiInference } from "@/lib/llm/llm";
import { ensureGroupBy } from "@/utils/textprocess";
import { sqlExistsPrompt, sqlPrompt2 } from "@/lib/prompt";

export async function parseQueryWithLLM(
  queryText: string,
  criteria: string[],
  extraInfo: string = ""
): Promise<string | any> {
  logger.log("🔥 시작 parseQueryWithLLM: ", queryText, criteria, extraInfo);

  try {
    let prompt = `
  ${sqlPrompt2}
  Natural Language Query: ${queryText}
  Criteria: ${criteria}
  `.trim();

    if (extraInfo) prompt += `Extra Info: ${extraInfo}`;

    const outText = await geminiInference(
      "gemini-3-flash-preview",
      "You are a head hunting expertand SQL Query parser. Your input is a natural-language request describing criteria for searching job candidates.",
      prompt,
      0.5
    );

    const cleanText = (outText as string).trim().replace(/\n/g, " ").trim();
    logger.log("🔥 First query: ", cleanText);

    const sqlQuery = `
  SELECT DISTINCT ON (T1.id)
    to_json(T1.id) AS id,
    T1.name,
    T1.headline,
    T1.location
  FROM 
    candid AS T1
  ${cleanText}
  `;
    const sqlQueryWithGroupBy = ensureGroupBy(sqlQuery, "");

    const refinePrompt =
      sqlExistsPrompt + `\n Input SQL Query: """${sqlQueryWithGroupBy}"""`;

    const outText2 = await geminiInference(
      "gemini-3-flash-preview",
      "You are a SQL Query refinement expert, for stable and fast search.",
      refinePrompt,
      0.4
    );

    const cleanedResponse2 = (outText2 as string)
      .trim()
      .replace(/\n/g, " ")
      .trim();
    logger.log("🥬 Second query: ", cleanedResponse2);
    const sqlQueryWithGroupBy2 = ensureGroupBy(cleanedResponse2, "");

    return sqlQueryWithGroupBy2;
  } catch (e) {
    logger.log("parseQueryWithLLM error", e);
    return e;
  }
}
