# Chapter 8 — Advanced Topics

**Goal of this chapter:** after it, you can decide whether fine-tuning is worth it, choose between small and large models with reasons, use more than text, think about AI as a product, and keep your knowledge current.

These topics are optional for your first project. Read them so you can make informed decisions, and return when a real need appears.

---

## 51. Fine-tuning

### The idea
**Fine-tuning** means continuing the training of an existing model on your own examples, so that its weights change and it behaves differently by default.

### The key question: when?
Fine-tuning is the *last* tool to reach for, not the first.

```
1. Better prompt            (minutes)
2. Few-shot examples        (minutes)
3. RAG / better context     (days)
4. A stronger model         (a config change)
5. Fine-tuning              (weeks, plus upkeep)
```

| Fine-tuning is good for | Fine-tuning is the wrong tool for |
|---|---|
| A fixed style, tone or format that prompts do not hold reliably | **Adding knowledge or facts** → use RAG |
| A narrow task done at very high volume, where a small tuned model replaces a large one (cheaper, faster) | Data that changes often (you would retrain all the time) |
| Special vocabulary or classification with many labelled examples | Fixing hallucinations in general |
| Shortening very long prompts that repeat on every call | A problem you have not yet tried to solve with prompting |

A common misunderstanding: "I will fine-tune the model on my meetings so it knows them." A fine-tuned model does not recall documents reliably, cannot cite them, and cannot forget one when you must delete it. Knowledge belongs in retrieval.

### How it works today: LoRA and QLoRA
Changing all billions of weights is expensive. **LoRA** (*low-rank adaptation*) freezes the original model and trains only a small set of extra weights, an **adapter**, often well under 1% of the model's size.

- Training is far cheaper and can run on one GPU.
- The adapter is a small file. One base model can serve many adapters.
- **QLoRA** does the same on a quantized (compressed) base model, lowering memory needs further.

Hosted providers also offer fine-tuning as a service for some models: you upload examples and receive a private model id.

### The data
- Format: usually JSONL, one example conversation per line (system, user, ideal assistant answer).
- Amount: from a few hundred to a few thousand **high-quality** examples. Quality beats quantity.
- Split: keep part of the data aside (a *validation set*) to test on examples the model has not seen.
- Source: the best examples are real inputs with outputs that a person checked or corrected. Your feedback data and eval failures are raw material.

### The costs people forget
- **Evaluation first.** Without an eval set (chapter 6), you cannot tell whether the tuned model is better.
- **Overfitting.** The model can memorise your examples and get worse on everything else.
- **Upkeep.** When a better base model appears, your fine-tune stays on the old one until you redo it.
- **Operations.** A self-hosted tuned model needs GPU serving.

### Remember
Fine-tune for behaviour, style and cheap narrow tasks, never to add facts. Exhaust prompting and RAG first, and have evals before you start.

---

## 52. Small versus large models, and distillation

### The idea
Bigger models are more capable; smaller models are faster, cheaper and can run locally. Good systems **mix** them.

| | Small model | Large model |
|---|---|---|
| Reasoning over many steps | Weak | Strong |
| Following long, complex instructions | Fair | Strong |
| Simple classification, extraction, rewriting | Good | Good (wasteful) |
| Speed | Fast | Slower |
| Cost | Low | High |
| Runs on a laptop | Yes | No |

### Where small models fit in your assistant
- Routing a question to the right path.
- Turning "last week" and "Anna" into filter values.
- Rewriting a follow-up question for search.
- Classifying a statement as progress, blocker or plan.

The large model is for the final answer that combines evidence, and for the careful extraction after each meeting.

**Always decide with your eval set**, per step: try the small model; if the score holds, keep it.

### Distillation
**Distillation** transfers the skill of a large model (the *teacher*) into a small one (the *student*):

1. Run the large model on thousands of real inputs and store its outputs.
2. Fine-tune the small model on these input–output pairs.
3. The small model now does *this one task* almost as well, at a fraction of the cost.

It is the practical route to the "narrow task at high volume" case in section 51. Check the provider's terms first; some restrict using outputs to train other models.

### Small models on devices
Small models can run on a laptop or phone, with no network and full privacy. For a meeting product, "everything stays on your machine" is a real selling point, at the price of lower quality.

### Remember
Use small models for simple steps and a large one where reasoning matters; let evals decide. Distillation makes a small model good at one narrow job.

---

## 53. Multimodal models

### The idea
**Multimodal** models accept more than text: images, PDFs, audio, sometimes video. Some also produce images or speech.

### How images work
An image is cut into patches, and each patch becomes tokens the model reads next to the text tokens. So:
- Images **cost tokens**; larger images cost more.
- The model can read text in images, describe diagrams, compare screenshots and read charts.
- Very small text or fine detail can be misread, like a person squinting. Send images in good resolution, crop to the relevant part.

### Useful applications for a developer
- **Screenshots**: "What is wrong in this error dialog?"
- **Diagrams and whiteboards**: turn a photo of an architecture sketch into text or Mermaid.
- **Scanned documents and PDFs**: extract tables and fields that plain text extraction breaks.
- **UI checks**: compare a design with a screenshot of the built page.

