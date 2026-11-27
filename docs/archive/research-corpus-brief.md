# Research and the corpus: what was worth keeping, and what it cost

This document describes the research practice behind the system. Several AI models from
different vendors research one question independently. Their answers are checked against each
other and against primary sources. The conclusions that survive are kept in a small, curated
set of reference files, called here the corpus.

It covers three things: why that work has lasting value, how a research run works, and where
the process around the research grew heavier than the knowledge it protected. It is for
anyone, human or agent, deciding how much of this practice to carry into a new repository.

It is self-contained. It names no client and no company, so it can travel.

## The short version

- **The corpus is the asset, not any single run.** About 54,000 words of distilled reference
  carry the conclusions of about 490,000 words of run records. Those few files are the part
  that keeps paying.
- **A file earns its place by being checkable.** Each one traces its claims to sources, says
  how confident it is, and carries a date.
- **Process grew faster than knowledge.** The file every session loads at startup grew from 349
  lines to 627 in the three months after an audit named its weight as the problem.
- **Rules written as prose did not hold. Rules built as checks did.**
- **Carry forward the artifacts and a short list of rules, and leave the ceremony behind.**
  The last section has the list.

## Status and confidence

- **Written 2026-11-26** from the knowledge repository's own records.
- **Counts and sizes were measured that day, by command.** They will drift. Re-measure before
  citing one.
- **Outcomes of individual runs are taken from each run's written record.** They were not
  re-derived for this document.
- **The last section is a recommendation.** Nothing in it has been ruled on.
- **The evidence is one project and one human operator.** The sixteen run folders are dated
  2026-07-28 to 2026-09-02.

## What the work produced

| Measure (2026-11-26) | Count |
|---|---|
| Research topics tracked | 57 |
| Topics answered or settled | 11 |
| Topics partly answered | 4 |
| Topics whose answer was later withdrawn | 1 |
| Topics not yet answered | 41 |
| Run folders | 16 live, 1 archived |
| Run records: prompts, manifests and raw model returns | 121 files, about 490,000 words |
| Corpus reference files | 14 files, about 54,000 words |
| All Markdown in the knowledge repository | 344 files, about 1.49 million words |

The corpus is under 4% of the repository by word count. Run records are a third of it, and
cold archive is most of another third.

The nine-to-one ratio between run records and corpus is loose. Some corpus files did not come
from runs, and some run conclusions landed in private client files instead.

The fourteen corpus files fall into three groups:

- **Two authoritative tables.** They were hardened by verification and can be cited after
  re-fetching the source.
- **Nine research syntheses.** Their confidence varies, and each file states its own.
- **Three method and production references.**

## Why it keeps paying

**One spend serves every later project.** When a run closes, its findings are split. The
general half goes to the corpus. Facts about one client stay in that client's private file,
with a pointer to the general half. One table of 56 jurisdictions and their regulatory
attributes is the upstream source for each site's reference data: when a law changes, the
table is corrected once and each site's subset is derived again.

**It outlasts expensive models.** The project owner's framing is that spending tokens on a
solid knowledge base is like wishing for more wishes. A cheaper model can read a verified
table; it does not have to derive it again. If frontier compute stops being subsidized, the
corpus is still there to query.

**It changed real outcomes.** Two examples:

- A public privacy page stated a statutory deadline. A run collected seven returns from four
  vendors and fetched the statute text three times independently. It found that the live page
  misstated when the clock starts. It confirmed that a proposed fix was flawed: three analysis
  seats that had not seen the earlier rejection found the same defect. The quotation checks
  also caught one vendor's model misquoting the statute in both of its seats. The corrected
  page shipped.
- Research ahead of a live email-domain change showed, from the vendor's own documentation,
  that the planned single one-day wait was really two waits in a fixed order. It also
  corrected the order of the DNS changes. The change then completed in one session.

**It keeps negative knowledge.** A withdrawn answer stays in the tracker, marked "do not act on
it". A topic card lists what is already established and must not be asked again. An archived
project carries its verdict, so the cut stays cut. This is what stops the next session from
reopening a settled question.

**It is evidence.** Raw returns and manifests are kept unedited. They are the chain from a
claim back to the model thread that produced it and the source that thread cited. They are
also the only data about the method itself, such as which thread produced each unique finding.

