# Glossary

Short definitions of the terms used in this book. The number shows the section where the term is explained.

| Term | Meaning | Section |
|---|---|---|
| **Adapter** | A small set of extra weights trained in LoRA fine-tuning | 51 |
| **Advisor** | In Spring AI, a wrapper around a model call (memory, RAG, logging) | 21 |
| **Agent** | A model that uses tools in a loop and chooses its own next step | 34 |
| **ANN** | Approximate nearest neighbour: fast, slightly inexact vector search | 27 |
| **ASR** | Automatic speech recognition: speech to text | 38 |
| **Attention** | The mechanism that lets each token use information from other tokens | 7 |
| **Autoregressive** | Producing text one token at a time, each based on all before it | 3 |
| **Base model** | A model after pre-training only; it continues text and does not chat | 6 |
| **Batch API** | Sending many requests for later processing at a lower price | 39, 46 |
| **BM25** | A classic keyword-search ranking method | 30 |
| **Chain-of-thought** | Asking a model to reason step by step before answering | 16 |
| **Chunk** | A piece of a document that is embedded and stored for retrieval | 28 |
| **Citation** | A pointer from a statement in an answer to its source | 32 |
| **Context engineering** | Choosing what text goes into the context window | 5 |
| **Context window** | All the text a model can see in one call, counted in tokens | 5 |
| **Cosine similarity** | A measure of how close two vectors are in direction | 26 |
| **Diarization** | Working out who spoke when in a recording | 38 |
| **Distillation** | Training a small model on a large model's outputs | 52 |
| **Embedding** | A vector of numbers representing the meaning of a text | 26 |
| **Eval** | A repeatable test of an AI feature: inputs, a way to judge, a score | 40 |
| **Faithfulness** | Whether an answer is fully supported by the given sources | 43 |
| **Few-shot** | Giving a few examples in the prompt | 14 |
| **Fine-tuning** | Further training of a model on your own examples | 6, 51 |
| **Golden answer** | The reference answer in an evaluation case | 41 |
| **Grounding** | Basing an answer on supplied sources, not on the model's memory | 32 |
| **Guardrail** | A check on input, output or actions around a model | 47 |
| **Hallucination** | A fluent, confident answer that is false or invented | 10 |
| **HNSW** | A graph index for fast approximate vector search | 27 |
| **Hybrid search** | Combining vector search and keyword search | 30 |
| **Inference** | Using a trained model to produce output | 2 |
| **Jailbreak** | Tricking a model into breaking its rules | 18 |
| **Latency** | How long a call takes; time to first token plus generation time | 12 |
| **LLM** | Large language model: a large model that predicts the next token of text | 3 |
| **LLM-as-judge** | Using a model to grade another model's output | 42 |
| **LoRA / QLoRA** | Cheap fine-tuning by training a small adapter (on a quantized model for QLoRA) | 51 |
| **MCP** | Model Context Protocol: a standard for offering tools, data and prompts to AI apps | 37 |
| **Metadata filter** | Narrowing a search by facts such as date or speaker | 30 |
| **Multimodal** | Able to handle more than text, such as images or audio | 53 |
| **Multi-tenancy** | Several customers on one system, each seeing only its own data | 50 |
| **Parameters** | The weights of a model; also used for its size ("7B") | 2, 8 |
| **Pre-training** | The first, huge training stage on general text | 6 |
| **Prompt** | Everything sent to the model in a call | 13 |
| **Prompt caching** | Reusing the unchanged start of a prompt at lower cost | 46 |
| **Prompt injection** | Instructions hidden in data that the model then follows | 18 |
| **Quantization** | Storing weights with fewer bits to make a model smaller | 20 |
| **Query rewriting** | Changing a question into a form that searches better | 31 |
| **RAG** | Retrieval-augmented generation: search first, then answer from the results | 29 |
| **Rate limit** | A provider's cap on requests or tokens per minute | 12, 25 |
| **ReAct** | The reason-then-act agent loop | 35 |
| **Recall@k** | Share of the relevant chunks that appear in the top k results | 43 |
| **Re-ranking** | A second, more precise scoring of retrieved passages | 31 |
| **RLHF** | Reinforcement learning from human feedback | 6 |
| **Routing** | Classifying an input and sending it to the right handler | 35 |
| **Sampling** | How the next token is chosen from the probabilities | 9 |
| **SSE** | Server-Sent Events: the usual transport for streaming answers | 19 |
| **Stop reason** | Why the model stopped: finished, token limit, or tool request | 19 |
| **Streaming** | Sending the answer piece by piece as it is produced | 12, 19 |
| **Structured output** | Model output that follows a schema, such as JSON | 22 |
| **System prompt** | The developer's lasting instructions to the model | 13 |
| **Temperature** | Setting that controls randomness of the output | 9 |
| **Token** | The unit of text a model reads and writes; about ¾ of an English word | 4 |
| **Tool calling** | The model asks your code to run a function and uses the result | 23 |
| **Top-p / top-k** | Sampling settings that cut off unlikely tokens | 9 |
| **Trace / span** | A record of one request and its steps | 45 |
| **Transformer** | The neural network design behind modern LLMs | 7 |
| **Vector database** | A store that finds vectors nearest to a query vector | 27 |
| **Weights** | The numbers inside a model that hold what it learned | 2 |
| **WER** | Word error rate: share of wrong words in a transcript | 38 |
| **Workflow** | A fixed sequence of model calls decided in code | 34 |
| **Zero-shot** | Asking for a task without giving examples | 14 |