### For the Scrum Memory Assistant
- A shared screen or whiteboard photo from a meeting can be stored with the transcript and described by the model, so it becomes searchable.
- Slides shown in a meeting can be linked to the moment they were shown.

### Audio: two designs
| Design | How | Trade-off |
|---|---|---|
| **Pipeline** | Speech-to-text → text model | Simple, cheap, you keep a transcript; tone of voice is lost |
| **Audio-native model** | The model hears the audio directly | Catches tone and emphasis; costs more, harder to store and search |

Your current design (a speech service, then text models) is the pipeline, and it is the right start: transcripts are small, searchable and easy to cite.

### Remember
Models can read images and documents, at a token cost. Use it where text alone loses information, and keep the transcript pipeline for audio.

---

## 54. AI product thinking

### The idea
A working model call is not a product. A product solves a real problem for a real person so well that they come back. You said you want to grow the assistant into your own product, so this section matters as much as the technical ones.

### Start from the job, not from the technology
Ask: *what does the user want to get done?*

Not "chat with meeting transcripts". Instead:
- "I missed part of the scrum because of the language. What do I need to know?"
- "What did I promise to do, and by when?"
- "Why is this ticket late? I must explain it to someone."

Each job suggests a feature that may not be a chat box at all: a daily digest, an "open promises" list, a ticket timeline.

### Design for a system that is sometimes wrong
This is the special challenge of AI products.
- **Show sources.** A link to the meeting moment turns doubt into a five-second check.
- **Make output editable.** Let the user correct a summary or a wrong owner. The correction is also training material for you.
- **Express uncertainty.** "I could not find this" is a feature.
- **Keep people in control.** The assistant suggests; the user confirms anything that matters.
- **Make undo easy.**

### Speed is part of quality
- Stream answers.
- Do heavy work before the user asks (process the meeting when it ends), so answers are quick.
- Show progress for long tasks.

### Build the feedback loop
```
real use → feedback and corrections → eval set → improvements → real use
```
Every thumbs-down and every edit is a free test case. Teams that close this loop improve every week; teams that do not, guess.

### Measure value, not usage of AI
| Weak metric | Strong metric |
|---|---|
| Number of questions asked | Do people return each week? |
| Tokens used | Time saved per meeting |
| "Users like it" | Share of answers accepted without correction |

### Know your economics
Work out **cost per user per month**: meetings ingested × cost each + questions × cost each. Compare it with what a user would pay. Chapter 7's cost levers are also your margin.

### What makes a product defensible
Everyone can call the same models. What others cannot copy quickly:
- **Your data and its structure**: a year of a team's meetings, well organised.
- **Workflow fit**: integrations with the tools the team already uses.
- **Trust**: privacy, reliability, correct citations.
- **Your eval set**: accumulated knowledge of what "good" means for this task.

### How to start
Start narrow. One user (you), one job (follow my daily scrum), done very well. When you use it every day and would miss it, show it to two colleagues. Their confusion will teach you more than a month of features.

### Remember
Solve one real job, design for errors with sources and corrections, close the feedback loop, and measure saved time, not AI activity.

---

## 55. Keeping up

### The idea
This field changes monthly. You cannot follow everything, and you do not need to. The fundamentals in this book move slowly. What changes fast are model versions, prices and library APIs.

### A sustainable routine: about one hour a week
1. **Release notes of the tools you use**: your model provider, Spring AI, your vector store. This is the highest-value reading there is.
2. **One or two good sources** that summarise the field: a newsletter or a blog by practitioners. Choose few and read them properly.
3. **Build something small** with one new idea each month. Reading without building fades quickly.

### How to read a model announcement
Ask five questions:
1. Context window and maximum output: changed?
2. Price per million input and output tokens?
3. New abilities: tools, structured output, images, reasoning modes?
4. Any behaviour changes or removed settings that affect my prompts?
5. **How does it score on my own eval set?** This is the only number that decides.

A leaderboard position says little about *your* task. Benchmarks can be outdated, can leak into training data, and measure general skills. Run your evals (chapter 6): that is why you built them.

### How to read a research paper (when you want to)
You do not have to read papers to be a good AI engineer. When one matters:
1. Abstract: what is claimed?
2. Figures and tables: what is the evidence?
3. Conclusion and limitations: where does it not work?
4. Only then, if still useful, the method.

Most ideas that matter reach libraries and documentation within months, in an easier form.

### Protect yourself from noise
- A new framework every week does not mean you must switch. Concepts transfer; choose one stack and go deep.
- Be sceptical of demos. A demo shows the best case; your users will find the others.
- Prefer primary sources (official documentation, release notes) to commentary about them.

### What stays true
Across every model generation so far:
- Clear context and instructions beat clever tricks.
- Retrieval quality decides RAG quality.
- What you do not measure, you cannot improve.
- Simple designs outlast complicated ones.
- Privacy and trust decide whether people adopt the product.

