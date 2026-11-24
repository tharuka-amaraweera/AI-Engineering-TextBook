# Chapter 7 — Production: Running AI Services (LLMOps)

**Goal of this chapter:** after it, you can run an AI service the way you run any serious backend: observable, affordable, safe, legal, deployable and ready for more than one customer.

You already know most of production engineering. This chapter covers what is *different* when a model is inside the service.

---

## 45. Observability

### The idea
In a normal service you log requests and errors. In an AI service the most important thing to see is **what went into the model and what came out**. Without it, you cannot explain a bad answer.

### What to record for every model call
| Field | Why |
|---|---|
| Trace id / request id | Join it with the rest of the request |
| Prompt name and version | Which prompt produced this? |
| Model name and version | Which model? |
| Full input (or a safe form of it) | To reproduce the problem |
| Full output | To see what the user saw |
| Input and output tokens | Cost |
| Latency, time to first token | Speed |
| Stop reason | Was it cut off? |
| Errors and retries | Reliability |
| User or tenant id | Who is affected, who costs what |

### Tracing
One user question can cause many steps: rewrite the query → search → re-rank → model call → tool call → model call. Record them as a **trace** with one **span** per step, exactly like distributed tracing between microservices. Then a slow or wrong answer shows you *which step* was slow or wrong.

Spring AI integrates with Micrometer, so model calls can appear in your normal metrics and traces. Dedicated LLM tools (for example Langfuse, or anything based on OpenTelemetry) add views built for prompts, costs and evaluations.

### Feedback
Add a thumbs up / down to answers and store it with the trace id. Bad ratings point you straight to traces worth reading, and those cases go into your eval set (chapter 6).

### Privacy
Prompts and answers contain user data, here even what colleagues said in meetings. So:
- Protect these logs like the data itself: access control, encryption.
- Set a retention time and delete after it.
- Redact where possible, and never write secrets into prompts.

### Remember
Log every model call with prompt version, model, tokens, latency and content; trace multi-step requests; treat those logs as sensitive data.

---

## 46. Cost control

### The idea
Cost = tokens × price × number of calls. You control all three.

**First measure.** Record cost per call, per feature and per user. You will often find that one feature or one long prompt causes most of the bill.

### The levers, strongest first

1. **Right-size the model (tiering).** Use a small, cheap model for easy steps (routing, classifying, rewriting a query) and the large model only for the hard step. Prices between tiers can differ by ten times or more.

2. **Send fewer input tokens.**
   - Retrieve 5 good chunks instead of 20 mediocre ones (re-ranking, chapter 4).
   - Trim conversation history (chapter 3).
   - Remove repeated or unused instructions.

3. **Produce fewer output tokens.** Output is the expensive and slow part. Ask for concise answers and set sensible limits.

4. **Prompt caching.** Many providers let the *unchanged start* of a prompt be cached. Cached input is much cheaper and faster on the next calls.
   - Order your prompt from stable to changing: system instructions and tool definitions first, long fixed documents next, the user's question last.
   - Anything that changes early (a timestamp in the first line!) breaks the cache for everything after it.
   - The cache lives only for a limited time, so it helps when calls come close together.

5. **Response caching.** Store the answer for an identical request (same prompt, same data version) and return it without calling the model. Good for summaries that many people open.

6. **Batch processing.** For work that is not urgent, batch APIs process requests later at a lower price. Good for reprocessing old meetings.

7. **Do not recompute.** Embed each chunk once. Extract each meeting once. Store the results.

### Guard the budget
- Set a spending limit and alerts in the provider console.
- Add limits per user or tenant in your service.
- Cap agent loops by steps and tokens (chapter 5).
- Watch for retry storms: a bug that retries failed calls forever is the classic surprise bill.

### Remember
Measure first. Then use the smallest model that passes your evals, send less, ask for less, cache the stable part, and cap spending.

---

## 47. Guardrails

### The idea
**Guardrails** are checks around the model that stop bad input going in, bad output coming out, and bad actions being taken. They are ordinary code and small model calls, placed at three points.

```
user input → [ INPUT guardrails ] → model → [ OUTPUT guardrails ] → user
                                      ↓
                              [ ACTION guardrails ] → tools
```

