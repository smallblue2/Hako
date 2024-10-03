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

#### Overview
Hako is an education tool intended to fully expose programming in its entirety to those looking to learn.

We believe there aren't existing solutions out there delivering the experience we envision. Not only will
we expose new programmers to coding, but the main attraction of our system, is an abstracted
operating system with an easily accessible system API.

In pursuit of encouraging the use of the underlying system, as opposed to just learning how to 'code'. We will also
have a highly simplified shell, terminal, filesystem, and more. We will be fully encouraging the user to explore
the entire system, use it, and understand it.

![A diagram that shows a quick mockup of the user interface of the operating system. It shows a taskbar with applications, and windows labelled 'editor' and 'console'.](./res/UIBrainstorm.png)

Additionally, our system will be extensible, users can program their own applications, workflows, automations -
whatever they so choose. Crucially we are showing them code as it fits into the broader system.  

Our inspirations are rooted in unix-like operating systems. We want to share the joyful experience of learning such in
a more focused manner. Unix was an operating systems that from the start broke down the barriers of entry to programming,
and we want to continue this vision with a focus on the youth. 

However a caveat of targeting youths, is sensitivity of data. We plan on mitigating this via a decentralised-approach.
Utilising a peer-to-peer real-time communication protocol, we solely use servers to match clients together. This way
we store no user data.

#### System Architecture

![A diagram illustrating the high level components of the system: execution environment, core apps, core library, user interface, file system and network](./res/GeneralOverview.png)
> Diagram displaying the client architecture

##### Components

**Core Library**
This is the system API, written by us in our own language and compiled to web assembly.

**Core Apps**
These are a collection of the core applications in our operating system.

Core applications consist of:
 - Text Editor
 - Terminal
 - Lua interpreter
 - Shell
 - Task Portal
 - Settings Wizard
 - File explorer

Other applications we'd like to implement as stretch goals:
 - Simplified Version Control System
 - Python or other extra interpreters
 - Simple Whiteboard/Drawing utility
 - Interactive assistant (like Clippy, but useful)

**Network**
This is the portion of the system that will interface with other clients.

**UI**
We will be utilising the GPU to render our operating system's user interface on the web using
WebGL.

This will require the utilising of existing frameworks such as an immediate mode gui, or a framework such as PixiJS.

**Execution env**
This is an environment in the browser that allows for the execution of arbitrary 'user-space' code.

It will be sandboxed and protected as to not modify or heed the overall system operations.

**FS**
The filesystem will be persistent and stored on the clients machine, so they have full ownership of their own data.

It will be serialisable and loaded/uploaded on session start/end.

#### Client
We will only have a single client for both mentors and students. This is
because we want to avoid needing user accounts for mentors and students.

This consists of the actual web-based operating system, and is entirely the system
users interact with.

#### Server
The server is exclusively used for matching clients together in our peer-to-peer 
real-time communication protocol.

It will be easy to set-up, and in an actual setting, would likely be ran by a teacher/mentor
in a classroom/lab setting.

#### Task System
The task system will be peer to peer. A task will consist of a 
description and input.  One client will act as 
a master that produces tasks to subscribers, the subscribers
can respond back with the output after running their code and
receive feedback on its correctness.

![A diagram with a 'Task Master' user to the left, a block in the middle titled 'WebRTC', and five 'Subscribers' to the right. Arrows are connecting all users to the 'WebRTC' block. It is displaying the relationship between the 'Task Master' and 'Subscriber'. The 'Task Master' is sending a task via WebRTC, and the 'Subscribers' are sending back their solutions.](./res/TaskSystem.png)

### Background

> Where did the ideas come from?

### Achievements

> What functions will the project provide? Who will the users be?

### Justification

> Why/when/where/how will it be useful?

### Programming language(s)

> List the proposed language(s) to be used.

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

