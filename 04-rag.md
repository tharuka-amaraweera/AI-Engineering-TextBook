# Chapter 4 — Retrieval and Knowledge: RAG

**Goal of this chapter:** after it, you can make a model answer from *your own data* with sources, and you know when RAG is the right tool and when it is not.

**The problem:** the model does not know your meetings, and you cannot paste all of them into every prompt (chapter 1, section 5).

**The solution: Retrieval-Augmented Generation (RAG).** Before asking the model, *search* your data for the few passages that matter, and put only those into the prompt.

```
Question → search your data → top passages → prompt (passages + question) → answer with sources
```

It is an open-book exam: the model does not need to remember; it needs the right page open.

---

## 26. Embeddings

### The idea
An **embedding** is a list of numbers (a *vector*) that represents the *meaning* of a text. An **embedding model** turns text into this vector.

```
"The deployment failed last night"   →  [0.12, -0.48, 0.33, ... 768 numbers]
"The release broke yesterday evening"→  [0.11, -0.45, 0.35, ...]   ← very close
"I like pizza"                       →  [-0.72, 0.09, -0.21, ...]  ← far away
```

Texts with similar meaning get vectors that are close together, even when they share no words. That is the whole trick: **search by meaning instead of by keyword.**

### How closeness is measured
The usual measure is **cosine similarity**: the angle between two vectors. 1 means same direction (same meaning), 0 means unrelated. You do not compute it yourself; the database does.

### Things to know
- An embedding model is a **different model** from the chat model: small, fast and cheap. Locally, for example, `nomic-embed-text` in Ollama.
- The number of values is the **dimension** (for example 768 or 1536). It is fixed per model.
- **Use the same embedding model for documents and questions.** Vectors from different models cannot be compared.
- **Changing the embedding model means re-embedding everything.** Store the model name next to your vectors.
- If your meetings mix German and English, choose a **multilingual** embedding model and test that a German question finds an English passage.

### Remember
An embedding is meaning as numbers. Similar meaning, nearby vectors.

---

## 27. Vector databases

### The idea
A **vector database** stores vectors with their text and metadata, and quickly finds the vectors nearest to a query vector.

### Exact vs approximate search
- **Exact**: compare the query with every stored vector. Correct but slow on large data.
- **Approximate nearest neighbour (ANN)**: use an index to find *almost* the best matches very fast. The common index is **HNSW**, a layered graph where the search jumps from vector to nearby vector. You trade a tiny bit of accuracy for a lot of speed.

### PGVector: vectors inside PostgreSQL

```sql
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE segment (
    id          bigserial PRIMARY KEY,
    meeting_id  bigint      NOT NULL,
    speaker     text,
    started_at  timestamptz,
    content     text        NOT NULL,
    embedding   vector(768)
);

CREATE INDEX ON segment USING hnsw (embedding vector_cosine_ops);

-- the 5 segments closest in meaning to the question
SELECT content, speaker, started_at
FROM segment
ORDER BY embedding <=> :question_vector
LIMIT 5;
```

`<=>` means cosine distance (smaller is closer).

### Which database?
| Option | When |
|---|---|
| **PGVector** | You already use PostgreSQL. Vectors live next to your normal tables, so you can join and filter with SQL. |
| Chroma, Qdrant, Weaviate, Milvus | Dedicated vector stores, more features at very large scale |
| Pinecone and similar | Managed service, nothing to operate |

For a personal or team project, any of them is fast enough. PGVector is the natural choice for you: one database, SQL you know, normal backups.

### In Spring AI
The `VectorStore` interface hides the database:

```java
vectorStore.add(List.of(
    new Document("Anna: The price import is blocked by the firewall change.",
                 Map.of("meetingId", 42, "speaker", "Anna", "date", "2026-11-12"))));

List<Document> hits = vectorStore.similaritySearch(
    SearchRequest.builder().query("What blocks the price import?").topK(5).build());
```

Spring AI calls the embedding model for you on `add` and on search.

### Remember
A vector database finds text by meaning. With PostgreSQL in your stack, start with PGVector.

---

## 28. Chunking

### The idea
You do not embed whole documents. You cut them into **chunks** and embed each chunk. Why?

- One vector for a long text is a blurry average of many topics and matches nothing well.
- You want to give the model the *relevant part*, not a whole document.

### The trade-off
| Chunks too small | Chunks too large |
|---|---|
| Lose context ("He agreed." Who? To what?) | Mix topics; the vector is blurry |
| Many pieces needed for one answer | Waste context window on irrelevant text |

