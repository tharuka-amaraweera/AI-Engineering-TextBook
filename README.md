# AI Engineering: A Self-Study Textbook

A beginner-to-advanced guide for a Java backend engineer who wants to build real AI features.

## Who this book is for

You know Java, Spring Boot, REST, databases, messaging and Kubernetes. You know nothing about AI yet. This book takes you from "what is a token?" to "I can design, build, test and run an AI service in production".

You do **not** need math, Python or a machine-learning degree. An AI engineer *uses* models to build products. A machine-learning researcher *creates* models. This book is about the first job.

## The running example

Almost every chapter uses the same example project, the **Scrum Memory Assistant**:

> A microservice that receives the transcript of every daily scrum from a transcription and translation app, stores it as structured data, and answers questions such as "What happened with the price import last week?" or "When did we decide to change the timeout?"

Using one example lets you see how each concept solves a real part of one real system.

## Chapters

| # | Chapter | Concepts | Plan stage |
|---|---------|----------|------------|
| 1 | [Foundations: how LLMs work](01-foundations.md) | 1–12 | Stage 1 |
| 2 | [Prompt engineering](02-prompt-engineering.md) | 13–18 | Stage 1 |
| 3 | [Building with LLMs](03-building-with-llms.md) | 19–25 | Stage 2 |
| 4 | [Retrieval and knowledge (RAG)](04-rag.md) | 26–33 | Stages 2–3 |
| 5 | [Agents and integration](05-agents-and-integration.md) | 34–39 | Stage 3 |
| 6 | [Evaluation and testing](06-evaluation.md) | 40–44 | Stage 3 |
| 7 | [Production (LLMOps)](07-production.md) | 45–50 | Stages 3–5 |
| 8 | [Advanced topics](08-advanced.md) | 51–55 | Stage 5+ |
| – | [Glossary](09-glossary.md) | all terms | any time |

## How every section is built

- **The idea** in plain words.
- **How it works**, step by step.
- **Example**, usually from the Scrum Memory Assistant, often with Java code.
- **Common mistakes** that beginners make.
- **Remember**: the one or two sentences to keep.

Each chapter ends with **exercises** (do them, do not only read them) and **check-yourself questions** with answers.

## How to study

1. Read one section. Close the file.
2. Say out loud, or write, what the section said, from memory. Look back only for what you missed.
3. Do the exercises the same week. Doing beats re-reading.
4. Start each study session by answering the last chapter's check-yourself questions without looking.
5. Put your notes and links into your Evolution Plan page.

About 5 hours a week is enough: chapters 1–2 in weeks 1–3, chapter 3 and the start of 4 in weeks 4–7, the rest while you build the project.

## Two honest warnings

- **This field changes fast.** Ideas in this book (tokens, context, RAG, tools, evaluation) are stable. Model names, prices and library method names are not. When code does not compile, check the current documentation of the library; the idea will still be right.
- **Code examples use Spring AI 1.x style.** Method and package names may differ in the version you install.
