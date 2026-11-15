# Chapter 5 — Agents and Integration

**Goal of this chapter:** after it, you understand what an agent really is, when to use one and when not, how MCP connects models to tools, and how speech and event-driven processing fit into an AI system.

---

## 34. What an agent is

### The idea
An **agent** is a model that uses tools **in a loop** and decides by itself what to do next, until the task is done.

```
agent = model + tools + loop
```

### The loop

```java
messages.add(userTask);
for (int step = 0; step < MAX_STEPS; step++) {
    Response r = model.call(messages, tools);
    messages.add(r);
    if (!r.wantsTool()) {
        return r.text();                 // finished
    }
    Object result = runTool(r.toolCall());   // act
    messages.add(toolResult(result));        // observe
}
throw new StepLimitReached();
```

Think → act → observe → think again. Tool calling (chapter 3) is one turn of this loop; an agent is many turns with the model in charge.

### Workflow versus agent
This distinction is the most useful one in the chapter.

| | Workflow | Agent |
|---|---|---|
| Who decides the steps | You, in code | The model, at run time |
| Predictable | Yes | Less |
| Cost and time | Known | Varies |
| Good for | Tasks with known steps | Open tasks where steps cannot be known ahead |

Processing a finished meeting is a **workflow**: store → extract → embed → done. The steps never change, so write them in code.

Answering "Why is the price import late, and who should I talk to?" may be an **agent** task: search meetings, look at action items, search again with what it learned, then answer.

### The rule
**Use the simplest thing that works.** One good prompt before a workflow; a workflow before an agent. Agents cost more, take longer, and fail in more interesting ways. Choose them when the flexibility is truly needed.

### Remember
An agent is a model calling tools in a loop and choosing its own next step. Prefer fixed workflows when the steps are known.

---

## 35. Agent and workflow patterns

### The common patterns

1. **Prompt chaining.** Split a task into fixed steps; each call uses the previous output.
   *Transcript → clean up → extract items → write summary.*

2. **Routing.** First classify the input, then send it to the right handler.
   *Question → "count/list" → SQL route; "find a moment" → RAG route (chapter 4).*

3. **Parallelisation.** Run independent calls at the same time and combine them.
   *Extract decisions, action items and blockers in three parallel calls.*

4. **Orchestrator and workers.** One model splits the task into sub-tasks at run time, hands them to worker calls, and combines the results.

5. **Evaluator and optimiser.** One call produces, another checks against criteria; repeat until good enough.
   *Write the summary → check "is every action item in the transcript?" → fix.*

6. **ReAct (Reason + Act).** The basic agent loop: the model writes a thought, picks an action, reads the result, repeats.

7. **Planning.** For long tasks the model first writes a plan, then carries it out step by step, and updates the plan when something unexpected happens.

Patterns 1–5 are workflows. 6 and 7 are agent behaviour.

### How agents fail
- **Loops**: calling the same tool with the same arguments again and again.
- **Compounding errors**: if each step is 95% reliable, ten steps in a row are only about 60% reliable (0.95¹⁰). Long chains need checks in between.
- **Lost goal**: after many steps the original task fades from attention.
- **Cost surprises**: every step re-sends the growing history.

### Guardrails for agents
- A **maximum number of steps** and a **token or cost budget**.
- **Detect repeats** and stop.
- **Clear stop condition**: what counts as done.
- **Good tool errors**, so the model can recover.
- **Human approval** before actions that change something.
- **Log every step**: thought, tool, arguments, result. Without a trace you cannot debug an agent.

### Remember
Know the patterns, start with the fixed ones, and give every agent a step limit, a budget and a trace.

---

## 36. Multi-agent systems

### The idea
Instead of one agent with one long context, several agents work together. The usual shape is an **orchestrator** that delegates to **sub-agents**. Each sub-agent has its own context window, its own instructions and its own tools, and returns only a short result.

### Why
- **Context isolation.** A sub-agent can read 50 pages and return 10 lines. The orchestrator's context stays small and clean.
- **Parallel work.** Independent sub-tasks run at the same time.
- **Specialisation.** Each agent has a focused prompt and few tools, which makes it more reliable.

