## 1. Introduction

1.  **Overview**

* High-level description
* High-level features
* Need

2. **Business Context**

MAY NOT BE APPLICABLE TO ALL PROJECTS

 * We don't have anybody sponsoring the development of this
 * Potential scope to market towards CoderDojo/CodeClub or a similar charity - not-for-profit however

3. **Glossary**

Any terms not relevant:

| Term | Description |
|-|-|
| Systems Literacy | The level of education/awareness on systems concepts |

## 2. General Description

**2.1 Product / System Functions**

Go into each distinct function

 * Code Execution environment
  - Lua interpreter
 * Desktop user interface
    * Core applications
      - Terminal (+Shell)
      - Core utils (ls, echo, touch, mv, etc)
      - File manager
      - Text editor
    * Desktop environment
    * Task bar
 * System interface/API
    - File system
    - Window manager
    - I/O
 * Task system
    - Networking
 * File storage

**2.2 User Characteristics and Objectives**

 * Students / Young Learners:
   * Competency: Novice
   * Objectives:
     - Teach systems programming concepts
       * Ease users into programmig concepts
       * Ease users into systems concepts
   * System Requirements to Meet Objective:
     - Simplified tools (text editor, shell)
     - Interface should feel familiar
     - Simplified system interface/api
     - System should encourage users to interact with its components / API
     - System should not get in the way of learning
 * Mentors:
   * Competency: Intermediate
   * Objectives:
     - Assist in teaching programming concepts
     - Assist in teaching systems concepts
     - All-in-one environment, no set-up for students
   * System Requirements to Meet Objective:
     - Task system
       * Group students instances together
       * Easily distribute 'tasks' to these groups
       * Should be able to see who has 'completed' tasks
     - Environment is included (interpreter, shell, text editor, etc)

**2.3 Operational Scenarios**

End-to-end scenarios that best explain the user's perspective

  * Students / Young Learners:
    * Writing a program
       - Might be using system interface
    * Running a program
    * Looking at a task
    * Submitting a task
    * Browsing filesystem
  * Mentors:
    * Creating a task (automatically from running a program)
    * Uploading a task
       - Assigning to different groups
    * Feedback on task completion
  
**2.4 Constraints**

 * Restricted by browser platform (filesystem, permissions, etc)
   - Persistent storage (ON THE CLIENT!!!!!)
 * No hardware restrictions - browser abstracts this
 * No data being saved remotely - sensitive data
 * Peer-to-Peer networking - signalling server

## 3. Functional Requirements

Ranked order

1 What must the system requirement?
2 How does it meet these requirements?

### 3.1 Bootstrap System

**Description**

Because the system involves persistent client storage, there is a bootstrap process
when the cient starts the application. If there is already a file system on the
browser we can load the current system stored there, otherwise we bootstrap the
system by creating a new file system and copying in the core files.

**Criticality**
**Technical Issues**
**Dependencies on with With Other Requirements**
**Others as Appropriate**

### 3.2 Exit System

**Description**
**Criticality**
**Technical Issues**
**Dependencies on with With Other Requirements**
**Others as Appropriate**

### 3.3 Open Application

**Description**
**Criticality**
**Technical Issues**
**Dependencies on with With Other Requirements**
**Others as Appropriate**

### 3.4 Manage Windows

**Description**
**Criticality**
**Technical Issues**
**Dependencies on with With Other Requirements**
**Others as Appropriate**

### 3.5 Browse File Manager

**Description**
**Criticality**
**Technical Issues**
**Dependencies on with With Other Requirements**
**Others as Appropriate**

### 3.6 Read a file

**Description**
**Criticality**
**Technical Issues**
**Dependencies With Other Requirements**
**Others as Appropriate**

### 3.7 Write a file

**Description**
**Criticality**
**Technical Issues**
**Dependencies on with With Other Requirements**
**Others as Appropriate**

### 3.8 Run a command

**Description**
**Criticality**
**Technical Issues**
**Dependencies on with With Other Requirements**
**Others as Appropriate**

### 3.9 Execute a file

**Description**
**Criticality**
**Technical Issues**
**Dependencies on with With Other Requirements**
**Others as Appropriate**

### 3.10 Interface with system API

**Description**
**Criticality**
**Technical Issues**
**Dependencies on with With Other Requirements**
**Others as Appropriate**

### 3.11 Create Task Rooms

**Description**
**Criticality**
**Technical Issues**
**Dependencies on with With Other Requirements**
**Others as Appropriate**

### 3.12 Join Task Rooms

**Description**
**Criticality**
**Technical Issues**
**Dependencies on with With Other Requirements**
**Others as Appropriate**

### 3.13 Leave Task Rooms

**Description**
**Criticality**
**Technical Issues**
**Dependencies on with With Other Requirements**
**Others as Appropriate**

### 3.14 Manage Task Groups

**Description**
**Criticality**
**Technical Issues**
**Dependencies on with With Other Requirements**
**Others as Appropriate**

### 3.15 Submit Task Solution

**Description**
**Criticality**
**Technical Issues**
**Dependencies on with With Other Requirements**
**Others as Appropriate**

### 3.16 Publish a Task

**Description**
**Criticality**
**Technical Issues**
**Dependencies on with With Other Requirements**
**Others as Appropriate**

### 3.17 Configure System

**Description**
**Criticality**
**Technical Issues**
**Dependencies on with With Other Requirements**
**Others as Appropriate**

### 3.18 Save Files to Desktop

**Description**
**Criticality**
**Technical Issues**
**Dependencies on with With Other Requirements**
**Others as Appropriate**

## 4. System Architecture

![./SystemComponentDiagram.png](This diagram depicts the architecture of a system with various components and their dependencies. The main component, "System Interface," is at the center, linking several subsystems named below.)

### 4.1 User Interface (UI)
Explanation

#### 4.1.1 Window Manager
Explanation

#### 4.1.2 Desktop Environment
Explanation

### 4.2 Execution Environment
Explanation

### 4.3 File System
Explanation

### 4.4 Networking
Explanation

### 4.5 Core Applications
Explanation

#### 4.5.1 Task System
Explanation

#### 4.5.2 Terminal
Explanation

#### 4.5.3 Settings
Explanation

#### 4.5.4 File Browser
Explanation

#### 4.5.5 Shell
Explanation

#### 4.5.6 Text Editor
Explanation

## 5. High-level Design

![user_workflow.png](A high level overview of a user creating and executing a file)

Sequence diagram for user interacting with system interface (ex. opening window)
Sequene diagram for pushing a completed correct task
