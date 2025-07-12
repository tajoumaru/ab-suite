# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

AB Suite is a TypeScript userscript that enhances the user experience on anime-related websites (AnimeBytes, AniList, releases.moe). It's built with Preact and uses Vite for building, targeting userscript managers like Tampermonkey/Greasemonkey.

## Commands

1. **Type Checking**: Use `pnpm check` for type checking without compilation
2. **Linting/Formatting**: Use `pnpm format` to lint and format code
3. **Building**: Use `pnpm build:minified` to build the userscript

### Other miscellaneous commands available

- `rg` (Ripgrep)
- `fd` (Rust based find)
- `dust` (rust based du)
- `eza` (rust based ls)

## Architecture

### Entry Point & Routing
- `src/main.tsx` - Main entry point with hostname-based routing
- Apps are initialized based on `window.location.hostname` mapping to different site integrations
- All components are wrapped with `withSettings` HOC for settings management

### Core Architecture Patterns
- **Host Integration Pattern**: Each site has a main integration component (e.g., `AnimeBytesHostIntegration`)
- **Module-based Structure**: Features organized by target site under `src/modules/`
- **Settings Management**: Centralized settings store using GM_setValue/GM_getValue for persistence
- **API Service**: Unified API service class for external requests using GM_xmlhttpRequest

### Key Directories
- `src/modules/` - Site-specific feature modules (animebytes, anilist, releases, seadex)
- `src/stores/` - Global state management (settings, seadex data)
- `src/services/` - External API integrations
- `src/utils/` - Shared utilities (cache, rate limiting, logging)
- `src/hooks/` - Reusable Preact hooks

### Settings System
- Settings are stored via GM_setValue/GM_getValue with 'ab-suite-' prefix
- `src/stores/settings.ts` provides centralized settings management
- `useSettingsStore()` hook for components to access/modify settings
- Settings include feature toggles, UI preferences, and API credentials

### Userscript Integration
- Uses Greasemonkey APIs (GM_addStyle, GM_setValue, GM_xmlhttpRequest, etc.)
- CSS is injected via custom Vite plugin at build time
- External dependencies are excluded from bundle and mapped to userscript globals

## Development Notes

### Styling
- CSS modules are NOT used - styles are injected directly via GM_addStyle
- Site-specific CSS files in `src/styles/` (animebytes.css, anilist.css, etc.)
- Inline styles are forbidden - Never use `style={{` etc
- Custom Vite plugin handles CSS injection during build

### API Integration
- All external requests use `src/services/api.ts` with GM_xmlhttpRequest
- Rate limiting and caching utilities available in `src/utils/`
- SeaDex API integration for anime release data
- Autocomplete search functionality for AnimeBytes

### Component Patterns
- Preact components with TypeScript
- The userscript completely adheres to a declarative approach, with no imperative code if possible.
- Settings-aware components use `useSettingsStore()` hook
- Conditional rendering based on settings flags
- Modal/dialog components for complex UI interactions

### Development Workflow

- Make sure once you complete a task to check for type issues and format the code. Both `pnpm check` and `pnpm format` should report no errors or warnings.
- When no more warnings or errors are found run `pnpm build:minified` to finish off your task