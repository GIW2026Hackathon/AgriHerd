# AgriHerd

**Smart Livestock Management for Healthier Herds and Better Farming Decisions.**

AgriHerd is a technology-driven livestock management platform designed to help farmers improve animal health monitoring, organise livestock records, access professional agricultural extension services, and make informed animal nutrition decisions.

The project initially focuses on **dairy livestock management**, with a modular design intended to support beef livestock management in future releases.

## Problem Statement

Livestock farmers face several challenges that affect animal health, productivity, and farm profitability:

1. **Unexplained Animal Sickness and Deaths:** Farmers may struggle to identify warning signs early, maintain complete health histories, and obtain timely professional assistance.
2. **Poor Livestock Data Management:** Animal health, treatment, and productivity records are often scattered across notebooks or disconnected records, making effective herd management difficult.
3. **Inadequate Access to Government Extension Services:** Farmers may have difficulty finding appropriate professional support and following up on livestock management advice.
4. **Inadequate Information on Balanced Animal Nutrition:** Limited access to reliable feeding guidance can lead to poor nutritional decisions that affect animal health and productivity.

AgriHerd aims to address these challenges through accessible digital records, practical alerts, reviewed agricultural information, and improved connections between farmers and livestock professionals.

## Objectives

- Improve the organisation and accessibility of livestock records.
- Help farmers monitor animal health and identify situations requiring professional attention.
- Improve access to government agricultural extension services and qualified livestock professionals.
- Provide reliable, professionally reviewed animal nutrition information.
- Support better dairy herd management through productivity records, reminders, and reporting.
- Establish a scalable foundation for future beef livestock management.

## Core Features

### 1. Animal Health Monitoring
- Record animal symptoms and health observations.
- Maintain treatment and vaccination histories.
- Track follow-up activities and veterinary assessments.
- Generate alerts based on configured warning rules.
- Maintain records of sickness events and animal deaths.

### 2. Digital Livestock Records
- Create a digital profile for each animal.
- Maintain animal identification and relevant characteristics.
- Track health, treatment, breeding, and productivity records.
- Access historical information through individual animal profiles.
- Generate livestock management summaries.

### 3. Agricultural Extension Services
- Connect farmers with participating government extension officers and qualified livestock professionals.
- Submit requests for agricultural or livestock management assistance.
- Track support requests and their status.
- Record professional recommendations and follow-up activities.
- Improve communication between farmers and available extension services.

### 4. Animal Nutrition Management
- Record available feeds and feed inventory.
- Monitor recorded feed consumption and stock levels.
- Provide access to professionally reviewed feeding information.
- Help farmers identify potential feed shortages.
- Support requests for individualised nutritional guidance from qualified professionals.

### 5. Dairy Productivity Management
- Record milk production for individual animals.
- Monitor production trends over time.
- Identify unusual changes that may warrant investigation.
- Generate basic dairy production summaries.

### 6. Alerts and Notifications
- Remind farmers about scheduled animal care activities.
- Flag selected health observations for professional review.
- Notify farmers about important follow-ups.
- Alert farmers when recorded feed stocks approach defined thresholds.

> **Important:** AgriHerd is intended to support livestock management, not replace veterinary professionals or qualified animal nutritionists. Automated alerts are not diagnoses, and feeding recommendations must be based on reliable, appropriately reviewed guidance.

## Target Users

AgriHerd is intended for:

- Smallholder dairy farmers.
- Medium-sized and commercial dairy farms.
- Farm workers and livestock attendants.
- Government agricultural extension officers.
- Veterinarians and other qualified livestock professionals.
- Agricultural organisations supporting livestock farmers.

The initial deployment will target dairy farming in Kenya, subject to validation with farmers and relevant livestock professionals.

## Project Scope

### Phase 1: Dairy Livestock Management

The initial release will focus on:

- Farmer and farm management.
- Animal registration and digital profiles.
- Animal health and treatment records.
- Milk production tracking.
- Feed inventory and nutrition information.
- Agricultural extension service requests.
- Reminders, alerts, and basic reports.

### Phase 2: Intelligence and Integrations

