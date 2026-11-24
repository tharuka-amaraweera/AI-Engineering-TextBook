# Chapter 3 — Building with LLMs as a Developer

**Goal of this chapter:** after it, you can call a model from Java, get typed objects back, let the model call your code, keep a conversation going, and handle failures. This is where your Spring Boot experience becomes an advantage.

> Code is written in Spring AI 1.x style. If a name does not match your version, check the Spring AI reference; the idea stays the same.

---

## 19. LLM APIs: REST, SDKs, keys, streaming

### The idea
A hosted model is a web service. You send an HTTP `POST` with JSON; you get JSON back. Nothing more magical than that.

### A raw call
Request to a local Ollama model:

```bash
curl http://localhost:11434/api/chat -d '{
  "model": "llama3.2",
  "stream": false,
  "messages": [
    {"role": "system", "content": "You answer in one sentence."},
    {"role": "user", "content": "What is a daily scrum?"}
  ]
}'
```

Hosted APIs look almost the same, plus an API key in a header. What you send:

| Field | Meaning |
|---|---|
| `model` | Which model to use |
| `system` / system message | Your instructions |
| `messages` | The conversation so far |
| `max_tokens` | Upper limit for the answer |
| `temperature` etc. | Sampling settings (chapter 1) |
| `tools` | Functions the model may ask for (section 23) |

What you get back:

| Field | Meaning |
|---|---|
| `content` | The answer |
| stop reason | *Why* generation ended: finished normally, hit `max_tokens`, or wants a tool |
| `usage` | Input and output token counts (your cost) |

### Always read the stop reason
If the stop reason says the token limit was reached, the answer is **cut off**. Half a JSON document will fail to parse. Raise the limit or ask for shorter output.

### API keys
- A key is a password that costs money when leaked.
- Never commit it. Read it from an environment variable or a secret store.
- Use separate keys for development and production, and set a spending limit in the provider's console.

### Streaming
Without streaming you wait for the full answer. With streaming, the server sends small pieces as they are produced, using **Server-Sent Events (SSE)**. Use streaming for anything a person waits for; use normal calls for background jobs.

### SDKs and frameworks
You rarely write raw HTTP. Providers offer SDKs, and frameworks such as **Spring AI** and **LangChain4j** put one common API over many providers.

### Remember
An LLM call is a stateless HTTP request. Check the stop reason and the token usage on every response.

---

## 20. Running models locally: Ollama and quantization

### The idea
**Ollama** is a tool that downloads open-weight models and runs them on your machine behind a simple REST API on port `11434`.

```bash
ollama pull llama3.2          # download a model
ollama run llama3.2           # chat in the terminal
ollama pull nomic-embed-text  # an embedding model (chapter 4)
ollama list                   # what is installed
```

### Why use it
- **Free**: no cost per call while learning.
- **Private**: nothing leaves your machine. Important for meeting transcripts.
- **Offline**: works without internet.

### Quantization
Model weights are normally stored as 16-bit or 32-bit numbers. **Quantization** stores them with fewer bits, often 4. The file becomes about four times smaller and runs on normal hardware, with a small loss of quality.

You will see tags such as `q4_K_M` (4-bit, a common good balance) or `q8` (8-bit, larger and slightly better). The usual file format is **GGUF**.

### Limits you should know
- Small local models are clearly weaker than large hosted ones: more mistakes in reasoning, tool calling and long instructions.
- **Small default context window.** Ollama runs models with a small context window unless you raise it (the `num_ctx` option). Longer input can be **cut silently**: no error, just a model that "forgot" the start of your transcript. When a local model ignores part of your input, check this first.
- Speed depends on your hardware. Without a GPU, larger models are slow.

### Remember
Ollama is your free, private practice ground. Watch the context size, and expect lower quality than hosted models.

---

## 21. Spring AI: ChatClient, advisors, model switching

### The idea
**Spring AI** brings LLMs into Spring Boot the way Spring Data brings databases: starters, auto-configuration, properties, and one API that works across providers.

### Setup
Add the starter for your provider (for Ollama: `spring-ai-starter-model-ollama`) and configure it:

```properties
spring.ai.ollama.base-url=http://localhost:11434
spring.ai.ollama.chat.options.model=llama3.2
spring.ai.ollama.chat.options.temperature=0.2
```

### ChatClient
`ChatClient` is the main class, a fluent API like `WebClient`:

