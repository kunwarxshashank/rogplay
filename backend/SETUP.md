# RogPlay Backend Setup Guide

## Issue Fixed
The payment error "Payment verified but account update failed" was caused by missing Razorpay secret key configuration.

## Setup Instructions

### 1. Install Dependencies
```bash
cd rogplaybackend
npm install dotenv
```

### 2. Configure Environment Variables
Edit the `.env` file in the `rogplaybackend` folder and add your actual Razorpay credentials:

```env
RAZORPAY_KEY_ID=rzp_test_RFx87LUV06PjuD
RAZORPAY_KEY_SECRET=your_actual_razorpay_secret_key_here
```

**Important:** Replace `your_actual_razorpay_secret_key_here` with your real Razorpay secret key from the Razorpay dashboard.

### 3. How to Get Your Razorpay Secret Key
1. Log in to [Razorpay Dashboard](https://dashboard.razorpay.com/)
2. Go to Settings → API Keys
3. Copy the "Key Secret" value
4. Paste it in your `.env` file

### 4. Restart Your Backend Server
After updating the `.env` file, restart your backend:
```bash
node app.js
# or if using nodemon:
nodemon app.js
```

## What Was Changed

### Files Modified:
1. **app.js**
   - Added `require('dotenv').config()` to load environment variables
   - Updated Razorpay initialization to use `process.env.RAZORPAY_KEY_SECRET`
   - Updated MongoDB URI and JWT secret to use environment variables

2. **New Files Created:**
   - `.env` - Your actual environment variables (DO NOT commit to git)
   - `.env.example` - Template for environment variables
   - `.gitignore` - Prevents `.env` from being committed

### Security Improvements:
- Credentials are now stored in environment variables instead of hardcoded
- `.gitignore` created to prevent sensitive data from being committed to git
- All JWT secret references updated to use environment variable

## Testing
After setup, test a payment:
1. Try purchasing a premium plan
2. The payment should process successfully
3. Your account should be upgraded to premium immediately

## Troubleshooting

### If you still get the error:
1. Double-check that the `.env` file has the correct Razorpay secret key
2. Make sure you restarted the backend server after updating `.env`
3. Verify that dotenv is installed: `npm list dotenv`
4. Check backend logs for any Razorpay API errors

### If payment verification fails:
- Ensure you're using the correct Razorpay mode (test/live) keys
- Verify the payment ID is being sent correctly from the frontend
- Check that the amount matches between frontend and backend

## Environment Variables Reference

| Variable | Description | Required |
|----------|-------------|----------|
| `RAZORPAY_KEY_ID` | Razorpay Key ID | Yes |
| `RAZORPAY_KEY_SECRET` | Razorpay Secret Key | Yes |
| `MONGODB_URI` | MongoDB connection string | Yes |
| `JWT_SECRET` | Secret key for JWT tokens | Yes |