Potential future enhancements include:

- More advanced livestock health and production trend analysis.
- Offline data capture and synchronisation.
- SMS notifications.
- QR-code-based animal identification.
- Integration with suitable livestock monitoring devices.
- Improved feeding and farm performance analytics.

These features will be prioritised based on user needs, available data, validation, and implementation resources.

### Phase 3: Beef Livestock Management

The platform is intended to expand to beef livestock management, potentially including:

- Weight and growth tracking.
- Weight-gain analysis.
- Grazing and feedlot management.
- Beef cattle breeding records.
- Livestock sales and market records.
- Cost and profitability analysis.

Beef-specific functionality will be developed separately where dairy and beef workflows differ.

## Proposed Technology Stack

The final technology stack will be confirmed during project setup.

Potential technologies include:

| Component | Proposed Technology |
|---|---|
| Frontend | React with Vite |
| Backend | Node.js and Express.js |
| Database | PostgreSQL |
| API | REST API |
| Authentication | Secure, role-based authentication |
| Version Control | Git and GitHub |
| Deployment | To be determined |

The architecture will prioritise modularity, maintainability, data security, and the ability to extend the platform as requirements grow.

## High-Level System Modules

AgriHerd will be organised around the following modules:

1. User and Farm Management
2. Animal Identification and Records
3. Animal Health Monitoring
4. Dairy Production Management
5. Feed and Nutrition Management
6. Agricultural Extension Services
7. Notifications and Reminders
8. Reports and Analytics
9. Administration and Access Control

## Getting Started

Setup instructions will be added as the project implementation progresses.

### Prerequisites

The requirements will depend on the final technology stack. For the proposed stack, developers will typically need:

- Node.js and npm.
- PostgreSQL.
- Git.
- A code editor such as Visual Studio Code.

### Installation

Installation commands, environment configuration, database setup, and development instructions will be documented after the initial project structure is established.

Do not commit credentials, database passwords, API keys, or other secrets to the repository.

## Development Principles

AgriHerd will follow these principles:

- **Farmer-focused:** Prioritise practical workflows and ease of use.
- **Data-driven:** Use recorded information to support better decisions.
- **Safety-conscious:** Refer health and specialised nutrition decisions to qualified professionals when appropriate.
- **Modular:** Separate shared livestock functionality from dairy- and beef-specific features.
- **Secure:** Protect farm records through authentication and access controls.
- **Maintainable:** Follow consistent coding conventions, documentation, and testing practices.
- **Scalable:** Design for additional farms, users, animals, and future modules.
- **Evidence-informed:** Validate requirements and important recommendations with farmers and livestock professionals.

## Project Status

**Status:** Requirements definition and initial development planning.

The project is being developed incrementally, beginning with dairy livestock management. Features will be documented as they are implemented and tested.

## Contributing

Contributions from developers, agricultural professionals, and other interested collaborators are welcome.

Before contributing:

1. Review the project documentation.
2. Discuss major changes with the project team.
3. Create a separate branch for your work.
4. Keep changes focused and maintainable.
5. Test your changes before submitting a pull request.
6. Update relevant documentation when functionality changes.

Detailed contribution guidelines and branch conventions will be added as the team establishes its development workflow.

## Roadmap

- [ ] Finalise and validate system requirements.
- [ ] Design the system architecture and database schema.
- [ ] Establish the project structure and development environment.
- [ ] Implement authentication and farm management.
- [ ] Implement animal registration and digital records.
- [ ] Implement health monitoring and follow-up records.
- [ ] Implement dairy production tracking.
- [ ] Implement feed inventory and reviewed nutrition resources.
- [ ] Implement extension service requests.
- [ ] Add reminders, alerts, and reports.
- [ ] Test the system with representative users.
- [ ] Pilot the dairy management module.
- [ ] Evaluate requirements for beef livestock expansion.

## Vision

AgriHerd aims to make livestock management more organised, accessible, and informed by helping farmers maintain better records, recognise potential problems, access professional support, and improve everyday management decisions.

**AgriHerd — Better Herd Management. Better Farming Decisions.**