```java
@RestController
class AssistantController {

    private final ChatClient chat;

    AssistantController(ChatClient.Builder builder) {
        this.chat = builder
            .defaultSystem("You help a software team with questions about their daily scrums. Use simple English.")
            .build();
    }

    @GetMapping("/ask")
    String ask(@RequestParam String question) {
        return chat.prompt()
                   .user(question)
                   .call()
                   .content();
    }

    @GetMapping(value = "/ask/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    Flux<String> askStream(@RequestParam String question) {
        return chat.prompt()
                   .user(question)
                   .stream()
                   .content();
    }
}
```

Read it as: build a prompt → add the user text → call the model → take the text.

### Advisors
An **advisor** wraps the model call, like a servlet filter or an interceptor. It can change the request before it goes out and the response when it comes back. Spring AI ships advisors for:

- **chat memory** (section 24),
- **RAG**: fetch documents and add them to the prompt (chapter 4),
- **logging** the full request and response.

You can write your own, for example to redact personal data.

### Model switching
Because your code talks to `ChatClient`, changing from a local model to a hosted one is mostly a change of dependency and properties. Keep prompts and business logic free of provider-specific details and you can compare models easily, which you will need in chapter 6.

*LangChain4j is the other popular Java library. The concepts in this chapter apply to both.*

### Remember
`ChatClient` is your `WebClient` for models; advisors are the filters around it; providers are swappable configuration.

---

## 22. Structured output

### The idea
Text is fine for people. Your code needs **objects**. Structured output means the model returns data that matches a schema, usually JSON, which you map to Java records.

### Example

```java
record ActionItem(String owner, String task, String dueDate) {}

record ScrumSummary(
    String summary,
    List<String> decisions,
    List<ActionItem> actionItems,
    List<String> blockers,
    List<String> ticketsMentioned
) {}

ScrumSummary extract(String transcript) {
    return chat.prompt()
        .user(u -> u.text("""
                Extract the key information from the daily scrum transcript.
                Use only what is said in the transcript. Use an empty list when
                there is nothing. Use null for a due date that was not mentioned.

                <transcript>
                {transcript}
                </transcript>
                """)
            .param("transcript", transcript))
        .call()
        .entity(ScrumSummary.class);
}
```

`.entity(ScrumSummary.class)` builds a JSON schema from your record, tells the model to follow it, and parses the answer into the record.

### How it works underneath
Two levels exist:
1. **Instruction only**: the schema is added to the prompt and the model *usually* complies. It can still produce broken JSON.
2. **Native structured output**: the provider *forces* the model to produce only tokens that fit the schema. Much more reliable. Use it when your model supports it.

### Tips
- **Name fields clearly** and describe them. `dueDate` with "ISO date or null" is better than `d`.
- **Use enums** for fixed choices (`PROGRESS`, `BLOCKER`, `PLAN`).
- **Allow "nothing"**: empty lists and null. If every field is required, the model invents values to fill them. That is a classic source of hallucination.
- **Keep the schema simple**: a few levels deep, not twenty nested types.
- **Validate after parsing** with normal Java code or Bean Validation. Valid JSON is not the same as correct content.
- **Retry once** on a parse failure, and check for a cut-off answer (stop reason).

### Why this matters so much
Structured output is the bridge between fuzzy language and your precise systems. In the Scrum Memory Assistant, this turns a transcript into rows in PostgreSQL that you can query with SQL.

### Remember
Ask for a schema, map it to records, allow empty values, and validate the result.

---

## 23. Tool calling (function calling)

### The idea
A model can only produce text. **Tool calling** lets it *ask your application* to run a function, and then use the result. This is how a model gets live data and does real actions.

### The flow

```
1. Your app  → model:  the question + a list of tools (name, description, parameters)
2. Model     → app:    "Please call findMeetings(from=2026-11-09, to=2026-11-13)"
3. Your app runs the Java method.
4. Your app  → model:  the result of the method
5. Model     → app:    the final answer in words, using the result
```

**The model never runs code.** It only writes a request. Your code decides whether and how to run it. That is your control point for security.

### Example

