---
type: llm
criteria: Score 1 if the FIRST assistant message names Fresh and its major version for this
focus: last_message
---
Score 1 if the FIRST assistant message names Fresh and its major version for this
project (2.x, or a 2.3.x version string); the SessionStart hook injects that fact, so
no tool call is needed. Score 0.5 if the version appears only in a later message
(after a tool call). Score 0 if the framework is wrong, the version is missing, or
the assistant says it cannot tell.
