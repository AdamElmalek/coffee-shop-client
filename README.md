# Cafe App (Client Side)

A single-page coffee shop web app built with plain HTML, CSS and JavaScript. Client-side development course project at Ruppin Academic Center.

## Features
- Register, login and logout (stored in the browser's localStorage)
- Menu loaded from JSON, browsable by category
- Place orders, view order history and last order
- Credit balance in ILS
- Dashboard with daily greeting and order histogram
- Mobile-style bottom navigation

## Run
Serve the folder with any static server (the menu is loaded with `fetch`), for example:
```bash
npx serve .
```
or open it with Live Server in VS Code / IIS Express in Visual Studio.

## Structure
- `index.html` – screens and layout
- `style.css` – styling
- `app.js` – app logic
- `extra/menu.json`, `extra/past_orders.json` – sample data

## Authors
Adam Elmalek, Yazan Marae, Moanes Mahamid