### Remember
Follow the release notes of what you use, test new models on your own evals, build something small every month, and trust fundamentals over hype.

---

## Exercises

1. **Decide.** For each wish, choose prompt, RAG or fine-tuning and explain: (a) "always answer in our team's summary format", (b) "know what was said in last month's meetings", (c) "classify 2 million short messages a day cheaply".
2. **Small versus large.** Run your router and your final-answer step with a small and a larger model. Compare eval scores, speed and cost per step.
3. **Image input.** Give a model that accepts images a photo of a whiteboard or a diagram. Ask for a text description and a Mermaid diagram.
4. **Jobs to be done.** Write down five jobs you personally want the assistant to do. For each, sketch the best interface. How many are *not* a chat box?
5. **Economics.** Compute cost per user per month for a team of eight with one meeting a day and ten questions per person a day.
6. **Release notes.** Read the latest release notes of your model provider and of Spring AI. Note one change that affects your project.
7. **Teach it.** Explain to a colleague, in five minutes, when to use RAG and when fine-tuning. If you can, you have understood chapters 4 and 8.

## Check yourself

1. Why is fine-tuning the wrong way to give a model knowledge of your meetings?
   - A. Fine-tuning is not allowed for meeting data.
   - B. Fine-tuned models are always slower.
   - C. Tuned models do not recall documents reliably, cannot cite them, cannot forget a deleted one, and need retraining as data changes.
   - D. Fine-tuning only works for images.
2. In what order do you try the options before fine-tuning?
   - A. Fine-tuning, then RAG, then a better prompt.
   - B. A stronger model, then fine-tuning, then examples.
   - C. RAG, then fine-tuning, then a better prompt.
   - D. Better prompt, few-shot examples, RAG or better context, a stronger model, then fine-tuning.
3. What does LoRA train, and why is that cheaper?
   - A. Only a small adapter of extra weights while the base model stays frozen; far fewer weights to train and store.
   - B. All weights, but with less data.
   - C. Only the tokenizer.
   - D. Only the system prompt.
4. What is distillation?
   - A. Removing unused weights from a model.
   - B. Training a small model on the outputs of a large one so it does one task almost as well, more cheaply.
   - C. Storing weights with fewer bits.
   - D. Shortening long prompts.
5. Which steps of the assistant can a small model handle?
   - A. Writing the final long answer.
   - B. Deep reasoning over many documents.
   - C. Routing, turning words into filter values, query rewriting and simple classification.
   - D. None; always use the largest model.
6. Why do images increase cost?
   - A. Images need a separate API key.
   - B. Images are stored forever.
   - C. Images are sent twice.
   - D. Images are turned into tokens, and larger images mean more tokens.
7. Which list contains ways to design for a system that is sometimes wrong?
   - A. Hide the sources, lock the output and sound certain.
   - B. Show sources, make output editable and state uncertainty.
   - C. Remove the undo button, send results automatically and skip review.
   - D. Promise 100% accuracy, hide errors and block feedback.
8. Which metric shows product value better than "number of questions asked"?
   - A. Number of tokens used.
   - B. Number of registered users.
   - C. Weekly return rate, time saved, or share of answers accepted without correction.
   - D. Number of features.
9. What decides whether you move to a new model?
   - A. Its rank on public leaderboards.
   - B. Its score on your own eval set, together with cost and speed.
   - C. How new it is.
   - D. What other companies use.

<details>
<summary>Answers</summary>

1. **C.** Fine-tuning changes how a model behaves; it is a poor store for facts. A tuned model does not recall documents reliably, cannot say where a fact came from, cannot forget a deleted meeting, and must be retrained when data changes. Use retrieval for knowledge.
2. **D.** Go from cheap and fast to expensive and slow: a better prompt, then few-shot examples, then RAG or better context, then a stronger model. Fine-tuning comes last, because it costs the most time and is the hardest to change.
3. **A.** LoRA leaves the base model's weights unchanged (frozen) and trains only a small set of extra weights, called an adapter. There are far fewer weights to train and to store, so it needs much less computing power.
4. **B.** In distillation, a large model produces answers for one task, and a small model is trained on these answers. The small model then does that one task almost as well, at a much lower cost. Storing weights with fewer bits is quantization, a different technique.
5. **C.** Small models are good at short, simple and well-defined steps: choosing a route, turning words into filter values, rewriting a query and simple classification. Keep the large model for the hard steps.
6. **D.** The model cannot read pixels directly. An image is turned into tokens, and a larger image becomes more tokens. You pay for these like for text tokens.
7. **B.** Since the system will sometimes be wrong, help the user notice and fix it: show the sources, let them edit the output, and say when the system is unsure. Keeping people in control and making undo easy belong on the list too.
8. **C.** Many questions can also mean the first answers were bad. Value shows when people come back every week, save time, or accept answers without correcting them.
9. **B.** Public leaderboards measure other people's tasks. Only your own eval set shows how the model does on your task. Compare that score together with cost and speed.
</details>