### The price
- **Many more tokens**: several times the cost of a single agent.
- **Information loss at every hand-over.** The sub-agent knows only what the orchestrator wrote in its task; the orchestrator sees only the summary that came back.
- **Harder debugging**: several traces instead of one.

### When it is worth it
Broad tasks that split into independent parts, such as researching many sources at once. Not for tasks where each step depends on the one before; a single agent does those better.

For the Scrum Memory Assistant you do not need multi-agent design. Knowing why is part of the skill.

### Remember
Multi-agent buys clean context and parallelism and pays with tokens and lost detail. Use it for wide, separable work only.

---

## 37. MCP: the Model Context Protocol

### The idea
Every AI application needs tools, and every tool had to be wired into every application separately. **MCP** is an open standard that fixes this: write a tool server once, and any MCP-capable application can use it. People call it "USB-C for AI tools".

### The parts
```
Host application (Claude Code, an IDE, a chat app)
  └── MCP client  ⇄  MCP server (your service)
                        ├── tools      functions the model can call
                        ├── resources  data the app can read
                        └── prompts    ready-made prompt templates
```

- The **server** offers capabilities.
- The **client** lives inside the host application and talks to one server.
- Messages use JSON-RPC. Two transports are common: **stdio** (the server is a local process) and **HTTP** (the server runs remotely).

### What happens
1. The client connects and asks: "Which tools do you have?"
2. The server answers with names, descriptions and parameter schemas.
3. The host gives these tools to the model, like any other tool (chapter 3).
4. When the model asks for one, the client sends the call to the server and returns the result.

So MCP is not a new kind of intelligence. It is a **standard plug for tool calling**.

### Your service as an MCP server
With Spring AI's MCP server starter, the `@Tool` methods you already wrote can be exposed over MCP:

```java
@Bean
ToolCallbackProvider meetingToolProvider(MeetingTools tools) {
    return MethodToolCallbackProvider.builder().toolObjects(tools).build();
}
```

Then you can add your server to Claude Code or another client and ask, inside your normal work tool, "What did we decide about the timeout last week?" The same tools serve your own UI and every MCP client.

### Security
- An MCP server is an API. It needs authentication and per-user permissions like any API.
- Text returned by a tool can contain a prompt injection (chapter 2). Tool descriptions from servers you do not control can too. Install only servers you trust.
- Start with read-only tools.

### Remember
MCP is a standard way to offer tools, data and prompts to any AI application. Build the tool once, use it everywhere.

---

## 38. Speech AI: transcription, diarization, translation

### The idea
Your project starts with audio. These are the parts of the speech pipeline:

| Term | Meaning |
|---|---|
| **ASR / speech-to-text** | Audio in, text out |
| **Streaming transcription** | Text arrives while people speak; early words may be corrected a moment later |
| **Batch transcription** | The whole recording is processed afterwards; usually more accurate |
| **Diarization** | Working out *who spoke when* ("Speaker 1", "Speaker 2") |
| **Timestamps** | Start and end time of each word or segment |
| **Language identification** | Detecting the spoken language, also when it switches mid-meeting |
| **Translation** | Text in another language, live or afterwards |
| **Word error rate (WER)** | Share of wrong words; the usual quality measure |

### What goes wrong, and what it means for you
- **Names and special terms** are the most common errors: colleagues' names, product names, ticket numbers, abbreviations. Many speech services let you supply a word list or context. Use it.
- **Diarization mistakes**: two people merged into one, or one split into two; labels are anonymous ("Speaker 2"), so you need a step that maps them to real names.
- **Overlapping speech and bad microphones** lower quality sharply.
- **Translation adds its own errors** on top of transcription errors.

**Errors flow downstream.** If the transcript says "price report" instead of "price import", your search, summary and answers inherit the mistake.

### Design consequences for the Scrum Memory Assistant
1. **Store the raw result** exactly as the speech service returned it (text, speaker label, timestamps, language, confidence if given). Never keep only a cleaned version; you may want to reprocess later with better logic.
2. **Store original and translation side by side.** Search in the original language is often more accurate.
3. **Keep timestamps on every segment.** They power citations ("12 Nov, 09:07") and "jump to that moment".
4. **Add a correction step**: a glossary of names and terms, applied by rules or by an LLM pass, kept separate from the raw data.
5. **Map speakers to people** once per meeting and store the mapping.

