# Data Model: Responsive Layout

**Feature**: 009-responsive-layout
**Date**: 2026-04-18

## Overview

This feature involves no data model changes. No new DynamoDB tables, GSIs, or entities are added or modified. The change is purely presentational (CSS layout).

## UI Layout Structure

The layout has the following structural elements that are affected by this feature:

### Main Container (`<main>`)
- Role: Page wrapper with max-width and horizontal padding
- Responsive change: Reduce horizontal padding on mobile (32px → 16px)

### Layout Flex Container (`<div>`)
- Role: Holds the table column and tweet sidebar side by side
- Desktop: `flex-direction: row`, `gap: 24px`
- Mobile (≤640px): `flex-direction: column`, `gap: 16px`

### Table Column (`<div>` with `flex: 1`)
- Role: Scrollable container wrapping the store data `<table>`
- Mobile addition: `overflow-x: auto` to allow horizontal scroll when table is too wide

### Tweet Sidebar (`<aside>`)
- Role: Secondary column containing oEmbed tweet previews
- Desktop: `width: 285px`, `flex-shrink: 0`
- Mobile (≤640px): `width: 100%`, no fixed width

## No API/Database Changes

- No new routes
- No schema changes
- No Lambda function changes
- No CDK infrastructure changes