### Input guardrails
- **Size limits**: reject or cut very long input (cost and abuse).
- **Topic check**: is this a question the assistant should handle?
- **Injection signs**: flag input that tries to override instructions (helps; never perfect).
- **PII handling**: detect and mask personal data that the model does not need.
- **Rate limits** per user.

### Output guardrails
- **Schema validation**: does the structured output parse, are values in range, do ids exist?
- **Grounding check**: are the citations real; is the answer supported by the sources?
- **Content check**: nothing harmful, nothing confidential that the user may not see.
- **Format safety**: escape output before putting it into HTML, SQL or a shell (chapter 2).

### Action guardrails
- **Allow-list of tools** per user role.
- **Argument validation** in every tool.
- **Human confirmation** for anything that changes, sends or deletes.
- **Permissions checked in code** with the real user identity.

### Design advice
- **Layer them.** No single check is perfect; several simple ones together are strong.
- **Deterministic first.** A regex or a database lookup is cheaper and more reliable than a model check. Use model-based checks for what code cannot decide.
- **Fail clearly.** When a guardrail blocks something, tell the user what happened in plain words.
- **Measure them.** Guardrails can block good requests. Track how often each triggers, and add cases to your evals.

### Remember
Check what goes in, what comes out, and what gets done. Use plain code first, layers always, and real permissions for actions.

---

## 48. Privacy, data protection and GDPR

> This section explains the engineering view. It is not legal advice. For real deployments, talk to your company's data protection officer.

### Why it matters so much here
Meeting recordings and transcripts are **personal data**: voices, names, opinions, sometimes health or private remarks. In the EU, the **GDPR** applies. In Germany, secretly recording spoken words that are not public can even be a criminal offence. In companies, monitoring employees often involves the works council.

So the first task in your project plan is correct: **get agreement before you record or store**.

### The main principles, in engineering terms
| Principle | What it means for your service |
|---|---|
| **Lawful basis and transparency** | People know they are recorded, why, and have agreed or another legal basis applies |
| **Purpose limitation** | Data collected to help you follow meetings is not later used to rate colleagues |
| **Data minimisation** | Store what you need; maybe transcripts but not audio |
| **Storage limitation** | A retention period and automatic deletion |
| **Right of access and erasure** | You can export and delete one person's data on request |
| **Security** | Encryption in transit and at rest, access control, audit logs |

### Deletion is harder in AI systems
"Delete this meeting" must remove **every copy and everything derived from it**:

- the raw transcript,
- chunks and their **embeddings** in the vector store,
- extracted summaries, decisions, action items,
- cached answers,
- prompt and response **logs** that contain the text,
- backups, after their retention time.

Design for this from the start: every derived row carries the `meeting_id`, so one delete can cascade.

### Sending data to a model provider
Ask before using a hosted model with real data:
1. **Is there a data processing agreement (DPA)?**
2. **Where is the data processed?** (EU region available?)
3. **Is my data used to train models?** (Business APIs usually say no by default; verify.)
4. **How long does the provider keep prompts?**
5. **Does my employer allow this provider for this kind of data?**

If any answer is unclear, use a **local model**. This is the strongest argument for supporting both local and hosted models in your design.

### AI-specific rules
The EU AI Act adds duties depending on risk, including transparency: people should know when they interact with an AI system or read AI-generated content. Follow how it applies to your use case as your product grows.

### Practical checklist for the Scrum Memory Assistant
- Team informed and agreed; rule written down.
- Company policy on AI tools checked.
- Local model as default for real meetings.
- Retention period set; automatic deletion job.
- "Delete meeting" and "delete person" functions that cascade.
- Logs with transcript text protected and time-limited.
- Demo and tests use only invented meetings.

### Remember
Meeting data is personal data. Get consent, store little, delete completely including embeddings and logs, and know exactly where the data travels.

---

## 49. Deploying AI services

### The idea
An AI service is a normal service with a slow, external, rate-limited dependency. Docker, Kubernetes, CI/CD: all as you know them. These points differ.

### Configuration and secrets
- API keys in a secret store, injected as environment variables. Never in the image or in git.
- Model name, temperature, token limits and prompt versions are **configuration**: you want to change them without a rebuild and roll them back quickly.