**It holds the questions.** A competitor can copy the habit of adversarial research. What they
cannot copy quickly is the list of questions worth asking, and the corpus is where that list
lives.

## What a good artifact looks like

| Property | Reason |
|---|---|
| Every claim has a source that resolves. An unsourced claim is excluded, not flagged for later. | The standard is verifiability: it is not what we know, it is what we can prove. |
| Primary sources are preferred, and each source's tier is labelled. | For statutory work the text governs, and a summary of it does not. |
| Confidence is stated in the file, by file, section or claim. | A soft synthesis filed beside a hardened table borrows credibility it has not earned. This happened twice. |
| Two separate marks: whether the source was fetched, and what standing the claim has. | A claim can be well sourced and still contested, when two good sources disagree. |
| Speculation sits in a fenced final section, never in the summary. | The summary is the part people quote. |
| Two closing sections: confidence and evidence gaps, then contested points. | A disagreement that is silently resolved is lost. |
| A date, and an instruction to re-fetch before relying on it. | Vendor limits and laws change. |
| Dense writing: tables and exact quotes over prose. | The reader may be a person or a model, and both pay per word. |

## How a research run works

Four terms first. A **run** answers one question. A **lane** is one model thread with fresh
context, and no lane sees another lane's work. The **payload** is the single file every lane
receives. The **manifest** is the run's log.

1. **Decide whether to run at all.** Check what is already settled. Send the question to the
   cheapest place that can settle it: an experiment or a search of the source for a mechanical
   question, a panel of models for an interpretive one, a person for unpublished practice.
   Then write the decision map: "if the answer is X, I do A; if Y, I do B." If no two answers
   would lead to different actions, the run is not worth commissioning.
2. **Sanitize what leaves.** Cut first and redact last. On one measured bundle, cutting
   sections the reviewers did not need removed 33 client mentions, and substitution had to
   handle only 6. Every name not on an allowlist is flagged, and a human clears each one.
   Names are replaced with typed placeholders so they can be restored when findings return.
   Last, a human reads the result and asks whether the subject could still be identified.
3. **Design the panel.** Each lane declares its type before the run. Retrieval and reasoning
   lanes supply evidence. Only an independent model lineage answering on its own counts as a
   vote. An agent with access to the repository can run experiments, but it never votes on
   work it wrote. Every model is pinned by name. The thread that adjudicates a question is one
   that did not contribute to it.
4. **Send one payload.** Every lane gets a byte-identical file. The lane's assignment goes in
   the chat message, never in the file. Before sending, the manifest gets a block for each
   lane: the exact message, the thread link, the model selected, the model that actually
   answered, and timestamps.
5. **Collect sourced returns.** Each lane returns a dense report with a list of canonical
   URLs. Expect to ask twice, because deep-research modes often leave sources out of the first
   answer.
6. **Reconcile.** A fresh session first writes its predictions as falsifiable bets, before it
   opens any return. This guards against hindsight. It files each return by its content, not
   its filename. It checks quotations against independently fetched primary text before it
   weighs any reasoning, and a lane that misquotes loses its authority on quotation. Agreement
   between lanes is corroboration, not proof, and lanes that cite the same sources count as
   one. Where two reports combine to imply something neither states, the result is labelled an
   inference.
7. **Review adversarially.** Three lenses run, each with an output shape only it can fill.
   Accuracy returns one row per citation. Logic returns one row per inferential step.
   Consistency returns pairs of lines that contradict each other. Reviewers are kept blind to
   earlier conclusions. In the statute run above, after four earlier passes, blind reviewers
   still found two real defects. One was an error in the adjudicator's own finding.
8. **Go to a person when the run cannot answer.** The triggers are recognizable: the answer is
   unpublished practice, every source traces to a party that sells the outcome, no authority
   exists, or someone will rely on the answer legally. Hand the person one bounded question
   with the candidate answers attached.
9. **Land it.** General findings go to the corpus with a confidence block. Client facts go to
   the client's file with a pointer. The topic's row is updated. The run folder moves,
   unedited, to the archive when its stated trigger fires. Findings about the method itself
   are recorded as applied or proposed.

The binding constraint is the human operator, who copies prompts and returns between browser
tabs by hand. Every step that depends on the operator remembering to record something has
failed at least once.

