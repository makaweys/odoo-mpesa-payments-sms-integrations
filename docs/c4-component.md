C4Component
title Component Diagram - Node.js Bridge

Container(NodeAPI, "Node.js Bridge", "Express.js") {
  Component(HashController, "Hash Controller", "Generates SHA256 hashes")
  Component(SMSController, "SMS Controller", "Sends SMS messages")
  Component(HashService, "Hashing Service", "Normalizes & hashes MSISDN")
  Component(Security, "Security Middleware", "Auth, IP whitelist, rate limiting")
}

HashController -> HashService
SMSController -> Security
HashController -> Security