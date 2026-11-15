# Chapter 6 — Quality: Evaluation and Testing

**Goal of this chapter:** after it, you can measure whether your AI feature is good, prove that a change made it better, and stop regressions before they reach users.

This chapter is short, but it is what separates a demo from a product. Many people can make an LLM app that works on three examples. Few can say "it is correct on 87% of our test questions, up from 79% last week".

---

## 40. Why testing LLMs is different

### The idea
In normal code, `assertEquals(42, add(40, 2))` is enough. With LLMs this breaks down:

| Normal code | LLM feature |
|---|---|
| Same input, same output | Output can differ from run to run |
| One correct answer | Many correct answers in different words |
| Fails loudly (exception) | Fails silently (a fluent, wrong answer) |
| A fix stays fixed | A prompt change can fix one case and break five |
| Behaviour changes only when you deploy | The provider can update the model behind the same name |

### What follows
- You cannot test by exact string comparison (except for labels and structured data).
- You need **many examples** and a **score**, not one example and a pass/fail.
- You test **statistically**: "passes 46 of 50", not "works".
- "It looked good when I tried it" is not evidence. People call that *vibe checking*. It is fine for a first experiment and dangerous as a release process.

### The word
An **eval** (evaluation) is a repeatable test of an AI feature: a set of inputs, a way to judge the outputs, and a score.

### Remember
LLM output is variable and fails silently. Quality is a score over many cases, measured again after every change.

---

## 41. Evaluation sets and golden answers

### The idea
An **evaluation set** is a list of test cases. Each case has an input and something to judge the output against.

```json
{
  "id": "q-014",
  "question": "When did SAP open the firewall for the price import?",
  "expected": "On 13 November 2026.",
  "mustCiteMeeting": "2026-11-13",
  "type": "find-moment"
}
```

The expected answer is often called the **golden answer** or *reference*.

### How to build a good set
1. **Start small: 20–30 cases.** A small set you actually run beats a big set you plan.
2. **Use real inputs.** Questions you really ask about your meetings, not ones you invented to be easy.
3. **Cover the types.** For the Scrum Memory Assistant: one-meeting questions, find-a-moment questions, count and list questions, questions about a person, questions with a date range.
4. **Include hard cases on purpose**:
   - the answer is **not in the data** (expected: "not found"),
   - a name the speech service got wrong,
   - a question in German about an English passage,
   - two meetings that contradict each other (a decision that was later changed).
5. **Grow it from failures.** Every time the assistant gives a bad answer in real use, add that case. After some months, this set is your most valuable asset.
6. **Keep it stable.** Do not tune the prompt on the same 20 cases forever, or you will fit the prompt to them. Keep a second, untouched set to confirm.

### Ways to judge an output
From cheap and exact to costly and flexible:

| Method | Example | Use for |
|---|---|---|
| **Code checks** | Label equals `BLOCKER`; JSON parses; date is valid; answer contains "13 November"; cited meeting id is correct | Classification, extraction, format, citations |
| **Similarity to reference** | Compare extracted action items with the expected list | Structured results |
| **LLM as judge** | "Does this answer say the same as the reference?" | Free-text answers (section 42) |
| **Human review** | You read 30 outputs | Building trust, checking the judge, subtle quality |

**Prefer code checks wherever possible.** They are free, instant and never wrong.

### Remember
Collect real cases, include "not found" and hard ones, judge with code where you can, and add every real failure to the set.

---

## 42. LLM as judge

### The idea
For free-text answers no code check can tell if "They opened it on Friday the 13th" matches "On 13 November 2026". A second model call can. This is **LLM-as-judge**.

### A judge prompt

```
You are grading an answer from a meeting assistant.

<question>{question}</question>
<reference_answer>{expected}</reference_answer>
<assistant_answer>{actual}</assistant_answer>

Grade the assistant's answer against the reference answer:
- PASS if it gives the same facts as the reference, even in other words,
  and adds nothing that contradicts it.
- FAIL if a fact is missing, wrong, or invented.

First explain your reasoning in two or three sentences.
Then give the verdict.
```

With structured output:

```java
record Grade(String reasoning, Verdict verdict) {}
enum Verdict { PASS, FAIL }
```

### Rules for a reliable judge
1. **One clear criterion per judge.** Correctness, groundedness and tone are three judges, not one.
2. **Pass/fail instead of a 1–10 scale.** Models are inconsistent between 6 and 7, but good at yes or no.
3. **Reasoning before verdict** (chapter 2, section 16).
4. **Give the reference.** Judging against a known answer is far easier than judging truth from nothing.
5. **Low temperature**, for stable grades.
6. **Check the judge.** Grade 30 cases yourself, compare with the judge, and fix the judge prompt until you agree on almost all. A judge you never checked is another unverified model.
7. Use a **capable model** as judge; the judging task is often harder than it looks.

### Limits
A judge costs money and time, and can be wrong. Use code checks first, a judge for what code cannot check, and your own eyes regularly.

### Remember
A judge is a model grading against a clear rule and a reference. Make it binary, make it explain first, and verify it against your own grades.

---

## 43. RAG-specific metrics

### The idea
A RAG system has two parts, and each can fail alone. Measure them separately.

```
question → [ RETRIEVAL ] → passages → [ GENERATION ] → answer
```

### Retrieval metrics
For each test question, mark which chunks *should* be found (the relevant ones).

| Metric | Question it answers | Example |
|---|---|---|
| **Recall@k** | Of the relevant chunks, how many are in the top *k*? | 2 relevant chunks exist, 1 is in the top 5 → 50% |
| **Precision@k** | Of the top *k*, how many are relevant? | 1 of 5 is relevant → 20% |
| **MRR** (mean reciprocal rank) | How high is the first relevant chunk? | First hit at rank 2 → 1/2 |