A common starting point is a few hundred tokens per chunk, with a small **overlap** (10–20%) so a sentence cut at the border appears whole in one of the two chunks.

### Strategies
1. **Fixed size**: every N tokens. Simple, ignores meaning.
2. **By structure**: paragraphs, headings, Markdown sections, methods in code. Usually better.
3. **By meaning**: split where the topic changes. Best quality, more work.

### Chunking meeting transcripts
A transcript is not a document; it has speakers and times. Good options:
- **By speaker turn**: one person's update is one chunk. In a daily scrum, that is a natural unit.
- **By topic**: when the talk moves from the price import to the release plan.
- **Merge tiny turns** ("Yes." "Okay.") into the neighbouring chunk.

### Add context to each chunk
A chunk alone can be meaningless: "It will be done by Friday." Put a short header in front before embedding:

```
[Daily scrum, 2026-11-12, speaker: Anna, topic: price import]
It will be done by Friday.
```

Now the vector carries the date, person and topic, and search quality rises sharply.

### Keep metadata
Store with each chunk: meeting id, date, speaker, start time, language. You need it for filtering (section 30) and citations (section 32).

### Remember
Chunk along natural borders, keep chunks self-explaining, and store metadata with each one.

---

## 29. The RAG pipeline

### Two phases

**Phase 1 — Indexing** (once per document, in the background):

```
transcript → clean → chunk → embed each chunk → store text + vector + metadata
```

**Phase 2 — Query** (on every question):

```
question → embed → search top-k chunks → build prompt (chunks + question) → model → answer + sources
```

### The prompt

```
Answer the question using only the meeting excerpts below.
If the excerpts do not contain the answer, say that you could not find it
in the meetings. After each statement, cite the excerpt number like [2].

<excerpts>
[1] (2026-11-10, Anna) The firewall change request was sent to the SAP team.
[2] (2026-11-12, Anna) The price import is still blocked; no answer from SAP.
[3] (2026-11-13, Mario) SAP opened the firewall this morning, import is running.
</excerpts>

Question: What happened with the price import this week?
```

### In Spring AI

```java
ChatClient chat = builder
    .defaultAdvisors(QuestionAnswerAdvisor.builder(vectorStore)
        .searchRequest(SearchRequest.builder().topK(5).build())
        .build())
    .build();

String answer = chat.prompt().user(question).call().content();
```

The advisor does the query phase: it searches and adds the results to the prompt. Start with it, then write the steps yourself when you need more control (and you will, for filters and citations).

### Where RAG goes wrong
When an answer is bad, ask in this order:
1. **Was the right chunk in the store at all?** (ingestion or chunking problem)
2. **Was it retrieved?** (search problem — the most common)
3. **Did the model use it correctly?** (prompt or model problem)

Always log the retrieved chunks. Without them you cannot tell 2 from 3.

### Remember
Index once, retrieve per question, generate from what was retrieved. Most RAG failures are retrieval failures.

---

## 30. Metadata filtering and hybrid search

### Metadata filtering
Vector search finds *similar meaning*. It does not understand dates, people or ids. "What did Anna say last week?" needs a **filter**:

```sql
SELECT content
FROM segment s JOIN meeting m ON m.id = s.meeting_id
WHERE s.speaker = 'Anna'
  AND m.held_on BETWEEN '2026-11-09' AND '2026-11-13'
ORDER BY s.embedding <=> :question_vector
LIMIT 5;
```

The filter narrows the set; similarity ranks what is left. In Spring AI you pass a filter expression in the `SearchRequest`.

Where do the filter values come from? Your code must turn "last week" and "Anna" into a date range and a name. A small LLM call with structured output does this well: question in, `{speaker, fromDate, toDate, searchText}` out. Give it today's date, because the model does not know it.

### Keyword search still matters
Embeddings are weak at **exact terms**: ticket numbers ("TCB-7598"), class names, error codes, rare names. Old-fashioned keyword search (BM25, or PostgreSQL full-text search) is strong exactly there.

### Hybrid search
Run both searches and merge the results:

```
vector search  → ranked list A
keyword search → ranked list B
merge (for example Reciprocal Rank Fusion) → final ranked list
```

**Reciprocal Rank Fusion** is simple: each result gets a score of 1 ÷ (60 + its rank) from each list; add the scores; sort. Results that rank well in both lists win.

