# School of Computing &mdash; Year 4 Project Proposal Form

> Edit (then commit and push) this document to complete your proposal form.
> Make use of figures / diagrams where appropriate.
>
> Do not rename this file.

## SECTION A

|                     |                   |
|---------------------|-------------------|
|Project Title:       | xxxxxx            |
|Student 1 Name:      | xxxxxx            |
|Student 1 ID:        | xxxxxx            |
|Student 2 Name:      | xxxxxx            |
|Student 2 ID:        | xxxxxx            |
|Project Supervisor:  | xxxxxx            |

> Ensure that the Supervisor formally agrees to supervise your project; this is only recognised once the
> Supervisor assigns herself/himself via the project Dashboard.
>
> Project proposals without an assigned
> Supervisor will not be accepted for presentation to the Approval Panel.

## SECTION B

> Guidance: This document is expected to be approximately 3 pages in length, but it can exceed this page limit.
> It is also permissible to carry forward content from this proposal to your later documents (e.g. functional
> specification) as appropriate.
>
> Your proposal must include *at least* the following sections.


### Introduction

> Describe the general area covered by the project.

### Outline

> Outline the proposed project.

### Background

> Where did the ideas come from?

### Achievements

> What functions will the project provide? Who will the users be?

### Justification

> Why/when/where/how will it be useful?

### Programming language(s)

* Javascript:
  Targetting the browser, will need javascript for client code.
* Zig:
  For Wasm targetted client programs as part of GNU coreutils like software (e.g. ls, cat, etc)
* Wasm (C/C++):
  Apart from Zig, we also anticipate using other C/C++ tools or libraries. At the very least we will need to modify the build of a C/C++ program (e.g. lua or cpython).
* Golang:
  For the peer-to-peer connection establishment server as part of the task system.
* Lua:
  Lua is proposed to be used a simple language for user facing code to access/manipulate the system (akin C on linux).
* Nix:
  For maintaining a reproduceable development environment for both CI/CD and regular development. We don't want to do double work setting up the environment on each others machines.
* Shell:
  For glue code in the build process.

### Programming tools / Tech stack

> Describe the compiler, database, web server, etc., and any other software tools you plan to use.

### Hardware

> Describe any non-standard hardware components which will be required.

### Learning Challenges

> List the main new things (technologies, languages, tools, etc) that you will have to learn.

### Breakdown of work

> Clearly identify who will undertake which parts of the project.
>
> It must be clear from the explanation of this breakdown of work both that each student is responsible for
> separate, clearly-defined tasks, and that those responsibilities substantially cover all of the work required
> for the project.

#### Student 1

> *Student 1 should complete this section.*

#### Student 2

> *Student 2 should complete this section.*

## Example

> Example: Here's how you can include images in markdown documents...

<!-- Basically, just use HTML! -->

<p align="center">
  <img src="./res/cat.png" width="300px">
</p>