### Timeouts everywhere on the path
A model answer can take a minute or more. Check every hop: the client, your gateway, the ingress, the service, the HTTP client to the provider. One default 30-second timeout in the middle cuts long answers.

### Streaming through proxies
Server-Sent Events need proxies that **do not buffer** the response. If streaming works locally but arrives in one block in the cluster, look at gateway and ingress buffering settings and at response compression.

### Scaling
- Your pods mostly wait for the provider. CPU is rarely the limit; **the provider's rate limit is**.
- More pods do not give more throughput once you reach that limit. Use a queue and controlled concurrency instead (chapter 5).
- Non-blocking I/O or virtual threads help, because many requests wait at the same time.

### Health and resilience
- A health check should not call the model on every probe (cost, and one provider hiccup would restart all pods). Check your own dependencies; report the provider's state separately.
- Circuit breaker and fallback model (chapter 3).
- Graceful degradation: the transcript view still works when summaries cannot be made.

### Releasing changes safely
- A prompt change **is** a release. It goes through review and the eval run (chapter 6).
- Roll out model or prompt changes behind a feature flag, to a part of the traffic first, and compare scores and feedback.
- Keep the previous prompt and model one switch away.

### Running your own model
Self-hosting an open model in the cluster needs GPU nodes and a model server (for example vLLM or Ollama), and brings its own work: capacity, cold starts, upgrades. It is worth it for strict privacy needs or very high volume, not as a first step.

### Remember
Deploy it like any service, but mind long timeouts, unbuffered streaming, provider rate limits as the real ceiling, and treat prompt changes as releases.

---

## 50. Multi-tenancy and data isolation

### The idea
If the assistant becomes a product, several teams or companies (**tenants**) use the same system. The one rule that must never break: **a tenant only ever sees its own data.** In an AI system there are more places where data can leak than in a normal one.

### Where isolation must hold
| Place | Rule |
|---|---|
| Relational data | `tenant_id` on every table; every query filtered |
| **Vector search** | The tenant filter is part of **every** similarity query |
| Prompts | Never mix data of two tenants in one context window |
| Chat memory | Keyed by tenant + user + conversation |
| Caches | Tenant is part of every cache key |
| Logs and traces | Tagged by tenant; access restricted |
| Tools | Take the tenant from the logged-in session, never from the model |
| Fine-tuned models | Never train a shared model on one tenant's private data |

### The most important sentence in this section
**Isolation is enforced in code, never in the prompt.**

Wrong: retrieve passages from all tenants and write "Only use data from team A" in the prompt. A prompt is a request, not a lock (chapter 2).

Right: the query itself can only return team A's rows:

```sql
SELECT content
FROM segment
WHERE tenant_id = :tenantFromSession
ORDER BY embedding <=> :question_vector
LIMIT 5;
```

PostgreSQL **row-level security** adds a second lock in the database, so even a forgotten `WHERE` clause cannot leak.

### Also plan for
- **Roles inside a tenant**: can everyone see every meeting, or only those they attended?
- **Per-tenant limits and cost tracking**: quotas, usage reports, later billing.
- **Per-tenant settings**: language, model choice (local or hosted), retention time.
- **Export and deletion per tenant** (section 48).

### Cheap now, expensive later
Adding a `tenant_id` column and a filter on day one costs an hour. Adding it to a system with a year of data and twenty query paths costs weeks and risks leaks. Even as a one-person tool, model "workspace" and "user" from the start.

### Remember
Put the tenant filter into every query, cache key and memory key. Enforce isolation in code and the database, never by asking the model.

---

## Exercises

1. **Log a call.** Add logging of prompt version, model, token counts, latency and stop reason to every model call in your service.
2. **Trace.** Record one RAG question as a trace with spans for search and generation. Which step takes longest?
3. **Cost report.** From your logs, compute cost per question and per meeting ingestion, using real prices of one model.
4. **Cache order.** Rewrite one of your prompts so that everything stable comes first and everything that changes comes last.
5. **Guardrails.** Add three: input length limit, citation-exists check, and a confirmation step before a "delete meeting" tool runs.
6. **Deletion.** Implement "delete meeting" so that transcript, chunks, embeddings and extracted items all disappear. Prove it with a query.
7. **Provider check.** For one hosted provider, find its answers to the five questions in section 48.
8. **Tenant filter.** Add `workspace_id` to your tables and to the vector query. Write a test that proves workspace B cannot retrieve workspace A's chunks.