### Remember
Filter by facts (date, person), search by meaning, and add keyword search for exact terms.

---

## 31. Re-ranking and query rewriting

### Re-ranking
Vector search is fast but rough. A **re-ranker** is a second, more careful model that reads the question and one passage *together* and scores how well the passage answers the question.

```
search: fetch 30 candidates (fast, rough)
re-rank: score each against the question (slower, precise)
keep: the best 5 for the prompt
```

Fetch wide, then keep narrow. This often improves answer quality more than changing the chat model.

### Query rewriting
Users ask questions that search badly.

- **Follow-up questions.** After talking about Anna: "And what about the other topic?" The words "the other topic" mean nothing to a search. Rewrite it with the chat history into a standalone question: "What did the team say about the release plan on 12 November?"
- **Multi-query.** Create three or four different wordings of the question, search with each, and merge the results. This catches passages that use other words.
- **Decomposition.** "Compare what Anna and Mario said about the import" becomes two searches.

Each rewrite is one small, cheap LLM call before the search.

### Remember
Retrieve many, re-rank, keep few. Rewrite follow-up questions into complete ones before searching.

---

## 32. Citations and grounding

### The idea
**Grounding** means the answer is based on the given sources, not on the model's general memory. **Citations** show the user which source supports which statement.

### Why it matters
- The user can **verify** in seconds. This turns "trust me" into "check here".
- Hallucinations become visible: a statement without a source is suspicious.
- For a meeting assistant, the natural next step after an answer is "show me that moment", so a citation is also navigation.

### How to build it
1. Number the excerpts in the prompt and include date and speaker (section 29).
2. Instruct: "Use only the excerpts. Cite like [2] after each statement. If the answer is not there, say so."
3. Ask for structured output:
   ```java
   record Answer(String text, List<Integer> usedExcerpts, boolean foundInMeetings) {}
   ```
4. In code, map excerpt numbers back to meeting id and timestamp, and render links.
5. **Verify**: every cited number must exist. For important cases, check that a quoted sentence really appears in the excerpt.

### The "not found" answer
A good assistant says "I could not find this in your meetings". Test this on purpose with questions whose answer is not in the data. An assistant that always answers is an assistant that sometimes invents.

### Remember
Number your sources, make the model cite them, check the citations in code, and reward "not found".

---

## 33. Long context versus RAG

### The idea
Context windows have become large. Do you still need RAG? Sometimes not.

| | Put everything in the context | RAG |
|---|---|---|
| Data size | Fits comfortably in the window | Larger than the window, or growing |
| Building effort | Very low | Chunking, embedding, search, tuning |
| Quality | Model sees everything; nothing is missed by a search | Depends on retrieval quality |
| Cost per call | High (all tokens every time; prompt caching helps) | Low (only a few chunks) |
| Speed | Slower | Faster |

**Rule of thumb:** if the data fits easily and is asked about rarely, start with long context. If it grows without end or is queried often, use RAG.

### RAG cannot count
RAG returns the *top few* passages. It is bad at questions about *everything*:

- "How many times was the price import blocked this year?"
- "List all decisions of October."
- "Who had the most blockers?"

No top-5 search answers these. The right tool is **structured data and SQL**: extract decisions, blockers and action items into tables when the meeting is ingested (chapter 3, structured output), then query them.

### Three routes for the Scrum Memory Assistant
| Question type | Example | Route |
|---|---|---|
| About one meeting | "Summarise today's scrum" | Put the full transcript in the context |
| Find a moment or topic | "When did we talk about the timeout?" | RAG over segments |
| Count, list, trend | "All open action items for Anna" | SQL over extracted tables |

A small routing step (an LLM call, or tool calling where each route is a tool) picks the route. This design is far stronger than "RAG for everything", and it is the kind of judgement that separates an AI engineer from someone who followed a tutorial.

### Remember
Long context for small data, RAG for finding passages in large data, SQL for counting and listing. Pick per question type.

---

## Exercises

1. **See embeddings.** Embed five sentences with a local embedding model, three about deployments and two about food. Compute or query their similarity and check that the groups separate.
2. **PGVector.** Start PostgreSQL with the pgvector extension in Docker. Create the `segment` table and run a similarity query.
3. **Chunk a transcript.** Take a fake scrum transcript. Chunk it by speaker turn, add the context header, and store the chunks with metadata.
4. **First RAG.** Use `QuestionAnswerAdvisor` to answer three questions about your stored meetings. Log the retrieved chunks.
5. **Find the weakness.** Ask a question containing a ticket number. If vector search misses it, add PostgreSQL full-text search and merge the results.
6. **Not found.** Ask something that is not in the data. Make the assistant answer "not found" reliably.
7. **Count.** Ask "How many blockers were mentioned in total?" with pure RAG. Then answer the same question with SQL over extracted data. Compare.

