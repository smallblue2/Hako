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

#### Where Hako Began

Hako stems from our shared passion for both **learning** and **teaching** computer science, specifically programming for children. Over the years, Niall has worked with various pedagogical methods and platforms like [CodeAcademy](www.codeacademy.org), [Scratch](www.scratch.mit.edu), and [KhanAcademy](www.khanacademy.org). While these platforms do a great job teaching programming languages, we realized something was missing.

#### The Problem We Saw

Many educational platforms focus on just the **code** – they teach how to write it but rarely explore the environment where the code runs. This gap can leave learners without the critical skills needed to fully understand or troubleshoot code in the real world. **Systems literacy** is often neglected, largely because teaching native development usually means dealing with hardware-specific challenges.

#### Our Solution

That’s where Hako comes in. We’re developing a **browser-based**, **hardware-agnostic** platform that removes the complexity of hardware while introducing learners to the systems in which their code operates. We want to empower children not just to write code, but to interact with the system, reason about behaviour, and debug issues – skills essential for a well-rounded programmer.

#### Our Experience
 - Niall has spent **over a decade** teaching children programming concepts from the ages of 9 - 17, and has plentiful experience in Systems Programming.
 - Cathal is **deeply proficient** with Systems Programming, and has experience mentoring university-level students.

Together, we’ll shaped Hako to not just teach programming, but to bring systems literacy to the forefront. Our combined expertise in Systems Programming and Pedagogy gives us the tools to fill the gaps left by traditional programming education.

### Achievements

#### Target Users
Hako is an educational tool designed for individuals learning programming concepts. However, our primary audience is **children**, and we will craft the user interface and overall experience with their needs in mind.

Additionally, **teachers and mentors** will play a key role by using Hako to guide students and assign programming tasks.

Our target demographic is split into two groups;
 - **Students (Ages 9 - 17)** - Engaging young learners in systems and programming concepts.
 - **Mentors**- While there’s no specific age range for mentors, we assume a certain level of technical proficiency.

#### Functions Provided
##### User Interface
The user interface will simulate a familiar operating system, tailored specifically to the needs of children. Our goal is to create an environment that is **fun, intuitive, and immersive**, tricking the user into believing they are interacting with a full-fledged OS.

Key features include:
 - **Floating Window Manager**
 - **Desktop Environment**
 - **Toolbar**

##### Core Apps
The system will come equipped with essential, built-in apps designed to teach programming and system interaction. These core apps will include (but are not limited to):
 - **Text Editor**
 - **Terminal**
 - **Shell**
 - **Task System**
 - **Settings Wizard**

##### Execution Environment
In order to teach children programming concepts, and to further allow them to interact with our system, we will need to create an execution environment that allows children to execute arbitrary code. 

Although we could support multiple different languages, we will first support the **Lua programming language** due to its lightweight and embeddable nature.

##### Filesystem
A filesystem is crucial for students to manage their progress and save their work. However, due to the sensitive nature of our target demographic, we will not store any user data. Instead, users will be able to **download their filesystem state** at the end of a session or **upload it** when starting one, ensuring privacy and control over their own data. 

### Justification

> Why/when/where/how will it be useful?

### Programming language(s)

> List the proposed language(s) to be used.

### Programming tools / Tech stack

> Describe the compiler, database, web server, etc., and any other software tools you plan to use.

* Browser
  - WebGL (likely version 2)
    Used for graphics/UI.
  - File System API
    For interacting with persistent storage on the client.
* Emscripten
  For compiling C/C++ to wasm to be able to run in the browser.
* WebRTC
  For peer-to-peer connections
* Containerd/Podman
  For ease of hosting the WebRTC server
* Zig Compiler
* Golang Compiler
* Lua Interpreter
* Just build system
  A generic build system for managing our own builds as well as vendor dependency builds (e.g. lua interpretter)

### Hardware

> Describe any non-standard hardware components which will be required.

Both client and server components target standard platforms, meaning they should run on any contemporary computing device.

### Learning Challenges

> List the main new things (technologies, languages, tools, etc) that you will have to learn.

### Breakdown of work
We will be attempting to split work according to our strengths, whilst still enabling both of us to learn new technologies. The breakdown of work is based on core systems of the project, and has been divided as:

#### Cathal
 - UI System
 - Execution Environment
 - Text Editor
 - Terminal

#### Niall
 - Networking
 - Task Portal
 - Filesystem
 - Shell
 - UI Design

## Example

> Example: Here's how you can include images in markdown documents...

<!-- Basically, just use HTML! -->

<p align="center">
  <img src="./res/cat.png" width="300px">
</p>