## Keeping it lean: what worked

- **Pull, never bulk-move.** Content moved into the new repository only when something needed
  it, with its source path and commit recorded. Everything else was left to die in place. The
  log holds 46 pulls: 37 curated, 6 still raw, 3 other.
- **Archive instead of delete, and log the verdict.** Nothing of record is lost, and it stops
  occupying a live surface.
- **Stop runs at design time.** The decision map and the cheapest-place rule exist because, in
  the method's own words, a panel feels like rigor.
- **One tracker.** Two topic queues were folded into one, and every topic kept its number.
- **No inbox folder.** One was proposed and declined, because a staging folder becomes a junk
  drawer. A new item is filed in its real home with a status block that states its confidence.
- **A negative result was recorded, not shipped.** A rule for where every fact should live was
  drafted and failed adversarial verification on all three lenses. It was kept out of the
  startup file.
- **Review budget went to a different vendor before more effort.** A cross-vendor review found
  three critical defects in a file that had already passed one vendor's maximum-effort review.
- **Some rules became checks.** A link checker, a keyword profile that files returns by
  content, and a banner that marks a stored prompt as a record all run without anyone
  remembering a rule.

## Where it failed

Bulk is not the failure. Raw returns are kept on purpose, as evidence. The cost is in what
every session must load, and in what someone must keep true by hand.

- **The startup file kept growing.** Its first paragraph calls it "one screen, pointers out".
  It was 114 lines on 2026-08-11 and 349 on 2026-08-28, when an audit measured it and named
  its weight as the problem. It was 561 by mid-September and 627 on 2026-11-26. Every new
  document adds a stub, and the stubs are paragraphs. The audit's explanation was that facts
  migrate toward the files read most often. The audit itself added eight lines.
- **"One home per fact" was declared and not achieved.** The principle was written down in at
  least six places. The same audit found 19 duplicated facts, 5 of which already disagreed
  with each other. A follow-up list of 74 smaller duplications still carries a status line
  saying nothing on it is fixed.
- **Written lessons did not bind.** The lessons file is about 22,000 words. "File by content,
  not by folder name" failed four times after it was written down. The file's own diagnosis is
  that prose fires at reading time and failures happen at doing time.
- **Run records were left incomplete.** Of 16 run folders, 4 contain a synthesis and 3 more
  share one. One run sits as three returned reports with no synthesis. Manifest fields were
  left blank at run time four times by late August and again in September, and which model
  actually answered cannot be recovered afterward. The decision map went unfilled on its
  first use.
- **The queue outran capacity.** 41 of 57 topics are unanswered. Two still show as open past
  the deadline written on them.
- **Method improvements stalled.** One accepted proposal waited five weeks while the field it
  fixed kept going blank. Three proposals from the last run have waited almost twelve weeks.
  The method document is 968 lines, a quarter of it an embedded example report, and one
  section still reads "please flesh this out".
- **The archive step was rarely taken.** One run folder has been archived. A run that met
  every archive condition in early September is still in the live folder.
- **Research sometimes cost more than asking.** A device-by-device email matrix was built for
  a set of devices the client turned out not to have. In a site audit, ten analyses and about
  2.2 million tokens could not establish where a suspicious file had come from, and one
  question to the client did. One early run should have been skipped, because its question was
  already decided.
- **Stored process files have their own hazards.** An agent that could not reach its assigned
  file found a different commissioning prompt stored in the repository and ran that. It
  returned a confident, well-formed review of the wrong thing.

## What to carry forward

This list is a recommendation. Nothing in it has been ruled on.

1. Run only when two different answers would lead to two different actions.
2. Use the cheapest instrument first: an experiment, then the source, then a panel of models,
   then an expert. When the question is where something came from, ask the person who was
   there.
3. Keep a claim only with a source and a quote, and check quotes before reasoning.
4. Open every kept file with its confidence, its date, and what would change the answer.
5. Keep general knowledge apart from any one client's facts.
6. Distill, then move the raw record out of the folders people read.
7. Spend review budget on a different model lineage before spending it on more effort.
8. When a lesson recurs a third time, build the check and delete the essay.
9. Give the startup file a line budget, and have a check enforce it. No such check exists
   today.
