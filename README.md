# Crypto Payment Gateway

A secure payment gateway for accepting cryptocurrency payments on Solana. Merchants can accept payments in any token while automatically receiving USDC in their settlement account thanks to Jupiter swap integration.

## Core Features

- **Multi-Token Acceptance**: Accept payments in SOL, USDC, and any other Solana token
- **Automatic Token Swaps**: Seamlessly converts incoming tokens to USDC using Jupiter Exchange
- **Merchant Dashboard**: Track balance and transaction history
- **QR Code Payment Flow**: Generate and scan QR codes for easy payments
- **Security & Rate Limiting**: Production-grade security features
- **Error Handling**: Robust error handling with fallbacks and retries

## Technical Architecture

- **Frontend**: Next.js App Router, React 19, TailwindCSS
- **Authentication**: JWT with secure storage and middleware protection
- **Database**: PostgreSQL with Prisma ORM
- **Blockchain**: Solana Web3.js for wallet interactions and transactions
- **Swaps**: Jupiter API for cross-token swaps with price discovery
- **Security**: Rate limiting, CSRF protection, input validation, secure headers
- **Containerization**: Docker and Docker Compose for easy deployment

## How It Works

1. **For Customers**:
   - Select token to pay with (SOL, USDC, etc.)
   - Scan QR code or copy wallet address
   - Make payment through their Solana wallet

2. **For Merchants**:
   - Receive notification of incoming payment
   - Payment is automatically swapped to USDC via Jupiter
   - Settlement is credited to merchant account
   - Transaction appears in dashboard history

## Production Deployment Guide

### Prerequisites

- Node.js 18+
- PostgreSQL database
- Solana wallet with SOL for transaction fees
- Domain with SSL certificate for secure connections

### Environment Setup

1. Clone the repository:
   ```
   git clone https://github.com/yourusername/crypto-pay-gateway.git
   cd crypto-pay-gateway
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Generate secure JWT secret:
   ```
   node scripts/generate-secrets.js
   ```

4. Configure the environment variables:
   - Create a `.env.production` file based on `.env.example`
   - Set the database connection string
   - Configure Solana RPC endpoint (preferably a private one)
   - Set your domain for CORS configuration

### Database Setup

1. Run database migrations:
   ```
   npm run migrations:deploy
   ```

### Docker Deployment (Recommended)

1. Build and start the containers:
   ```
   docker-compose up -d
   ```

### Manual Deployment

1. Build the application:
   ```
   npm run build
   ```

2. Start the production server:
   ```
   npm run start
   ```

### Nginx Configuration

We recommend using Nginx as a reverse proxy:

```nginx
server {
    listen 80;
    server_name yourdomain.com;
    
    location / {
        return 301 https://$host$request_uri;
    }
}

server {
    listen 443 ssl;
    server_name yourdomain.com;

    ssl_certificate /path/to/fullchain.pem;
    ssl_certificate_key /path/to/privkey.pem;
    
    # Modern SSL configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-ECDSA-CHACHA20-POLY1305:ECDHE-RSA-CHACHA20-POLY1305:DHE-RSA-AES128-GCM-SHA256:DHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;
    
    # HSTS
    add_header Strict-Transport-Security "max-age=63072000" always;
    
    # Proxy to Next.js
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

## Security Best Practices

1. Keep dependencies updated:
   ```
   npm audit fix
   ```

2. Enable rate limiting by configuring `RATE_LIMIT_WINDOW_MS` and `RATE_LIMIT_MAX_REQUESTS`

3. Use a secure RPC endpoint with API key authentication

4. Regularly backup your database

## Monitoring and Error Tracking

For production monitoring, we recommend:

1. Setting up Sentry for error tracking by configuring `NEXT_PUBLIC_SENTRY_DSN`
2. Implementing server monitoring with Prometheus and Grafana
3. Setting up log aggregation with ELK stack or similar
