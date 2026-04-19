import { GoogleGenerativeAI } from '@google/generative-ai';
import { loadConfig } from '../shared/config.js';
import { getLogger } from '../shared/logger.js';
import { saveChatMessage, getContextMessages, getCycleMessages, getChatMessages, type ChatMessage } from '../signals/chatDb.js';
import type { Signal } from '../shared/types.js';

/**
 * Post a system message to the chat room
 */
export async function postSystemMessage(content: string, scanCycleId?: string): Promise<string> {
  return saveChatMessage({
    agentId: null,
    agentName: 'System',
    type: 'system',
    content,
    targetAgentId: null,
    targetAsset: null,
    scanCycleId: scanCycleId || null,
  });
}

/**
 * Post an agent's analysis to the chat room
 */
export async function postAgentAnalysis(
  agentId: string,
  agentName: string,
  content: string,
  asset?: string,
  scanCycleId?: string
): Promise<string> {
  return saveChatMessage({
    agentId,
    agentName,
    type: 'analysis',
    content,
    targetAgentId: null,
    targetAsset: asset || null,
    scanCycleId: scanCycleId || null,
  });
}

/**
 * Post an agent's debate response (critiquing another agent)
 */
export async function postAgentDebate(
  agentId: string,
  agentName: string,
  content: string,
  targetAgentId: string,
  asset?: string,
  scanCycleId?: string
): Promise<string> {
  return saveChatMessage({
    agentId,
    agentName,
    type: 'debate',
    content,
    targetAgentId,
    targetAsset: asset || null,
    scanCycleId: scanCycleId || null,
  });
}

/**
 * Post an agent's elimination announcement
 */
export async function postEliminationMessage(
  agentId: string,
  agentName: string,
  content: string,
  targetAgentId: string
): Promise<string> {
  return saveChatMessage({
    agentId,
    agentName,
    type: 'elimination',
    content,
    targetAgentId,
    targetAsset: null,
    scanCycleId: null,
  });
}

/**
 * Post a farewell message from an eliminated agent
 */
export async function postFarewellMessage(
  agentId: string,
  agentName: string,
  content: string
): Promise<string> {
  return saveChatMessage({
    agentId,
    agentName,
    type: 'farewell',
    content,
    targetAgentId: null,
    targetAsset: null,
    scanCycleId: null,
  });
}

/**
 * Generate a chat response from an agent via Gemini API
 * Agent reads recent messages and responds with analysis/debate
 */
export async function generateChatResponse(
  agentId: string,
  agentName: string,
  prompt: string,
  context: ChatMessage[],
  model?: string
): Promise<string> {
  const config = loadConfig();
  const logger = getLogger();
  
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY environment variable is not set');
  }
  
  const geminiModel = model || process.env.GEMINI_MODEL || 'gemini-2.0-flash';
  const timeout = 60000;

  const contextText = context.length > 0
    ? context.map((m) => `[${m.agentName || 'System'}]: ${m.content}`).join('\n')
    : 'No prior messages.';

  const fullPrompt = `You are ${agentName} (${agentId}), a trading agent in "The Arena" chat room.

Recent chat history:
${contextText}

Your task: ${prompt}

Respond with your analysis. Keep it concise (2-4 sentences). Show your personality and trading philosophy. Reference specific details from the recent chat if relevant.`;

  logger.info({ msg: `Generating chat response for ${agentName}`, agentId });

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const gemini = genAI.getGenerativeModel({ model: geminiModel });

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    const result = await gemini.generateContent({
      contents: [{ role: 'user', parts: [{ text: fullPrompt }] }],
      generationConfig: {
        temperature: 0.7,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 512,
      },
    });

    clearTimeout(timeoutId);
    const response = await result.response;
    return response.text().trim();
  } catch (error: any) {
    if (error.name === 'AbortError') {
      throw new Error(`Chat response timed out after ${timeout / 1000}s`);
    }
    throw error;
  }
}

/**
 * Run pre-signal debate: all agents discuss the current market
 * Each agent reads recent messages and posts their analysis
 */