```java
class MeetingTools {

    private final MeetingRepository meetings;

    MeetingTools(MeetingRepository meetings) { this.meetings = meetings; }

    @Tool(description = "Find daily scrum meetings between two dates (inclusive). Returns id, date and a short summary of each.")
    List<MeetingInfo> findMeetings(
            @ToolParam(description = "Start date, ISO format yyyy-MM-dd") String from,
            @ToolParam(description = "End date, ISO format yyyy-MM-dd") String to) {
        return meetings.findBetween(LocalDate.parse(from), LocalDate.parse(to));
    }

    @Tool(description = "Get the open action items of one person by first name.")
    List<ActionItem> openActionItems(String owner) {
        return meetings.openActionItems(owner);
    }
}

String answer = chat.prompt()
    .user("What is still open for Anna from last week?")
    .tools(new MeetingTools(meetingRepository))
    .call()
    .content();
```

Spring AI does steps 2–4 for you: it sees the tool request, calls your method and sends the result back.

### Writing good tools
- **The description is a prompt.** The model chooses tools only from their names and descriptions. Say what the tool does, when to use it, and what it returns.
- **Few, clear tools.** Five well-named tools beat thirty similar ones.
- **Simple parameters.** Strings, numbers, enums. State formats ("ISO date").
- **Small results.** A tool result goes into the context window. Return the ten relevant rows, not ten thousand.
- **Useful errors.** Return "No meeting found for that date; try a wider range" so the model can try again.

### Safety
- Validate every argument. The model can send wrong or malicious values (chapter 2, prompt injection).
- Read-only tools are safe to run automatically. For tools that change or delete something, ask the user to confirm.
- Check permissions in the tool using the *logged-in user*, never using something the model says.

### Remember
The model asks, your code acts. Tool descriptions are prompts, and tool arguments are untrusted input.

---

## 24. Conversation memory

### The idea
The model is stateless (chapter 1). **Memory** is your application storing messages and sending the right ones back with each call.

### Strategies
| Strategy | How it works | Good | Bad |
|---|---|---|---|
| Full history | Send everything | Simple, nothing lost | Grows until too slow, costly or too long |
| Sliding window | Send only the last N messages | Simple, bounded | Forgets early facts |
| Summarising | Replace old messages with a short summary | Keeps the gist | Loses details; the summary costs a call |
| Long-term memory | Save important facts in a database and fetch the relevant ones | Works across sessions | More to build (it is RAG, chapter 4) |

Real products combine them: recent messages in full, older ones summarised, key facts in a store.

### Example in Spring AI

```java
ChatMemory memory = MessageWindowChatMemory.builder()
        .maxMessages(20)
        .build();

ChatClient chat = builder
        .defaultAdvisors(MessageChatMemoryAdvisor.builder(memory).build())
        .build();

String reply = chat.prompt()
        .user(question)
        .advisors(a -> a.param(ChatMemory.CONVERSATION_ID, sessionId))
        .call()
        .content();
```

The advisor loads the last messages of that conversation, adds them to the request, and saves the new question and answer afterwards. The **conversation id** keeps users apart.

### Common mistakes
- One shared memory for all users, so people see each other's conversations. Always key by user and conversation.
- In-memory storage in a service with several pods: the next request reaches another pod and the history is gone. Use a database-backed store.
- Letting history grow without limit and wondering why calls get slow and expensive.

### Remember
Memory is your code re-sending selected history. Decide what to keep, bound its size, and separate users.

---

## 25. Error handling: retries, timeouts, limits, fallbacks

### The idea
LLM calls fail more often and take longer than a normal REST call. Plan for it.

### What can go wrong
| Problem | Typical sign | What to do |
|---|---|---|
| Rate limit | HTTP 429 | Wait and retry with backoff; respect a `retry-after` header |
| Provider overloaded or down | HTTP 5xx | Retry with backoff; then fall back |
| Too slow | Timeout | Sensible timeouts; streaming; background job |
| Input too long | HTTP 400 | Do **not** retry; shorten the input |
| Answer cut off | Stop reason = token limit | Raise the limit or ask for less |
| Broken structure | Parse exception | Retry once; use native structured output |
| Refusal | Model declines | Show a clear message; do not loop |

### Good practice
1. **Retry only what can succeed.** 429 and 5xx: yes. 400 and 401: never.
2. **Exponential backoff with jitter.** Wait 1 s, 2 s, 4 s…, each with a random part, so many clients do not retry at the same moment.
3. **Realistic timeouts.** A long answer can take a minute or more. A 5-second timeout copied from another service will fail constantly.
4. **Limit retries**, for example three. Endless retries multiply cost and load.
5. **Fallback model.** If the main model fails, try a second one.
6. **Circuit breaker** (for example Resilience4j): when a provider is down, stop calling for a while instead of piling up requests.
7. **Take long work out of the request thread.** Summarising a meeting belongs in a background job (chapter 5).
8. **Degrade gracefully.** If the AI part fails, the rest should still work: show the transcript without the summary.

