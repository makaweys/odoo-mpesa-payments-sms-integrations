```mermaid
C4Context
title System Context - Odoo MPesa Integration

Person(Customer, "Customer")
System(MPesa, "MPesa Daraja API")
System(Odoo, "Odoo Online")
System(NodeJS, "Node.js Integration Bridge")
System(SMS, "SMS Provider")
```

Customer -> MPesa : Makes payment
MPesa -> Odoo : Payment webhook (hashed MSISDN)
Odoo -> NodeJS : Hashing / SMS requests
NodeJS -> SMS : Send SMS
Odoo -> Customer : Accounting records & notifications
