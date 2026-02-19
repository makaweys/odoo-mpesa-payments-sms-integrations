# Architecture & System Design

This document describes the internal architecture, design decisions, and system interactions for the Odoo MPesa Payments & SMS Integration Bridge.

---

## 1. Design Constraints

### Odoo Online Limitations

- No external Python libraries
- No cryptographic functions
- Sandboxed execution
- HTTP requests only

### MPesa Constraints

- MSISDN sent as SHA256 hash
- No plaintext phone number
- Webhook-driven confirmations

---

## 2. Architectural Pattern

**Adapter / Integration Bridge Pattern**

- Odoo remains the system of record
- Node.js acts as a stateless utility service
- External providers remain decoupled

---

## 3. C4 Model Diagrams

---

### 3.1 C4 – System Context Diagram

```mermaid
C4Context
title System Context - Odoo MPesa Integration

Person(Customer, "Customer")
System(MPesa, "MPesa Daraja API")
System(Odoo, "Odoo Online")
System(NodeJS, "Node.js Integration Bridge")
System(SMS, "SMS Provider")

Rel(Customer, MPesa, "Makes payment")
Rel(MPesa, Odoo, "Payment webhook (hashed MSISDN)")
Rel(Odoo, NodeJS, "Hashing & SMS requests")
Rel(NodeJS, SMS, "Send SMS")
Rel(Odoo, Customer, "Accounting records & notifications")
```
