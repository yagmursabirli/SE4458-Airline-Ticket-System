# ✈️ Airline Ticketing System


**SE 4458 – Software Architecture & Design of Modern Large Scale Systems (Final Project)**


A **microservice-based** airline ticketing platform developed as part of the SE 4458 – Large Scale Systems Design course.
The system enables users to search flights, book tickets, earn and redeem miles, while administrators can manage flights and pricing using both rule-based and ML-assisted workflows.


---

## 🚀 Live Links


🗂 **GitHub Repository:**  
https://github.com/yagmursabirli/SE4458-Airline-Ticket-System

🎥 **Video Presentation:**  
https://drive.google.com/file/d/1BaGVFF7fnerYeCGX-6yIt4nbSjtXj1wS/view?usp=sharing


## 🚀 Project Overview

The Airline Ticketing System is inspired by real-world airline platforms (e.g., turkishairlines.com) and is designed to demonstrate modern distributed system principles, including:


Microservices architecture


API Gateway pattern


Asynchronous processing via message queues


Transactional consistency


ML-assisted decision support


The project strictly follows the architectural and functional requirements defined in the course specification.


---
# 🏗 System Design & Architecture


The system follows a Microservices Architecture to ensure modularity, scalability, and fault isolation.


**🔹 API Gateway**


Acts as the central entry point for all clients (Web, Mobile, Admin).


Handles:


Request routing


CORS policy enforcement


Path-based API versioning (/api/v1)


Implements in-memory caching for flight search results to reduce database latency and repeated queries.


---
**🔹 Flight Service (Backend)**


Developed using Node.js & Express


Responsible for:


Adding flights (Admin only)


Searching flights (date, flexible date range, direct flights, passenger count)


Ticket booking and capacity management


Uses database transactions to prevent overbooking.


Persists data in AWS RDS (PostgreSQL).


---
**🔹 Notification Worker**


A dedicated background service.


Consumes messages from AWS SQS.


Sends:


Welcome emails for new Miles&Smiles members


Mileage update notifications


Enables asynchronous, non-blocking user operations.


---
**🔹 ML Price Predictor**


Python-based microservice exposing a REST API.


Uses a Machine Learning model trained on historical flight attributes.


Predicts flight prices based on:


Flight duration


Route characteristics


Integrated into the Admin workflow to assist pricing decisions.


---
**🔹 IAM (Identity & Access Management)**


Integrated with AWS Cognito.


Provides secure authentication and role-based authorization:


ADMIN


USER


Admin operations are logically isolated and protected.


---
**🔀 API Versioning**


All backend APIs are versioned using path-based versioning:


/api/v1/...


This approach ensures:


Backward compatibility


Safe API evolution


Industry-standard REST design practices


---
**📊 Data Model (Entity Relationship)**


The system uses a relational data model hosted on PostgreSQL (AWS RDS).
SQLite is intentionally not used, in compliance with course requirements.


**Core Entities**


✈️ Flights


Flight code


Route (fromCity → toCity)


Flight date


Capacity


Price & predicted price


Stop information (direct / connecting)


🎫 Bookings


Associates users with flights


Tracks booking status (CONFIRMED, COMPLETED)


Ensures seat capacity consistency


👤 UserProfiles


Stores Miles&Smiles membership data


Mileage balance


Membership type


---
**📌 ER Diagram**


The complete ER Diagram is included in the repository as a PNG file and referenced in this documentation.



---
**💡 Assumptions & Design Decisions**


Role Isolation:


Admin users are strictly separated via IAM roles. Only users with ADMIN privileges can create or manage flights.


Miles Calculation:


Miles are credited after flight completion via a scheduled nightly process.


Redemption Ratio:


It is assumed that 10 Miles&Smiles points correspond to a fixed monetary value during ticket purchase.


Payment Simulation:


No real payment gateway is integrated, as specified in the assignment requirements.


External Miles Update:


Partner airlines can update user miles via an authenticated external API.


---
**🔄 Concurrency in Ticket Booking**


Problem:


Risk of overbooking when multiple users attempt to book the last available seats.


Solution:


Implemented database transactions to atomically:


Validate capacity


Decrease seat count


Confirm booking


---
**🌐 Cross-Origin Resource Sharing (CORS)**


Problem:


Multiple clients (Admin vs. User) caused CORS conflicts.


Solution:


Configured centralized CORS policies at the API Gateway level, allowing only verified origins.


---
**🧠 Caching Strategy**


In-memory caching is implemented at the API Gateway.


Cached resource:


Flight search results


This significantly reduces database load and improves response time for frequent queries.


---
**🐳 Dockerization**


Each core service includes a Dockerfile:


API Gateway


Flight Service


Notification Worker


ML Price Predictor


Docker images are not committed, only Dockerfiles, as required.


---
**🚀 Deployment Status**


The system is configured for local execution.


Cloud deployment was not completed.


---

Yağmur Sabırlı


Software Engineering


✨ This project demonstrates how modern distributed systems, message queues, ML-assisted services, and API Gateway patterns can be combined to build a scalable airline ticketing platform.