**Recall is the one that matters most.** If the right chunk is not retrieved, no model can answer correctly. Low precision only adds some noise.

These are plain code checks: compare retrieved chunk ids with expected ids. No LLM needed.

### Generation metrics
| Metric | Question it answers | How to check |
|---|---|---|
| **Faithfulness** (groundedness) | Is every statement supported by the retrieved passages? | LLM judge with passages + answer |
| **Answer relevance** | Does it answer the question that was asked? | LLM judge |
| **Correctness** | Does it match the golden answer? | LLM judge with reference |
| **Citation accuracy** | Do the cited sources really support the statements? | Code + judge |

### Diagnosing with both
| Retrieval | Answer | Meaning | Fix |
|---|---|---|---|
| Good | Good | Working | — |
| Bad | Bad | Search failed | Chunking, filters, hybrid search, re-ranking |
| Good | Bad | Model misused good passages | Prompt, model, fewer or cleaner passages |
| Bad | "Good" | The model answered from its own memory | Dangerous: tighten "use only the excerpts" |

Without separate numbers you would tune the prompt for a search problem, and waste days.

### Remember
Measure retrieval (recall first) and generation (faithfulness, correctness) separately, so you know which half to fix.

---

## 44. Regression testing in CI

### The idea
Run your evals automatically, like unit tests, so a change that lowers quality is caught before it is merged.

### A simple shape in Java

```java
@SpringBootTest
@Tag("eval")
class AssistantEvalTest {

    @Autowired Assistant assistant;
    @Autowired Judge judge;

    @Test
    void answersMeetQualityBar() {
        List<EvalCase> cases = EvalCases.load("evals/questions.jsonl");

        long passed = cases.stream()
            .filter(c -> judge.grade(c, assistant.ask(c.question())).verdict() == Verdict.PASS)
            .count();

        double score = (double) passed / cases.size();
        System.out.printf("Eval score: %.0f%% (%d/%d)%n", score * 100, passed, cases.size());

        assertThat(score).isGreaterThanOrEqualTo(0.85);
    }
}
```

Note the difference from a unit test: the assertion is a **threshold on a score**, not on a single case.

### Practical rules
- **Separate from unit tests.** Evals are slow and cost money. Tag them and run them when prompts, models, retrieval code or the eval set change, plus nightly.
- **Two sizes.** A small "smoke" set (10 cases) on every pull request; the full set nightly or before release.
- **Record every run**: date, commit, prompt version, model, score, and the failed case ids. A score over time shows whether you are improving.
- **Read the failures.** The score tells you *that* something broke; reading five failed cases tells you *what*.
- **Allow for noise.** With 30 cases, one case is 3 points. Do not celebrate or panic over ±1 case; run twice if unsure.
- **Re-run when the model changes.** A new model version, even under the same name, is a change to your system. Your eval set is how you decide whether to upgrade.
- **Pin versions.** Use exact model versions in production where the provider offers them, and store prompts in version control (chapter 2).

### The improvement loop
```
1. Look at real outputs and failures
2. Form one idea (prompt, chunking, model, filter)
3. Change one thing
4. Run the eval set
5. Better overall? Keep. Otherwise revert.
6. Add newly found failures to the set
```

This loop, not clever prompting, is how AI features get good.

### Remember
Automate your evals, assert on a score threshold, track it over time, and rerun whenever prompt, code or model changes.

---

## Exercises

1. **First eval set.** Write 20 questions about your fake meetings with golden answers. Include 3 "not found" cases and 3 count or list questions.
2. **Code checks.** For the PROGRESS / BLOCKER / PLAN classifier from chapter 2, write a test that reports accuracy over 20 labelled sentences.
3. **Build a judge.** Implement the PASS/FAIL judge. Grade 20 answers yourself first, then compare with the judge. Where do you disagree, and why?
4. **Retrieval recall.** For 10 questions, write down the ids of the chunks that should be found. Measure recall@5. Change the chunking and measure again.
5. **Diagnose.** Take three wrong answers and place each in the table of section 43.
6. **Automate.** Put the eval in a tagged JUnit test with a threshold and run it from Maven.
7. **Prove an improvement.** Make one change (for example add context headers to chunks) and show the before and after score.

## Check yourself

1. Give three reasons why LLM testing differs from normal unit testing.
2. What is a golden answer?
3. Which kinds of cases must be in an eval set besides normal questions?
4. Why prefer code checks to an LLM judge?
5. Why is PASS/FAIL better than a 1–10 score for a judge?
6. How do you know you can trust your judge?
7. What is recall@k, and why is it the most important retrieval metric?
8. Retrieval is good but the answer is wrong. Where do you look?
9. Why must you rerun evals when the provider updates a model?

<details>
<summary>Answers</summary>

1. Output varies between runs; many different answers are correct; failures are silent; changes have side effects; the model can change under you.
2. The reference answer a test case's output is judged against.
3. "Not found" cases, hard and edge cases, and every real failure you meet.
4. They are free, instant, repeatable and cannot be wrong.
5. Models are inconsistent on fine scales but reliable on a clear yes/no rule.
6. Grade a sample yourself and check that the judge agrees with you on almost all cases.
7. The share of relevant chunks found in the top k. If the right chunk is missing, the answer cannot be right.
8. The generation step: prompt, model, or too many noisy passages.
9. A new model version changes your system's behaviour even though your code did not change.
</details>
