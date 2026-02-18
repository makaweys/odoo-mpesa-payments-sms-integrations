# Odoo-Mpesa Payments and SMS Integration

A secure Node.js bridge service that integrates Odoo with Mpesa payments by providing phone number hashing (SHA256) and SMS functionality. The system handles Kenyan phone numbers in all formats and provides secure endpoints for Odoo automation scripts.

## Purpose

This service solves two key problems in Odoo-Mpesa integration:

1. **Phone Number Privacy**: Hashes customer phone numbers using SHA256 before storing them in Odoo, matching Mpesa's hashing method for payment confirmation matching
2. **SMS Notifications**: Sends payment confirmations and balance notifications to customers via SMS Initiated from Odoo. Check Sammple Odoo Python Automation Scripts under src/odoo

## ✨ Features

- **SHA256 Hashing** - Matches Safaricom Mpesa's hashing algorithm
- **Multi-format Phone Support** - Handles all Kenyan formats (07, 01, +254, 254, with/without spaces)
- **Hash Formats** - Returns `mobile_hash_plus254`, `mobile_hash_07`, `mobile_hash_01`, `mobile_hash_254` as required by Odoo
- **Secure** - IP whitelisting and API key authentication
- **Rate Limiting** - Prevents abuse with configurable limits
- **Comprehensive Logging** - All requests logged with sensitive data masked
- **SMS Integration** - Works with Bulk Textsms provider
- **Production Ready** - PM2 process management and Docker support

Phone Number Format Support
The system normalizes all Kenyan phone numbers to the format 254XXXXXXXXX before hashing:

Input Format Normalized Hashed Format
0701 234 567 254701234567 +254701234567, 0701234567, 254701234567
0110 345 678 254110345678 +254110345678, 0110345678, 254110345678
+254 701 234 567 254701234567 +254701234567, 0701234567, 254701234567
701234567 254701234567 +254701234567, 0701234567, 254701234567

## Prerequisites

- Node.js 18 or higher
- npm or yarn
- Bulk Textsms account (for SMS): https://textsms.co.ke/bulk-sms-api/ - You can implement such a solution using your preferred provider
- Odoo instance with webhook capabilities

## Quick Start

### 1. Clone and Install

```bash

# Clone repository
git clone git@github.com:makaweys/odoo-mpesa-payments-integrations.git
cd odoo-mpesa-bridge

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your configuration

# Run with Docker
docker-compose up -d

# Or run locally
npm start

# For development
npm run dev
```
