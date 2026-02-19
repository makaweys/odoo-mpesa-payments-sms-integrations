sequenceDiagram
participant MPesa
participant Odoo
participant NodeJS

MPesa->>Odoo: Webhook (hashed MSISDN)
Odoo->>Odoo: Match hash to customer
alt Match found
Odoo->>Odoo: Create & post payment
Odoo->>NodeJS: Send SMS request
NodeJS-->>Odoo: SMS success
else No match
Odoo->>Odoo: Save draft payment
end
