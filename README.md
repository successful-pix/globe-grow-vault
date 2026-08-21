# International Digital Wallet

Build a clean, modern, and realistic mobile-first crypto wallet and investment app called "International Digital".

App Purpose:
A simple but realistic crypto wallet + investment app where users can hold USDT, buy coins, swap tokens, invest money to earn profits, and grow with referrals.

Core User Features:

1. Authentication
- Sign up / Login with email
- Secure dashboard

2. Wallet
- Show user balance in USDT and other coins
- Deposit and Withdraw options
- Realistic transaction history

3. Supported Coins (with real logos):
- Bitcoin (BTC)
- Ethereum (ETH)
- USDT (Tether)
- BNB
- Solana (SOL)
- XRP
- Cardano (ADA)
- Dogecoin (DOGE)
- Toncoin (TON)
- Polygon (MATIC)

4. Swap Feature (like Trust Wallet):
- User can swap between coins
- Show estimated gas fee
- Show live exchange rate
- Confirmation before swap

5. Investment Section:
- User can invest a specific amount (example: 1000 BRL or USDT)
- Choose investment plan (7 days, 15 days, 30 days)
- Show expected profit percentage
- Show countdown and profit progress
- Ability to claim profit when plan is completed

6. Portfolio
- Show total portfolio value
- Profit and loss overview
- Asset allocation

7. Live Price Charts:
- Show live or realistic price charts for each coin
- Simple candlestick or line chart
- 24h change percentage

8. Referral System:
- Every user gets a unique referral code/link
- When someone signs up with the code, the referrer gets a bonus
- Show referral earnings and total referred users
- Referral balance can be withdrawn or used

9. KYC Verification:
- Users can submit KYC (Full Name, ID document upload, Selfie)
- KYC status: Pending, Approved, Rejected
- Some features (like high withdrawal) can be limited until KYC is approved

Admin Panel Features:
- Admin login
- View all users and their balances
- Manually add or deduct balance
- Set and update deposit wallet addresses for users
- Manage investment plans (create/edit duration and profit %)
- View and manage swap requests
- View and approve/reject withdrawal requests
- View and approve/reject KYC submissions
- View referral activities
- Dashboard with total users, total investments, and total volume

Design Requirements:
- Very realistic and professional (inspired by Trust Wallet and Binance)
- Dark mode by default
- Clean mobile UI
- Real coin logos
- Smooth and premium fintech look
- Mobile responsive

Technical:
- Use Supabase for authentication and database
- Store users, balances, transactions, investments, referrals, KYC, and wallet addresses properly
- Make the system clean, realistic, and easy to expand

Build a solid and premium crypto wallet + investment app.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://globe-grow-vault.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/a6cda602-bcf6-485f-8887-01a107861d8f).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
