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

> List the proposed language(s) to be used.

### Programming tools / Tech stack

> Describe the compiler, database, web server, etc., and any other software tools you plan to use.

### Hardware

> Describe any non-standard hardware components which will be required.

### Learning Challenges
Cathal and Niall bring different expertise to this project, meaning each of us will face unique learning challenges. This section outlines the areas where one or both contributors will need to develop new skills as part of Hoku's development.

#### Learning New Programming Languages
We've chosen certain programming languages for their suitability for this project, but the below particularly present a learning curve.
 - **Web Assembly** - A portable binary format that allows native execution in the browser. We will need to learn how to work with WebAssembly to effectively implement Hoku's system components.
 - **Zig** - A modern, statically typed systems programming language. While it offers powerful features for system-level programming, Niall is not yet familiar with its syntax and conventions.

#### Learning New Tools / Technologies
We will also need to get up to speed on a range of tools and technologies that are crucial for Hoku's development:
 - **Emscripten** - This LLVM/Clang-based compiler is essential for compiling C and C++ code into WebAssembly. Using it to port applications for browser execution will be new territory for us.
 - **WebRTC**- This real-time communication protocol will enable peer-to-peer networking for Hoku. We are unfamiliar with WebRTC, so we will need to learn how to use it to facilitate decentralized networking.
 - **Nix** - As a declarative package manager, Nix will allow us to manage builds and development environments. Niall is not yet proficient with Nix and will need to invest time in learning its ecosystem.
 - **WebGL** - We'll use WebGL to render graphics within the browser, enabling 2D and 3D rendering using the GPU. Although familiar with some graphics APIs, using WebGL will be a new challenge.

#### Decentralised Networking
We'll use WebGL to render graphics within the browser, enabling 2D and 3D rendering using the GPU. Although familiar with some graphics APIs, using WebGL will be a new challenge.

#### Web Assembly Ecosystem
Working with WebAssembly to build core systems for Hoku presents a number of challenges. We will need to learn how to:
 - **Develop with WebAssembly** as the target environment.
 - **Patch and port software** for execution in the browser.
 - **Use Emscripten's custom libc** to correctly compile applications for WebAssembly.
This process, from setup to final execution, is new to us, and learning how to harness WebAssembly's full potential will be one of the key challenges in the project.

#### Javascript/Browser APIs
We will need to familiarise ourselves with several JavaScript and browser APIs, including:
 - **Web Workers** for multi-threading.
 - **The browser's filesystem API** to enable persistent user data.
These are areas we have little experience in, so mastering these will be essential for Hoku's success.

#### UI/UX Design For Children
Designing an intuitive and engaging interface specifically for children is an entirely new area for us. Creating a system that is both educational and appealing to younger audiences presents a significant challenge, as children's user needs differ greatly from typical adult users.

#### Combination of Non-Conventional Technologies
While many of the technologies we plan to use - such as WebAssembly, WebRTC, and WebGL - are well-documented and supported by active communities, the challenge lies in our **specific use case**. We will be combining these technologies in a relatively **unusual environment**: a browser-based platform that simulates an operating system.
Creating this type of system requires stitching together tools that are not typically used in this context. For example, using WebAssembly to manage a floating window manager or designing a complete execution environment with support for real-time peer-to-peer networking is not a common approach. The challenge will be **adapting these technologies** to work together in a cohesive and innovative way that mimics an OS-like experience for children.

#### Designing New Systems We're Unfamiliar With
We will also need to design and implement several complex systems that we've never worked on before, such as (but are not limited to):
 - A **custom execution environment**.
 - A **system API** to allow users to interact directly with the environment.
 - A **floating window manager** to simulate a familiar operating system experience.
These are ambitious goals, and developing these systems from scratch will require significant research and problem-solving.

#### User Testing
We have limited experience with formal user testing, and since our target audience consists of children, this introduces several additional challenges. We will need to:
 - Develop **clear protocols** for handling sensitive data.
 - Ensure **ethical considerations** are met, including parental consent and child safety.
 - Implement strict measures to **anonymise and secure user data**.
Balancing the practicalities of testing with ethical and legal obligations will be one of our largest hurdles.


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

