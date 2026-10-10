# Vela - Product Overview

## Introduction
Vela (internal code name) is a white-label, multi-tenant B2B2C Booking SaaS tailored initially for the beauty and wellness industry (barber shops, hair salons, beauty centers, spas) with the flexibility to scale to other appointment-based businesses.

## Core Value Proposition
- **For Businesses (Tenants):** A fully isolated, branded booking platform. Each business manages its own domain, branding, services, employees, and customers without sharing a unified marketplace with competitors.
- **For Customers:** A seamless, mobile-first, and branded booking experience that feels like a custom app built specifically for that business.

## Key Features
1. **True White-Label & Multi-Tenancy:** Each business operates independently. Customers only see the tenant's brand and domain.
2. **Multi-Location Support:** Tenants can manage multiple physical locations (Basic plan = 1 location, Pro plan = up to 3).
3. **Advanced Booking Engine:** Availability is dynamically calculated based on location hours, employee shifts, service durations, and existing appointments.
4. **Subscription-Based Billing:** Businesses pay a flat monthly/yearly SaaS fee via Stripe (Basic or Pro). The platform does not take a cut from customer bookings.
5. **Role-Based Access (RBAC):** Distinct roles for Owner, Admin, Employee, Customer, and platform Super Admin.

## Customization & Branding
- The product name "Vela" is globally configurable.
- Support for future internationalization (i18n), including tenant-specific locale, currency, timezone, and date/time formats.

## Product Philosophy
Vela is designed as a secure, high-performance, and maintainable modular monolith. It avoids premature microservices in favor of a cohesive codebase with strict data isolation.