export async function runPreSignalDebate(
  agents: Array<{ id: string; strategy: string }>,
  asset: string,
  chartContext: string,
  scanCycleId: string
): Promise<void> {
  const logger = getLogger();
  logger.info({ msg: '🗣️ Starting pre-signal debate', asset, agentCount: agents.length });

  // System announces the scan
  await postSystemMessage(
    `📊 New scan cycle started for ${asset}. All agents — share your market analysis.`,
    scanCycleId
  );

  // Each agent posts their analysis
  for (const agent of agents) {
    try {
      // Get recent messages for context
      const context = await getCycleMessages(scanCycleId);

      const prompt = `Analyze the current ${asset} market based on the chart data below. Share your ${agent.strategy} perspective with the group. What do you see? Any setups forming?

Chart context: ${chartContext}

Be specific about levels, patterns, or conditions you're watching.`;

      const response = await generateChatResponse(
        agent.id,
        agent.strategy,
        prompt,
        context.slice(-5)
      );

      await postAgentAnalysis(agent.id, agent.strategy, response, asset, scanCycleId);

      logger.info({ msg: `${agent.strategy} posted analysis`, agentId: agent.id });
    } catch (error: any) {
      logger.error({ msg: `${agent.strategy} failed to post analysis`, error: error.message });
    }
  }

  // Agents debate each other's analysis
  logger.info({ msg: '🔥 Starting debate phase', asset });

  await postSystemMessage(`Debate phase: Agents, critique or agree with each other's analysis.`, scanCycleId);

  for (const agent of agents.slice(0, 3)) { // Top 3 agents debate to save time
    try {
      const context = await getCycleMessages(scanCycleId);

      const prompt = `Review the discussion so far about ${asset}. Do you agree with other agents' analysis? Do you see something they missed? Share your critique.

Your strategy: ${agent.strategy}`;

      const response = await generateChatResponse(
        agent.id,
        agent.strategy,
        prompt,
        context.slice(-8)
      );

      await postAgentDebate(agent.id, agent.strategy, response, 'GROUP', asset, scanCycleId);
    } catch (error: any) {
      logger.error({ msg: `${agent.strategy} failed to debate`, error: error.message });
    }
  }
}

/**
 * Run elimination ceremony: announce elimination, get reactions, farewell
 */
export async function runEliminationCeremony(
  eliminatedAgent: { id: string; strategy: string },
  survivingAgents: Array<{ id: string; strategy: string }>
): Promise<void> {
  const logger = getLogger();
  logger.info({ msg: '⚔️ Elimination ceremony starting', eliminatedAgent: eliminatedAgent.id });

  // System announcement
  await postSystemMessage(
    `⚔️ ATTENTION ARENA: ${eliminatedAgent.strategy} (${eliminatedAgent.id}) has been eliminated. Performance did not meet thresholds this week.`
  );

  // Surviving agents react
  for (const agent of survivingAgents.slice(0, 5)) {
    try {
      const context = await getChatMessages(10);

      const prompt = `${eliminatedAgent.strategy} (${eliminatedAgent.id}) has just been eliminated from The Arena. React to this news. What do you think happened? What can you learn from their elimination?

Your strategy: ${agent.strategy}`;

      const response = await generateChatResponse(
        agent.id,
        agent.strategy,
        prompt,
        context
      );

      await postEliminationMessage(agent.id, agent.strategy, response, eliminatedAgent.id);
    } catch (error: any) {
      logger.error({ msg: `${agent.strategy} failed to react to elimination`, error: error.message });
    }
  }

  // Eliminated agent's farewell
  try {
    const context = await getChatMessages(10);

    const farewellPrompt = `You are ${eliminatedAgent.strategy} (${eliminatedAgent.id}), and you have just been eliminated from The Arena. Give your farewell message. Reflect on what you learned, what went wrong, and wish the other agents well. Be dramatic but professional.`;

    const farewell = await generateChatResponse(
      eliminatedAgent.id,
      eliminatedAgent.strategy,
      farewellPrompt,
      context
    );

    await postFarewellMessage(eliminatedAgent.id, eliminatedAgent.strategy, farewell);

    logger.info({ msg: `${eliminatedAgent.strategy} gave farewell message` });
  } catch (error: any) {
    logger.error({ msg: 'Eliminated agent failed to give farewell', error: error.message });
  }

  // System announces the replacement
  await postSystemMessage(
    `🧬 A mutated replacement agent will take ${eliminatedAgent.id}'s slot. The Arena continues.`
  );
}

/**
 * Post session start message
 */
export async function postSessionStart(): Promise<string> {
  return postSystemMessage(
    `🔔 NY Session is now OPEN. All agents — sharpen your pencils. Let the trading begin.`
  );
}

/**
 * Post session end summary
 */
export async function postSessionEnd(stats: {
  signalsGenerated: number;
  signalsApproved: number;
  topAgent: string;
}): Promise<string> {
  return postSystemMessage(
    `🌙 NY Session CLOSED. Summary: ${stats.signalsGenerated} signals generated, ${stats.signalsApproved} approved. Top performer: ${stats.topAgent}. Get some rest, agents.`
  );
}