## Check yourself

1. Which list contains only fields you would log for each model call?
   - A. Trace id, prompt version, model, input, output and token counts.
   - B. The model's weights, the training data and the API key.
   - C. Only the answer text.
   - D. The user's password, the API key and the answer.
2. Why is tracing important for RAG and agents?
   - A. It makes calls cheaper.
   - B. It hides errors from users.
   - C. It replaces evals.
   - D. One request has many steps; a trace shows which step was slow or wrong.
3. Which list contains only ways to reduce cost?
   - A. A bigger model, longer answers and more retries.
   - B. A smaller model for easy steps, fewer input tokens, shorter output and prompt caching.
   - C. A higher temperature, more examples and a longer system prompt.
   - D. Turning off logging, removing evals and skipping tests.
4. What breaks prompt caching?
   - A. Using the same system prompt every time.
   - B. A long prompt.
   - C. Any change near the start of the prompt, such as a timestamp, and too much time between calls.
   - D. A low temperature.
5. What are the three places for guardrails?
   - A. Input, output and actions (tools).
   - B. Prompt, model and database.
   - C. Frontend, backend and network.
   - D. Training, testing and deployment.
6. What must be deleted when a meeting is deleted?
   - A. Only the raw transcript.
   - B. The transcript and the summary; embeddings are anonymous and can stay.
   - C. Nothing, if the data is encrypted.
   - D. Raw transcript, chunks and embeddings, extracted items and summaries, cached answers, logs containing the text, and later the backups.
7. Which questions do you ask before sending real data to a hosted model?
   - A. Is the model fast? Is it cheap? Is it popular?
   - B. Is there a DPA? Where is data processed? Is it used for training? How long is it kept?
   - C. Which language is the SDK written in? Is there a free tier?
   - D. How many parameters does the model have?
8. What usually limits the throughput of an AI service?
   - A. Your CPU.
   - B. Your disk space.
   - C. The provider's rate limits, not your CPU.
   - D. The size of the system prompt.
9. Why is "only use team A's data" in the prompt not isolation?
   - A. The model cannot read team names.
   - B. A prompt is a request the model can fail to follow; isolation needs a filter in the query and the database.
   - C. Prompts are too short for rules.
   - D. It is isolation, as long as the prompt is clear.

<details>
<summary>Answers</summary>

1. **A.** To understand a call later you need: the trace id, the prompt version, the model, the input, the output and the token counts. Latency, stop reason, errors and the user or tenant are useful too. Secrets such as API keys and passwords never go into logs.
2. **D.** One user request becomes many steps: search, re-ranking, several model calls, tool calls. A trace shows all steps of one request together, so you can see which step was slow or wrong.
3. **B.** You pay per token and per model size. So use a smaller model for easy steps, send fewer input tokens, ask for shorter output, and cache what repeats. Response caching, batch processing and storing results help too.
4. **C.** The cache matches the prompt from its start. If something near the start changes, for example a timestamp, everything after it must be processed again. Caches also expire after a short time. Put stable text first and changing text last.
5. **A.** Check what goes into the model (input), what comes out (output), and what the system is about to do (actions, meaning tool calls). Each place catches different problems.
6. **D.** The meeting's content lives in many places: the raw transcript, the chunks and their embeddings, extracted items and summaries, cached answers, logs that contain the text, and backups. Embeddings are made from personal data, so they must go too.
7. **B.** These questions are about what happens to the data: is there a data processing agreement (DPA), where is the data processed, is it used for training, and how long is it kept? One more: does your employer allow it?
8. **C.** Your service mostly waits for the model provider, so your own CPU has little to do. The limit is how many requests and tokens per minute the provider allows.
9. **B.** A prompt is only a request. The model can fail to follow it, and an attacker can talk it out of it. Real isolation means team B's data never reaches the model: the filter is in the query and the database.
</details>
