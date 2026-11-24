# Chapter 1 — Foundations: How LLMs Work

**Goal of this chapter:** after it, you can explain what a large language model (LLM) is, how it produces text, what limits it has, and what it costs. Everything later in the book builds on these twelve ideas.

---

## 1. AI, machine learning, deep learning, generative AI

### The idea
These four words describe circles inside circles.

```
Artificial Intelligence (AI)
└── Machine Learning (ML)
    └── Deep Learning (DL)
        └── Generative AI
            └── Large Language Models (LLMs)
```

- **AI**: any technique that lets a computer do a task that normally needs human intelligence. A chess program with hand-written rules is AI.
- **Machine learning**: the computer *learns the rules from examples* instead of a programmer writing them.
- **Deep learning**: machine learning that uses large neural networks with many layers.
- **Generative AI**: deep-learning models that *create* new content: text, images, audio, code.
- **LLM**: a generative model for text. Claude, GPT, Gemini and Llama are LLMs.

### How it differs from normal programming
As a Java developer you write rules:

```
Traditional programming:   rules + data      →  answers
Machine learning:          data  + answers   →  rules (the "model")
```

To detect spam the traditional way, you write `if (text.contains("free money"))`. The ML way: you show the computer 100,000 emails already marked spam or not-spam, and it finds the patterns itself. The result is a **model**: a file full of numbers that holds those patterns.

### Remember
ML learns rules from data. An LLM is a very large ML model that generates text.

---

## 2. Neural networks: weights, layers, training, inference

### The idea
A neural network is a function. Numbers go in, numbers come out. Inside are millions or billions of adjustable numbers called **weights** (also called **parameters**).

### How it works
1. The input is turned into numbers.
2. The numbers pass through **layers**. Each layer multiplies them by its weights, adds them up, and passes the result to the next layer.
3. The last layer gives the output.

At the start the weights are random, so the output is nonsense. **Training** fixes that:

1. Show the network an example where the right answer is known.
2. Measure how wrong the output is. This number is the **loss**.
3. Change every weight a tiny bit in the direction that makes the loss smaller. (The method is called *gradient descent*; the way to work out each weight's share of the error is *backpropagation*. You do not need the math.)
4. Repeat billions of times.

**Inference** is using the finished network: weights are frozen, input goes in, output comes out.

| | Training | Inference |
|---|---|---|
| What happens | Weights are changed | Weights are fixed and used |
| Who does it | Model companies | You, on every API call |
| Cost | Months, huge computer clusters | Milliseconds to seconds per call |

### Common mistake
Thinking the model "learns" from your conversation. It does not. During inference the weights never change. If a chat product seems to remember you, the application is saving text and sending it again (see section 5 and chapter 3).

### Remember
Weights are the model's knowledge. Training sets them; inference only reads them.

---

## 3. What an LLM is: next-token prediction

### The idea
An LLM does one thing: **given some text, it predicts what comes next.** It produces a probability for every possible next piece of text (a *token*, section 4).

```
Input:  "The capital of France is"
Output: " Paris" 92%   " the" 2%   " located" 1%   ...thousands more...
```

### How a full answer is produced
The model works in a loop:

1. Predict the probabilities for the next token.
2. Pick one (section 9 explains how).
3. Add it to the text.
4. Go back to step 1 with the longer text.
5. Stop when the model produces a special "end" token or reaches a length limit.

This loop is called **autoregressive generation**. It is why answers appear word by word.

### What follows from this
- **The model does not look things up.** There is no database inside. It produces text that is *likely*, based on patterns in its training data. Likely is often true, but not always (section 10).
- **The model is stateless.** Each call starts from zero. It only knows the text you send in that call.
- **It can still do amazing things.** To predict the next word of a legal contract, a Java class or a proof well, a model must capture a lot about law, code and logic. Simple task, deep skill.

### Remember
An LLM is a next-token predictor running in a loop. Every strength and weakness comes from that.

---

## 4. Tokens and tokenization

### The idea
Models do not read letters or words. They read **tokens**: common chunks of text. A tokenizer cuts text into tokens and gives each a number.

```
"Tokenization is useful"  →  ["Token", "ization", " is", " useful"]  →  [3404, 2065, 374, 5505]
```

### Rules of thumb
- In English, 1 token ≈ 4 characters ≈ ¾ of a word. So 1,000 tokens ≈ 750 words.
- Common words are one token. Rare or long words are split into several.
- German uses more tokens than English for the same meaning, because of long compound words. Code, JSON and numbers also use many tokens.
- Every model family has its own tokenizer, so counts differ between models.

### Why you must care
1. **Cost**: you pay per token, in and out (section 12).
2. **Limits**: the context window and output limit are counted in tokens (section 5).
3. **Speed**: output is produced token by token.
4. **Odd behaviour**: models see tokens, not letters. That is why they can fail at "how many r's are in strawberry".

### Example
A 15-minute daily scrum is about 2,000–2,500 spoken words, so about 3,000–3,500 tokens of transcript.

### Remember
Tokens are the unit of everything: reading, writing, limits and money.

---

## 5. The context window

### The idea
The **context window** is all the text a model can see in one call. It includes:

- the system prompt (your instructions),
- the whole conversation so far,
- any documents or data you added,
- tool definitions and tool results,
- **and the answer the model is writing.**

Sizes today range from a few thousand tokens for small local models to hundreds of thousands, or more than a million, for large hosted models.

### The key consequence: no memory
The model has no memory outside the context window. A "conversation" works like this:

```
Call 1:  [system] [user: Hi, I'm Tharuka]                          → "Hello Tharuka!"
Call 2:  [system] [user: Hi, I'm Tharuka] [assistant: Hello...]
         [user: What is my name?]                                  → "Tharuka"
```

The application sends the **whole history again** on every call. If it leaves out the first message, the model does not know your name.

### Bigger is not automatically better
- **Cost and speed**: every token in the window is paid for and processed on every call.
- **Attention gets thinner**: with very long input, models can miss details, especially in the middle. This is sometimes called *lost in the middle* or *context rot*.
- **Hard limit**: if you send more than the window allows, the call fails or text is cut off. Some local tools cut silently (chapter 3).

### Example
One scrum ≈ 3,500 tokens. A year of daily scrums ≈ 220 meetings ≈ 770,000 tokens. You cannot, and should not, paste a year of meetings into every question. Choosing *which* text to put into the window is the core skill of AI engineering. It is called **context engineering**, and RAG (chapter 4) is its most common form.

### Remember
The model knows only what is in the window right now. Your job is to put the right text there.

---

## 6. How a chat model is made: pre-training, fine-tuning, RLHF

### The idea
A chat assistant is built in stages.

**Stage 1 — Pre-training.** The model reads an enormous amount of text (web pages, books, code) and practises predicting the next token. This takes months and costs a great deal. The result is a **base model**. A base model does not answer questions; it *continues documents*. Give it "What is the capital of France?" and it may continue with more questions, like a quiz page.

**Stage 2 — Fine-tuning for chat.** The base model is trained further on a much smaller set of high-quality example conversations: a question, then a helpful answer. Now it behaves like an assistant.

**Stage 3 — Learning from human preference.** People (or other models) compare answers and mark the better one. The model is adjusted to produce the kind of answer that is preferred: helpful, honest, safe. One well-known method is **RLHF**, *reinforcement learning from human feedback*.

### What follows from this
- **Knowledge cutoff.** Training data ends at a date. The model knows nothing after it, unless you put newer information into the context.
- **It knows nothing about your private data.** Your company's code and your meetings were never in the training data.
- **Behaviour comes from training plus your prompt.** Training gives the general character; your system prompt steers it for your task.
- You can also fine-tune a model yourself (chapter 8), but you rarely need to.

### Remember
Pre-training gives knowledge, fine-tuning gives the assistant behaviour, and nothing after the cutoff date is known.

---

## 7. Transformers and attention (intuition only)

### The idea
The **transformer** is the neural network design behind all modern LLMs (introduced in 2017 in the paper "Attention Is All You Need"). Its key part is **attention**.

### Attention in one example
> "The animal didn't cross the street because **it** was too tired."

What does "it" mean? To predict well, the model must connect "it" with "animal", not "street". Attention is the mechanism that lets every token *look at every other token in the context* and decide how much each one matters for understanding it.

### How the transformer uses it
1. Each token is turned into a list of numbers (a vector) that represents its meaning.
2. Position information is added, so the model knows word order.
3. The vectors pass through many layers. In each layer, attention mixes in information from the other relevant tokens, so each vector becomes richer: "it" becomes "it = the tired animal".
4. From the final vector of the last token, the model computes the probabilities for the next token.

### Why it matters to you
- Attention is why models can use information from anywhere in the context window.
- Attention work grows quickly as the input gets longer. That is one reason long contexts are slower and more expensive.
- All tokens can be processed in parallel during training. That made it possible to train on huge data, which is what made LLMs "large".

### Remember
Attention lets each token pull in meaning from all other tokens. You do not need the math to be a good AI engineer.

---

## 8. Model size, open vs closed, local vs hosted

### Size
Size is counted in **parameters** (weights): 3 billion ("3B"), 70B, and far more for the largest models. In general, more parameters means more capable but slower and more expensive to run.

### Open vs closed
| | Open-weight models | Closed models |
|---|---|---|
| Examples | Llama, Mistral, Qwen, Gemma | Claude, GPT, Gemini |
| You get | The weight files | Only an API |
| Run where | Your laptop, your servers | The provider's servers |

### Local vs hosted
| | Local (for example Ollama) | Hosted API |
|---|---|---|
| Quality | Good for simple tasks | Best available |
| Privacy | Data never leaves your machine | Data goes to the provider |
| Cost | Free per call, but you need hardware | Pay per token, no hardware |
| Speed | Depends on your machine | Usually fast |
| Setup | You manage it | Just an API key |

Rough hardware rule for local models: a compressed ("4-bit quantized", chapter 3) model needs a bit under 1 GB of memory per billion parameters. A 7B model runs on a normal 16 GB laptop; a 70B model does not.

### Example
For the Scrum Memory Assistant, meeting transcripts are sensitive. During learning you can use a small local model so nothing leaves your machine. For quality you may later use a hosted model, but only after checking your company's rules (chapter 7).

### Remember
Local = private and free per call but weaker. Hosted = strongest but data leaves and you pay per token.

---

## 9. Sampling settings: temperature, top-p, max tokens

### The idea
The model gives probabilities; **sampling settings** control how the next token is chosen from them.

- **Temperature** controls randomness.
  - `0`: always (almost) pick the most likely token. Focused and repeatable.
  - Around `1`: pick in proportion to the probabilities. More varied and creative.
  - Much higher: increasingly random.
- **Top-p** (nucleus sampling): only consider the smallest group of tokens whose probabilities add up to *p*. With `top_p = 0.9` the unlikely tail is cut off.
- **Top-k**: only consider the *k* most likely tokens.
- **Max tokens**: a hard limit on the length of the answer. When reached, the answer is cut, even mid-sentence.
- **Stop sequences**: text that makes the model stop when it appears.

### What to use
| Task | Temperature |
|---|---|
| Extracting data, classification, code, factual answers | 0 – 0.3 |
| General chat, summaries | 0.3 – 0.7 |
| Brainstorming, creative writing | 0.7 – 1.0 |

Change temperature *or* top-p, not both at once.

### Common mistakes
- Believing temperature 0 guarantees the same answer every time. It makes answers *much more* stable, not identical.
- Setting max tokens too low and receiving half a JSON document. Always check *why* the model stopped (chapter 3).
- Assuming every model accepts these settings. Some newer models fix or limit them. Read the model's documentation.

### Remember
Low temperature for facts and data, higher for ideas. Always set max tokens on purpose.

---

## 10. Hallucinations

### The idea
A **hallucination** is an answer that sounds confident and fluent but is false or made up.

### Why it happens
The model is trained to produce *plausible* text, and plausible is not the same as true. It has no built-in step that checks facts, and it does not always know what it does not know. When it lacks information, the most likely continuation is often something that merely *looks* right.

### Typical forms
- Made-up facts, numbers, dates and quotes.
- Made-up sources, links, library names or API methods.
- Wrong details about a document that *is* in the context (less common, but it happens).

### How to reduce them
1. **Give the model the facts** in the context (grounding, RAG). This is the strongest fix.
2. **Allow "I don't know"**: "If the answer is not in the transcripts, say so."
3. **Ask for evidence**: "Quote the sentence that supports your answer."
4. **Lower the temperature** for factual tasks.
5. **Validate the output in code**: check that IDs exist, dates are valid, quoted text really appears in the source.
6. **Use a stronger model** for tasks where errors are costly.

### Common mistake
Thinking hallucinations can be removed completely. They can be made rare, never impossible. Design your product so a wrong answer is easy to notice and cheap to fix: show sources, keep a human in control of important actions.

### Remember
Fluent is not the same as correct. Ground the model in real data and verify what matters.

---

## 11. The model landscape and how to choose

### The idea
There are several model families, and each offers **tiers**: a small, fast, cheap model; a middle one; and a large, most capable, most expensive one.

| Family | Maker | Type |
|---|---|---|
| Claude | Anthropic | Closed, API |
| GPT | OpenAI | Closed, API |
| Gemini | Google | Closed, API |
| Llama | Meta | Open-weight |
| Mistral | Mistral AI | Open-weight and API |
| Qwen | Alibaba | Open-weight |

Names and versions change every few months. Do not memorise them; learn how to choose.

### How to choose
Ask these questions:

1. **Quality**: is it good enough *on my task*? (Only your own tests can tell you, chapter 6.)
2. **Cost**: price per million input and output tokens.
3. **Speed**: important for chat, less for background jobs.
4. **Context window**: does my input fit?
5. **Features**: tool calling, structured output, images, caching.
6. **Languages**: how good is it in German, if your meetings are in German?
7. **Privacy**: may this data leave my machine or the EU?

### A practical method
Start with a strong model to prove the idea works. Then try cheaper and smaller models and keep the cheapest one that still passes your tests. Public benchmarks are a hint; your own evaluation decides.

### Remember
Pick the cheapest model that passes *your* tests, not the one at the top of a ranking.

---

## 12. Cost and latency

### Cost
Hosted models are priced **per million tokens**, with separate prices for input and output. Output tokens usually cost several times more than input tokens.

**Worked example** (prices are made up to show the method; look up real ones):

> Price: $3 per million input tokens, $15 per million output tokens.
> Task: summarise one scrum transcript (4,000 input tokens) into 300 output tokens.
>
> Input: 4,000 ÷ 1,000,000 × $3 = $0.012
> Output: 300 ÷ 1,000,000 × $15 = $0.0045
> **Total: about $0.017 per meeting**, so about $3.60 a year for daily scrums.

Now a chat question that sends 20 retrieved passages (8,000 tokens) and gets 400 tokens back costs about $0.03. A thousand such questions a day is $30 a day. Cost is small per call and large at scale, so measure it early.

### Latency
Two numbers matter:
- **Time to first token**: how long until the answer starts.
- **Tokens per second**: how fast it is written.

Total time ≈ time to first token + (output tokens ÷ tokens per second). **Output length is usually the biggest part.** Asking for shorter answers is the simplest way to be faster.

**Streaming** sends tokens to the user as they are produced. The total time is the same, but the user sees progress at once, so it feels much faster.

### Rate limits
Providers limit requests per minute and tokens per minute. Beyond the limit you get HTTP `429 Too Many Requests`. Your code must handle that (chapter 3).

### Remember
You pay per token and output is the expensive, slow part. Estimate cost per call × calls per day before you build.

---

## Exercises

1. **Token counting.** Find a tokenizer tool online for any model family. Paste one English paragraph and its German translation. Compare the token counts.
2. **Feel the loop.** Install Ollama (chapter 3 explains how), run a small model, and watch the text arrive token by token.
3. **Temperature.** Ask a local model the same creative question five times at temperature 0 and five times at 1. Write down what changes.
4. **Stateless proof.** Call a model's API twice: first "My name is …", then, in a separate call without history, "What is my name?". Explain the result.
5. **Cost estimate.** Estimate the yearly cost of the Scrum Memory Assistant for a team: 220 meetings to summarise plus 10 questions a day. Use real prices of one model.
6. **Hallucination hunt.** Ask a model about a library method that does not exist ("How do I use `String.reverseWords()` in Java?"). Note what it does. Then add "If this method does not exist, say so" and compare.

## Check yourself

1. What is the difference between training and inference?
   - A. Training runs the model for users; inference changes the weights.
   - B. Training changes the weights using examples; inference uses the fixed weights to produce output.
   - C. Training happens on your laptop; inference happens only in the cloud.
   - D. There is no difference; both words mean running the model.
2. Why does an LLM not "remember" your previous conversation by itself?
   - A. Its memory is deleted every night.
   - B. It remembers only the last three messages.
   - C. It is stateless: it only sees the context window of the current call.
   - D. Providers block memory for privacy reasons.
3. Roughly how many tokens are 3,000 English words?
   - A. About 750 tokens.
   - B. About 2,250 tokens.
   - C. About 3,000 tokens.
   - D. About 4,000 tokens.
4. Which list contains only things that count towards the context window?
   - A. System prompt, conversation history, added documents or tool results, and the answer being written.
   - B. The model's weights, the training data, the system prompt and the answer.
   - C. Only the latest user message and the answer.
   - D. The system prompt, your API key, the temperature setting and the history.
5. What is a base model, and how is it different from a chat model?
   - A. A base model is smaller; a chat model is the larger version.
   - B. A base model only continues text; a chat model was fine-tuned on conversations to follow instructions and answer.
   - C. A base model answers questions; a chat model only completes sentences.
   - D. A base model runs locally; a chat model runs in the cloud.
6. What does attention do?
   - A. It decides how long the answer is.
   - B. It removes unimportant tokens from the context window.
   - C. It lets each token take in information from the other tokens that matter for its meaning.
   - D. It stores the conversation between calls.
7. Which temperature would you use to extract action items as JSON, and why?
   - A. 0 to 0.3, because you want the same, exact result each time.
   - B. Around 1, because JSON needs creativity.
   - C. Above 1.5, so the model finds more action items.
   - D. Temperature does not matter for JSON.
8. Which list contains three ways to reduce hallucinations?
   - A. Raise the temperature; remove the documents; forbid "I don't know".
   - B. Put the facts in the context; allow "I don't know"; ask for quotes.
   - C. Use a longer system prompt; use a smaller model; ask the question twice.
   - D. Hide the sources; increase max tokens; use a base model.
9. Why is output length the main driver of latency?
   - A. Long outputs need a bigger context window.
   - B. The provider slows down long answers on purpose.
   - C. Output tokens are checked by a second model.
   - D. Output is produced one token at a time; input is processed much faster.

<details>
<summary>Answers</summary>

1. **B.** Training is the learning phase: the weights change as the model sees examples. Inference is the using phase: the weights stay fixed and the model only produces output. When you call a model through an API, you are doing inference.
2. **C.** The model keeps nothing between calls. It only sees what is in the context window of the current call. A chat seems to have memory only because the application sends the history again every time.
3. **D.** One token is about ¾ of a word, so a text has more tokens than words. 3,000 ÷ 0.75 is about 4,000 tokens.
4. **A.** Everything the model reads or writes in one call counts: the system prompt, the history, added documents or tool results, tool definitions, and the answer being written. Weights, training data, API keys and settings such as temperature are not text in the context window.
5. **B.** A base model comes out of pre-training and can only continue a text. A chat model is a base model that was fine-tuned on conversations, so it follows instructions and answers questions. The difference is the extra training, not the size or the place where it runs.
6. **C.** Attention lets each token look at the other tokens and take in information from the ones that matter for its meaning. For example, in "the bank of the river", the token "bank" can use "river" to get the right meaning. It does not delete tokens and it does not store anything.
7. **A.** Extraction has one right result, so you want the same, exact output each time, not variety. A low temperature (0 to 0.3) makes the model pick the most likely tokens. A high temperature adds randomness, which can also break the JSON.
8. **B.** The model invents less when the facts are in front of it, when it is allowed to say "I don't know", and when it must quote its source. A lower temperature, checks in code and a stronger model also help.
9. **D.** The model writes the answer one token after another, so each extra output token adds time. The input is processed much faster. To make a call faster, ask for a shorter answer first.
</details>