### Remember
Expect slow and failed calls. Retry the right errors with backoff, set real timeouts, and keep the app useful when the model is not available.

---

## Exercises

1. **Raw call.** Call your local Ollama model with `curl`. Find the token counts in the response.
2. **First endpoint.** Build the `/ask` and `/ask/stream` endpoints with Spring AI. Open the streaming one in a browser.
3. **Structured output.** Write a fake scrum transcript (10–15 lines, three speakers). Extract a `ScrumSummary`. Then add a sentence with no clear owner and see what the model does with `owner`.
4. **Tool calling.** Create a `MeetingTools` class backed by a hard-coded list. Ask "What did we discuss on Tuesday?" and log each tool call with its arguments.
5. **Memory.** Add chat memory. Tell the assistant your name, ask for it three messages later, then set `maxMessages` to 2 and repeat. Explain the difference.
6. **Break it.** Stop Ollama and call your endpoint. Add a timeout, a retry and a friendly error message.
7. **Switch.** If your company rules and budget allow, change the configuration to a hosted model and run exercise 3 again. Compare quality and speed.

## Check yourself

1. Which two fields of an API response should you always look at, besides the content?
   - A. The model name and the request id.
   - B. The stop reason and the token usage.
   - C. The temperature and top-p.
   - D. The date and the server region.
2. What is quantization, and what do you trade?
   - A. Splitting text into tokens; you trade speed for accuracy.
   - B. Removing layers from the model; you trade memory for speed.
   - C. Storing weights with fewer bits; the model gets smaller and faster for a small loss of quality.
   - D. Training on less data; you trade knowledge for cheaper training.
3. A local model ignores the start of a long transcript. What is the likely cause?
   - A. The temperature is too high.
   - B. The model cannot read transcripts.
   - C. The system prompt is too short.
   - D. The context window setting is too small and the input was cut silently.
4. What is an advisor in Spring AI?
   - A. A wrapper around the model call that can change the request and response, like a filter.
   - B. A second model that checks the answers.
   - C. A tool that the model can call.
   - D. A document that explains best practices.
5. Why should a schema allow null and empty lists?
   - A. It makes the JSON smaller.
   - B. Otherwise the model invents values to fill required fields.
   - C. Null values are faster to parse.
   - D. A schema without null is not valid.
6. In tool calling, who executes the function?
   - A. The model.
   - B. The provider's server.
   - C. Your application; the model only asks for the call.
   - D. The user's browser.
7. Which line matches a memory strategy with its real weakness?
   - A. Full history: forgets early facts.
   - B. Sliding window: forgets early facts.
   - C. Summarising: grows without bound.
   - D. Long-term store: nothing to build.
8. Which HTTP errors do you retry, and which not?
   - A. Retry all errors.
   - B. Retry 400 and 401; never retry 429.
   - C. Never retry any error.
   - D. Retry 429 and 5xx with backoff; do not retry 400 or 401.

<details>
<summary>Answers</summary>

1. **B.** The stop reason tells you whether the answer finished normally or was cut off, for example at max tokens. The token usage tells you what the call cost. Without them you can miss a half answer or a rising bill.
2. **C.** Quantization stores each weight with fewer bits. The model needs less memory and runs faster, and you lose a little quality. This is why large models can run on a laptop.
3. **D.** Local runtimes often have a small default context window. If the input is longer, the start is cut off without any error, so the model never sees it. Check and raise the context window setting.
4. **A.** An advisor wraps the model call. It can change the request before it is sent and the response after it comes back, like a filter. Memory, RAG and logging are added this way.
5. **B.** If a field is required but the text has no value for it, the model must still write something, so it invents a value. Allowing null and empty lists gives the model an honest way to say "nothing found".
6. **C.** The model only writes a request: which function to call and with which arguments. Your application runs the function and sends the result back to the model. This is why your code can check and limit every call.
7. **B.** A sliding window keeps only the latest messages, so it forgets early facts. Full history grows without bound. Summarising loses detail. A long-term store keeps more, but it is more to build.
8. **D.** 429 (too many requests) and 5xx (server problems) are temporary, so waiting and trying again can work. Backoff means waiting longer after each failed try. 400 (bad request) and 401 (not authorised) fail the same way every time, until you fix the request or the key.
</details>
