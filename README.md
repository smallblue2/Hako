<p align="center">
  <img src="./docs/logos/hako_banner.png" alt="Project Banner" style="image-rendering: pixelated; width: 100%; max-width: 512px;" />
</p>

<p>
  <img src="https://img.shields.io/badge/WebAssembly-654FF0?style=for-the-badge&logo=WebAssembly&logoColor=white" alt="Web Assembly"/>
  <img src="https://img.shields.io/badge/C-00599C?style=for-the-badge&logo=c&logoColor=white" alt="C language" />
  <img src="https://img.shields.io/badge/Lua-2C2D72?style=for-the-badge&logo=lua&logoColor=white" alt="Lua language" />
  <img src="https://img.shields.io/badge/Svelte-4A4A55?style=for-the-badge&logo=svelte&logoColor=FF3E00" alt="Svelte framework" />
  <img src="https://img.shields.io/badge/JavaScript-323330?style=for-the-badge&logo=javascript&logoColor=F7DF1E" alt="Javascript language" />
  <img src="https://img.shields.io/badge/Go-00ADD8?style=for-the-badge&logo=go&logoColor=white" alt="Go language" />
</p>

<p>
 <img src="https://gitlab.computing.dcu.ie/ryann62/2025-csc1097-ryann62-ogradc23/badges/main/pipeline.svg" alt="Pipeline status"/>

 <img src="https://img.shields.io/badge/dynamic/json?color=blue&label=Lines%20Of%20Code&query=$.loc&url=https%3A%2F%2Fartifacts.hakoapp.com%2Floc.json" alt="Lines of Code"/>
</p>

# Hako - A friendly box to learn development principles

**Hako** is a browser-based, Unix-inspired educational operating system designed to teach students fundamental systems programming concepts through a simplified execution environment.

Try it out: [hakoapp.com](https://hakoapp.com) \
**NOTE:** This is a self hosted website, and although effort is put in to keep the website up, it is subject local network outages and alike.

## About the Project

Hako is a **fully client-side** web application that blends the familiarity of traditional desktop interfaces with the structure and philosophy of Unix-like systems. It aims to reduce the abstraction commonly found in modern programming environments, helping learners understand how code interacts with the underlying system.

## Features

 - **Code Execution Environment**: Embedded Lua interpreter for writing and running code.
 - **Graphical Desktop Interface**: A windowed desktop with a taskbar.
 - **Core Applications**:
    - **Terminal & Shell**: Lightweight shell with support for redirection and piping.
    - **Core-Utils**: Core-utils inspired by GNU, for a useful and educational CLI experience.
    - **Text-Editor**: Minimalist editor with syntax highlighting.
    - **File Manager**: GUI for browsing and managing the filesystem.
 - **System APIs**:
    - Filesystem operations
    - Process management
    - Window management
    - Terminal management
    - Error handling
 - **Processes**: UNIX-Inspired processes powered via webworkers.
 - **Persistent File Storage**: Built on the browser's IndexedDB.

## Technologies

 - C
 - WebAssembly
 - Meson
 - Javascript + Typescript
 - Lua
 - Web Workers
 - IndexedDB
 - Emscripten
 - Go

## Purpose

Hako is a teaching tool built around the principles of systems literacy. It offers a hands-on, minimalist environment that bridges the gap between beginner-friendly tools and full-fledged operating systems.

## Contributors
 - Niall Ryan
 - Cathal O'Grady