### Remember
A transcript is imperfect data with speakers and times. Keep the raw version, keep timestamps, and plan for name and term errors.

---

## 39. Event-driven AI processing

### The idea
LLM work is slow (seconds to minutes) and fails now and then. Do not do heavy AI work inside a user's HTTP request. Use the pattern you already know from messaging systems: **events and background workers**.

### The flow

```
Translator app                Scrum Memory Assistant
"meeting finished" ──queue──▶ worker:
                               1. store raw transcript      (status: RECEIVED)
                               2. clean and chunk
                               3. extract summary and items (LLM, structured output)
                               4. embed chunks, store vectors
                               5. mark meeting              (status: READY)
```

The user's questions later hit a fast path: search plus one model call.

### Rules that matter
- **Idempotency.** Messages can arrive twice. Processing the same meeting again must not create duplicates: use the meeting id as a key and "upsert".
- **Status per step.** Save progress (`RECEIVED → EXTRACTED → EMBEDDED → READY / FAILED`). A retry continues from the failed step instead of paying for finished ones again.
- **Retries and a dead-letter queue.** Retry with backoff; after several failures park the message and alert, do not loop forever.
- **Rate-limit your workers.** Ten workers calling the model at once can hit the provider's limit (chapter 3). Control concurrency.
- **Make it re-runnable.** You *will* improve your prompt or switch the embedding model. Build a "reprocess meeting" or "reprocess all" command from day one. This is why you keep raw transcripts.
- **Batch APIs.** Some providers offer a batch mode for non-urgent work at a lower price, with results later. Good for reprocessing a year of meetings.

### How the translator app hands over
| Option | Good | Bad |
|---|---|---|
| REST call to the assistant | Simple | The app must retry if the assistant is down |
| Message queue | Decoupled, retries built in | One more component to run |

Both are fine. A queue fits better once other sources (uploads, other meeting tools) should feed the assistant too, which matters if this becomes a product.

### Remember
Do heavy AI work in background workers: idempotent, with status per step, retries, and the ability to reprocess everything.

---

## Exercises

1. **Hand-written loop.** Without Spring AI's automatic tool handling, write the agent loop yourself: call the model, detect a tool request, run it, send the result back. Add a step limit.
2. **Workflow or agent?** For each task decide and justify: (a) summarise a meeting, (b) "prepare me for tomorrow's scrum", (c) translate a transcript, (d) "find out why the release slipped".
3. **Routing.** Build a router that classifies a question as ONE_MEETING, FIND_MOMENT or COUNT_LIST (chapter 4, section 33) with structured output. Test it on 15 questions.
4. **MCP.** Expose one read-only tool of your service through MCP and connect a client to it.
5. **Speech data model.** Look at the real output of your speech service. Design the table for raw segments: which fields do you keep?
6. **Pipeline.** Implement the background pipeline for one meeting with a status column. Kill the process in the middle and check that a restart continues correctly.

## Check yourself

1. Complete: agent = ___ + ___ + ___.
2. What is the difference between a workflow and an agent?
3. If each step is 90% reliable, how reliable are five steps in a row?
4. Name three guardrails every agent needs.
5. What do you gain and lose with multi-agent systems?
6. What three things can an MCP server offer?
7. Why store the raw transcript and not only the cleaned one?
8. Why must the meeting-processing worker be idempotent?

<details>
<summary>Answers</summary>

1. Model + tools + loop.
2. In a workflow your code fixes the steps; in an agent the model decides the next step at run time.
3. About 59% (0.9⁵).
4. Step limit, cost or token budget, repeat detection, clear stop condition, human approval for changes, full trace.
5. Gain: clean, isolated context and parallel work. Lose: many more tokens, detail at each hand-over, easy debugging.
6. Tools, resources and prompts.
7. So you can reprocess later with better cleaning, prompts or models, and because cleaning can introduce errors.
8. Messages can be delivered more than once, and retries happen; processing twice must not create duplicates.
</details>