## Check yourself

1. What does an embedding represent?
   - A. The length of a text.
   - B. The meaning of a text as a vector of numbers; similar meanings give nearby vectors.
   - C. A compressed copy of the text that can be unpacked again.
   - D. The keywords of a text.
2. Why must documents and questions use the same embedding model?
   - A. Different models have different prices.
   - B. It is a licence rule.
   - C. Vectors from different models live in different spaces and cannot be compared.
   - D. Only one model can run at a time.
3. What is HNSW, and what do you trade for its speed?
   - A. An exact search that checks every vector; you trade speed for accuracy.
   - B. A compression format for vectors; you trade quality for size.
   - C. A keyword index; you trade meaning for exact terms.
   - D. A graph index for approximate nearest-neighbour search; you trade a little accuracy for much more speed.
4. What goes wrong with chunks that are too small? Too large?
   - A. Too small: context is lost. Too large: topics mix, the vector is blurry and context window is wasted.
   - B. Too small: topics mix. Too large: context is lost.
   - C. Too small: the cost rises. Too large: nothing goes wrong.
   - D. The size does not matter if the embedding model is good.
5. Why add a header with date and speaker to each chunk?
   - A. To make the chunks longer.
   - B. Because the database requires it.
   - C. So the chunk is understandable alone and the vector carries date, person and topic.
   - D. To hide who said what.
6. A RAG answer is wrong. Which three questions do you ask, in order?
   - A. Is the model too small? Is the temperature too high? Is the prompt too long?
   - B. Was the right chunk stored? Was it retrieved? Did the model use it correctly?
   - C. Did the model use it correctly? Was it retrieved? Was it stored?
   - D. Is the user wrong? Is the question unclear? Is the data old?
7. Why is hybrid search useful?
   - A. It is cheaper than vector search.
   - B. It needs no embedding model.
   - C. It searches two databases at once.
   - D. Vector search finds meaning, keyword search finds exact terms such as ticket numbers; together they cover both.
8. What does a re-ranker do?
   - A. It rewrites the user's question.
   - B. It scores each retrieved passage against the question more precisely, so you keep only the best few.
   - C. It sorts the chunks by date.
   - D. It creates the embeddings.
9. Which kind of question can RAG not answer well, and what is the alternative?
   - A. Questions about one document; use fine-tuning.
   - B. Questions with exact terms; use a bigger model.
   - C. Counting, listing and trend questions over all data; use structured extraction and SQL.
   - D. Short questions; use a longer prompt.

<details>
<summary>Answers</summary>

1. **B.** An embedding is a list of numbers (a vector) that stands for the meaning of a text. Texts with similar meaning get vectors that are close together, even when they use different words. You cannot turn the vector back into the text.
2. **C.** Each embedding model has its own space: the numbers mean something only inside that model. A question vector from one model and a document vector from another cannot be compared, so the search returns nonsense.
3. **D.** HNSW is a graph index. It finds vectors that are very probably the nearest ones without checking every vector. You give up a little accuracy and get much more speed, which matters when there are millions of vectors.
4. **A.** A very small chunk has lost the sentences around it, so it is hard to understand alone. A very large chunk mixes several topics, so its vector is blurry and matches nothing well. It also fills the context window with text that is not needed.
5. **C.** A chunk is read alone, without the rest of the document. A header with date, speaker and topic makes it understandable by itself. The header is also part of the embedded text, so a search for a person or a date can find the chunk.
6. **B.** Follow the data in the order it flows: first storage, then retrieval, then generation. If an early step failed, the later steps cannot succeed, so you check the early step first.
7. **D.** Vector search is good at meaning but weak at exact strings such as ticket numbers, names or error codes. Keyword search is the opposite. Hybrid search runs both and combines the results.
8. **B.** The first search is fast but rough. A re-ranker then reads the question together with each retrieved passage and gives a more precise score. You keep only the best few passages for the prompt.
9. **C.** RAG retrieves only a few passages, so it never sees all the data at once. "How many…", "list all…" and "how did it change over time" need every record. Extract the facts into a table once, and answer these questions with SQL.
</details>
