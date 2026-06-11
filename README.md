eQaskelen Guardian

AI-powered Digital Twin for Municipal Incident Monitoring

Overview

eQaskelen Guardian is a smart city platform designed for Kaskelen, Kazakhstan. The system enables residents to report infrastructure issues through a Telegram bot, while city administrators can monitor incidents in real time through an interactive dashboard.

The platform collects citizen reports, visualizes them on a map, and automatically identifies high-risk zones based on the concentration of reports.

Problem

Residents often report power outages, water supply issues, and other infrastructure problems through social media, messaging apps, or local chats. These reports are scattered across multiple platforms and are difficult for authorities to track efficiently.

As a result:

* Important reports may be overlooked.
* Response times increase.
* Authorities lack a unified operational picture.
* Citizens receive limited feedback on reported issues.

Solution

eQaskelen Guardian provides:

* Telegram-based incident reporting
* Real-time geolocation collection
* Interactive city map
* AI-powered risk zone detection
* Operational analytics dashboard
* Bilingual interface (Kazakh / Russian)

The system automatically aggregates reports and highlights areas where multiple incidents occur within the same location.

Features

Citizen Reporting

Residents submit reports through a Telegram bot by:

1. Selecting a category
2. Sharing their location
3. Sending the report

Interactive Dashboard

The dashboard provides:

* Live incident visualization
* Incident statistics
* User activity analytics
* Real-time monitoring

AI Risk Detection

When a significant number of reports are concentrated in the same area, the system generates a HIGH RISK ZONE.

The AI module:

* Detects report clusters
* Calculates risk scores
* Highlights critical areas
* Supports operational decision-making

Multi-Language Support

Supported languages:

* Russian
* Kazakh

Technology Stack

Frontend

* React
* TypeScript
* Leaflet
* Tailwind CSS
* Vite

Backend

* Python
* Aiogram
* Telegram Bot API

Database

* Supabase
* PostgreSQL

Architecture

Citizen → Telegram Bot → Supabase Database → Dashboard → AI Risk Analysis

Project Status

Current Status: MVP (Minimum Viable Product)

Implemented:

* Telegram Bot
* Incident Collection
* Geolocation Support
* Interactive Map
* AI Risk Zone Detection
* Bilingual Interface
* Supabase Integration

Future Development

* Mobile application
* Additional incident categories
* Predictive analytics
* Municipal service integration
* Regional expansion across Kazakhstan

Author

Ansar Kali

Student Developer | Smart City Enthusiast

Kaskelen, Kazakhstan
